import secrets
import sqlite3
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from app.api.errors import AppError
from app.domain.execution import (
    ExecutionAttempt,
    ExecutionReceipt,
    compute_receipt_hash,
)
from app.repositories.sqlite.audit_repo import AuditSqliteRepository
from app.repositories.sqlite.execution_repo import ExecutionSqliteRepository


class ExecutionReconciliationService:
    """
    Reconciliation Service for ambiguous or interrupted execution attempts (Prompt 14 Section 78-81).
    Strictly forbids heuristic guessing (e.g. nearest timestamp, similar title).
    Requires direct authoritative evidence (explicit Hermes session reference or correlation metadata).
    """

    def __init__(self, conn: sqlite3.Connection, hermes_runtime_reader=None):
        self._conn = conn
        self._hermes = hermes_runtime_reader

    async def reconcile_attempt(
        self,
        attempt_id: str,
        actor_id: str = "system:reconciler",
        authoritative_session_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Attempt reconciliation for an attempt in OUTCOME_UNKNOWN or SUBMITTING state.
        """
        exec_repo = ExecutionSqliteRepository(self._conn)
        audit_repo = AuditSqliteRepository(self._conn)

        attempt = exec_repo.get_attempt(attempt_id)
        if not attempt:
            raise AppError(status_code=404, code="EXECUTION_ATTEMPT_NOT_FOUND", message=f"Attempt '{attempt_id}' not found.")

        # If already acknowledged or reconciled, return existing receipt
        if attempt.state in ("ACKNOWLEDGED", "RECONCILED"):
            receipt = exec_repo.get_receipt_by_intent(attempt.intent_id)
            return {
                "attempt_id": attempt_id,
                "state": attempt.state,
                "reconciled": True,
                "receipt": receipt.model_dump() if receipt else None,
                "detail": "Attempt already reconciled.",
            }

        # Look for direct correlation evidence
        session_id = authoritative_session_id or attempt.session_id

        # If runtime reader provided, check if session exists authoritatively
        if not session_id and self._hermes and hasattr(self._hermes, "find_session_by_correlation"):
            session_id = await self._hermes.find_session_by_correlation(
                correlation_id=attempt.correlation_id,
                task_id=attempt.task_id,
            )

        now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        if not session_id:
            # Fails closed: remains OUTCOME_UNKNOWN (Prompt 14 Section 81)
            return {
                "attempt_id": attempt_id,
                "state": attempt.state,
                "reconciled": False,
                "receipt": None,
                "detail": "Direct correlation evidence unavailable. Attempt remains OUTCOME_UNKNOWN. Automatic retry is forbidden.",
            }

        # Direct evidence found: reconcile atomically
        self._conn.execute("BEGIN IMMEDIATE;")
        try:
            receipt_id = f"rcpt-rec-{secrets.token_hex(6)}"
            rec_hash = compute_receipt_hash(
                receipt_id=receipt_id,
                attempt_id=attempt_id,
                intent_id=attempt.intent_id,
                task_id=attempt.task_id,
                profile_id=attempt.profile_id,
                hermes_session_id=session_id,
                submitted_at=attempt.submitted_at or attempt.created_at,
                acknowledged_at=now_str,
                executor_type="ReconciledFromDirectEvidence",
                correlation_id=attempt.correlation_id,
                result="RECONCILED_SUCCESS",
            )

            receipt = ExecutionReceipt(
                receipt_id=receipt_id,
                attempt_id=attempt_id,
                intent_id=attempt.intent_id,
                task_id=attempt.task_id,
                profile_id=attempt.profile_id,
                hermes_session_id=session_id,
                submitted_at=attempt.submitted_at or attempt.created_at,
                acknowledged_at=now_str,
                executor_type="ReconciledFromDirectEvidence",
                executor_version="reconciler-1.0",
                correlation_id=attempt.correlation_id,
                result="RECONCILED_SUCCESS",
                receipt_hash=rec_hash,
                created_at=now_str,
            )

            exec_repo.save_receipt(receipt)
            exec_repo.save_correlation(
                task_id=attempt.task_id,
                intent_id=attempt.intent_id,
                execution_attempt_id=attempt_id,
                hermes_session_id=session_id,
                correlation_id=attempt.correlation_id,
                created_at=now_str,
            )
            exec_repo.update_attempt_state(
                attempt_id=attempt_id,
                state="RECONCILED",
                acknowledged_at=now_str,
                completed_at=now_str,
                session_id=session_id,
            )

            from app.repositories.sqlite.audit_repo import append_audit_entry_to_conn
            append_audit_entry_to_conn(
                conn=self._conn,
                event_id=f"aud-{secrets.token_hex(8)}",
                timestamp=now_str,
                actor_type="SYSTEM",
                actor_id=actor_id,
                actor_label="Execution Reconciler",
                action="execution.reconciled",
                resource_type="TASK",
                resource_id=attempt.task_id,
                resource_label=f"Task {attempt.task_id}",
                outcome="SUCCESS",
                reason=f"Attempt {attempt_id} reconciled with direct Hermes session '{session_id}'",
                correlation_id=attempt.correlation_id,
                intent_id=attempt.intent_id,
                payload_hash=None,
                revision=1,
            )

            self._conn.execute("COMMIT;")
            return {
                "attempt_id": attempt_id,
                "state": "RECONCILED",
                "reconciled": True,
                "receipt": receipt.model_dump(),
                "detail": f"Direct session correlation established with Hermes session '{session_id}'.",
            }
        except Exception as e:
            self._conn.execute("ROLLBACK;")
            raise AppError(status_code=500, code="RECONCILIATION_FAILED", message=f"Reconciliation error: {e}")
