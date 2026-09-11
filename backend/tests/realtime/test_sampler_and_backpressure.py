import asyncio
import pytest

from app.api.dependencies import get_realtime_manager, get_realtime_sampler, get_realtime_snapshot_service
from app.realtime.manager import ClientSession, RealtimeConnectionManager
from app.realtime.protocol import create_heartbeat_message
from app.realtime.sampler import RealtimeSampler
from app.realtime.snapshot import CanonicalSnapshotService


@pytest.mark.asyncio
async def test_sampler_single_flight():
    manager = RealtimeConnectionManager()
    snapshot_service = get_realtime_snapshot_service()

    sampler = RealtimeSampler(
        snapshot_service=snapshot_service,
        connection_manager=manager,
        interval_seconds=1.0,
    )

    # Acquire lock manually to simulate an ongoing sample iteration
    async with sampler._single_flight_lock:
        initial_samples = sampler.sample_count
        # Attempt another sample while locked
        await sampler.sample_once()
        # Sample count should NOT increase because it was skipped
        assert sampler.sample_count == initial_samples


@pytest.mark.asyncio
async def test_sampler_error_containment():
    manager = RealtimeConnectionManager()

    # Mock snapshot service that raises an exception
    class FailingSnapshotService:
        async def get_snapshot(self):
            raise RuntimeError("Simulated read failure in SQLite adapter")

    sampler = RealtimeSampler(
        snapshot_service=FailingSnapshotService(),  # type: ignore
        connection_manager=manager,
        interval_seconds=1.0,
    )

    # Should not raise exception
    await sampler.sample_once()
    assert sampler.sample_error_count == 1
    assert sampler.sample_count == 0


@pytest.mark.asyncio
async def test_backpressure_slow_client():
    manager = RealtimeConnectionManager(client_queue_size=2)

    # Create dummy session
    session = ClientSession(client_id="slow-1", websocket=None, queue_size=2)  # type: ignore
    manager._clients[session.client_id] = session

    # Fill queue to capacity (2 items)
    msg1 = create_heartbeat_message(sequence=1, server_instance_id="mc-1")
    msg2 = create_heartbeat_message(sequence=2, server_instance_id="mc-1")
    await manager.send_to_client(session, msg1)
    await manager.send_to_client(session, msg2)

    # Third message causes backpressure
    msg3 = create_heartbeat_message(sequence=3, server_instance_id="mc-1")
    ok = await manager.send_to_client(session, msg3)

    assert ok is False
    assert manager.slow_client_drops >= 1
    assert manager.resync_events >= 1


@pytest.mark.asyncio
async def test_capacity_limit():
    manager = RealtimeConnectionManager(max_connections=2)

    s1 = await manager.register(None)  # type: ignore
    assert s1 is not None
    s2 = await manager.register(None)  # type: ignore
    assert s2 is not None

    # Third client exceeds capacity
    s3 = await manager.register(None)  # type: ignore
    assert s3 is None
    assert manager.connected_clients_count == 2

    await manager.unregister(s1.client_id)
    assert manager.connected_clients_count == 1


@pytest.mark.asyncio
async def test_query_load_with_ten_clients_does_not_multiply():
    """Verify that having 10 clients does not multiply database read queries tenfold."""
    manager = RealtimeConnectionManager(max_connections=50)

    class CountingSnapshotService:
        def __init__(self):
            self.read_count = 0

        async def get_snapshot(self):
            self.read_count += 1
            # Return fresh dummy snapshot
            from app.realtime.protocol import get_utc_now_iso
            from app.realtime.types import CanonicalRealtimeSnapshot
            from app.schemas.runtime import GatewayDto, RuntimeOverviewDto
            return CanonicalRealtimeSnapshot(
                generated_at=get_utc_now_iso(),
                revision=self.read_count,
                gateway=GatewayDto(status="HEALTHY", connected=True, latency_ms=5, last_heartbeat_at=get_utc_now_iso()),
                runtime_summary=RuntimeOverviewDto(status="HEALTHY", uptime_seconds=10, active_sessions_count=0, active_workers_count=0),
                agents=[],
                task_summary={},
                approval_summary={},
                active_delegations=[],
                attention=[],
            )

    counting_service = CountingSnapshotService()
    sampler = RealtimeSampler(
        snapshot_service=counting_service,  # type: ignore
        connection_manager=manager,
        interval_seconds=1.0,
    )

    # Register 10 client sessions
    sessions = []
    for i in range(10):
        s = ClientSession(client_id=f"client-{i}", websocket=None, queue_size=16)  # type: ignore
        manager._clients[s.client_id] = s
        sessions.append(s)

    assert manager.connected_clients_count == 10

    # Sample once through the shared sampler
    await sampler.sample_once()

    # Database read must only happen ONCE, not 10 times!
    assert counting_service.read_count == 1

    # All 10 clients have received the broadcast message in their queues
    for s in sessions:
        assert s.queue.qsize() == 1
        msg = s.queue.get_nowait()
        assert msg.type == "snapshot"

