import hashlib
import json
import sqlite3
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
from app.api.errors import ConflictError
from app.config import settings
from app.db.connection import get_db_connection


class PersistentIdempotencyStore:
    """SQLite-backed persistent idempotency store."""

    def __init__(self, db_path_override: Optional[str] = None) -> None:
        self._db_path_override = db_path_override

    def _get_connection(self) -> sqlite3.Connection:
        return get_db_connection(self._db_path_override)

    @staticmethod
    def compute_hash(payload: Any) -> str:
        """Deterministic SHA-256 fingerprint of request payload."""
        if payload is None:
            return "empty"
        try:
            serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
        except Exception:
            serialized = str(payload)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    async def get_response(
        self,
        key: str,
        operation: str,
        payload_hash: str,
        principal_id: str = "default-operator",
    ) -> Optional[dict[str, Any]]:
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT payload_hash, response_body, expires_at
                FROM idempotency_records
                WHERE idempotency_key = ? AND scope = ? AND principal_id = ?;
                """,
                (key, operation, principal_id),
            )
            row = cursor.fetchone()
            if not row:
                return None

            # Check if payload hash matches
            stored_hash = row["payload_hash"]
            if stored_hash != payload_hash:
                raise ConflictError(
                    code="IDEMPOTENCY_CONFLICT",
                    message="Idempotency key was previously used with a different request payload.",
                    details={"key": key, "scope": operation},
                )

            # Check expiration
            expires_at = row["expires_at"]
            if expires_at:
                now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
                if now_str > expires_at:
                    # Expired record
                    return None

            body_str = row["response_body"]
            return json.loads(body_str) if body_str else None
        finally:
            conn.close()

    async def save_response(
        self,
        key: str,
        operation: str,
        payload_hash: str,
        response: dict[str, Any],
        principal_id: str = "default-operator",
        method: str = "POST",
        route: str = "",
        response_code: int = 200,
        ttl_seconds: Optional[int] = None,
    ) -> None:
        conn = self._get_connection()
        try:
            now = datetime.now(timezone.utc)
            now_str = now.isoformat().replace("+00:00", "Z")
            ttl = ttl_seconds if ttl_seconds is not None else settings.idempotency_ttl_seconds
            expires_str = (now + timedelta(seconds=ttl)).isoformat().replace("+00:00", "Z")
            body_str = json.dumps(response, sort_keys=True, separators=(",", ":"))

            conn.execute("BEGIN IMMEDIATE;")
            conn.execute(
                """
                INSERT OR REPLACE INTO idempotency_records (
                    idempotency_key, scope, principal_id, method, route,
                    payload_hash, response_code, response_body, created_at, expires_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    key,
                    operation,
                    principal_id,
                    method,
                    route,
                    payload_hash,
                    response_code,
                    body_str,
                    now_str,
                    expires_str,
                ),
            )
            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise
        finally:
            conn.close()
