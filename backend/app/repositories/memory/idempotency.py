import hashlib
import json
from typing import Any, Optional
from app.api.errors import ConflictError


class InMemoryIdempotencyStore:
    """Stores completed idempotent mutation responses in memory."""

    def __init__(self) -> None:
        # key: (idempotency_key, operation) -> {"payload_hash": str, "response": dict}
        self._store: dict[tuple[str, str], dict[str, Any]] = {}

    @staticmethod
    def compute_hash(payload: Any) -> str:
        if payload is None:
            return "empty"
        try:
            serialized = json.dumps(payload, sort_keys=True)
        except Exception:
            serialized = str(payload)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    async def get_response(self, key: str, operation: str, payload_hash: str) -> Optional[dict[str, Any]]:
        record = self._store.get((key, operation))
        if not record:
            return None
        if record["payload_hash"] != payload_hash:
            raise ConflictError(
                code="IDEMPOTENCY_CONFLICT",
                message="Idempotency key was previously used with a different request payload.",
            )
        return record["response"]

    async def save_response(self, key: str, operation: str, payload_hash: str, response: dict[str, Any]) -> None:
        self._store[(key, operation)] = {
            "payload_hash": payload_hash,
            "response": response,
        }


idempotency_store = InMemoryIdempotencyStore()
