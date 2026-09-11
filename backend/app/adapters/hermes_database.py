import asyncio
import contextlib
import logging
import os
import sqlite3
from typing import Any, Callable, Optional, TypeVar
from app.api.errors import RuntimeUnavailableError

logger = logging.getLogger("sagara.runtime.hermes_db")

T = TypeVar("T")


class HermesReadOnlyDatabase:
    """
    WAL-aware, strictly read-only SQLite database access layer for Hermes runtime state.db.
    
    Adheres to:
    - mode=ro via URI
    - PRAGMA query_only = ON
    - PRAGMA busy_timeout = 3000
    - NO immutable=1 (preserves live WAL reading)
    - Short-lived read connections
    - Async thread execution to avoid event loop blocking
    - Zero write queries (SELECT and read-only PRAGMAs only)
    """

    def __init__(self, db_path: Optional[str] = None) -> None:
        self._db_path = db_path

    @property
    def db_path(self) -> Optional[str]:
        return self._db_path

    def _resolve_path(self) -> str:
        if not self._db_path:
            raise RuntimeUnavailableError(
                message="Hermes state.db path is not configured.",
                details={"configured_path": self._db_path},
            )
        resolved = os.path.abspath(os.path.expanduser(self._db_path))
        if not os.path.isfile(resolved):
            raise RuntimeUnavailableError(
                message=f"Hermes state.db file not found at: {resolved}",
                details={"resolved_path": resolved},
            )
        return resolved

    def _create_connection(self) -> sqlite3.Connection:
        path = self._resolve_path()
        # Convert windows backslashes if necessary for sqlite URI
        normalized_path = path.replace("\\", "/")
        if not normalized_path.startswith("/"):
            uri_str = f"file:///{normalized_path}?mode=ro"
        else:
            uri_str = f"file:{normalized_path}?mode=ro"

        try:
            conn = sqlite3.connect(uri_str, uri=True, timeout=3.0)
            conn.row_factory = sqlite3.Row
            cur = conn.cursor()
            cur.execute("PRAGMA query_only = ON;")
            cur.execute("PRAGMA busy_timeout = 3000;")
            return conn
        except sqlite3.OperationalError as e:
            logger.error("Failed to connect to Hermes SQLite DB: %s", e)
            raise RuntimeUnavailableError(
                message=f"Failed to open Hermes state.db in read-only mode: {e}",
                details={"uri": uri_str, "error": str(e)},
            ) from e

    def execute_read_sync(self, query_fn: Callable[[sqlite3.Connection], T]) -> T:
        """Executes a read query function using a short-lived read-only connection."""
        conn = self._create_connection()
        with contextlib.closing(conn):
            return query_fn(conn)

    async def execute_read(self, query_fn: Callable[[sqlite3.Connection], T]) -> T:
        """Asynchronously executes a read query in a background thread."""
        return await asyncio.to_thread(self.execute_read_sync, query_fn)

    async def check_capabilities(self) -> dict[str, bool]:
        """Discovers presence of relevant runtime tables."""
        def _check(conn: sqlite3.Connection) -> dict[str, bool]:
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = {row[0] for row in cur.fetchall()}
            return {
                "gateway_heartbeats": "gateway_heartbeats" in tables,
                "sessions": "sessions" in tables,
                "session_turn_leases": "session_turn_leases" in tables,
                "async_delegations": "async_delegations" in tables,
                "session_model_usage": "session_model_usage" in tables,
                "messages": "messages" in tables,
                "schema_version": "schema_version" in tables,
            }

        return await self.execute_read(_check)

    async def get_schema_version(self) -> Optional[int]:
        """Retrieves schema_version from database if table exists."""
        def _get_ver(conn: sqlite3.Connection) -> Optional[int]:
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version';")
            if not cur.fetchone():
                return None
            cur.execute("SELECT version FROM schema_version LIMIT 1;")
            row = cur.fetchone()
            return int(row[0]) if row else None

        return await self.execute_read(_get_ver)
