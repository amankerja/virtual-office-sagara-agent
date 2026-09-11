import asyncio
import copy
import json
import pytest
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.api.dependencies import (
    get_realtime_manager,
    get_realtime_snapshot_service,
    reconfigure_dependencies,
)
from app.main import create_app
from app.realtime.router import realtime_websocket_endpoint


class MockWebSocket:
    """In-memory WebSocket mock for fast, deterministic async endpoint testing."""

    def __init__(self, headers: dict = None) -> None:
        self.headers = headers or {"origin": "http://localhost:5173"}
        self.sent_messages: list[str] = []
        self.is_accepted: bool = False
        self.is_closed: bool = False
        self.close_code: int = 1000
        self._receive_queue: asyncio.Queue[str] = asyncio.Queue()

    async def accept(self) -> None:
        self.is_accepted = True

    async def send_text(self, text: str) -> None:
        self.sent_messages.append(text)

    async def receive_text(self) -> str:
        return await self._receive_queue.get()

    async def push_client_message(self, text: str) -> None:
        await self._receive_queue.put(text)

    async def close(self, code: int = 1000) -> None:
        self.is_closed = True
        self.close_code = code


@pytest.fixture
def test_app():
    reconfigure_dependencies()
    return create_app()


def test_ws_connect_receives_initial_snapshot_via_testclient(test_app):
    """Wire-level test with Starlette TestClient."""
    with TestClient(test_app) as client:
        with client.websocket_connect("/api/v1/realtime/ws") as websocket:
            data = websocket.receive_text()
            envelope = json.loads(data)

            assert envelope["protocol_version"] == "1"
            assert envelope["type"] == "snapshot"
            assert envelope["sequence"] >= 1
            assert envelope["server_instance_id"].startswith("mc-")
            assert "generated_at" in envelope

            payload = envelope["payload"]
            assert "gateway" in payload
            assert "agents" in payload
            assert "task_summary" in payload
            assert "approval_summary" in payload
            assert "active_delegations" in payload
            assert "attention" in payload


def test_ws_unsupported_protocol_version_via_testclient(test_app):
    """Protocol version mismatch triggers REALTIME_PROTOCOL_UNSUPPORTED."""
    with TestClient(test_app) as client:
        with client.websocket_connect("/api/v1/realtime/ws?protocol_version=99") as websocket:
            data = websocket.receive_text()
            envelope = json.loads(data)

            assert envelope["type"] == "error"
            assert envelope["payload"]["code"] == "REALTIME_PROTOCOL_UNSUPPORTED"


@pytest.mark.asyncio
async def test_ws_delta_broadcast_to_client():
    reconfigure_dependencies()
    manager = get_realtime_manager()
    snapshot_service = get_realtime_snapshot_service()

    ws = MockWebSocket()

    # Launch endpoint in background task
    endpoint_task = asyncio.create_task(
        realtime_websocket_endpoint(websocket=ws)  # type: ignore
    )

    # Allow registration and initial snapshot delivery
    await asyncio.sleep(0.05)
    assert len(ws.sent_messages) == 1
    snap_env = json.loads(ws.sent_messages[0])
    assert snap_env["type"] == "snapshot"
    initial_seq = snap_env["sequence"]

    # Produce a state change on an agent
    snap = await snapshot_service.get_snapshot()
    snap.revision += 1
    orig_state = snap.agents[0].runtime.state
    new_state = "IDLE" if orig_state == "ACTIVE" else "ACTIVE"
    snap.agents[0].runtime.state = new_state
    modified_agent_id = snap.agents[0].id

    # Manager processes fresh snapshot and broadcasts delta
    await manager.handle_new_snapshot(snap)
    await asyncio.sleep(0.05)

    assert len(ws.sent_messages) == 2
    delta_env = json.loads(ws.sent_messages[1])

    assert delta_env["type"] == "delta"
    assert delta_env["sequence"] == initial_seq + 1
    assert delta_env["server_instance_id"] == manager.server_instance_id

    changes = delta_env["payload"]["changes"]
    assert "agents" in changes
    assert len(changes["agents"]["upsert"]) == 1
    assert changes["agents"]["upsert"][0]["id"] == modified_agent_id
    assert changes["agents"]["upsert"][0]["runtime"]["state"] == new_state

    # Clean up endpoint task
    endpoint_task.cancel()
    try:
        await endpoint_task
    except asyncio.CancelledError:
        pass


