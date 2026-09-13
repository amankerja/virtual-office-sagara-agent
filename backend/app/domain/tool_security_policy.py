"""
Tool Security Policy Domain Model (Prompt 14.9A Section 11-16, 48-60).
Establishes the canonical server-side tool capability allowlist, risk classification,
resource scoping, and deterministic semantic hashing.
"""

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field, ConfigDict

RiskClass = Literal[
    "READ_ONLY",
    "LOCAL_MUTATION",
    "EXTERNAL_MUTATION",
    "COMMUNICATION",
    "INFRASTRUCTURE",
    "CREDENTIAL_SENSITIVE",
    "UNKNOWN",
]

ScopeType = Literal[
    "FILESYSTEM_PATH",
    "SYSTEMD_SERVICE",
    "SQLITE_TABLE",
    "NONE",
]

# Canonical Implementation Fingerprints
RUNTIME_STATUS_FINGERPRINT = hashlib.sha256(b"sagara_runtime_status_handler_v1").hexdigest()[:16]
DOCUMENT_INSPECTION_FINGERPRINT = hashlib.sha256(b"sagara_document_inspection_handler_v1").hexdigest()[:16]


class ResourceScope(BaseModel):
    """Resource scope boundary for tool access."""
    model_config = ConfigDict(extra="forbid")

    scope_type: ScopeType = "NONE"
    allowed_roots: List[str] = Field(default_factory=list)
    denied_patterns: List[str] = Field(default_factory=list)
    allow_hidden: bool = False
    allow_symlinks: bool = False
    allowed_units: List[str] = Field(default_factory=list)
    allowed_properties: List[str] = Field(default_factory=list)
    allowed_tables: List[str] = Field(default_factory=list)
    allowed_profiles: List[str] = Field(default_factory=list)


class ToolOperationPolicy(BaseModel):
    """Specific operation-level policy under a tool."""
    model_config = ConfigDict(extra="forbid")

    operation_id: str
    description: str
    read_only_verified: bool = False
    argument_schema: Dict[str, Any] = Field(default_factory=dict)
    max_result_bytes: int = 32768
    max_result_lines: int = 500
    timeout_seconds: float = 10.0


class ToolCapability(BaseModel):
    """Registered and approved tool capability definition."""
    model_config = ConfigDict(extra="forbid")

    tool_id: str
    tool_version: str = "1.0.0"
    implementation_fingerprint: str
    description: str
    risk_class: RiskClass = "UNKNOWN"
    read_only_verified: bool = False
    resource_scope: ResourceScope = Field(default_factory=ResourceScope)
    operations: Dict[str, ToolOperationPolicy] = Field(default_factory=dict)
    network_policy: Literal["DENY", "ALLOWLIST"] = "DENY"
    filesystem_policy: Literal["DENY", "READ_ONLY_SCOPED"] = "DENY"
    redaction_policy: Literal["REQUIRED", "NONE"] = "REQUIRED"
    audit_policy: Literal["FULL", "SUMMARY"] = "FULL"
    enabled_profiles: List[str] = Field(default_factory=list)


class ToolSecurityPolicy(BaseModel):
    """
    Authoritative server-side tool security policy.
    Enforces strict default-deny and resource-scoped capabilities.
    """
    model_config = ConfigDict(extra="forbid")

    version: str = "TOOL_SECURITY_POLICY_V1"
    policy_hash: str = ""
    status: Literal["INSTALLED_BUT_NOT_ENABLED", "PROPOSED", "ACTIVE"] = "INSTALLED_BUT_NOT_ENABLED"
    default_action: Literal["DENY"] = "DENY"
    network_enabled: bool = False
    shell_enabled: bool = False
    mcp_enabled: bool = False
    arbitrary_sql_enabled: bool = False
    mutation_enabled: bool = False
    approved_capabilities: Dict[str, ToolCapability] = Field(default_factory=dict)
    denied_categories: List[str] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"))
    description: str = "Canonical Tool Security Policy V1 — Fail-Closed Read-Only Observation Boundary"


