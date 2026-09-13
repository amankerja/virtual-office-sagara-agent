from datetime import datetime, timezone
import sqlite3
from typing import Optional, Dict, Any
from app.domain.execution import (
    ExecutionAuthorization,
    ExecutionAttempt,
    ExecutionReceipt,
    ExecutionWindow,
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
        cursor = self._conn.cursor()
        cursor.execute("PRAGMA table_info(execution_receipts);")
        cols = [r[1] if isinstance(r, (list, tuple)) else r["name"] for r in cursor.fetchall()]

        if "tool_security_policy_version" in cols:
            self._conn.execute(
                """
                INSERT INTO execution_receipts (
                    receipt_id, attempt_id, intent_id, task_id, profile_id,
                    hermes_session_id, submitted_at, acknowledged_at, executor_type,
                    executor_version, correlation_id, result, receipt_hash, created_at,
                    execution_policy_version, execution_policy_hash, execution_mode,
                    tool_security_policy_version, tool_security_policy_hash, tool_executions_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
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
                    receipt.execution_policy_version,
                    receipt.execution_policy_hash,
                    receipt.execution_mode,
                    receipt.tool_security_policy_version,
                    receipt.tool_security_policy_hash,
                    receipt.tool_executions_count,
                ),
            )
        elif "execution_policy_version" in cols:
            self._conn.execute(
                """
                INSERT INTO execution_receipts (
                    receipt_id, attempt_id, intent_id, task_id, profile_id,
                    hermes_session_id, submitted_at, acknowledged_at, executor_type,
                    executor_version, correlation_id, result, receipt_hash, created_at,
                    execution_policy_version, execution_policy_hash, execution_mode
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
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
                    receipt.execution_policy_version,
                    receipt.execution_policy_hash,
                    receipt.execution_mode,
                ),
            )
        else:
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

    def _row_to_receipt(self, row: Any) -> ExecutionReceipt:
        has_pol_ver = "execution_policy_version" in row.keys() if hasattr(row, "keys") else False
        has_pol_hash = "execution_policy_hash" in row.keys() if hasattr(row, "keys") else False
        has_mode = "execution_mode" in row.keys() if hasattr(row, "keys") else False
        has_tp_ver = "tool_security_policy_version" in row.keys() if hasattr(row, "keys") else False
        has_tp_hash = "tool_security_policy_hash" in row.keys() if hasattr(row, "keys") else False
        has_tool_cnt = "tool_executions_count" in row.keys() if hasattr(row, "keys") else False

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
            execution_policy_version=row["execution_policy_version"] if has_pol_ver else None,
            execution_policy_hash=row["execution_policy_hash"] if has_pol_hash else None,
            execution_mode=row["execution_mode"] if has_mode else None,
            tool_security_policy_version=row["tool_security_policy_version"] if has_tp_ver else None,
            tool_security_policy_hash=row["tool_security_policy_hash"] if has_tp_hash else None,
            tool_executions_count=row["tool_executions_count"] if has_tool_cnt and row["tool_executions_count"] is not None else 0,
        )

    def get_receipt(self, receipt_id: str) -> Optional[ExecutionReceipt]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM execution_receipts WHERE receipt_id = ?;", (receipt_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return self._row_to_receipt(row)

    def get_receipt_by_intent(self, intent_id: str) -> Optional[ExecutionReceipt]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM execution_receipts WHERE intent_id = ? LIMIT 1;", (intent_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return self._row_to_receipt(row)

    def get_receipt_by_task(self, task_id: str) -> Optional[ExecutionReceipt]:
        cursor = self._conn.cursor()
        cursor.execute("SELECT * FROM execution_receipts WHERE task_id = ? ORDER BY created_at DESC LIMIT 1;", (task_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return self._row_to_receipt(row)

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

    # --- Execution Windows (Prompt 14.4 Section 54-56) ---
    def create_execution_window(self, window: ExecutionWindow) -> None:
        """Persist a new bounded execution window."""
        created_at = window.created_at or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        self._conn.execute(
            """
            INSERT INTO execution_windows (
                id, lock_name, opened_by, opened_at, expires_at,
                max_executions, executions_consumed, reason, state,
                closed_at, closed_by, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                window.id,
                window.lock_name,
                window.opened_by,
                window.opened_at,
                window.expires_at,
                window.max_executions,
                window.executions_consumed,
                window.reason,
                window.state,
                window.closed_at,
                window.closed_by,
                created_at,
            ),
        )

    def get_active_execution_window(self, lock_name: str = "global_dispatch") -> Optional[ExecutionWindow]:
        """
        Get the currently active OPEN execution window for the lock.
        Orders by opened_at DESC to retrieve the latest window.
        """
        cursor = self._conn.cursor()
        cursor.execute(
            """
            SELECT * FROM execution_windows
            WHERE lock_name = ? AND state = 'OPEN'
            ORDER BY opened_at DESC LIMIT 1;
            """,
            (lock_name,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return ExecutionWindow(
            id=row["id"],
            lock_name=row["lock_name"],
            opened_by=row["opened_by"],
            opened_at=row["opened_at"],
            expires_at=row["expires_at"],
            max_executions=row["max_executions"],
            executions_consumed=row["executions_consumed"],
            reason=row["reason"],
            state=row["state"],
            closed_at=row["closed_at"],
            closed_by=row["closed_by"],
            created_at=row["created_at"],
        )

    def get_latest_execution_window(self, lock_name: str = "global_dispatch") -> Optional[ExecutionWindow]:
        """
        Get the latest execution window for the lock regardless of state.
        """
        cursor = self._conn.cursor()
        cursor.execute(
            """
            SELECT * FROM execution_windows
            WHERE lock_name = ?
            ORDER BY opened_at DESC LIMIT 1;
            """,
            (lock_name,),
        )
        row = cursor.fetchone()
        if not row:
            return None
        return ExecutionWindow(
            id=row["id"],
            lock_name=row["lock_name"],
            opened_by=row["opened_by"],
            opened_at=row["opened_at"],
            expires_at=row["expires_at"],
            max_executions=row["max_executions"],
            executions_consumed=row["executions_consumed"],
            reason=row["reason"],
            state=row["state"],
            closed_at=row["closed_at"],
            closed_by=row["closed_by"],
            created_at=row["created_at"],
        )


    def claim_execution_slot(self, window_id: str, now_iso: str) -> bool:
        """
        Atomically claim one execution slot from the execution window (Prompt 14.4 Section 95-96).
        Ensures concurrency safety: only succeeds if state is OPEN, executions_consumed < max_executions,
        and window has not expired. Transitions state to EXHAUSTED if max_executions reached.
        """
        cursor = self._conn.cursor()
        cursor.execute(
            """
            UPDATE execution_windows
            SET executions_consumed = executions_consumed + 1,
                state = CASE WHEN executions_consumed + 1 >= max_executions THEN 'EXHAUSTED' ELSE 'OPEN' END
            WHERE id = ? AND state = 'OPEN' AND executions_consumed < max_executions AND expires_at > ?;
            """,
            (window_id, now_iso),
        )
        return cursor.rowcount == 1

    def close_active_windows(
        self,
        lock_name: str = "global_dispatch",
        closed_by: str = "operator:admin",
        closed_at: Optional[str] = None,
    ) -> int:
        """Close all OPEN windows for a lock (used during emergency lock or relock)."""
        if not closed_at:
            closed_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        cursor = self._conn.cursor()
        cursor.execute(
            """
            UPDATE execution_windows
            SET state = 'CLOSED', closed_at = ?, closed_by = ?
            WHERE lock_name = ? AND state = 'OPEN';
            """,
            (closed_at, closed_by, lock_name),
        )
        return cursor.rowcount

    def expire_stale_windows(self, now_iso: str) -> int:
        """Auto-expire windows that have passed their TTL."""
        cursor = self._conn.cursor()
        cursor.execute(
            """
            UPDATE execution_windows
            SET state = 'EXPIRED'
            WHERE state = 'OPEN' AND expires_at <= ?;
            """,
            (now_iso,),
        )
        return cursor.rowcount

