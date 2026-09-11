import copy
import pytest

from app.adapters.mock_adapters import MockProfileAdapter, MockRuntimeAdapter, MockSkillAdapter
from app.realtime.delta import RealtimeDeltaService
from app.realtime.protocol import (
    create_delta_message,
    create_error_message,
    create_heartbeat_message,
    create_resync_message,
    create_snapshot_message,
    validate_protocol_version,
)
from app.realtime.replay import RealtimeReplayBuffer
from app.realtime.snapshot import CanonicalSnapshotService
from app.repositories.memory.activity_repo import InMemoryActivityRepository
from app.repositories.memory.approval_repo import InMemoryApprovalRepository
from app.repositories.memory.task_repo import InMemoryTaskRepository
from app.schemas.agents import AgentDto
from app.schemas.delegations import DelegationDto
from app.services.agent_service import AgentProjectionService


@pytest.fixture
def test_repos_and_services():
    profile_catalog = MockProfileAdapter()
    skill_catalog = MockSkillAdapter()
    runtime_reader = MockRuntimeAdapter()
    task_repo = InMemoryTaskRepository()
    approval_repo = InMemoryApprovalRepository()
    activity_repo = InMemoryActivityRepository()

    agent_service = AgentProjectionService(
        profile_catalog=profile_catalog,
        skill_catalog=skill_catalog,
        runtime_reader=runtime_reader,
        task_repo=task_repo,
        approval_repo=approval_repo,
        is_mock=True,
    )

    snapshot_service = CanonicalSnapshotService(
        agent_service=agent_service,
        task_repo=task_repo,
        approval_repo=approval_repo,
        runtime_reader=runtime_reader,
        activity_repo=activity_repo,
    )

    return {
        "snapshot_service": snapshot_service,
        "runtime_reader": runtime_reader,
        "task_repo": task_repo,
        "approval_repo": approval_repo,
    }


def test_protocol_envelope_and_version():
    assert validate_protocol_version("1") is True
    assert validate_protocol_version("2") is False
    assert validate_protocol_version("") is False

    snap_msg = create_snapshot_message(
        snapshot_data={"test": True},
        sequence=10,
        server_instance_id="mc-test-1",
    )
    assert snap_msg.protocol_version == "1"
    assert snap_msg.type == "snapshot"
    assert snap_msg.sequence == 10
    assert snap_msg.server_instance_id == "mc-test-1"
    assert snap_msg.generated_at.endswith("Z")

    err_msg = create_error_message(
        sequence=11,
        server_instance_id="mc-test-1",
        code="TEST_ERROR",
        message="Test error message",
    )
    assert err_msg.type == "error"
    assert err_msg.payload.code == "TEST_ERROR"

    resync_msg = create_resync_message(
        sequence=12,
        server_instance_id="mc-test-1",
        reason="sequence_gap",
    )
    assert resync_msg.type == "resync_required"
    assert resync_msg.payload.reason == "sequence_gap"

    hb_msg = create_heartbeat_message(sequence=13, server_instance_id="mc-test-1")
    assert hb_msg.type == "heartbeat"


@pytest.mark.asyncio
async def test_snapshot_generation_and_determinism(test_repos_and_services):
    service = test_repos_and_services["snapshot_service"]
    snapshot = await service.get_snapshot()

    assert snapshot.revision == 1
    assert snapshot.gateway.connected is True
    assert len(snapshot.agents) > 0

    # Stable sorted by ID
    agent_ids = [a.id for a in snapshot.agents]
    assert agent_ids == sorted(agent_ids)

    # Active delegations sorted by ID
    del_ids = [d.id for d in snapshot.active_delegations]
    assert del_ids == sorted(del_ids)

    # UNKNOWN semantics preserved, not collapsed to zero
    for a in snapshot.agents:
        assert a.runtime.state in [
            "ACTIVE", "IDLE", "RECENTLY_ACTIVE", "AWAITING_APPROVAL",
            "DEGRADED", "ERROR", "OFFLINE", "UNKNOWN", "CONFIGURATION_INCOMPLETE"
        ]


@pytest.mark.asyncio
async def test_pure_diff_delta_single_agent(test_repos_and_services):
    service = test_repos_and_services["snapshot_service"]
    delta_service = RealtimeDeltaService()

    snap_a = await service.get_snapshot()

    # Toggle the state of the first agent
    snap_b = copy.deepcopy(snap_a)
    snap_b.revision = 2
    target_agent = snap_b.agents[0]
    original_state = snap_a.agents[0].runtime.state
    new_state = "IDLE" if original_state == "ACTIVE" else "ACTIVE"
    target_agent.runtime.state = new_state
    target_id = target_agent.id

    delta = delta_service.compute_delta(snap_a, snap_b)
    assert delta is not None
    assert delta.base_revision == 1
    assert delta.revision == 2
    assert delta.changes.agents is not None
    assert len(delta.changes.agents.upsert) == 1
    assert delta.changes.agents.upsert[0].id == target_id
    assert delta.changes.agents.upsert[0].runtime.state == new_state
    assert len(delta.changes.agents.remove) == 0

    # Verify unrelated entities are omitted
    assert delta.changes.gateway is None
    assert delta.changes.task_summary is None
    assert delta.changes.approval_summary is None


