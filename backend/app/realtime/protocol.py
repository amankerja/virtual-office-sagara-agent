from datetime import datetime, timezone
from typing import Any, Optional

from app.realtime.types import (
    ErrorPayload,
    PROTOCOL_VERSION,
    RealtimeDelta,
    RealtimeMessageEnvelope,
    RealtimeMessageType,
    ResyncPayload,
)


def get_utc_now_iso() -> str:
    """Return current UTC time formatted as ISO 8601 string ending in Z."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def validate_protocol_version(version: str) -> bool:
    """Validate incoming client protocol version."""
    return version == PROTOCOL_VERSION


def create_envelope(
    msg_type: RealtimeMessageType,
    sequence: int,
    server_instance_id: str,
    payload: Any,
    generated_at: Optional[str] = None,
) -> RealtimeMessageEnvelope:
    """Create a canonical versioned message envelope."""
    return RealtimeMessageEnvelope(
        protocol_version=PROTOCOL_VERSION,
        type=msg_type,
        sequence=sequence,
        generated_at=generated_at or get_utc_now_iso(),
        server_instance_id=server_instance_id,
        payload=payload,
    )


def create_snapshot_message(
    snapshot_data: Any,
    sequence: int,
    server_instance_id: str,
    generated_at: Optional[str] = None,
) -> RealtimeMessageEnvelope:
    """Create a SNAPSHOT message."""
    return create_envelope(
        msg_type="snapshot",
        sequence=sequence,
        server_instance_id=server_instance_id,
        payload=snapshot_data,
        generated_at=generated_at,
    )


def create_delta_message(
    delta: RealtimeDelta,
    sequence: int,
    server_instance_id: str,
) -> RealtimeMessageEnvelope:
    """Create a DELTA message."""
    return create_envelope(
        msg_type="delta",
        sequence=sequence,
        server_instance_id=server_instance_id,
        payload=delta,
        generated_at=delta.generated_at,
    )


def create_heartbeat_message(
    sequence: int,
    server_instance_id: str,
) -> RealtimeMessageEnvelope:
    """Create a transport HEARTBEAT message."""
    return create_envelope(
        msg_type="heartbeat",
        sequence=sequence,
        server_instance_id=server_instance_id,
        payload={},
    )


def create_resync_message(
    sequence: int,
    server_instance_id: str,
    reason: str = "sequence_gap",
) -> RealtimeMessageEnvelope:
    """Create a RESYNC_REQUIRED message."""
    return create_envelope(
        msg_type="resync_required",
        sequence=sequence,
        server_instance_id=server_instance_id,
        payload=ResyncPayload(reason=reason),
    )


def create_error_message(
    sequence: int,
    server_instance_id: str,
    code: str,
    message: str,
) -> RealtimeMessageEnvelope:
    """Create a safe operational ERROR message."""
    return create_envelope(
        msg_type="error",
        sequence=sequence,
        server_instance_id=server_instance_id,
        payload=ErrorPayload(code=code, message=message),
    )
