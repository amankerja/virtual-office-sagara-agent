"""
Read-Only Resource Registry Service (Prompt 14.9A.7 Section 15-21).
Authoritative server-side management of registered read-only resources.
Enforces logical-to-canonical path resolution, hash binding, revocation, and audited changesets.
"""

import hashlib
import json
import secrets
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.api.errors import AppError, ConflictError, ResourceNotFoundError
from app.domain.resource_registry import (
    ReadOnlyResource,
    ResourceRegistryChangeSet,
    CANONICAL_INITIAL_RESOURCES,
)
from app.repositories.sqlite.audit_repo import append_audit_entry_to_conn


class ReadOnlyResourceRegistry:
    """
    Server-side registry for allowed read-only inspection resources.
    Protects against freeform path injection, directory enumeration, and resource drift.
    """

    @classmethod
    def get_resource(cls, conn: sqlite3.Connection, resource_id: str) -> Optional[ReadOnlyResource]:
        """Fetch a registered resource by logical resource ID or canonical path."""
        cursor = conn.cursor()
        try:
            cursor.execute(
                "SELECT * FROM read_only_resources WHERE resource_id = ? OR canonical_path = ?;",
                (resource_id, resource_id),
            )
            row = cursor.fetchone()
            if not row:
                return None
            return cls._row_to_model(row)
        except sqlite3.OperationalError:
            # Table might not exist yet; check in-memory canonical resources
            for r in CANONICAL_INITIAL_RESOURCES:
                if r.resource_id == resource_id or r.canonical_path == resource_id:
                    return r
            return None


    @classmethod
    def list_resources(cls, conn: sqlite3.Connection, enabled_only: bool = False) -> List[ReadOnlyResource]:
        """List registered resources."""
        cursor = conn.cursor()
        try:
            if enabled_only:
                cursor.execute("SELECT * FROM read_only_resources WHERE enabled = 1 ORDER BY resource_id ASC;")
            else:
                cursor.execute("SELECT * FROM read_only_resources ORDER BY resource_id ASC;")
            rows = cursor.fetchall()
            return [cls._row_to_model(row) for row in rows]
        except sqlite3.OperationalError:
            if enabled_only:
                return [r for r in CANONICAL_INITIAL_RESOURCES if r.enabled]
            return list(CANONICAL_INITIAL_RESOURCES)

    @classmethod
    def resolve_and_validate(
        cls,
        conn: sqlite3.Connection,
        resource_id: str,
        base_dir: Path,
    ) -> Tuple[bool, Optional[str], Optional[Path], Optional[ReadOnlyResource], str]:
        """
        Resolve logical resource ID to canonical path and validate immutability.
        Returns (is_valid, denial_code, resolved_path, resource, message).
        """
        resource = cls.get_resource(conn, resource_id)
        if not resource:
            return False, "UNKNOWN_RESOURCE", None, None, f"Resource '{resource_id}' is not in the read-only resource registry (UNKNOWN_RESOURCE)."

        if not resource.enabled:
            return False, "RESOURCE_REVOKED", None, resource, f"Resource '{resource_id}' has been disabled or revoked (RESOURCE_REVOKED)."

        # Systemd service resources don't have filesystem path containment checks
        if resource.resource_type == "SYSTEMD_SERVICE":
            return True, None, None, resource, "Resource validation passed."

        # Document resources: Resolve canonical path relative to base_dir
        candidate = Path(resource.canonical_path)
        if candidate.is_absolute():
            resolved = candidate.resolve()
        else:
            resolved = (base_dir / candidate).resolve()

        if not resolved.exists() or not resolved.is_file():
            return False, "RESOURCE_NOT_FOUND", None, resource, f"Resolved path for resource '{resource_id}' does not exist on disk."

        # Verify disk hash matches registered hash
        if resource.current_hash:
            try:
                data = resolved.read_bytes()
                actual_hash = hashlib.sha256(data).hexdigest()
                if actual_hash != resource.current_hash:
                    return False, "DOCUMENT_RESOURCE_CHANGED", resolved, resource, (
                        f"Resource content hash mismatch: registered '{resource.current_hash}' != disk '{actual_hash}' (DOCUMENT_RESOURCE_CHANGED)."
                    )
            except Exception as e:
                return False, "FILE_READ_ERROR", resolved, resource, f"Failed to read resource '{resource_id}' for hash verification: {e}"

        return True, None, resolved, resource, "Resource validation passed."

    @classmethod
    def set_resource_enabled(
        cls,
        conn: sqlite3.Connection,
        resource_id: str,
        enabled: bool,
        actor_id: str,
        reason: str = "Resource status toggle",
    ) -> ReadOnlyResource:
        """Enable or disable (revoke) a registered resource with audit logging."""
        now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM read_only_resources WHERE resource_id = ?;", (resource_id,))
        row = cursor.fetchone()
        if not row:
            raise ResourceNotFoundError(f"Resource '{resource_id}' not found in registry.")

        conn.execute("BEGIN IMMEDIATE;")
        try:
            conn.execute(
                "UPDATE read_only_resources SET enabled = ?, updated_at = ? WHERE resource_id = ?;",
                (1 if enabled else 0, now_str, resource_id),
            )
            append_audit_entry_to_conn(
                conn=conn,
                event_id=f"aud-{secrets.token_hex(8)}",
                timestamp=now_str,
                actor_type="USER",
                actor_id=actor_id,
                actor_label=actor_id,
                action="resource_registry.revoked" if not enabled else "resource_registry.enabled",
                resource_type="RESOURCE",
                resource_id=resource_id,
                resource_label=f"Resource {resource_id}",
                outcome="SUCCESS",
                reason=f"{reason}: enabled={enabled}",
                correlation_id=f"corr-res-{secrets.token_hex(6)}",
            )

            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise

        updated = cls.get_resource(conn, resource_id)
        assert updated is not None
        return updated

    @classmethod
    def seed_canonical_resources(cls, conn: sqlite3.Connection) -> None:
        """Seed initial canonical resources if table is empty."""
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS cnt FROM read_only_resources;")
        row = cursor.fetchone()
        cnt = (row["cnt"] if isinstance(row, sqlite3.Row) else row[0]) if row else 0
        if cnt == 0:
            for r in CANONICAL_INITIAL_RESOURCES:
                conn.execute(
                    """
                    INSERT INTO read_only_resources (
                        resource_id, display_name, canonical_path, root_id, resource_type,
                        enabled, classification, max_bytes, max_lines, current_hash,
                        allow_redaction, owner_policy, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        r.resource_id,
                        r.display_name,
                        r.canonical_path,
                        r.root_id,
                        r.resource_type,
                        1 if r.enabled else 0,
                        r.classification,
                        r.max_bytes,
                        r.max_lines,
                        r.current_hash,
                        1 if r.allow_redaction else 0,
                        r.owner_policy,
                        r.created_at,
                        r.updated_at,
                    ),
                )

    @staticmethod
    def _row_to_model(row: Any) -> ReadOnlyResource:
        keys = row.keys() if hasattr(row, "keys") else []
        def g(k, default=None):
            return row[k] if k in keys else default

        return ReadOnlyResource(
            resource_id=g("resource_id"),
            display_name=g("display_name"),
            canonical_path=g("canonical_path"),
            root_id=g("root_id"),
            resource_type=g("resource_type", "DOCUMENT"),
            enabled=bool(g("enabled", 1)),
            classification=g("classification", "INTERNAL"),
            max_bytes=int(g("max_bytes", 32768)),
            max_lines=int(g("max_lines", 500)),
            current_hash=g("current_hash"),
            allow_redaction=bool(g("allow_redaction", 1)),
            owner_policy=g("owner_policy", "MISSION_CONTROL"),
            created_at=g("created_at"),
            updated_at=g("updated_at"),
        )