@pytest.mark.asyncio
async def test_no_change_suppression(test_repos_and_services):
    service = test_repos_and_services["snapshot_service"]
    delta_service = RealtimeDeltaService()

    snap_a = await service.get_snapshot()
    snap_b = copy.deepcopy(snap_a)
    snap_b.revision = 2

    # Exactly identical snapshots should produce None
    delta = delta_service.compute_delta(snap_a, snap_b)
    assert delta is None

    # Volatile heartbeat_age_seconds changing should NOT produce a delta
    snap_b.gateway.heartbeat_age_seconds = (snap_b.gateway.heartbeat_age_seconds or 0) + 2
    delta = delta_service.compute_delta(snap_a, snap_b)
    assert delta is None


@pytest.mark.asyncio
async def test_entity_removal_in_active_delegations(test_repos_and_services):
    service = test_repos_and_services["snapshot_service"]
    delta_service = RealtimeDeltaService()

    snap_a = await service.get_snapshot()
    # Add a mock active delegation to snap_a
    del1 = DelegationDto(
        id="del-temp-1",
        task_title="Subtask 1",
        state="RUNNING",
        started_at="2026-09-10T00:00:00Z",
    )
    snap_a.active_delegations.append(del1)

    # In snap_b, delegation completed and left active set
    snap_b = copy.deepcopy(snap_a)
    snap_b.revision = 2
    snap_b.active_delegations = []

    delta = delta_service.compute_delta(snap_a, snap_b)
    assert delta is not None
    assert delta.changes.active_delegations is not None
    assert "del-temp-1" in delta.changes.active_delegations.remove
    assert len(delta.changes.active_delegations.upsert) == 0


@pytest.mark.asyncio
async def test_multi_entity_delta(test_repos_and_services):
    service = test_repos_and_services["snapshot_service"]
    delta_service = RealtimeDeltaService()

    snap_a = await service.get_snapshot()

    snap_b = copy.deepcopy(snap_a)
    snap_b.revision = 2
    # 1. Agent change
    snap_b.agents[0].runtime.state = "AWAITING_APPROVAL"
    # 2. Gateway change
    snap_b.gateway.latency_ms = 42
    # 3. Approval change
    snap_b.approval_summary["pending"] += 1

    delta = delta_service.compute_delta(snap_a, snap_b)
    assert delta is not None
    assert delta.changes.agents is not None
    assert delta.changes.gateway is not None
    assert delta.changes.gateway.latency_ms == 42
    assert delta.changes.approval_summary is not None
    assert delta.changes.approval_summary["pending"] == snap_a.approval_summary["pending"] + 1


def test_replay_buffer_operations():
    buffer = RealtimeReplayBuffer(max_size=5)

    # Empty buffer
    assert buffer.get_messages_since(0) is None

    # Append 5 messages (seq 1 to 5)
    for seq in range(1, 6):
        msg = create_heartbeat_message(sequence=seq, server_instance_id="mc-inst-1")
        buffer.append(msg)

    assert buffer.current_size == 5
    assert buffer.latest_sequence == 5

    # Client asking for seq >= 5 gets empty list (up to date)
    assert buffer.get_messages_since(5) == []

    # Client asking for seq 3 gets messages 4 and 5
    res = buffer.get_messages_since(3)
    assert res is not None
    assert len(res) == 2
    assert [m.sequence for m in res] == [4, 5]

    # Append 2 more (seq 6, 7) -> evicts seq 1 and 2
    for seq in range(6, 8):
        buffer.append(create_heartbeat_message(sequence=seq, server_instance_id="mc-inst-1"))

    assert buffer.current_size == 5
    # Requesting evicted sequence 1 -> None (resync required)
    assert buffer.get_messages_since(1) is None
    # Requesting sequence 2 (oldest retained is 3, min_seq - 1 = 2) -> returns [3, 4, 5, 6, 7]
    replayed = buffer.get_messages_since(2)
    assert replayed is not None
    assert len(replayed) == 5
    assert replayed[0].sequence == 3


@pytest.mark.asyncio
async def test_privacy_invariants(test_repos_and_services):
    service = test_repos_and_services["snapshot_service"]
    snapshot = await service.get_snapshot()

    raw_json = snapshot.model_dump_json()

    # Forbidden private or sensitive terms
    forbidden = ["system_prompt", "transcript", "raw_messages", "api_key", "bearer ", "private_key", "authorization"]
    for word in forbidden:
        assert word not in raw_json.lower(), f"Privacy violation: '{word}' found in realtime snapshot"
