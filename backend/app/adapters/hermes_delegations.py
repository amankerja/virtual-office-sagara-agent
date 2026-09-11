from datetime import datetime, timezone
import json
import sqlite3
import time
from typing import Optional
from app.adapters.hermes_database import HermesReadOnlyDatabase
from app.adapters.hermes_diagnostics import HermesRuntimeDiagnostics
from app.schemas.delegations import DelegationDto, DelegationState


def _epoch_to_iso(epoch_val: Optional[float]) -> str:
    if epoch_val is None or epoch_val <= 0:
        return ""
    try:
        dt = datetime.fromtimestamp(epoch_val, timezone.utc)
        return dt.isoformat().replace("+00:00", "Z")
    except (ValueError, OSError, OverflowError):
        return ""


class DelegationReader:
    """
    Reads async delegation evidence from Hermes SQLite `async_delegations`.
    Normalizes delegation state and extracts clean task metadata without leaking secrets.
    """

    def __init__(
        self,
        db: HermesReadOnlyDatabase,
        diagnostics: Optional[HermesRuntimeDiagnostics] = None,
    ) -> None:
        self._db = db
        self._diagnostics = diagnostics

    def _normalize_state(self, raw_state: Optional[str]) -> DelegationState:
        if not raw_state:
            return "UNKNOWN"
        normalized = raw_state.lower().strip()
        if normalized in ("running", "dispatched"):
            return "RUNNING"
        if normalized in ("queued", "pending"):
            return "QUEUED"
        if normalized in ("claimed",):
            return "CLAIMED"
        if normalized in ("completed",):
            return "COMPLETED"
        if normalized in ("error", "failed"):
            return "FAILED"
        if normalized in ("cancelled", "canceled"):
            return "CANCELLED"
        return "UNKNOWN"

    def _extract_task_info(self, task_json_str: Optional[str], delegation_id: str) -> tuple[str, Optional[str]]:
        task_title = f"Async Delegation {delegation_id}"
        target_agent = None

        if not task_json_str:
            return task_title, target_agent

        try:
            data = json.loads(task_json_str)
            if isinstance(data, dict):
                goal = data.get("goal") or data.get("task") or data.get("title")
                if goal and isinstance(goal, str):
                    task_title = goal[:120]
                elif data.get("goals") and isinstance(data["goals"], list) and len(data["goals"]) > 0:
                    task_title = str(data["goals"][0])[:120]

                role = data.get("role")
                if role and isinstance(role, str):
                    target_agent = role
        except Exception:
            pass

        return task_title, target_agent

    async def list_delegations(
        self,
        agent_id: Optional[str] = None,
        state: Optional[str] = None,
    ) -> list[DelegationDto]:
        def _read(conn: sqlite3.Connection) -> list[DelegationDto]:
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='async_delegations';")
            if not cur.fetchone():
                return []

            now = time.time()
            cur.execute(
                """
                SELECT delegation_id, origin_session, parent_session_id, state,
                       dispatched_at, completed_at, updated_at, owner_pid, task_json
                FROM async_delegations
                ORDER BY dispatched_at DESC, delegation_id DESC;
            """
            )
            rows = cur.fetchall()

            delegations: list[DelegationDto] = []
            for r in rows:
                norm_state = self._normalize_state(r["state"])
                if state and state != "ALL" and norm_state != state:
                    continue

                task_title, target_role = self._extract_task_info(r["task_json"], r["delegation_id"])

                # If filter by agent_id is active, match target_agent_id
                if agent_id and agent_id != "ALL" and target_role != agent_id:
                    continue

                started_iso = _epoch_to_iso(r["dispatched_at"]) or _epoch_to_iso(now)
                completed_iso = _epoch_to_iso(r["completed_at"]) if r["completed_at"] else None

                worker_pid_str = str(r["owner_pid"]) if r["owner_pid"] is not None else None

                delegations.append(
                    DelegationDto(
                        id=r["delegation_id"],
                        parent_session_id=r["parent_session_id"] or r["origin_session"],
                        target_agent_id=target_role,
                        task_title=task_title,
                        state=norm_state,
                        worker_pid=worker_pid_str,
                        owner_pid=r["owner_pid"],
                        started_at=started_iso,
                        completed_at=completed_iso,
                    )
                )

            return delegations

        return await self._db.execute_read(_read)

    async def get_delegation(self, delegation_id: str) -> Optional[DelegationDto]:
        def _read(conn: sqlite3.Connection) -> Optional[DelegationDto]:
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='async_delegations';")
            if not cur.fetchone():
                return None

            cur.execute(
                """
                SELECT delegation_id, origin_session, parent_session_id, state,
                       dispatched_at, completed_at, updated_at, owner_pid, task_json
                FROM async_delegations
                WHERE delegation_id = ?
                LIMIT 1;
            """,
                (delegation_id,),
            )
            r = cur.fetchone()
            if not r:
                return None

            now = time.time()
            norm_state = self._normalize_state(r["state"])
            task_title, target_role = self._extract_task_info(r["task_json"], r["delegation_id"])
            started_iso = _epoch_to_iso(r["dispatched_at"]) or _epoch_to_iso(now)
            completed_iso = _epoch_to_iso(r["completed_at"]) if r["completed_at"] else None
            worker_pid_str = str(r["owner_pid"]) if r["owner_pid"] is not None else None

            return DelegationDto(
                id=r["delegation_id"],
                parent_session_id=r["parent_session_id"] or r["origin_session"],
                target_agent_id=target_role,
                task_title=task_title,
                state=norm_state,
                worker_pid=worker_pid_str,
                owner_pid=r["owner_pid"],
                started_at=started_iso,
                completed_at=completed_iso,
            )

        return await self._db.execute_read(_read)
