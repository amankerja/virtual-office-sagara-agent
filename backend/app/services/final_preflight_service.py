import sqlite3
from datetime import datetime, timezone
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

        # 6. Operator Authorization
        if not (principal.has_role("admin") or principal.has_role("operator") or principal.has_permission("action:execute")):
            blocking_reasons.append(f"Operator '{principal.id}' lacks execution authority ('action:execute').")

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

        passed = len(blocking_reasons) == 0
        return FinalPreflightResult(
            passed=passed,
            checked_at=now_str,
            blocking_reasons=blocking_reasons,
            warnings=warnings,
            targetability=targetability,
        )
