import sqlite3
from typing import Tuple, Dict, Any
from app.config import settings
from app.repositories.sqlite.execution_repo import ExecutionSqliteRepository


class ExecutionKillSwitch:
    """
    Emergency Execution Kill Switch (Prompt 14 Section 27-30).
    Requires BOTH:
    1. Environment execution enabled flag (MISSION_CONTROL_EXECUTION_ENABLED=true)
    2. Persistent database lock (execution_locks.status == 'UNLOCKED')
    Neither alone is enough. Fails closed (LOCKED) on any uncertainty.
    """

    @classmethod
    def is_locked(cls, conn: sqlite3.Connection) -> Tuple[bool, str]:
        """
        Check if execution is currently locked.
        Returns (is_locked, reason).
        """
        # 1. Environment Gate
        if not settings.execution_enabled:
            return True, "Environment execution flag 'MISSION_CONTROL_EXECUTION_ENABLED' is disabled (safety gate locked)."

        # 2. Persistent Database Lock
        try:
            repo = ExecutionSqliteRepository(conn)
            lock_status = repo.get_execution_lock("global_dispatch")
            if lock_status != "UNLOCKED":
                return True, f"Persistent control plane execution lock is {lock_status}."
        except Exception as err:
            return True, f"Control plane database lock inspection failed ({err}); failing closed (LOCKED)."

        return False, "Execution gate is UNLOCKED."

    @classmethod
    def get_status(cls, conn: sqlite3.Connection) -> Dict[str, Any]:
        """Diagnostic state of execution kill switch and environment gates."""
        is_locked, reason = cls.is_locked(conn)
        db_lock = "UNKNOWN"
        try:
            repo = ExecutionSqliteRepository(conn)
            db_lock = repo.get_execution_lock("global_dispatch")
        except Exception:
            pass

        return {
            "is_locked": is_locked,
            "reason": reason,
            "environment_enabled": settings.execution_enabled,
            "persistent_lock_status": db_lock,
            "live_canary_enabled": settings.live_canary_enabled,
        }
