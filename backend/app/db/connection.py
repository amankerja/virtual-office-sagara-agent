import os
import sqlite3
from pathlib import Path
from typing import Generator, Optional
from app.config import settings


def resolve_sqlite_path(database_url: str) -> str:
    """Parse a database URL to a filesystem path or :memory:."""
    if not database_url or database_url in (":memory:", "sqlite:///:memory:"):
        return ":memory:"
    
    url = database_url
    if url.startswith("sqlite:///"):
        path_part = url[len("sqlite:///"):]
    elif url.startswith("sqlite://"):
        path_part = url[len("sqlite://"):]
    else:
        path_part = url

    # Handle windows drive letter e.g. /D:/ or D:/
    if len(path_part) > 2 and path_part[0] == "/" and path_part[2] == ":":
        path_part = path_part[1:]

    # Resolve relative paths relative to backend directory or current working directory
    resolved = Path(path_part)
    if not resolved.is_absolute():
        resolved = Path.cwd() / resolved

    resolved.parent.mkdir(parents=True, exist_ok=True)
    return str(resolved)


def get_db_connection(db_path_override: Optional[str] = None) -> sqlite3.Connection:
    """Create a configured SQLite connection with WAL, foreign keys, and busy timeout."""
    db_target = db_path_override or resolve_sqlite_path(settings.database_url)
    
    conn = sqlite3.connect(
        db_target,
        timeout=10.0,
        isolation_level=None,  # Autocommit mode by default, explicit BEGIN for transactions
        check_same_thread=False,
    )
    conn.row_factory = sqlite3.Row
    
    # Enable foreign keys and busy timeout
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA busy_timeout = 5000;")
    
    # Configure WAL mode for file-based databases
    if db_target != ":memory:":
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        
    return conn


def init_db(db_path_override: Optional[str] = None) -> None:
    """Initialize schema migrations on the configured database."""
    from app.db.migrations import run_migrations
    conn = get_db_connection(db_path_override)
    try:
        run_migrations(conn)
    finally:
        conn.close()
