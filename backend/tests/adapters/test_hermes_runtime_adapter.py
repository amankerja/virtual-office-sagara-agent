import os
import sqlite3
import pytest
from app.adapters.hermes_database import HermesReadOnlyDatabase
from app.adapters.hermes_runtime import HermesSqliteRuntimeAdapter
from app.api.errors import RuntimeUnavailableError

from tests.fixtures.create_synthetic_hermes_db import build_synthetic_hermes_db

FIXTURE_DB_PATH = os.path.join(os.path.dirname(__file__), "..", "fixtures", "hermes_state.db")


@pytest.fixture
def hermes_adapter() -> HermesSqliteRuntimeAdapter:
    build_synthetic_hermes_db(FIXTURE_DB_PATH)
    return HermesSqliteRuntimeAdapter(db_path=FIXTURE_DB_PATH)


@pytest.mark.asyncio
async def test_database_capabilities_and_version(hermes_adapter: HermesSqliteRuntimeAdapter):
    caps = await hermes_adapter.database.check_capabilities()
    assert caps["gateway_heartbeats"] is True
    assert caps["sessions"] is True
    assert caps["session_turn_leases"] is True
    assert caps["async_delegations"] is True
    assert caps["session_model_usage"] is True
    assert caps["messages"] is True
    assert caps["schema_version"] is True

    version = await hermes_adapter.database.get_schema_version()
    assert version == 26


@pytest.mark.asyncio
async def test_read_only_query_safety(hermes_adapter: HermesSqliteRuntimeAdapter):
    """Verifies write operations fail through the HermesReadOnlyDatabase connection."""
    def _attempt_write(conn: sqlite3.Connection):
        cur = conn.cursor()
        cur.execute("INSERT INTO gateway_heartbeats (backend_id) VALUES ('fake-id');")

    with pytest.raises(Exception):
        await hermes_adapter.database.execute_read(_attempt_write)


@pytest.mark.asyncio
async def test_unavailable_database_raises_error():
    bad_adapter = HermesSqliteRuntimeAdapter(db_path="/non/existent/path/to/hermes.db")
    with pytest.raises(RuntimeUnavailableError) as exc_info:
        await bad_adapter.get_gateway()
    assert "not found" in exc_info.value.message.lower()


@pytest.mark.asyncio
async def test_gateway_heartbeat_freshest_selection_and_diagnostics(hermes_adapter: HermesSqliteRuntimeAdapter):
    gateway = await hermes_adapter.get_gateway()
    assert gateway.connected is True
    assert gateway.status == "HEALTHY"
    assert gateway.backend_id == "hermes-central-primary"
    assert gateway.pid == 2117612
    assert gateway.heartbeat_age_seconds is not None
    assert gateway.heartbeat_age_seconds >= 0

    # Multiple gateways diagnostic verification (Section 31)
    diagnostics = hermes_adapter.diagnostics.get_records()
    codes = [d.code for d in diagnostics]
    assert "MULTIPLE_ACTIVE_GATEWAYS_OBSERVED" in codes


@pytest.mark.asyncio
async def test_session_reader_states_and_leases(hermes_adapter: HermesSqliteRuntimeAdapter):
    sessions = await hermes_adapter.list_sessions(limit=50)
    assert len(sessions) >= 5

    session_map = {s.id: s for s in sessions}

    # sess_active_01 has active turn lease -> ACTIVE
    active_sess = session_map.get("sess_active_01")
    assert active_sess is not None
    assert active_sess.state == "ACTIVE"
    assert active_sess.profile_id == "lead"
    assert active_sess.agent_id == "lead"
    assert active_sess.usage is not None
    assert active_sess.usage["input_tokens"] == 15000

    # sess_recent_02 is unclosed with recent activity -> RECENT
    recent_sess = session_map.get("sess_recent_02")
    assert recent_sess is not None
    assert recent_sess.state == "RECENT"
    assert recent_sess.profile_id == "marketing"

    # sess_completed_03 is closed -> COMPLETED
    completed_sess = session_map.get("sess_completed_03")
    assert completed_sess is not None
    assert completed_sess.state == "COMPLETED"

    # sess_failed_04 ended with error -> FAILED
    failed_sess = session_map.get("sess_failed_04")
    assert failed_sess is not None
    assert failed_sess.state == "FAILED"

    # sess_null_profile_06 has NULL profile_name -> agent_id is None
    null_prof_sess = session_map.get("sess_null_profile_06")
    assert null_prof_sess is not None
    assert null_prof_sess.profile_id is None
    assert null_prof_sess.agent_id is None


