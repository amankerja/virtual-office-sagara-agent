from datetime import datetime
import sqlite3
from typing import Tuple, Dict, Any, Optional
from app.config import settings
from app.services.execution_lock_service import ExecutionLockService


class ExecutionKillSwitch:
    """
    Emergency Execution Kill Switch (Prompt 14 Section 27-30, Prompt 14.4 Section 44-71).
    Requires BOTH:
    1. Environment execution enabled flag (MISSION_CONTROL_EXECUTION_ENABLED=true)
    2. Persistent database lock (execution_locks.status == 'UNLOCKED')
    3. Active bounded execution window (execution_windows.state == 'OPEN', now < expires_at, budget remaining)
    Neither alone is enough. Fails closed (LOCKED) on any uncertainty.
    """

    @classmethod
    def is_locked(
        cls,
        conn: sqlite3.Connection,
        now_dt: Optional[datetime] = None,
    ) -> Tuple[bool, str]:
        """
        Check if execution is currently locked.
        Returns (is_locked, reason).
        """
        is_locked, reason, _ = ExecutionLockService.get_effective_status(conn, now_dt=now_dt)
        return is_locked, reason

    @classmethod
    def get_status(
        cls,
        conn: sqlite3.Connection,
        now_dt: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """Diagnostic state of execution kill switch, active window, and environment gates."""
        return ExecutionLockService.inspect(conn, now_dt=now_dt)
