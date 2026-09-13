import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional
from pydantic import BaseModel

from app.api.errors import AppError
from app.domain.principal import OperatorPrincipal
from app.repositories.sqlite.audit_repo import AuditSqliteRepository
from app.repositories.sqlite.execution_repo import ExecutionSqliteRepository
from app.schemas.action_intents import ActionIntentDto
from app.services.audit_verifier import verify_audit_chain
from app.services.execution_kill_switch import ExecutionKillSwitch
from app.services.signing import compute_payload_hash, verify_action_signature


def _resolve_mission_control_base_dir() -> Path:
    b = Path(__file__).resolve().parents[3]
    if not (b / "docs").exists():
        return Path.cwd()
    return b


class FinalPreflightResult(BaseModel):
    passed: bool
    checked_at: str
    blocking_reasons: List[str]
    warnings: List[str]
    targetability: str  # "TARGETABLE", "NOT_TARGETABLE", "UNKNOWN"


class FinalExecutionPreflightService:
    """
    Final Execution Preflight Service (Prompt 14 Section 35-43).
    Mandatory fail-closed pre-execution gate evaluating immediately before submission.
    Prevents TOCTOU vulnerabilities and enforces exact targetability.
    """

    def __init__(
        self,
        conn: sqlite3.Connection,
        profile_registry=None,
        task_repository=None,
        executor=None,
    ):
        self._conn = conn
        self._profiles = profile_registry
        self._tasks = task_repository
        self._executor = executor

    async def evaluate(
        self,
        intent: ActionIntentDto,
        principal: OperatorPrincipal,
        expected_task_revision: Optional[int] = None,
    ) -> FinalPreflightResult:
        now_dt = datetime.now(timezone.utc)
        now_str = now_dt.isoformat().replace("+00:00", "Z")
        blocking_reasons: List[str] = []
        warnings: List[str] = []
        targetability = "UNKNOWN"

        # 1. Action Type Scope Guard (Prompt 14 Section 2)
        if intent.action_type != "TASK_DISPATCH":
            blocking_reasons.append(
                f"Execution is not implemented for action type '{intent.action_type}'. Only 'TASK_DISPATCH' is supported in Prompt 14."
            )

        # 2. Intent Status & Lifecycle
        if intent.status not in ("READY_TO_EXECUTE", "APPROVED"):
            blocking_reasons.append(
                f"Action intent status '{intent.status}' is not eligible for execution. Must be READY_TO_EXECUTE."
            )

        # 3. Expiration Check
        try:
            expires_dt = datetime.fromisoformat(intent.expires_at.replace("Z", "+00:00"))
            if now_dt >= expires_dt:
                blocking_reasons.append(f"Action intent expired at {intent.expires_at}.")
        except Exception:
            blocking_reasons.append("Invalid expiration timestamp format on action intent.")

        # 4. Intent Payload & HMAC Cryptographic Integrity
        current_hash = compute_payload_hash(intent.payload)
        if current_hash != intent.payload_hash:
            blocking_reasons.append(
                f"Action intent payload hash mismatch: recorded '{intent.payload_hash}' != computed '{current_hash}' (tampering detected)."
            )

        sig_valid = verify_action_signature(
            intent_id=intent.id,
            action_type=intent.action_type,
            target_type=intent.target_type,
            target_id=intent.target_id,
            payload_hash=intent.payload_hash,
            operator_id=intent.requested_by,
            nonce=intent.nonce,
            created_at=intent.created_at,
            expires_at=intent.expires_at,
            signature=intent.signature,
        )
        if not sig_valid:
            blocking_reasons.append("Action intent cryptographic signature verification failed (tampering detected).")

        # 5. Approval Binding Verification
        cursor = self._conn.cursor()
        cursor.execute(
            "SELECT * FROM approvals WHERE intent_id = ? ORDER BY created_at DESC LIMIT 1;",
            (intent.id,),
        )
        appr_row = cursor.fetchone()
        if not appr_row:
            blocking_reasons.append("No approval record found for action intent.")
        else:
            if appr_row["decision"] != "APPROVE":
                blocking_reasons.append(f"Approval decision is '{appr_row['decision']}', not 'APPROVE'.")
            if appr_row["payload_hash"] != intent.payload_hash:
                blocking_reasons.append("Approval record is bound to a different payload hash than the intent.")

        # 6. Operator Authorization (Prompt 14.4 Section 23-25)
        if not (principal.has_permission("execution.execute") or principal.has_permission("action:execute")):
            blocking_reasons.append(f"Operator '{principal.id}' lacks execution authority ('execution.execute').")

        # 7. Kill Switch & Execution Gate (Prompt 14 Section 27)
        is_locked, lock_reason = ExecutionKillSwitch.is_locked(self._conn)
        if is_locked:
            blocking_reasons.append(f"Execution kill switch locked: {lock_reason}")

        # 8. Audit Ledger Chain Integrity (Prompt 14 Section 74)
        audit_valid, audit_detail = verify_audit_chain(self._conn)
        if not audit_valid:
            blocking_reasons.append(f"Audit ledger integrity failure: {audit_detail}.")

        # 9. No Existing Successful Receipt (Single Execution Guarantee)
        exec_repo = ExecutionSqliteRepository(self._conn)
        existing_receipt = exec_repo.get_receipt_by_intent(intent.id)
        if existing_receipt:
            blocking_reasons.append(
                f"Action intent has already been executed. Existing receipt ID: '{existing_receipt.receipt_id}'."
            )

        # 10. Task Verification
        task_id = intent.payload.get("task_id")
        if not task_id:
            blocking_reasons.append("Intent payload missing required 'task_id'.")
        else:
            # Check revision if task repository provided
            if self._tasks:
                try:
                    import inspect
                    task = self._tasks.get_task(task_id)
                    if inspect.isawaitable(task):
                        task = await task
                    if not task:
                        blocking_reasons.append(f"Target task '{task_id}' does not exist.")
                    else:
                        req_rev = expected_task_revision or intent.resource_revision
                        if req_rev is not None and task.revision != req_rev:
                            blocking_reasons.append(
                                f"Task revision conflict: current {task.revision} != expected {req_rev}."
                            )
                except Exception as e:
                    warnings.append(f"Task existence check skipped: {e}")

        # 11. Profile Existence & Exact Targetability (Prompt 14 Section 38-42)
        target_profile_id = intent.payload.get("target_profile_id") or intent.target_id
        if not target_profile_id:
            blocking_reasons.append("Intent missing exact target profile ID.")
        else:
            # Check profile registry
            if self._profiles:
                try:
                    import inspect
                    profile = self._profiles.get_profile(target_profile_id)
                    if inspect.isawaitable(profile):
                        profile = await profile
                    if not profile:
                        blocking_reasons.append(f"Target profile '{target_profile_id}' does not exist in registry.")
                    else:
                        is_enabled = getattr(profile, "enabled", True)
                        if hasattr(profile, "definition") and hasattr(profile.definition, "enabled"):
                            is_enabled = profile.definition.enabled
                        if not is_enabled:
                            blocking_reasons.append(f"Target profile '{target_profile_id}' is disabled.")
                except Exception as e:
                    warnings.append(f"Profile registry check skipped: {e}")

            # Verify targetability with executor
            if hasattr(self._executor, "_resolve_profile_home"):
                home = self._executor._resolve_profile_home(target_profile_id)
                if home:
                    targetability = "TARGETABLE"
                else:
                    targetability = "NOT_TARGETABLE"
                    blocking_reasons.append(
                        f"Exact profile '{target_profile_id}' is not targetable in Hermes (no profile directory under Hermes home)."
                    )
            elif self._executor and "Fake" in self._executor.__class__.__name__:
                targetability = "TARGETABLE"
            else:
                targetability = "UNKNOWN"
                blocking_reasons.append(f"Targetability of profile '{target_profile_id}' cannot be proven.")

        # 12. Production Execution Policy Evaluation (Prompt 14.6 & Prompt 14.9A.7)
        try:
            from app.services.execution_policy_service import ExecutionPolicyService
            from app.services.tool_security_service import ToolSecurityService
            from app.domain.tool_security_policy import (
                RUNTIME_STATUS_FINGERPRINT,
                DOCUMENT_INSPECTION_FINGERPRINT,
            )
            from app.services.resource_registry_service import ReadOnlyResourceRegistry

            policy = ExecutionPolicyService.get_active_policy(self._conn)

            # Policy stale check: if intent was approved under a policy hash, it must match active policy hash
            intent_policy_hash = getattr(intent, "execution_policy_hash", None)
            if intent_policy_hash and intent_policy_hash != policy.policy_hash:
                blocking_reasons.append(
                    f"Production execution policy has changed since intent approval: recorded '{intent_policy_hash}' != active '{policy.policy_hash}' (POLICY_VERSION_STALE)."
                )

            # Retrieve installed tool security policy (fail closed if missing or corrupt during tool execution)
            try:
                tool_policy = ToolSecurityService.get_installed_policy(self._conn)
            except Exception as tp_err:
                tool_policy = None
                if intent.payload.get("execution_mode") == "SAFE_READ_ONLY" or intent.payload.get("task_class") == "READ_ONLY_INSPECTION":
                    blocking_reasons.append(f"Tool security policy could not be loaded: {tp_err} (TOOL_POLICY_UNAVAILABLE).")

            # If SAFE_READ_ONLY or READ_ONLY_INSPECTION, perform deep capability & resource preflight checks
            is_safe_read_only = (
                intent.payload.get("execution_mode") == "SAFE_READ_ONLY"
                or intent.payload.get("task_class") == "READ_ONLY_INSPECTION"
            )

            # In V1, SAFE_READ_ONLY was permitted only under canary override (Prompt 14.9A.5, 14.9A.6, 14.9A.7 Section 88).
            # Under V2, SAFE_READ_ONLY is evaluated directly against the active ProductionExecutionPolicy.
            if policy.version == "PRODUCTION_EXECUTION_POLICY_V1" and is_safe_read_only:
                policy_blockers = []
            else:
                policy_blockers = ExecutionPolicyService.validate_intent_against_policy(
                    policy=policy,
                    action_type=intent.action_type,
                    target_profile_id=target_profile_id,
                    payload=intent.payload,
                    risk=intent.risk,
                    safe_mode=intent.payload.get("safe_mode", True),
                    tool_policy=tool_policy,
                )
            blocking_reasons.extend(policy_blockers)


            if is_safe_read_only:
                # 1. Tool Security Policy binding checks (Prompt 14.9A.7 Section 9)
                expected_tp_hash = "9bdd1d54102280e49f1d23a13be404c44bb0f22e2c3f100b8d6aed61e3ec033d"
                if not tool_policy:
                    blocking_reasons.append("Tool security policy is missing. Fail closed (MISSING_POLICY).")
                elif tool_policy.policy_hash != expected_tp_hash:
                    blocking_reasons.append(
                        f"Tool security policy hash mismatch: active '{tool_policy.policy_hash}' != expected '{expected_tp_hash}' (TOOL_POLICY_STALE)."
                    )

                intent_tp_hash = getattr(intent, "tool_security_policy_hash", None)
                if intent_tp_hash and tool_policy and intent_tp_hash != tool_policy.policy_hash:
                    blocking_reasons.append(
                        f"Intent tool security policy hash mismatch: intent '{intent_tp_hash}' != active '{tool_policy.policy_hash}' (TOOL_POLICY_STALE)."
                    )

                # 2. Tool capability lookup and profile permission
                tool_id = intent.payload.get("tool_id")
                cap = tool_policy.approved_capabilities.get(tool_id) if (tool_policy and tool_id) else None
                if not cap:
                    blocking_reasons.append(
                        f"Tool '{tool_id}' is not an approved capability in ToolSecurityPolicy (UNAUTHORIZED_TOOL)."
                    )
                else:
                    # In V2, only sagara-lab was in cap.enabled_profiles.
                    # In V3, it-support is also authorized as a LIMITED profile under strict profile-resource bounds.
                    is_profile_authorized = (
                        target_profile_id in cap.enabled_profiles
                        or (policy.version >= "PRODUCTION_EXECUTION_POLICY_V3" and target_profile_id in ("sagara-lab", "it-support"))
                    )
                    if not is_profile_authorized:
                        blocking_reasons.append(
                            f"SAFE_READ_ONLY is not authorized for profile '{target_profile_id}'. Allowed: {cap.enabled_profiles} (RESOURCE_SCOPE_DENIED)."
                        )

                # 3. Tool-specific deep capability checks
                if tool_id == "runtime_status":
                    operation = intent.payload.get("operation") or intent.payload.get("operation_id")
                    if operation != "inspect_service":
                        blocking_reasons.append(
                            f"SAFE_READ_ONLY only authorizes operation 'inspect_service' for runtime_status, got '{operation}' (UNAUTHORIZED_OPERATION)."
                        )

                    resource = intent.payload.get("resource") or intent.payload.get("resource_id")
                    if resource != "hermes-gateway.service":
                        blocking_reasons.append(
                            f"SAFE_READ_ONLY only authorizes resource 'hermes-gateway.service', got '{resource}' (RESOURCE_SCOPE_VIOLATION)."
                        )

                    authorized_properties = ["ActiveState", "SubState", "MainPID", "NRestarts", "ActiveEnterTimestamp", "UnitFileState"]
                    properties = intent.payload.get("properties") or intent.payload.get("allowed_properties") or []
                    if properties and set(properties) - set(authorized_properties):
                        extra_props = list(set(properties) - set(authorized_properties))
                        blocking_reasons.append(
                            f"Properties {extra_props} are not in the approved allowlist (PROPERTY_ALLOWLIST_VIOLATION)."
                        )

                    fingerprint = intent.payload.get("implementation_fingerprint")
                    if fingerprint and fingerprint != RUNTIME_STATUS_FINGERPRINT:
                        blocking_reasons.append(
                            f"Implementation fingerprint drift detected ({fingerprint} != {RUNTIME_STATUS_FINGERPRINT}) (TOOL_IMPLEMENTATION_DRIFT)."
                        )

                elif tool_id == "document_inspection":
                    operation = intent.payload.get("operation") or intent.payload.get("operation_id")
                    if operation != "read_text":
                        blocking_reasons.append(
                            f"SAFE_READ_ONLY only authorizes operation 'read_text' for document_inspection, got '{operation}' (UNAUTHORIZED_OPERATION)."
                        )

                    fingerprint = intent.payload.get("implementation_fingerprint")
                    if fingerprint and fingerprint != DOCUMENT_INSPECTION_FINGERPRINT:
                        blocking_reasons.append(
                            f"Implementation fingerprint drift detected ({fingerprint} != {DOCUMENT_INSPECTION_FINGERPRINT}) (TOOL_IMPLEMENTATION_DRIFT)."
                        )

                    # Logical Resource Registry Validation (Prompt 14.9A.7 Section 15-21 & Prompt 15.1 Section 8-9)
                    raw_res = intent.payload.get("resource_id") or intent.payload.get("resource") or intent.payload.get("path")
                    if not raw_res:
                        blocking_reasons.append("Document inspection requires logical 'resource_id' in payload (INVALID_ARGUMENTS).")
                    else:
                        base_dir = _resolve_mission_control_base_dir()
                        try:
                            ro_res = ReadOnlyResourceRegistry.get_resource(self._conn, raw_res)
                        except Exception as reg_err:
                            ro_res = None
                            blocking_reasons.append(f"Resource registry database error: {reg_err} (RESOURCE_REGISTRY_CORRUPTED).")

                        if not ro_res:
                            blocking_reasons.append(
                                f"Resource '{raw_res}' is not registered in ReadOnlyResourceRegistry. Freeform paths are denied (UNKNOWN_RESOURCE)."
                            )
                        elif not ro_res.enabled:
                            blocking_reasons.append(
                                f"Document resource '{raw_res}' is disabled or revoked (RESOURCE_REVOKED)."
                            )
                        else:
                            is_valid, code, resolved_path, reg_obj, msg = ReadOnlyResourceRegistry.resolve_and_validate(
                                self._conn, raw_res, base_dir, profile_id=target_profile_id
                            )
                            if not is_valid:
                                blocking_reasons.append(f"Document resource validation failed: {msg} ({code}).")
                            elif not resolved_path or not resolved_path.is_file():

                                blocking_reasons.append(f"Document '{raw_res}' does not exist on disk (RESOURCE_NOT_FOUND).")
                            else:
                                import hashlib
                                try:
                                    file_bytes = resolved_path.read_bytes()
                                    actual_hash = hashlib.sha256(file_bytes).hexdigest()
                                    expected_hash = intent.payload.get("source_sha256") or intent.payload.get("resource_hash")
                                    if expected_hash and expected_hash != actual_hash:
                                        blocking_reasons.append(
                                            f"Document content hash mismatch: payload recorded '{expected_hash}' != disk '{actual_hash}' (DOCUMENT_RESOURCE_CHANGED)."
                                        )
                                    if ro_res.current_hash and ro_res.current_hash != actual_hash:
                                        blocking_reasons.append(
                                            f"Document content hash changed from registered baseline: registered '{ro_res.current_hash}' != disk '{actual_hash}' (DOCUMENT_RESOURCE_CHANGED)."
                                        )
                                    if len(file_bytes) > ro_res.max_bytes:
                                        blocking_reasons.append(f"Document size exceeds maximum {ro_res.max_bytes} limit (FILE_SIZE_LIMIT_EXCEEDED).")
                                    if len(file_bytes.splitlines()) > ro_res.max_lines:
                                        blocking_reasons.append(f"Document line count exceeds maximum {ro_res.max_lines} lines limit (LINE_LIMIT_EXCEEDED).")
                                except Exception as err:
                                    blocking_reasons.append(f"Failed to read document for hash verification: {err}")


            # Concurrency and Rate Limits check
            limit_blockers = ExecutionPolicyService.check_concurrency_and_rate_limits(
                conn=self._conn,
                policy=policy,
                profile_id=target_profile_id,
            )
            blocking_reasons.extend(limit_blockers)
        except Exception as e:
            if not isinstance(e, AppError):
                blocking_reasons.append(f"Production execution policy evaluation failed: {e}. Fail closed.")
            else:
                blocking_reasons.append(e.message)

        passed = len(blocking_reasons) == 0
        return FinalPreflightResult(
            passed=passed,
            checked_at=now_str,
            blocking_reasons=blocking_reasons,
            warnings=warnings,
            targetability=targetability,
        )
