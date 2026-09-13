from datetime import datetime, timedelta, timezone
import secrets
import sqlite3
from typing import Optional, Dict, Any, Tuple
from pydantic import BaseModel

from app.api.errors import AppError
from app.config import settings
from app.domain.execution import ExecutionWindow
from app.domain.principal import (
    OperatorPrincipal,
    PERMISSION_EXECUTION_LOCK_MANAGE,
)
from app.repositories.sqlite.audit_repo import append_audit_entry_to_conn
from app.repositories.sqlite.execution_repo import ExecutionSqliteRepository
from app.services.audit_verifier import verify_audit_chain

REQUIRED_UNLOCK_CONFIRMATION_PHRASE = "UNLOCK TASK EXECUTION"
DEFAULT_UNLOCK_TTL_MINUTES = 15
DEFAULT_MAX_EXECUTIONS = 1


class ExecutionLockStatus(BaseModel):
    is_locked: bool
    status: str  # "LOCKED", "UNLOCKED"
    reason: str
    active_window: Optional[Dict[str, Any]] = None
    environment_enabled: bool
    live_canary_enabled: bool


class ExecutionLockService:
    """
    Controlled Kill-Switch and Bounded Execution Window Management (Prompt 14.4 Section 44-71).
    - Persistent default: LOCKED
    - High-risk unlock requires: permission, reason, typed confirmation phrase, audit integrity
    - Bounded execution window: max_executions (canary budget=1), time-to-live auto-relock
    - Emergency lock: immediate closure and persistent re-lock
    - All state transitions logged to tamper-evident audit ledger
    """

    @classmethod
    def get_effective_status(
        cls,
        conn: sqlite3.Connection,
        now_dt: Optional[datetime] = None,
    ) -> Tuple[bool, str, Optional[ExecutionWindow]]:
        """
        Evaluate effective execution gate status with auto-relock and budget checks.
        Returns: (is_locked, reason, active_window)
        """
        if now_dt is None:
            now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat().replace("+00:00", "Z")

        # 1. Environment Gate
        if not settings.execution_enabled:
            return True, "Environment execution flag 'MISSION_CONTROL_EXECUTION_ENABLED' is disabled (safety gate locked).", None

        # 2. Persistent Database Lock
        try:
            repo = ExecutionSqliteRepository(conn)
            lock_status = repo.get_execution_lock("global_dispatch")
            if lock_status != "UNLOCKED":
                return True, f"Persistent control plane execution lock is {lock_status}.", None

            # 3. Active Bounded Execution Window
            window = repo.get_latest_execution_window("global_dispatch")
            if window:
                if window.state == "EXHAUSTED" or window.executions_consumed >= window.max_executions:
                    return True, f"Execution window '{window.id}' budget exhausted ({window.executions_consumed}/{window.max_executions}).", window
                if window.state in ("CLOSED", "EXPIRED"):
                    return True, f"Execution window '{window.id}' is {window.state.lower()}.", window

                # Check expiration (Rule #53: Auto-relock)
                expires_dt = datetime.fromisoformat(window.expires_at.replace("Z", "+00:00"))
                if now_dt >= expires_dt:
                    repo.expire_stale_windows(now_iso)
                    return True, f"Active execution window '{window.id}' expired at {window.expires_at}.", window

                return False, "Execution gate is UNLOCKED with active execution window.", window

            return False, "Execution gate is UNLOCKED.", None


        except Exception as err:
            return True, f"Control plane database lock inspection failed ({err}); failing closed (LOCKED).", None

    @classmethod
    def inspect(
        cls,
        conn: sqlite3.Connection,
        now_dt: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Diagnostic state of execution lock, active window, and environment flags."""
        is_locked, reason, window = cls.get_effective_status(conn, now_dt=now_dt)
        db_lock = "UNKNOWN"
        try:
            repo = ExecutionSqliteRepository(conn)
            db_lock = repo.get_execution_lock("global_dispatch")
        except Exception:
            pass

        return {
            "is_locked": is_locked,
            "status": db_lock,
            "persistent_lock_status": db_lock,
            "reason": reason,
            "active_window": window.model_dump() if window else None,
            "environment_enabled": settings.execution_enabled,
            "live_canary_enabled": settings.live_canary_enabled,
        }


    @classmethod
    def request_unlock(
        cls,
        conn: sqlite3.Connection,
        principal: OperatorPrincipal,
        reason: str,
        ttl_minutes: int = DEFAULT_UNLOCK_TTL_MINUTES,
        max_executions: int = DEFAULT_MAX_EXECUTIONS,
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Request unlock challenge and validate prerequisites."""
        if not principal.has_permission(PERMISSION_EXECUTION_LOCK_MANAGE):
            raise AppError(
                status_code=403,
                code="AUTHORIZATION_DENIED",
                message=f"Operator '{principal.id}' lacks execution lock management authority ('{PERMISSION_EXECUTION_LOCK_MANAGE}').",
            )

        if not reason or not reason.strip():
            raise AppError(
                status_code=400,
                code="REASON_REQUIRED",
                message="Operator-supplied reason is required for unlocking execution.",
            )

        # Audit integrity check (Rule #69)
        audit_valid, audit_detail = verify_audit_chain(conn)
        if not audit_valid:
            raise AppError(
                status_code=403,
                code="AUDIT_INTEGRITY_COMPROMISED",
                message=f"Unlock denied: audit ledger integrity verification failed: {audit_detail}.",
            )

        corr_id = correlation_id or f"corr-unlock-req-{secrets.token_hex(6)}"
        now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # Record audit event: unlock requested
        append_audit_entry_to_conn(
            conn=conn,
            event_id=f"aud-{secrets.token_hex(8)}",
            timestamp=now_iso,
            actor_type="USER",
            actor_id=principal.id,
            actor_label=principal.display_name or principal.id,
            action="execution.unlock.requested",
            resource_type="SYSTEM",
            resource_id="execution_lock:global_dispatch",
            resource_label="Global Dispatch Lock",
            outcome="SUCCESS",
            reason=reason.strip(),
            correlation_id=corr_id,
            revision=1,
        )

        return {
            "required_confirmation_phrase": REQUIRED_UNLOCK_CONFIRMATION_PHRASE,
            "default_ttl_minutes": ttl_minutes,
            "max_executions": max_executions,
            "correlation_id": corr_id,
            "message": "Unlock request verified. Submit confirmation phrase to open bounded execution window.",
        }

    @classmethod
    def unlock(
        cls,
        conn: sqlite3.Connection,
        principal: OperatorPrincipal,
        confirmation_phrase: str,
        reason: str,
        ttl_minutes: int = DEFAULT_UNLOCK_TTL_MINUTES,
        max_executions: int = DEFAULT_MAX_EXECUTIONS,
        correlation_id: Optional[str] = None,
        now_dt: Optional[datetime] = None,
        realtime_service=None,
    ) -> Dict[str, Any]:
        """
        Unlock execution with bounded window and typed confirmation phrase (Prompt 14.4 Section 49-56).
        """
        if not principal.has_permission(PERMISSION_EXECUTION_LOCK_MANAGE):
            raise AppError(
                status_code=403,
                code="AUTHORIZATION_DENIED",
                message=f"Operator '{principal.id}' lacks execution lock management authority ('{PERMISSION_EXECUTION_LOCK_MANAGE}').",
            )

        if not confirmation_phrase or confirmation_phrase.strip() != REQUIRED_UNLOCK_CONFIRMATION_PHRASE:
            raise AppError(
                status_code=400,
                code="INVALID_CONFIRMATION_PHRASE",
                message=f"Invalid confirmation phrase. Exact required phrase: '{REQUIRED_UNLOCK_CONFIRMATION_PHRASE}'.",
            )

        if not reason or not reason.strip():
            raise AppError(
                status_code=400,
                code="REASON_REQUIRED",
                message="Operator-supplied reason is required for unlocking execution.",
            )

        # Audit ledger integrity check (Prompt 14.4 Section 69, 99)
        audit_valid, audit_detail = verify_audit_chain(conn)
        if not audit_valid:
            raise AppError(
                status_code=403,
                code="AUDIT_INTEGRITY_COMPROMISED",
                message=f"Unlock denied: audit ledger integrity verification failed: {audit_detail}.",
            )

        if now_dt is None:
            now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat().replace("+00:00", "Z")

        # Bound TTL: min 1 min, max 30 min
        bounded_ttl = max(1, min(30, ttl_minutes))
        expires_dt = now_dt + timedelta(minutes=bounded_ttl)
        expires_iso = expires_dt.isoformat().replace("+00:00", "Z")

        # Bound max executions: min 1, max 10 (default 1)
        bounded_max_executions = max(1, min(10, max_executions))

        window_id = f"win-{secrets.token_hex(8)}"
        corr_id = correlation_id or f"corr-unlock-{secrets.token_hex(6)}"

        window = ExecutionWindow(
            id=window_id,
            lock_name="global_dispatch",
            opened_by=principal.id,
            opened_at=now_iso,
            expires_at=expires_iso,
            max_executions=bounded_max_executions,
            executions_consumed=0,
            reason=reason.strip(),
            state="OPEN",
            created_at=now_iso,
        )

        repo = ExecutionSqliteRepository(conn)
        if getattr(conn, "in_transaction", False):
            conn.commit()
        conn.execute("BEGIN IMMEDIATE;")
        try:
            repo.close_active_windows("global_dispatch", closed_by=principal.id, closed_at=now_iso)
            repo.set_execution_lock(
                lock_name="global_dispatch",
                status="UNLOCKED",
                updated_by=principal.id,
                updated_at=now_iso,
                reason=reason.strip(),
            )
            repo.create_execution_window(window)

            # Record audit event: execution unlocked
            append_audit_entry_to_conn(
                conn=conn,
                event_id=f"aud-{secrets.token_hex(8)}",
                timestamp=now_iso,
                actor_type="USER",
                actor_id=principal.id,
                actor_label=principal.display_name or principal.id,
                action="execution.unlocked",
                resource_type="SYSTEM",
                resource_id="execution_lock:global_dispatch",
                resource_label=f"Execution Window {window_id}",
                outcome="SUCCESS",
                reason=f"Execution unlocked by operator: {reason.strip()} (TTL: {bounded_ttl}m, budget: {bounded_max_executions})",
                correlation_id=corr_id,
                revision=1,
            )
            conn.execute("COMMIT;")
        except Exception as e:
            conn.execute("ROLLBACK;")
            raise AppError(status_code=500, code="LOCK_UPDATE_FAILED", message=f"Failed to unlock execution: {e}")

        # Broadcast realtime notification if available
        if realtime_service and hasattr(realtime_service, "broadcast_event"):
            try:
                import asyncio
                event_payload = {
                    "type": "EXECUTION_UNLOCKED",
                    "window_id": window_id,
                    "opened_by": principal.id,
                    "expires_at": expires_iso,
                    "max_executions": bounded_max_executions,
                }
                coro = realtime_service.broadcast_event("execution_safety", event_payload)
                if asyncio.iscoroutine(coro):
                    asyncio.create_task(coro)
            except Exception:
                pass

        return {
            "status": "UNLOCKED",
            "window": window.model_dump(),
            "ttl_minutes": bounded_ttl,
            "max_executions": bounded_max_executions,
            "message": f"Execution successfully unlocked with bounded window '{window_id}'.",
        }

    @classmethod
    def lock(
        cls,
        conn: sqlite3.Connection,
        principal: OperatorPrincipal,
        reason: str = "Operator emergency execution lock",
        correlation_id: Optional[str] = None,
        now_dt: Optional[datetime] = None,
        realtime_service=None,
    ) -> Dict[str, Any]:
        """
        Emergency execution lock (Prompt 14.4 Section 48, 76, 97).
        Locking should always be easy and fail closed immediately.
        """
        if now_dt is None:
            now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat().replace("+00:00", "Z")
        corr_id = correlation_id or f"corr-lock-{secrets.token_hex(6)}"

        repo = ExecutionSqliteRepository(conn)
        if getattr(conn, "in_transaction", False):
            conn.commit()
        conn.execute("BEGIN IMMEDIATE;")
        try:
            repo.close_active_windows("global_dispatch", closed_by=principal.id, closed_at=now_iso)
            repo.set_execution_lock(
                lock_name="global_dispatch",
                status="LOCKED",
                updated_by=principal.id,
                updated_at=now_iso,
                reason=reason.strip(),
            )

            # Record audit event: execution locked
            append_audit_entry_to_conn(
                conn=conn,
                event_id=f"aud-{secrets.token_hex(8)}",
                timestamp=now_iso,
                actor_type="USER",
                actor_id=principal.id,
                actor_label=principal.display_name or principal.id,
                action="execution.locked",
                resource_type="SYSTEM",
                resource_id="execution_lock:global_dispatch",
                resource_label="Global Dispatch Lock",
                outcome="SUCCESS",
                reason=reason.strip(),
                correlation_id=corr_id,
                revision=1,
            )
            conn.execute("COMMIT;")
        except Exception as e:
            conn.execute("ROLLBACK;")
            raise AppError(status_code=500, code="LOCK_UPDATE_FAILED", message=f"Failed to lock execution: {e}")

        # Broadcast realtime notification if available
        if realtime_service and hasattr(realtime_service, "broadcast_event"):
            try:
                import asyncio
                event_payload = {
                    "type": "EXECUTION_LOCKED",
                    "locked_by": principal.id,
                    "reason": reason.strip(),
                }
                coro = realtime_service.broadcast_event("execution_safety", event_payload)
                if asyncio.iscoroutine(coro):
                    asyncio.create_task(coro)
            except Exception:
                pass

        return {
            "status": "LOCKED",
            "message": "Execution successfully locked.",
            "locked_by": principal.id,
            "locked_at": now_iso,
        }

    @classmethod
    def claim_execution_slot(
        cls,
        conn: sqlite3.Connection,
        now_dt: Optional[datetime] = None,
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Atomically claim an execution slot from the active window (Prompt 14.4 Section 95-96).
        Returns: (success, message, window_id)
        """
        if now_dt is None:
            now_dt = datetime.now(timezone.utc)
        now_iso = now_dt.isoformat().replace("+00:00", "Z")

        repo = ExecutionSqliteRepository(conn)
        window = repo.get_latest_execution_window("global_dispatch")
        if not window or window.state == "CLOSED":
            return False, "No active open execution window found.", None

        if window.state == "EXHAUSTED" or window.executions_consumed >= window.max_executions:
            return False, f"Execution window '{window.id}' budget has been exhausted ({window.executions_consumed}/{window.max_executions}).", None

        # Check TTL
        expires_dt = datetime.fromisoformat(window.expires_at.replace("Z", "+00:00"))
        if now_dt >= expires_dt:
            repo.expire_stale_windows(now_iso)
            return False, f"Execution window '{window.id}' expired at {window.expires_at}.", None

        # Attempt atomic DB claim
        claimed = repo.claim_execution_slot(window.id, now_iso)
        if not claimed:
            return False, f"Execution window '{window.id}' budget has been exhausted ({window.executions_consumed}/{window.max_executions}).", None

        return True, "Execution slot claimed successfully.", window.id

