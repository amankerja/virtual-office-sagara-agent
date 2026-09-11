from datetime import datetime, timezone
import sqlite3
from typing import Optional, Dict, Any
from app.domain.execution import (
    ExecutionAuthorization,
    ExecutionAttempt,
    ExecutionReceipt,
)


class ExecutionSqliteRepository:
    """SQLite repository for execution authorizations, attempts, receipts, correlations, and locks."""

    def __init__(self, conn: sqlite3.Connection):
        self._conn = conn

    # --- Authorizations ---
    def save_authorization(self, auth: ExecutionAuthorization) -> None:
        self._conn.execute(
            """
            INSERT INTO execution_authorizations (
                id, intent_id, payload_hash, profile_id, task_id, task_revision,
                issued_to, issued_at, expires_at, nonce, state, consumed_at, execution_attempt_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                auth.id,
                auth.intent_id,
                auth.payload_hash,
                auth.profile_id,
                auth.task_id,
                auth.task_revision,
                auth.issued_to,
                auth.issued_at,
                auth.expires_at,
                auth.nonce,
                auth.state,
                auth.consumed_at,
                auth.execution_attempt_id,
            ),
        )

    def get_authorization(self, auth_id: str) -> Optional[ExecutionAuthorization]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM execution_authorizations WHERE id = ?;", (auth_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return ExecutionAuthorization(
            id=row["id"],
            intent_id=row["intent_id"],
            payload_hash=row["payload_hash"],
            profile_id=row["profile_id"],
            task_id=row["task_id"],
            task_revision=row["task_revision"],
            issued_to=row["issued_to"],
            issued_at=row["issued_at"],
            expires_at=row["expires_at"],
            nonce=row["nonce"],
            state=row["state"],
            consumed_at=row["consumed_at"],
            execution_attempt_id=row["execution_attempt_id"],
        )

    def get_active_authorization_by_intent(self, intent_id: str) -> Optional[ExecutionAuthorization]:
        cursor = self._conn.cursor()
        cursor.execute(
            "SELECT * FROM execution_authorizations WHERE intent_id = ? ORDER BY issued_at DESC LIMIT 1;",
            (intent_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return ExecutionAuthorization(
            id=row["id"],
            intent_id=row["intent_id"],
            payload_hash=row["payload_hash"],
            profile_id=row["profile_id"],
            task_id=row["task_id"],
            task_revision=row["task_revision"],
            issued_to=row["issued_to"],
            issued_at=row["issued_at"],
            expires_at=row["expires_at"],
            nonce=row["nonce"],
            state=row["state"],
            consumed_at=row["consumed_at"],
            execution_attempt_id=row["execution_attempt_id"],
        )

    def claim_authorization(
        self,
        auth_id: str,
        attempt_id: str,
        claimed_at: str,
    ) -> bool:
        """
        Atomic transition: ISSUED -> CLAIMED.
        Prompt 14 Section 50: Concurrency safety — only one execute request can claim the token.
        """
        cursor = self._conn.cursor()
        cursor.execute(
            """
            UPDATE execution_authorizations
            SET state = 'CLAIMED', execution_attempt_id = ?, consumed_at = ?
            WHERE id = ? AND state = 'ISSUED';
            """,
            (attempt_id, claimed_at, auth_id),
        )
        return cursor.rowcount == 1

    def consume_authorization(self, auth_id: str, consumed_at: str) -> bool:
        cursor = self._conn.cursor()
        cursor.execute(
            """
            UPDATE execution_authorizations
            SET state = 'CONSUMED', consumed_at = ?
            WHERE id = ? AND state = 'CLAIMED';
            """,
            (consumed_at, auth_id),
        )
        return cursor.rowcount == 1

    # --- Attempts ---
    def save_attempt(self, attempt: ExecutionAttempt) -> None:
        self._conn.execute(
            """
            INSERT INTO execution_attempts (
                id, intent_id, authorization_id, task_id, profile_id, correlation_id,
                state, created_at, claimed_at, submitted_at, acknowledged_at, completed_at,
                session_id, error_code
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                attempt.id,
                attempt.intent_id,
                attempt.authorization_id,
                attempt.task_id,
                attempt.profile_id,
                attempt.correlation_id,
                attempt.state,
                attempt.created_at,
                attempt.claimed_at,
                attempt.submitted_at,
                attempt.acknowledged_at,
                attempt.completed_at,
                attempt.session_id,
                attempt.error_code,
            ),
        )

    def update_attempt_state(
        self,
        attempt_id: str,
        state: str,
        submitted_at: Optional[str] = None,
        acknowledged_at: Optional[str] = None,
        completed_at: Optional[str] = None,
        session_id: Optional[str] = None,
        error_code: Optional[str] = None,
    ) -> None:
        updates = ["state = ?"]
        params = [state]
        if submitted_at:
            updates.append("submitted_at = ?")
            params.append(submitted_at)
        if acknowledged_at:
            updates.append("acknowledged_at = ?")
            params.append(acknowledged_at)
        if completed_at:
            updates.append("completed_at = ?")
            params.append(completed_at)
        if session_id:
            updates.append("session_id = ?")
            params.append(session_id)
        if error_code is not None:
            updates.append("error_code = ?")
            params.append(error_code)

        params.append(attempt_id)
        query = f"UPDATE execution_attempts SET {', '.join(updates)} WHERE id = ?;"
        self._conn.execute(query, tuple(params))

    def get_attempt(self, attempt_id: str) -> Optional[ExecutionAttempt]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM execution_attempts WHERE id = ?;", (attempt_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return ExecutionAttempt(
            id=row["id"],
            intent_id=row["intent_id"],
            authorization_id=row["authorization_id"],
            task_id=row["task_id"],
            profile_id=row["profile_id"],
            correlation_id=row["correlation_id"],
            state=row["state"],
            created_at=row["created_at"],
            claimed_at=row["claimed_at"],
            submitted_at=row["submitted_at"],
            acknowledged_at=row["acknowledged_at"],
            completed_at=row["completed_at"],
            session_id=row["session_id"],
            error_code=row["error_code"],
        )

    # --- Receipts ---
    def save_receipt(self, receipt: ExecutionReceipt) -> None:
        self._conn.execute(
            """
            INSERT INTO execution_receipts (
                receipt_id, attempt_id, intent_id, task_id, profile_id,
                hermes_session_id, submitted_at, acknowledged_at, executor_type,
                executor_version, correlation_id, result, receipt_hash, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                receipt.receipt_id,
                receipt.attempt_id,
                receipt.intent_id,
                receipt.task_id,
                receipt.profile_id,
                receipt.hermes_session_id,
                receipt.submitted_at,
                receipt.acknowledged_at,
                receipt.executor_type,
                receipt.executor_version,
                receipt.correlation_id,
                receipt.result,
                receipt.receipt_hash,
                receipt.created_at,
            ),
        )

    def get_receipt(self, receipt_id: str) -> Optional[ExecutionReceipt]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM execution_receipts WHERE receipt_id = ?;", (receipt_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return ExecutionReceipt(
            receipt_id=row["receipt_id"],
            attempt_id=row["attempt_id"],
            intent_id=row["intent_id"],
            task_id=row["task_id"],
            profile_id=row["profile_id"],
            hermes_session_id=row["hermes_session_id"],
            submitted_at=row["submitted_at"],
            acknowledged_at=row["acknowledged_at"],
            executor_type=row["executor_type"],
            executor_version=row["executor_version"],
            correlation_id=row["correlation_id"],
            result=row["result"],
            receipt_hash=row["receipt_hash"],
            created_at=row["created_at"],
        )

    def get_receipt_by_intent(self, intent_id: str) -> Optional[ExecutionReceipt]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM execution_receipts WHERE intent_id = ? LIMIT 1;", (intent_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return ExecutionReceipt(
            receipt_id=row["receipt_id"],
            attempt_id=row["attempt_id"],
            intent_id=row["intent_id"],
            task_id=row["task_id"],
            profile_id=row["profile_id"],
            hermes_session_id=row["hermes_session_id"],
            submitted_at=row["submitted_at"],
            acknowledged_at=row["acknowledged_at"],
            executor_type=row["executor_type"],
            executor_version=row["executor_version"],
            correlation_id=row["correlation_id"],
            result=row["result"],
            receipt_hash=row["receipt_hash"],
            created_at=row["created_at"],
        )

    def get_receipt_by_task(self, task_id: str) -> Optional[ExecutionReceipt]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM execution_receipts WHERE task_id = ? ORDER BY created_at DESC LIMIT 1;", (task_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return ExecutionReceipt(
            receipt_id=row["receipt_id"],
            attempt_id=row["attempt_id"],
            intent_id=row["intent_id"],
            task_id=row["task_id"],
            profile_id=row["profile_id"],
            hermes_session_id=row["hermes_session_id"],
            submitted_at=row["submitted_at"],
            acknowledged_at=row["acknowledged_at"],
            executor_type=row["executor_type"],
            executor_version=row["executor_version"],
            correlation_id=row["correlation_id"],
            result=row["result"],
            receipt_hash=row["receipt_hash"],
            created_at=row["created_at"],
        )

    # --- Correlations ---
    def save_correlation(
        self,
        task_id: str,
        intent_id: str,
        execution_attempt_id: str,
        hermes_session_id: str,
        correlation_id: str,
        created_at: str,
    ) -> None:
        self._conn.execute(
            """
            INSERT OR REPLACE INTO task_execution_correlations (
                task_id, intent_id, execution_attempt_id, hermes_session_id, correlation_id, created_at
            ) VALUES (?, ?, ?, ?, ?, ?);
            """,
            (task_id, intent_id, execution_attempt_id, hermes_session_id, correlation_id, created_at),
        )

    def get_correlation_by_task(self, task_id: str) -> Optional[Dict[str, Any]]:
        cursor = self._conn.cursor()
        cursor.execute(
            "SELECT * FROM task_execution_correlations WHERE task_id = ? LIMIT 1;",
            (task_id,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return dict(row)

    # --- Execution Locks ---
    def get_execution_lock(self, lock_name: str = "global_dispatch") -> str:
        """Read current execution lock status. Returns 'LOCKED' on missing row. Raises on DB error."""
        cursor = self._conn.cursor()
        cursor.execute("SELECT status FROM execution_locks WHERE lock_name = ?;", (lock_name,))
        row = cursor.fetchone()
        if not row:
            return "LOCKED"
        return str(row["status"]).upper()

    def set_execution_lock(
        self,
        lock_name: str,
        status: str,
        updated_by: str = "operator:admin",
        updated_at: Optional[str] = None,
        reason: Optional[str] = None,
    ) -> None:
        if not updated_at:
            updated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        self._conn.execute(
            """
            INSERT INTO execution_locks (lock_name, status, updated_at, updated_by, reason)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(lock_name) DO UPDATE SET
                status = excluded.status,
                updated_at = excluded.updated_at,
                updated_by = excluded.updated_by,
                reason = excluded.reason;
            """,
            (lock_name, status.upper(), updated_at, updated_by, reason),
        )
