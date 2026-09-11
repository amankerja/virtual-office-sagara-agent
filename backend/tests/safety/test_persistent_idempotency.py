import sqlite3
import tempfile
from pathlib import Path
import pytest
from app.api.errors import ConflictError
from app.db.migrations import run_migrations
from app.repositories.sqlite.idempotency_repo import PersistentIdempotencyStore


@pytest.fixture
def temp_idempotency_db():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    conn = sqlite3.connect(db_path)
    run_migrations(conn)
    conn.close()

    try:
        yield db_path
    finally:
        Path(db_path).unlink(missing_ok=True)


@pytest.mark.asyncio
async def test_idempotency_restart_and_replay_safety(temp_idempotency_db):
    """Section 56 & 124: Reopened store across restarts serves original response for identical request."""
    store1 = PersistentIdempotencyStore(temp_idempotency_db)

    payload = {"task_id": "task-001", "action": "test"}
    payload_hash = store1.compute_hash(payload)
    response_data = {"status": "ok", "task_id": "task-001", "revision": 1}

    # Save response in instance 1
    await store1.save_response(
        key="idemp-key-1",
        operation="create_task",
        payload_hash=payload_hash,
        response=response_data,
        principal_id="op-1",
    )

    # Re-open instance 2 simulating application restart (Section 124)
    store2 = PersistentIdempotencyStore(temp_idempotency_db)
    cached = await store2.get_response(
        key="idemp-key-1",
        operation="create_task",
        payload_hash=payload_hash,
        principal_id="op-1",
    )
    assert cached == response_data


@pytest.mark.asyncio
async def test_idempotency_conflict_on_mismatched_payload(temp_idempotency_db):
    """Section 57: Same key with modified payload raises 409 IDEMPOTENCY_CONFLICT."""
    store = PersistentIdempotencyStore(temp_idempotency_db)

    payload1 = {"task_id": "task-001", "amount": 100}
    payload2 = {"task_id": "task-001", "amount": 200}

    hash1 = store.compute_hash(payload1)
    hash2 = store.compute_hash(payload2)

    await store.save_response(
        key="idemp-key-2",
        operation="mutate",
        payload_hash=hash1,
        response={"result": "ok"},
        principal_id="op-1",
    )

    with pytest.raises(ConflictError) as exc:
        await store.get_response(
            key="idemp-key-2",
            operation="mutate",
            payload_hash=hash2,
            principal_id="op-1",
        )
    assert exc.value.code == "IDEMPOTENCY_CONFLICT"
