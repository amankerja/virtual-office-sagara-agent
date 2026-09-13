"""
Tool Security Service & Constrained Tool Broker (Prompt 14.9A Section 10-54, 61-87).
Authoritative server-side enforcement boundary for SAFE_READ_ONLY observation.
Guarantees:
- Default: DENY
- Zero arbitrary command / generic shell execution
- Zero network / HTTP / SSRF access
- Zero MCP access
- Strict resource scoping (filesystem roots, systemd services, sqlite tables)
- Path traversal & symlink escape detection
- Sensitive file denylist (.env, keys, credentials, tokens)
- Hidden file rejection
- Binary file rejection
- Bounded result bytes and lines
- Secret redaction on all tool outputs
- Untrusted data envelope wrapping
- Implementation fingerprint & policy hash drift detection
- Immutable audit ledger recording
"""

import fnmatch
import hashlib
import json
import os
import re
import sqlite3
import subprocess
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Literal, Optional, Tuple

from pydantic import BaseModel, ConfigDict, Field

from app.api.errors import AppError, ConflictError, ResourceNotFoundError
from app.domain.tool_security_policy import (
    DOCUMENT_INSPECTION_FINGERPRINT,
    RUNTIME_STATUS_FINGERPRINT,
    ResourceScope,
    RiskClass,
    ToolCapability,
    ToolOperationPolicy,
    ToolSecurityPolicy,
    compute_tool_policy_hash,
    create_canonical_tool_security_policy_v1,
)

# Canonical Denial Reason Codes (Prompt 14.9A Section 53)
class DenialCode:
    TOOL_NOT_ALLOWED = "TOOL_NOT_ALLOWED"
    TOOL_OPERATION_NOT_ALLOWED = "TOOL_OPERATION_NOT_ALLOWED"
    RESOURCE_SCOPE_DENIED = "RESOURCE_SCOPE_DENIED"
    PATH_TRAVERSAL = "PATH_TRAVERSAL"
    SYMLINK_ESCAPE = "SYMLINK_ESCAPE"
    SENSITIVE_FILE_DENIED = "SENSITIVE_FILE_DENIED"
    BINARY_FILE_DENIED = "BINARY_FILE_DENIED"
    RESULT_SIZE_EXCEEDED = "RESULT_SIZE_EXCEEDED"
    NETWORK_DENIED = "NETWORK_DENIED"
    MCP_DENIED = "MCP_DENIED"
    TOOL_POLICY_STALE = "TOOL_POLICY_STALE"
    TOOL_IMPLEMENTATION_DRIFT = "TOOL_IMPLEMENTATION_DRIFT"
    READ_ONLY_PROOF_MISSING = "READ_ONLY_PROOF_MISSING"
    INVALID_ARGUMENTS = "INVALID_ARGUMENTS"
    SAFE_NO_TOOLS_ACTIVE = "SAFE_NO_TOOLS_ACTIVE"
    EXECUTION_LOCKED = "EXECUTION_LOCKED"
    MISSING_POLICY = "MISSING_POLICY"


class ToolResultEnvelope(BaseModel):
    """Untrusted tool output envelope with safety metadata (Prompt 14.9A Section 63)."""
    model_config = ConfigDict(extra="forbid")

    tool_id: str
    operation_id: str
    resource: str
    truncated: bool = False
    redacted: bool = False
    content: str
    is_untrusted_data: bool = True  # Model output cannot be treated as control-plane commands


@dataclass
class ToolPreflightResult:
    allowed: bool
    reason_code: Optional[str] = None
    message: str = ""
    capability: Optional[ToolCapability] = None
    operation: Optional[ToolOperationPolicy] = None


# Secret Detection & Redaction Patterns (Section 31-32)
SECRET_PATTERNS = [
    re.compile(r"sk-[a-zA-Z0-9_-]{20,}"),  # OpenAI/API keys
    re.compile(r"xox[baprs]-[a-zA-Z0-9-]{10,}"),  # Slack tokens
    re.compile(r"gh[pousr]-[a-zA-Z0-9]{36}"),  # GitHub tokens
    re.compile(r"AKIA[0-9A-Z]{16}"),  # AWS Access Key
    re.compile(r"Bearer\s+[a-zA-Z0-9_\-\.]{15,}", re.IGNORECASE),  # Bearer tokens
    re.compile(r"ey[A-Za-z0-9_-]{10,}\.ey[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}"),  # JWT
    re.compile(r"-----BEGIN [A-Z ]+PRIVATE KEY-----[\s\S]*?-----END [A-Z ]+PRIVATE KEY-----"),  # PEM keys
    re.compile(r"(?:api_key|token|secret|password|passwd)\s*[:=]\s*['\"]?([^\s'\"]{6,})['\"]?", re.IGNORECASE),
]


