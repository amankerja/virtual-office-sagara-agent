import logging
from typing import Optional
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect, status

from app.config import settings
from app.realtime.protocol import (
    create_error_message,
    create_resync_message,
    create_snapshot_message,
    validate_protocol_version,
)
from app.realtime.types import PROTOCOL_VERSION

logger = logging.getLogger("mission_control.realtime")

realtime_router = APIRouter(tags=["Realtime"])


def is_allowed_origin(origin: Optional[str]) -> bool:
    if not origin:
        return True
    if "*" in settings.cors_origins:
        return True
    if origin in settings.cors_origins:
        return True
    if "alkaralintas.site" in origin or "localhost" in origin or "127.0.0.1" in origin:
        return True
    return False


@realtime_router.websocket("/realtime/ws")
async def realtime_websocket_endpoint(
    websocket: WebSocket,
    protocol_version: str = PROTOCOL_VERSION,
    from_sequence: Optional[int] = None,
    server_instance_id: Optional[str] = None,
) -> None:
    # 1. Validate protocol version
    if not validate_protocol_version(protocol_version):
        await websocket.accept()
        err_envelope = create_error_message(
            sequence=0,
            server_instance_id="unsupported",
            code="REALTIME_PROTOCOL_UNSUPPORTED",
            message=f"Unsupported protocol version '{protocol_version}'. Required: '{PROTOCOL_VERSION}'.",
        )
        await websocket.send_text(err_envelope.model_dump_json())
        await websocket.close(code=status.WS_1002_PROTOCOL_ERROR)
        return

    # 2. Check Origin
    origin = websocket.headers.get("origin")
    if not is_allowed_origin(origin):
        logger.warning(f"WebSocket rejected: disallowed origin '{origin}'")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    # 3. Accept connection
    await websocket.accept()

    # Import dependencies for manager & snapshot
    from app.api.dependencies import get_realtime_manager, get_realtime_snapshot_service

    manager = get_realtime_manager()
    snapshot_service = get_realtime_snapshot_service()

    session = await manager.register(websocket)
    if not session:
        # At connection capacity
        err_envelope = create_error_message(
            sequence=manager.sequence,
            server_instance_id=manager.server_instance_id,
            code="REALTIME_CAPACITY_EXCEEDED",
            message="Server connection limit reached. Please retry later.",
        )
        await websocket.send_text(err_envelope.model_dump_json())
        await websocket.close(code=status.WS_1013_TRY_AGAIN_LATER)
        return

    try:
        # 4. Handle initial sync / replay
        replayed = False
        if (
            server_instance_id == manager.server_instance_id
            and from_sequence is not None
        ):
            buffered_messages = manager.replay_buffer.get_messages_since(from_sequence)
            if buffered_messages is not None:
                # Replay missing messages
                for msg in buffered_messages:
                    await manager.send_to_client(session, msg)
                replayed = True
            else:
                # Sequence gap or evicted: notify resync required
                resync_msg = create_resync_message(
                    sequence=manager.sequence,
                    server_instance_id=manager.server_instance_id,
                    reason="sequence_gap_evicted",
                )
                await manager.send_to_client(session, resync_msg)

        if not replayed:
            # Send current canonical snapshot
            snapshot = manager.latest_snapshot
            if snapshot is None:
                snapshot = await snapshot_service.get_snapshot()
                await manager.handle_new_snapshot(snapshot)
            else:
                snap_msg = create_snapshot_message(
                    snapshot_data=snapshot,
                    sequence=manager.sequence,
                    server_instance_id=manager.server_instance_id,
                    generated_at=snapshot.generated_at,
                )
                await manager.send_to_client(session, snap_msg)

        # 5. Receive loop to keep connection alive and handle client frames
        while True:
            # Wait for client text or ping frames
            _ = await websocket.receive_text()

    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected: {session.client_id}")
    except Exception as exc:
        logger.warning(f"WebSocket client exception: {exc}")
    finally:
        await manager.unregister(session.client_id)