@pytest.mark.asyncio
async def test_ws_reconnect_replay():
    reconfigure_dependencies()
    manager = get_realtime_manager()
    snapshot_service = get_realtime_snapshot_service()

    # 1. First connection
    ws1 = MockWebSocket()
    task1 = asyncio.create_task(realtime_websocket_endpoint(websocket=ws1))  # type: ignore
    await asyncio.sleep(0.05)
    assert len(ws1.sent_messages) == 1
    snap_data = json.loads(ws1.sent_messages[0])
    server_inst = snap_data["server_instance_id"]
    seq_1 = snap_data["sequence"]

    task1.cancel()
    try:
        await task1
    except asyncio.CancelledError:
        pass

    # 2. Produce delta while client is disconnected
    snap = await snapshot_service.get_snapshot()
    snap.revision += 1
    orig_state = snap.agents[0].runtime.state
    snap.agents[0].runtime.state = "IDLE" if orig_state == "ACTIVE" else "ACTIVE"
    await manager.handle_new_snapshot(snap)

    # 3. Reconnect specifying matching server_instance_id and from_sequence=seq_1
    ws2 = MockWebSocket()
    task2 = asyncio.create_task(
        realtime_websocket_endpoint(  # type: ignore
            websocket=ws2,
            server_instance_id=server_inst,
            from_sequence=seq_1,
        )
    )
    await asyncio.sleep(0.05)

    assert len(ws2.sent_messages) == 1
    replayed = json.loads(ws2.sent_messages[0])
    assert replayed["type"] == "delta"
    assert replayed["sequence"] == seq_1 + 1

    task2.cancel()
    try:
        await task2
    except asyncio.CancelledError:
        pass


@pytest.mark.asyncio
async def test_ws_reconnect_gap_triggers_resync():
    reconfigure_dependencies()
    manager = get_realtime_manager()
    server_inst = manager.server_instance_id

    # Reconnect with a sequence gap that cannot be satisfied from empty buffer
    ws = MockWebSocket()
    task = asyncio.create_task(
        realtime_websocket_endpoint(  # type: ignore
            websocket=ws,
            server_instance_id=server_inst,
            from_sequence=999,
        )
    )
    await asyncio.sleep(0.05)

    assert len(ws.sent_messages) >= 1
    first_msg = json.loads(ws.sent_messages[0])
    assert first_msg["type"] in ["resync_required", "snapshot"]

    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


@pytest.mark.asyncio
async def test_ws_multi_client_broadcast_and_cleanup():
    reconfigure_dependencies()
    manager = get_realtime_manager()
    snapshot_service = get_realtime_snapshot_service()

    ws1 = MockWebSocket()
    ws2 = MockWebSocket()

    t1 = asyncio.create_task(realtime_websocket_endpoint(websocket=ws1))  # type: ignore
    t2 = asyncio.create_task(realtime_websocket_endpoint(websocket=ws2))  # type: ignore

    await asyncio.sleep(0.05)
    assert manager.connected_clients_count == 2
    assert len(ws1.sent_messages) == 1
    assert len(ws2.sent_messages) == 1

    # Mutate state
    snap = await snapshot_service.get_snapshot()
    snap.revision += 1
    orig_state = snap.agents[0].runtime.state
    snap.agents[0].runtime.state = "IDLE" if orig_state == "ACTIVE" else "ACTIVE"
    await manager.handle_new_snapshot(snap)

    await asyncio.sleep(0.05)
    # Both clients receive the same delta
    assert len(ws1.sent_messages) == 2
    assert len(ws2.sent_messages) == 2
    d1 = json.loads(ws1.sent_messages[1])
    d2 = json.loads(ws2.sent_messages[1])
    assert d1["sequence"] == d2["sequence"]
    assert d1["payload"]["changes"] == d2["payload"]["changes"]

    # Close t1
    t1.cancel()
    try:
        await t1
    except asyncio.CancelledError:
        pass
    await asyncio.sleep(0.02)
    assert manager.connected_clients_count == 1

    # Close t2
    t2.cancel()
    try:
        await t2
    except asyncio.CancelledError:
        pass
    await asyncio.sleep(0.02)
    assert manager.connected_clients_count == 0