@pytest.mark.asyncio
async def test_session_pagination_and_filters(hermes_adapter: HermesSqliteRuntimeAdapter):
    # Filter by agent_id
    filtered = await hermes_adapter.list_sessions(agent_id="lead")
    assert len(filtered) == 1
    assert filtered[0].id == "sess_active_01"


    # Pagination with limit
    p1 = await hermes_adapter.list_sessions(limit=2)
    assert len(p1) == 2
    p2 = await hermes_adapter.list_sessions(cursor="2", limit=2)
    assert len(p2) == 2
    assert p1[0].id != p2[0].id


@pytest.mark.asyncio
async def test_delegations_reader_normalization(hermes_adapter: HermesSqliteRuntimeAdapter):
    delegations = await hermes_adapter.list_delegations()
    assert len(delegations) >= 3

    del_map = {d.id: d for d in delegations}

    # del_01: running
    d1 = del_map.get("del_01")
    assert d1 is not None
    assert d1.state == "RUNNING"
    assert d1.worker_pid == "2159075"
    assert d1.owner_pid == 2159075
    assert "integrity audit" in d1.task_title.lower()

    # del_02: completed
    d2 = del_map.get("del_02")
    assert d2 is not None
    assert d2.state == "COMPLETED"
    assert d2.completed_at is not None

    # del_03: failed
    d3 = del_map.get("del_03")
    assert d3 is not None
    assert d3.state == "FAILED"


@pytest.mark.asyncio
async def test_usage_unknown_not_zero_semantics(hermes_adapter: HermesSqliteRuntimeAdapter):
    # sess_recent_02 has NULL actual_cost_usd and NULL reasoning_tokens in database
    s2 = await hermes_adapter.get_session("sess_recent_02")
    assert s2 is not None
    assert s2.usage["actual_cost_usd"] is None
    assert s2.usage["reasoning_tokens"] is None
    assert s2.usage["estimated_cost_usd"] == 0.12

    # sess_unregistered_05 has explicit 0.0 actual_cost_usd
    s5 = await hermes_adapter.get_session("sess_unregistered_05")
    assert s5 is not None
    assert s5.usage["actual_cost_usd"] == 0.0
    assert s5.usage["reasoning_tokens"] == 0


@pytest.mark.asyncio
async def test_runtime_events_source_unavailable(hermes_adapter: HermesSqliteRuntimeAdapter):
    events = await hermes_adapter.list_events()
    assert events == []

    diagnostics = hermes_adapter.diagnostics.get_records()
    codes = [d.code for d in diagnostics]
    assert "RUNTIME_EVENT_SOURCE_UNAVAILABLE" in codes


@pytest.mark.asyncio
async def test_wal_awareness_without_immutable(hermes_adapter: HermesSqliteRuntimeAdapter):
    """
    Section 105: Verifies that reader reads committed WAL state.
    Inserts a row in WAL mode without checkpointing, and confirms the read-only adapter observes it.
    """
    conn = sqlite3.connect(FIXTURE_DB_PATH)
    cur = conn.cursor()
    # Insert new gateway heartbeat in separate writer connection
    cur.execute(
        """
        INSERT INTO gateway_heartbeats (backend_id, pid, started_at, last_heartbeat, profile, host)
        VALUES ('hermes-wal-heartbeat', 999999, 1789000000.0, 1789000000.0, 'wal-profile', '10.0.0.1');
    """
    )
    conn.commit()
    conn.close()

    # Query through read-only adapter
    def _read_wal(ro_conn: sqlite3.Connection):
        ro_cur = ro_conn.cursor()
        ro_cur.execute("SELECT backend_id FROM gateway_heartbeats WHERE backend_id='hermes-wal-heartbeat';")
        return ro_cur.fetchone()

    res = await hermes_adapter.database.execute_read(_read_wal)
    assert res is not None
    assert res["backend_id"] == "hermes-wal-heartbeat"


@pytest.mark.asyncio
async def test_runtime_overview_derivation(hermes_adapter: HermesSqliteRuntimeAdapter):
    overview = await hermes_adapter.get_runtime_overview()
    assert overview.status == "HEALTHY"
    assert overview.confidence == "CONFIRMED"
    assert overview.active_sessions_count >= 1
    assert overview.active_workers_count >= 1