def compute_tool_policy_hash(policy_data: dict) -> str:
    """
    Deterministic SHA-256 semantic hash of canonical JSON representation.
    Omits volatile policy_hash field if present.
    """
    normalized = dict(policy_data)
    normalized.pop("policy_hash", None)
    canonical_json = json.dumps(normalized, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()


def create_canonical_tool_security_policy_v1() -> ToolSecurityPolicy:
    """
    Construct the canonical V1 Tool Security Policy (Prompt 14.9A Section 11-16, 56-60).
    Default: DENY
    Approved Future Read-Only Candidates: Exactly 2:
      1. runtime_status (inspect_service: hermes-gateway.service)
      2. document_inspection (read_text: bounded safe documentation/artifacts)
    Status: INSTALLED_BUT_NOT_ENABLED (SAFE_NO_TOOLS remains active production mode).
    """
    now_str = "2026-09-12T12:00:00Z"

    # Candidate 1: runtime_status
    runtime_status_cap = ToolCapability(
        tool_id="runtime_status",
        tool_version="1.0.0",
        implementation_fingerprint=RUNTIME_STATUS_FINGERPRINT,
        description="Server-controlled typed systemd service status query for allowlisted units",
        risk_class="READ_ONLY",
        read_only_verified=True,
        resource_scope=ResourceScope(
            scope_type="SYSTEMD_SERVICE",
            allowed_units=["hermes-gateway.service"],
            allowed_properties=[
                "ActiveState",
                "SubState",
                "MainPID",
                "NRestarts",
                "ActiveEnterTimestamp",
                "UnitFileState",
            ],
            allowed_profiles=["sagara-lab"],
        ),
        operations={
            "inspect_service": ToolOperationPolicy(
                operation_id="inspect_service",
                description="Query fixed systemd status properties for allowlisted unit via fixed argv /usr/bin/systemctl --user show",
                read_only_verified=True,
                argument_schema={
                    "type": "object",
                    "properties": {
                        "unit": {"type": "string", "enum": ["hermes-gateway.service"]},
                        "properties": {
                            "type": "array",
                            "items": {"type": "string"},
                        },
                    },
                    "required": ["unit"],
                    "additionalProperties": False,
                },
                max_result_bytes=8192,
                max_result_lines=100,
                timeout_seconds=5.0,
            )
        },
        network_policy="DENY",
        filesystem_policy="DENY",
        redaction_policy="REQUIRED",
        audit_policy="FULL",
        enabled_profiles=["sagara-lab"],
    )

    # Candidate 2: document_inspection
    document_inspection_cap = ToolCapability(
        tool_id="document_inspection",
        tool_version="1.0.0",
        implementation_fingerprint=DOCUMENT_INSPECTION_FINGERPRINT,
        description="Server-controlled bounded read-only inspection of non-secret text files in approved roots",
        risk_class="READ_ONLY",
        read_only_verified=True,
        resource_scope=ResourceScope(
            scope_type="FILESYSTEM_PATH",
            allowed_roots=["docs", "artifacts"],
            denied_patterns=[
                ".env*",
                "*.env",
                "*.pem",
                "*.key",
                "id_rsa*",
                "id_ed25519*",
                "*credentials*",
                "*token*",
                "*secret*",
                "*oauth*",
                "*cookie*",
                "*session*",
                "*auth*",
                "shadow",
                "passwd",
            ],
            allow_hidden=False,
            allow_symlinks=False,
            allowed_profiles=["sagara-lab"],
        ),
        operations={
            "read_text": ToolOperationPolicy(
                operation_id="read_text",
                description="Bounded UTF-8 text read with strict path traversal checks, symlink escape checks, sensitive pattern rejection, and secret redaction",
                read_only_verified=True,
                argument_schema={
                    "type": "object",
                    "properties": {
                        "path": {"type": "string"},
                        "max_bytes": {"type": "integer", "maximum": 32768},
                    },
                    "required": ["path"],
                    "additionalProperties": False,
                },
                max_result_bytes=32768,
                max_result_lines=500,
                timeout_seconds=5.0,
            )
        },
        network_policy="DENY",
        filesystem_policy="READ_ONLY_SCOPED",
        redaction_policy="REQUIRED",
        audit_policy="FULL",
        enabled_profiles=["sagara-lab"],
    )

    denied_categories = [
        "GENERIC_SHELL",
        "NETWORK_COMMUNICATION",
        "MODEL_CONTEXT_PROTOCOL",
        "LOCAL_MUTATION",
        "INFRASTRUCTURE_MUTATION",
        "DATABASE_MUTATION",
        "CROSS_PROFILE_MEMORY",
    ]

    raw_dict = {
        "version": "TOOL_SECURITY_POLICY_V1",
        "status": "INSTALLED_BUT_NOT_ENABLED",
        "default_action": "DENY",
        "network_enabled": False,
        "shell_enabled": False,
        "mcp_enabled": False,
        "arbitrary_sql_enabled": False,
        "mutation_enabled": False,
        "approved_capabilities": {
            "runtime_status": runtime_status_cap.model_dump(),
            "document_inspection": document_inspection_cap.model_dump(),
        },
        "denied_categories": denied_categories,
        "created_at": now_str,
        "description": "Canonical Tool Security Policy V1 — Conservative Bounded Read-Only Observation Boundary",
    }
    phash = compute_tool_policy_hash(raw_dict)
    raw_dict["policy_hash"] = phash
    return ToolSecurityPolicy(**raw_dict)
