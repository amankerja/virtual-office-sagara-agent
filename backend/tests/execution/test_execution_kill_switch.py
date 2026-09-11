import sqlite3
import pytest
from app.config import settings
from app.db.connection import get_db_connection
from app.db.migrations import run_migrations
from app.repositories.sqlite.execution_repo import ExecutionSqliteRepository
from app.services.execution_kill_switch import ExecutionKillSwitch


@pytest.fixture
def clean_db():
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    run_migrations(conn)
    yield conn
    conn.close()


def test_kill_switch_default_locked(clean_db, monkeypatch):
    """By default, env is False and DB is LOCKED -> is_locked is True."""
    monkeypatch.setattr(settings, "execution_enabled", False)
    is_locked, reason = ExecutionKillSwitch.is_locked(clean_db)
    assert is_locked is True
    assert "disabled" in reason.lower()


def test_kill_switch_env_enabled_but_db_locked(clean_db, monkeypatch):
    """Env enabled but DB lock is LOCKED -> still locked."""
    monkeypatch.setattr(settings, "execution_enabled", True)
    is_locked, reason = ExecutionKillSwitch.is_locked(clean_db)
    assert is_locked is True
    assert "LOCKED" in reason


def test_kill_switch_env_disabled_but_db_unlocked(clean_db, monkeypatch):
    """Env disabled but DB lock is UNLOCKED -> still locked."""
    monkeypatch.setattr(settings, "execution_enabled", False)
    repo = ExecutionSqliteRepository(clean_db)
    repo.set_execution_lock("global_dispatch", "UNLOCKED")

    is_locked, reason = ExecutionKillSwitch.is_locked(clean_db)
    assert is_locked is True
    assert "disabled" in reason.lower()


def test_kill_switch_both_unlocked(clean_db, monkeypatch):
    """Both gates unlocked -> is_locked is False."""
    monkeypatch.setattr(settings, "execution_enabled", True)
    repo = ExecutionSqliteRepository(clean_db)
    repo.set_execution_lock("global_dispatch", "UNLOCKED")

    is_locked, reason = ExecutionKillSwitch.is_locked(clean_db)
    assert is_locked is False
    assert "gate is UNLOCKED" in reason


def test_kill_switch_db_failure_fails_closed(monkeypatch):
    """Corrupted / broken DB connection fails closed."""
    monkeypatch.setattr(settings, "execution_enabled", True)
    broken_conn = sqlite3.connect(":memory:")
    # Do not run migrations, so execution_locks table is missing
    is_locked, reason = ExecutionKillSwitch.is_locked(broken_conn)
    assert is_locked is True
    assert "failing closed" in reason.lower()
    broken_conn.close()


def test_kill_switch_get_status(clean_db, monkeypatch):
    monkeypatch.setattr(settings, "execution_enabled", True)
    monkeypatch.setattr(settings, "live_canary_enabled", False)
    repo = ExecutionSqliteRepository(clean_db)
    repo.set_execution_lock("global_dispatch", "LOCKED")

    status = ExecutionKillSwitch.get_status(clean_db)
    assert status["is_locked"] is True
    assert status["environment_enabled"] is True
    assert status["persistent_lock_status"] == "LOCKED"
    assert status["live_canary_enabled"] is False