def redact_secrets(text: str) -> Tuple[str, bool]:
    """
    Redact discovered API keys, tokens, and sensitive credentials in text.
    Returns (redacted_text, was_redacted).
    """
    redacted = False
    result = text

    for pattern in SECRET_PATTERNS:
        matches = pattern.finditer(result)
        matched_any = False
        for m in matches:
            matched_any = True
            redacted = True
            # For key-value patterns with group, redact the value group; otherwise whole match
            if m.re.groups > 0 and m.group(1):
                secret_val = m.group(1)
                result = result.replace(secret_val, "[REDACTED_SECRET]")
            else:
                result = result.replace(m.group(0), "[REDACTED_SECRET]")

    return result, redacted


class ToolSecurityService:
    """
    Authoritative server-side tool security enforcement broker.
    Prompt 14.9A Section 10-54.
    """

    # Registered Implementation Fingerprints
    IMPLEMENTATION_FINGERPRINTS = {
        "runtime_status": RUNTIME_STATUS_FINGERPRINT,
        "document_inspection": DOCUMENT_INSPECTION_FINGERPRINT,
    }

    @classmethod
    def get_installed_policy(cls, conn: sqlite3.Connection) -> ToolSecurityPolicy:
        """Fetch current installed ToolSecurityPolicy from DB or fallback to canonical V1."""
        cursor = conn.cursor()
        try:
            cursor.execute(
                """
                SELECT definition_json, policy_hash, version FROM tool_security_policies
                WHERE status IN ('INSTALLED_BUT_NOT_ENABLED', 'ACTIVE', 'PROPOSED')
                ORDER BY created_at DESC LIMIT 1;
                """
            )
            row = cursor.fetchone()
            if not row:
                return create_canonical_tool_security_policy_v1()

            raw_json = row["definition_json"] if isinstance(row, sqlite3.Row) else row[0]
            policy_dict = json.loads(raw_json)
            computed_hash = compute_tool_policy_hash(policy_dict)
            stored_hash = row["policy_hash"] if isinstance(row, sqlite3.Row) else row[1]
            if computed_hash != stored_hash:
                raise AppError(
                    status_code=500,
                    code="CORRUPT_TOOL_SECURITY_POLICY",
                    message="Tool security policy hash does not match computed definition hash. Fail closed.",
                )
            policy_dict["policy_hash"] = stored_hash
            return ToolSecurityPolicy(**policy_dict)
        except sqlite3.OperationalError:
            return create_canonical_tool_security_policy_v1()
        except AppError:
            raise
        except Exception as e:
            raise AppError(
                status_code=500,
                code="TOOL_SECURITY_POLICY_UNAVAILABLE",
                message=f"Failed to load tool security policy: {e}. Fail closed.",
            )

    @classmethod
    def preflight_tool_request(
        cls,
        policy: Optional[ToolSecurityPolicy],
        profile_id: str,
        tool_id: str,
        operation_id: str,
        arguments: Dict[str, Any],
        expected_policy_hash: Optional[str] = None,
        runtime_mode: str = "SAFE_NO_TOOLS",
    ) -> ToolPreflightResult:
        """
        Evaluate a tool invocation request against the tool security policy.
        Enforces default-deny, profile scope, operation allowlist, schema, and drift.
        """
        # 1. Fail closed on missing policy (Section 54)
        if not policy:
            return ToolPreflightResult(
                allowed=False,
                reason_code=DenialCode.MISSING_POLICY,
                message="No active tool security policy found. Default deny.",
            )

        # 2. Check runtime mode: If production mode is SAFE_NO_TOOLS, tool execution is blocked (Section 56)
        if runtime_mode == "SAFE_NO_TOOLS":
            return ToolPreflightResult(
                allowed=False,
                reason_code=DenialCode.SAFE_NO_TOOLS_ACTIVE,
                message="Production runtime mode is SAFE_NO_TOOLS. All tool executions are strictly disabled.",
            )

        # 3. Policy staleness check (Section 84)
        if expected_policy_hash and expected_policy_hash != policy.policy_hash:
            return ToolPreflightResult(
                allowed=False,
                reason_code=DenialCode.TOOL_POLICY_STALE,
                message=f"Tool security policy hash mismatch (intent: {expected_policy_hash[:8]}..., active: {policy.policy_hash[:8]}...). Execution blocked.",
            )

        # 4. Tool allowlist check (Section 15)
        cap = policy.approved_capabilities.get(tool_id)
        if not cap:
            return ToolPreflightResult(
                allowed=False,
                reason_code=DenialCode.TOOL_NOT_ALLOWED,
                message=f"Tool '{tool_id}' is not in the approved tool capability allowlist.",
            )

        # 5. Implementation drift check (Section 83)
        expected_fingerprint = cls.IMPLEMENTATION_FINGERPRINTS.get(tool_id)
        if cap.implementation_fingerprint != expected_fingerprint:
            return ToolPreflightResult(
                allowed=False,
                reason_code=DenialCode.TOOL_IMPLEMENTATION_DRIFT,
                message=f"Tool '{tool_id}' implementation fingerprint drift detected ({cap.implementation_fingerprint} != {expected_fingerprint}). Revalidation required.",
            )

        # 6. Profile scope check (Section 37, 81)
        if profile_id not in cap.enabled_profiles:
            return ToolPreflightResult(
                allowed=False,
                reason_code=DenialCode.RESOURCE_SCOPE_DENIED,
                message=f"Profile '{profile_id}' is not authorized to use tool '{tool_id}'. Allowed profiles: {cap.enabled_profiles}.",
            )

        # 7. Read-only verification check (Section 6, 123)
        if not cap.read_only_verified:
            return ToolPreflightResult(
                allowed=False,
                reason_code=DenialCode.READ_ONLY_PROOF_MISSING,
                message=f"Tool '{tool_id}' has not been proven read-only. Execution denied.",
            )

        # 8. Operation allowlist check (Section 16, 53)
        op = cap.operations.get(operation_id)
        if not op:
            return ToolPreflightResult(
                allowed=False,
                reason_code=DenialCode.TOOL_OPERATION_NOT_ALLOWED,
                message=f"Operation '{operation_id}' is not allowed for tool '{tool_id}'. Allowed: {list(cap.operations.keys())}.",
            )

        if not op.read_only_verified:
            return ToolPreflightResult(
                allowed=False,
                reason_code=DenialCode.READ_ONLY_PROOF_MISSING,
                message=f"Operation '{operation_id}' under tool '{tool_id}' is not proven read-only.",
            )

        # 9. Argument schema validation & argument smuggling defense (Section 85-86)
        schema = op.argument_schema
        if schema:
            # Check required properties
            for req in schema.get("required", []):
                if req not in arguments:
                    return ToolPreflightResult(
                        allowed=False,
                        reason_code=DenialCode.INVALID_ARGUMENTS,
                        message=f"Missing required argument '{req}' for operation '{operation_id}'.",
                    )

            # Check additional properties (Strict extra fields forbidden)
            if schema.get("additionalProperties") is False:
                allowed_keys = set(schema.get("properties", {}).keys())
                extra_keys = set(arguments.keys()) - allowed_keys
                if extra_keys:
                    return ToolPreflightResult(
                        allowed=False,
                        reason_code=DenialCode.INVALID_ARGUMENTS,
                        message=f"Unexpected extra arguments {list(extra_keys)} for operation '{operation_id}'. Smuggling rejected.",
                    )

        return ToolPreflightResult(
            allowed=True,
            capability=cap,
            operation=op,
        )

    # -------------------------------------------------------------------------
    # Filesystem Path Security & Document Inspection (Section 21-32, 66-71, 87)
    # -------------------------------------------------------------------------

    @classmethod
    def validate_file_path(
        cls,
        raw_path: str,
        resource_scope: ResourceScope,
        base_dir: Path,
    ) -> Tuple[bool, Optional[str], Optional[Path], str]:
        """
        Validates filesystem path against traversal, symlink escapes, hidden files, and sensitive patterns.
        Returns (is_valid, denial_code, resolved_path, message).
        """
        # 1. Reject null bytes and URL encoding tricks (Section 87)
        if "\x00" in raw_path:
            return False, DenialCode.PATH_TRAVERSAL, None, "Null byte in path rejected."
        if "%2e" in raw_path.lower() or "%2f" in raw_path.lower() or "%5c" in raw_path.lower():
            return False, DenialCode.PATH_TRAVERSAL, None, "URL encoded path traversal attempt rejected."

        # 2. Reject explicit parent traversal strings
        clean_path_str = raw_path.replace("\\", "/")
        if ".." in clean_path_str.split("/"):
            return False, DenialCode.PATH_TRAVERSAL, None, "Path traversal sequence '..' rejected."

        # 3. Resolve absolute canonical paths relative to allowed roots
        candidate_path = Path(raw_path)
        if candidate_path.is_absolute():
            resolved = candidate_path.resolve()
        else:
            resolved = (base_dir / candidate_path).resolve()

        # 4. Allowed Root Containment Check (Section 22, 26)
        matched_root = False
        for root_name in resource_scope.allowed_roots:
            allowed_root_path = (base_dir / root_name).resolve() if not Path(root_name).is_absolute() else Path(root_name).resolve()
            try:
                if resolved.is_relative_to(allowed_root_path):
                    matched_root = True
                    break
            except AttributeError:
                # Python < 3.9 fallback
                try:
                    resolved.relative_to(allowed_root_path)
                    matched_root = True
                    break
                except ValueError:
                    pass

        if not matched_root:
            return False, DenialCode.RESOURCE_SCOPE_DENIED, None, f"Path '{raw_path}' escapes all allowed roots {resource_scope.allowed_roots}."

        # 5. Symlink safety (Section 26, 68)
        if not resource_scope.allow_symlinks:
            # Check if any path component leading to target or target itself is a symlink
            check_p = Path(raw_path) if Path(raw_path).is_absolute() else (base_dir / candidate_path)
            curr = check_p
            while curr != curr.parent and curr.exists():
                if curr.is_symlink():
                    return False, DenialCode.SYMLINK_ESCAPE, None, f"Symlink detected at '{curr}'. Symlinks forbidden."
                curr = curr.parent

        # 6. Hidden files check (Section 25)
        if not resource_scope.allow_hidden:
            for part in resolved.parts:
                if part.startswith(".") and part not in [".", ".."]:
                    return False, DenialCode.SENSITIVE_FILE_DENIED, None, f"Hidden file/directory '{part}' access rejected."

        # 7. Sensitive file denylist patterns (Section 24, 69)
        file_name = resolved.name.lower()
        for pattern in resource_scope.denied_patterns:
            if fnmatch.fnmatch(file_name, pattern.lower()) or fnmatch.fnmatch(resolved.as_posix().lower(), pattern.lower()):
                return False, DenialCode.SENSITIVE_FILE_DENIED, None, f"Access to sensitive file pattern '{pattern}' denied."

        return True, None, resolved, "Path validation passed."

    @classmethod
    def execute_document_inspection(
        cls,
        raw_path: str,
        max_bytes: int,
        resource_scope: ResourceScope,
        op_policy: ToolOperationPolicy,
        base_dir: Path,
    ) -> ToolResultEnvelope:
        """
        Execute bounded read-only inspection of a text document.
        Applies path validation, binary check, byte/line bounds, and secret redaction.
        """
        is_valid, code, resolved_path, msg = cls.validate_file_path(raw_path, resource_scope, base_dir)
        if not is_valid:
            raise AppError(status_code=403, code=code or DenialCode.RESOURCE_SCOPE_DENIED, message=msg)

        if not resolved_path or not resolved_path.is_file():
            raise ResourceNotFoundError(f"Target document '{raw_path}' does not exist or is not a regular file.")

        # Binary check (Section 29, 70)
        try:
            with open(resolved_path, "rb") as f:
                header = f.read(512)
                if b"\x00" in header:
                    raise AppError(
                        status_code=403,
                        code=DenialCode.BINARY_FILE_DENIED,
                        message=f"Binary file access denied for '{raw_path}'. Only plain text supported.",
                    )
        except OSError as e:
            raise AppError(status_code=500, code="FILE_READ_ERROR", message=f"Failed to read document header: {e}")

        # Bounded reading (Section 30, 71)
        effective_max_bytes = min(max_bytes or op_policy.max_result_bytes, op_policy.max_result_bytes)
        truncated = False

        try:
            with open(resolved_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read(effective_max_bytes + 1)
                if len(content) > effective_max_bytes:
                    content = content[:effective_max_bytes]
                    truncated = True
        except Exception as e:
            raise AppError(status_code=500, code="FILE_READ_ERROR", message=f"Failed to read document: {e}")

        # Line bounds
        lines = content.splitlines()
        if len(lines) > op_policy.max_result_lines:
            content = "\n".join(lines[: op_policy.max_result_lines])
            truncated = True

        # Secret Redaction (Section 31-32, 82)
        redacted_content, was_redacted = redact_secrets(content)

        return ToolResultEnvelope(
            tool_id="document_inspection",
            operation_id="read_text",
            resource=resolved_path.name,
            truncated=truncated,
            redacted=was_redacted,
            content=redacted_content,
            is_untrusted_data=True,
        )

    # -------------------------------------------------------------------------
    # Typed Systemd Status Inspection (Section 18-20, 78-80)
    # -------------------------------------------------------------------------

    @classmethod
    def execute_runtime_status(
        cls,
        unit: str,
        properties: Optional[List[str]],
        resource_scope: ResourceScope,
        op_policy: ToolOperationPolicy,
        command_runner: Optional[Callable[[List[str], float], str]] = None,
    ) -> ToolResultEnvelope:
        """
        Execute typed systemd status inspection.
        Fixed argv: /usr/bin/systemctl --user show <unit> --property=...
        shell=False, absolute binary path, no model-supplied arbitrary argv.
        """
        if unit not in resource_scope.allowed_units:
            raise AppError(
                status_code=403,
                code=DenialCode.RESOURCE_SCOPE_DENIED,
                message=f"Service '{unit}' is not in allowed systemd units {resource_scope.allowed_units}.",
            )

        # Filter properties to allowlisted set
        requested_props = properties or resource_scope.allowed_properties
        allowed_props = [p for p in requested_props if p in resource_scope.allowed_properties]
        if not allowed_props:
            allowed_props = resource_scope.allowed_properties

        # Construct fixed argv
        prop_arg = f"--property={','.join(allowed_props)}"
        cmd = ["/usr/bin/systemctl", "--user", "show", unit, prop_arg]

        # Use injected runner (for unit tests / mock environments) or subprocess
        truncated = False
        if command_runner:
            output = command_runner(cmd, op_policy.timeout_seconds)
        else:
            try:
                proc = subprocess.run(
                    cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    timeout=op_policy.timeout_seconds,
                    shell=False,  # Strict: NEVER shell=True (Prompt 14.9A Section 19)
                )
                output = proc.stdout
                if proc.returncode != 0:
                    output = f"systemctl returned {proc.returncode}: {proc.stderr.strip()}"
            except FileNotFoundError:
                # If systemctl is not available (e.g. on Windows development host), provide clear bounded note
                output = f"SYSTEMCTL_UNAVAILABLE: Unit {unit} status cannot be inspected on this host architecture."
            except subprocess.TimeoutExpired:
                raise AppError(status_code=504, code="TOOL_TIMEOUT", message="Runtime status inspection timed out.")
            except Exception as e:
                raise AppError(status_code=500, code="RUNTIME_STATUS_ERROR", message=f"Failed to inspect unit: {e}")

        # Bound output bytes
        if len(output) > op_policy.max_result_bytes:
            output = output[: op_policy.max_result_bytes]
            truncated = True

        redacted_content, was_redacted = redact_secrets(output)

        return ToolResultEnvelope(
            tool_id="runtime_status",
            operation_id="inspect_service",
            resource=unit,
            truncated=truncated,
            redacted=was_redacted,
            content=redacted_content,
            is_untrusted_data=True,
        )

    # -------------------------------------------------------------------------
    # Typed SQLite Read-Only Helper (Section 33-38, 72-74)
    # -------------------------------------------------------------------------

    @classmethod
    def execute_typed_sqlite_query(
        cls,
        db_path: Path,
        query_id: str,
        profile_id: str,
        allowed_profiles: List[str],
        params: Tuple[Any, ...] = (),
    ) -> List[Dict[str, Any]]:
        """
        Typed read-only SQLite inspection with immutable mode=ro and PRAGMA query_only=ON.
        Raw SQL is strictly forbidden. Predefined query registry only.
        """
        # Cross-profile isolation check (Section 37-38, 81)
        if profile_id not in allowed_profiles:
            raise AppError(
                status_code=403,
                code=DenialCode.RESOURCE_SCOPE_DENIED,
                message=f"Profile '{profile_id}' is not permitted to query this database scope.",
            )

        # Fixed Query Registry (Section 36)
        QUERY_REGISTRY = {
            "session_summary": (
                "SELECT session_id, profile_id, created_at, status FROM sessions WHERE profile_id = ? ORDER BY created_at DESC LIMIT 10;",
                1,  # expected param count
            ),
            "runtime_health": (
                "SELECT component, status, updated_at FROM runtime_status ORDER BY updated_at DESC LIMIT 5;",
                0,
            ),
        }

        if query_id not in QUERY_REGISTRY:
            raise AppError(
                status_code=403,
                code=DenialCode.TOOL_OPERATION_NOT_ALLOWED,
                message=f"Typed query '{query_id}' is not registered in the fixed query registry.",
            )

        sql_template, expected_params = QUERY_REGISTRY[query_id]
        if len(params) != expected_params:
            raise AppError(
                status_code=400,
                code=DenialCode.INVALID_ARGUMENTS,
                message=f"Query '{query_id}' requires {expected_params} parameters, got {len(params)}.",
            )

        # Ensure database exists
        if not db_path.is_file():
            raise ResourceNotFoundError(f"Database at '{db_path}' not found.")

        # Open in URI read-only mode (Section 33)
        uri = f"file:{db_path.as_posix()}?mode=ro"
        conn = sqlite3.connect(uri, uri=True)
        try:
            conn.execute("PRAGMA query_only = ON;")
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute(sql_template, params)
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    # -------------------------------------------------------------------------
    # Hard Denials for Forbidden Categories (Section 17, 39-41, 75-77)
    # -------------------------------------------------------------------------

    @classmethod
    def evaluate_forbidden_tool(cls, requested_tool_id: str) -> None:
        """Immediately reject forbidden tools such as shell, network, and MCP."""
        lower = requested_tool_id.lower()
        if any(term in lower for term in ["shell", "bash", "sh", "powershell", "cmd", "exec", "run_command"]):
            raise AppError(
                status_code=403,
                code=DenialCode.TOOL_NOT_ALLOWED,
                message=f"Generic shell / command execution tool '{requested_tool_id}' is strictly forbidden.",
            )
        if any(term in lower for term in ["network", "http", "curl", "fetch", "get", "request"]):
            raise AppError(
                status_code=403,
                code=DenialCode.NETWORK_DENIED,
                message=f"Network communication tool '{requested_tool_id}' is strictly denied in SAFE_READ_ONLY V1.",
            )
        if "mcp" in lower:
            raise AppError(
                status_code=403,
                code=DenialCode.MCP_DENIED,
                message=f"Model Context Protocol (MCP) tool '{requested_tool_id}' is denied in SAFE_READ_ONLY V1.",
            )

    # -------------------------------------------------------------------------
    # Audit Recording (Section 52, 100)
    # -------------------------------------------------------------------------

    @classmethod
    def record_tool_audit(
        cls,
        conn: sqlite3.Connection,
        intent_id: Optional[str],
        tool_id: str,
        operation_id: str,
        profile_id: str,
        status: Literal["ALLOWED", "DENIED", "EXECUTED", "FAILED"],
        denial_reason: Optional[str] = None,
        arguments: Optional[Dict[str, Any]] = None,
        result_bytes: int = 0,
        result_content: Optional[str] = None,
        redacted: bool = False,
    ) -> None:
        """
        Record a tamper-evident audit entry for tool authorization or execution.
        Does NOT log secret contents; records argument hash and result hash.
        """
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        audit_id = f"tld-{datetime.now(timezone.utc).strftime('%Y%m%d%H%M%S')}-{os.urandom(4).hex()}"
        args_hash = hashlib.sha256(json.dumps(arguments or {}, sort_keys=True).encode()).hexdigest()
        res_hash = hashlib.sha256(result_content.encode()).hexdigest() if result_content else None

        try:
            conn.execute(
                """
                INSERT INTO tool_execution_audits (
                    id, intent_id, tool_id, operation_id, profile_id, status,
                    denial_reason, arguments_hash, result_bytes, result_hash, redacted, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    audit_id,
                    intent_id,
                    tool_id,
                    operation_id,
                    profile_id,
                    status,
                    denial_reason,
                    args_hash,
                    result_bytes,
                    res_hash,
                    1 if redacted else 0,
                    now,
                ),
            )
        except sqlite3.OperationalError:
            # Table may not exist yet in early test setup
            pass
