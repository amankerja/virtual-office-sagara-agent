import sqlite3
import tempfile
from pathlib import Path
import pytest
from app.db.connection import get_db_connection
from app.db.migrations import run_migrations, compute_audit_hash, GENESIS_PREVIOUS_HASH
from app.repositories.sqlite.audit_repo import SqliteAuditRepository
from app.schemas.audit import AuditRecordDto
from app.schemas.common import EntityReference
from app.services.audit_verifier import verify_audit_chain


@pytest.fixture
def temp_sqlite_db():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    try:
        conn = sqlite3.connect(db_path)
        run_migrations(conn)
        conn.close()
        yield db_path
    finally:
        Path(db_path).unlink(missing_ok=True)


def test_migrations_and_wal_mode(temp_sqlite_db):
    """Verify schema migrations apply, tables exist, and WAL mode is active."""
    conn = get_db_connection(temp_sqlite_db)
    try:
        cursor = conn.cursor()
        cursor.execute("PRAGMA journal_mode;")
        row = cursor.fetchone()
        assert row[0].upper() == "WAL"

        cursor.execute("PRAGMA foreign_keys;")
        assert cursor.fetchone()[0] == 1

        # Check tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = {r[0] for r in cursor.fetchall()}
        expected = {
            "schema_migrations",
            "action_intents",
            "approvals",
            "idempotency_records",
            "audit_ledger",
            "configuration_change_sets",
            "schedule_change_sets",
        }
        assert expected.issubset(tables)

        # Check genesis record
        cursor.execute("SELECT * FROM audit_ledger WHERE sequence = 0;")
        genesis = cursor.fetchone()
        assert genesis is not None
        assert genesis["event_id"] == "aud-000000000000-genesis"
        assert genesis["previous_hash"] == GENESIS_PREVIOUS_HASH
    finally:
        conn.close()


def test_audit_chain_verification_intact(temp_sqlite_db):
    """Verify audit chain passes verification on clean append sequence."""
    conn = get_db_connection(temp_sqlite_db)
    try:
        is_valid, err = verify_audit_chain(conn)
        assert is_valid is True
        assert err is None
    finally:
        conn.close()


@pytest.mark.asyncio
async def test_audit_ledger_append_and_tamper_detection(temp_sqlite_db):
    """Section 68, 70, 125: Append events, verify chain, then tamper and detect failure."""
    repo = SqliteAuditRepository(temp_sqlite_db)

    # Append 3 audit records
    for i in range(1, 4):
        rec = AuditRecordDto(
            id=f"aud-test-00{i}",
            timestamp=f"2026-09-11T00:0{i}:00Z",
            actor=EntityReference(type="USER", id="op-1", label="Operator 1"),
            action=f"ACTION_STEP_{i}",
            target=EntityReference(type="TASK", id="task-1", label="Task 1"),
            outcome="SUCCESS",
            reason=f"Step {i} executed",
            correlation_id=f"corr-00{i}",
        )
        await repo.record_audit(rec, intent_id=f"intent-00{i}", payload_hash="hash-123")

    # Verify chain is valid
    is_valid, err = repo.verify_chain()
    assert is_valid is True
    assert err is None

    # Deliberately tamper with record sequence 2 in TEST DATABASE copy
    conn = get_db_connection(temp_sqlite_db)
    try:
        conn.execute(
            "UPDATE audit_ledger SET reason = 'MALICIOUS_TAMPERED_REASON' WHERE sequence = 2;"
        )
    finally:
        conn.close()

    # Verify chain now fails verification
    is_valid_after, err_after = repo.verify_chain()
    assert is_valid_after is False
    assert "Tamper detected at sequence 2" in err_after
