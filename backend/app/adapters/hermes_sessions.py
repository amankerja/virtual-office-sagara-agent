import base64
from datetime import datetime, timezone
import json
import os
import sqlite3
import time
from typing import Any, Optional
from app.adapters.hermes_database import HermesReadOnlyDatabase
from app.adapters.hermes_diagnostics import HermesRuntimeDiagnostics
from app.schemas.sessions import SessionDto, SessionState


def _epoch_to_iso(epoch_val: Optional[float]) -> str:
    if epoch_val is None or epoch_val <= 0:
        return ""
    try:
        dt = datetime.fromtimestamp(epoch_val, timezone.utc)
        return dt.isoformat().replace("+00:00", "Z")
    except (ValueError, OSError, OverflowError):
        return ""


class SessionReader:
    """
    Reads Hermes sessions and correlates with active turn leases.
    Strictly preserves privacy (no bulk message loading).
    Enforces UNKNOWN != ZERO on token and cost fields.
    """

    def __init__(
        self,
        db: HermesReadOnlyDatabase,
        diagnostics: Optional[HermesRuntimeDiagnostics] = None,
    ) -> None:
        self._db = db
        self._diagnostics = diagnostics

    def _determine_session_state(
        self,
        session_id: str,
        ended_at: Optional[float],
        end_reason: Optional[str],
        archived: int,
        last_activity_at: Optional[float],
        active_leases: set[str],
        now: float,
    ) -> SessionState:
        # 1. Proven active execution lease
        if session_id in active_leases:
            return "ACTIVE"

        # 2. Archived session
        if archived == 1:
            return "ARCHIVED"

        # 3. Explicitly ended session
        if ended_at is not None or end_reason is not None:
            if end_reason in ("error", "failed", "cron_incomplete_no_output"):
                return "FAILED"
            return "COMPLETED"

        # 4. Unclosed session - evaluate activity recency
        if last_activity_at is not None and (now - last_activity_at) <= 900:
            return "RECENT"

        return "COMPLETED"

    async def list_sessions(
        self,
        agent_id: Optional[str] = None,
        state: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> list[SessionDto]:
        def _read(conn: sqlite3.Connection) -> list[SessionDto]:
            cur = conn.cursor()
            # Check sessions table
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions';")
            if not cur.fetchone():
                return []

            now = time.time()

            # Discover active turn leases
            active_leases: set[str] = set()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='session_turn_leases';")
            if cur.fetchone():
                cur.execute("SELECT conversation_id FROM session_turn_leases WHERE expires_at > ?;", (now,))
                active_leases = {row[0] for row in cur.fetchall()}

            # Build query with filter push-down where safe
            where_clauses: list[str] = []
            params: list[Any] = []

            if agent_id and agent_id != "ALL":
                where_clauses.append("profile_name = ?")
                params.append(agent_id)

            offset = 0
            if cursor:
                try:
                    offset = int(cursor)
                except ValueError:
                    try:
                        decoded = base64.b64decode(cursor).decode("utf-8")
                        offset = int(decoded)
                    except Exception:
                        offset = 0

            where_sql = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""
            query_sql = f"""
                SELECT id, source, model, parent_session_id, started_at, ended_at, end_reason,
                       message_count, tool_call_count, input_tokens, output_tokens, reasoning_tokens,
                       estimated_cost_usd, actual_cost_usd, last_activity_at, profile_name, archived
                FROM sessions
                {where_sql}
                ORDER BY last_activity_at DESC, id DESC
                LIMIT ? OFFSET ?;
            """
            params.extend([limit, offset])
            cur.execute(query_sql, params)
            rows = cur.fetchall()

            sessions: list[SessionDto] = []
            for r in rows:
                sid = r["id"]
                profile_name = r["profile_name"]
                # Preserved exact correlation: null if not present
                correlated_agent_id = profile_name if profile_name else None

                session_state = self._determine_session_state(
                    session_id=sid,
                    ended_at=r["ended_at"],
                    end_reason=r["end_reason"],
                    archived=r["archived"] or 0,
                    last_activity_at=r["last_activity_at"],
                    active_leases=active_leases,
                    now=now,
                )

                if state and state != "ALL" and session_state != state:
                    continue

                started_iso = _epoch_to_iso(r["started_at"])
                last_act_iso = _epoch_to_iso(r["last_activity_at"]) or started_iso

                usage_payload: dict[str, Any] = {
                    "input_tokens": r["input_tokens"],
                    "output_tokens": r["output_tokens"],
                    "reasoning_tokens": r["reasoning_tokens"],
                    "estimated_cost_usd": r["estimated_cost_usd"],
                    "actual_cost_usd": r["actual_cost_usd"],
                }

                sessions.append(
                    SessionDto(
                        id=sid,
                        profile_id=correlated_agent_id,
                        agent_id=correlated_agent_id,
                        source=r["source"] or "hermes",
                        state=session_state,
                        model=r["model"],
                        provider=None,
                        started_at=started_iso or _epoch_to_iso(now),
                        last_activity_at=last_act_iso or _epoch_to_iso(now),
                        message_count=r["message_count"] if r["message_count"] is not None else 0,
                        tool_call_count=r["tool_call_count"],
                        parent_session_id=r["parent_session_id"],
                        usage=usage_payload,
                    )
                )

            return sessions

        return await self._db.execute_read(_read)

    async def get_session(self, session_id: str) -> Optional[SessionDto]:
        def _read(conn: sqlite3.Connection) -> Optional[SessionDto]:
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions';")
            if not cur.fetchone():
                return None

            now = time.time()
            active_leases: set[str] = set()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='session_turn_leases';")
            if cur.fetchone():
                cur.execute("SELECT conversation_id FROM session_turn_leases WHERE conversation_id = ? AND expires_at > ?;", (session_id, now))
                active_leases = {row[0] for row in cur.fetchall()}

            cur.execute(
                """
                SELECT id, source, model, parent_session_id, started_at, ended_at, end_reason,
                       message_count, tool_call_count, input_tokens, output_tokens, reasoning_tokens,
                       estimated_cost_usd, actual_cost_usd, last_activity_at, profile_name, archived
                FROM sessions
                WHERE id = ?
                LIMIT 1;
            """,
                (session_id,),
            )
            r = cur.fetchone()
            if not r:
                return None

            profile_name = r["profile_name"]
            correlated_agent_id = profile_name if profile_name else None

            session_state = self._determine_session_state(
                session_id=r["id"],
                ended_at=r["ended_at"],
                end_reason=r["end_reason"],
                archived=r["archived"] or 0,
                last_activity_at=r["last_activity_at"],
                active_leases=active_leases,
                now=now,
            )

            started_iso = _epoch_to_iso(r["started_at"])
            last_act_iso = _epoch_to_iso(r["last_activity_at"]) or started_iso

            usage_payload: dict[str, Any] = {
                "input_tokens": r["input_tokens"],
                "output_tokens": r["output_tokens"],
                "reasoning_tokens": r["reasoning_tokens"],
                "estimated_cost_usd": r["estimated_cost_usd"],
                "actual_cost_usd": r["actual_cost_usd"],
            }

            return SessionDto(
                id=r["id"],
                profile_id=correlated_agent_id,
                agent_id=correlated_agent_id,
                source=r["source"] or "hermes",
                state=session_state,
                model=r["model"],
                provider=None,
                started_at=started_iso or _epoch_to_iso(now),
                last_activity_at=last_act_iso or _epoch_to_iso(now),
                message_count=r["message_count"] if r["message_count"] is not None else 0,
                tool_call_count=r["tool_call_count"],
                parent_session_id=r["parent_session_id"],
                usage=usage_payload,
            )

        return await self._db.execute_read(_read)

    async def get_session_accounting(self) -> dict[str, int]:
        """
        Produce authoritative session accounting across central and profile stores.
        Enforces deduplication: aggregate_distinct_sessions != naïve arithmetic sum (Section 16).
        """
        def _read_accounting(conn: sqlite3.Connection) -> dict[str, int]:
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions';")
            if not cur.fetchone():
                return {
                    "central_store_sessions": 0,
                    "profile_local_sessions": 0,
                    "aggregate_distinct_sessions": 0,
                }

            cur.execute("SELECT id FROM sessions;")
            central_ids = {row[0] for row in cur.fetchall()}

            # Profile-local discovery
            profile_ids: set[str] = set()
            hermes_dir = os.path.dirname(self._db.db_path) if self._db.db_path else None
            if hermes_dir:
                profiles_dir = os.path.join(hermes_dir, "profiles")
                if os.path.isdir(profiles_dir):
                    for entry in os.listdir(profiles_dir):
                        pdb_path = os.path.join(profiles_dir, entry, "state.db")
                        if os.path.isfile(pdb_path):
                            try:
                                pconn = sqlite3.connect(f"file:{pdb_path}?mode=ro", uri=True)
                                pcur = pconn.cursor()
                                pcur.execute("PRAGMA query_only=ON;")
                                pcur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='sessions';")
                                if pcur.fetchone():
                                    for prow in pcur.execute("SELECT id FROM sessions;"):
                                        profile_ids.add(prow[0])
                                pconn.close()
                            except Exception:
                                pass

            distinct_ids = central_ids.union(profile_ids)
            return {
                "central_store_sessions": len(central_ids),
                "profile_local_sessions": len(profile_ids),
                "aggregate_distinct_sessions": len(distinct_ids),
            }

        return await self._db.execute_read(_read_accounting)

