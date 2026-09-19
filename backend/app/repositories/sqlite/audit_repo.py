import json
import sqlite3
from typing import Optional, Tuple
from app.db.connection import get_db_connection
from app.db.migrations import compute_audit_hash
from app.schemas.audit import AuditRecordDto
from app.schemas.common import EntityReference, RelatedEntities
from app.services.audit_verifier import verify_audit_chain


class SqliteAuditRepository:
    """SQLite-backed append-only tamper-evident audit ledger repository."""

    def __init__(self, db_path_override: Optional[str] = None) -> None:
        self._db_path_override = db_path_override

    def _get_connection(self) -> sqlite3.Connection:
        return get_db_connection(self._db_path_override)

    async def list_audit_records(
        self,
        actor_type: Optional[str] = None,
        outcome: Optional[str] = None,
        correlation_id: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> list[AuditRecordDto]:
        conn = self._get_connection()
        try:
            query = "SELECT * FROM audit_ledger WHERE 1=1"
            params: list = []

            if actor_type and actor_type != "ALL":
                query += " AND actor_type = ?"
                params.append(actor_type)
            if outcome and outcome != "ALL":
                query += " AND outcome = ?"
                params.append(outcome)
            if correlation_id:
                query += " AND correlation_id = ?"
                params.append(correlation_id)

            query += " ORDER BY sequence DESC"

            start_offset = 0
            if cursor:
                try:
                    start_offset = int(cursor)
                except ValueError:
                    start_offset = 0

            query += " LIMIT ? OFFSET ?"
            params.extend([limit, start_offset])

            cursor_obj = conn.cursor()
            cursor_obj.execute(query, params)
            rows = cursor_obj.fetchall()

            records = []
            for r in rows:
                records.append(
                    AuditRecordDto(
                        id=r["event_id"],
                        timestamp=r["timestamp"],
                        actor=EntityReference(
                            type=r["actor_type"],
                            id=r["actor_id"],
                            label=r["actor_label"],
                        ),
                        action=r["action"],
                        target=EntityReference(
                            type=r["resource_type"],
                            id=r["resource_id"],
                            label=r["resource_label"],
                        ),
                        outcome=r["outcome"] if r["outcome"] in ("SUCCESS", "DENIED", "FAILED") else "SUCCESS",
                        reason=r["reason"],
                        correlation_id=r["correlation_id"],
                        related=RelatedEntities(
                            approval_id=r["intent_id"] or None,
                            task_id=r["resource_id"] if r["resource_type"] == "TASK" else None,
                        ),
                    )
                )
            return records
        finally:
            conn.close()

    async def get_audit_record(self, audit_id: str) -> Optional[AuditRecordDto]:
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM audit_ledger WHERE event_id = ? LIMIT 1;", (audit_id,))
            r = cursor.fetchone()
            if not r:
                return None
            return AuditRecordDto(
                id=r["event_id"],
                timestamp=r["timestamp"],
                actor=EntityReference(
                    type=r["actor_type"],
                    id=r["actor_id"],
                    label=r["actor_label"],
                ),
                action=r["action"],
                target=EntityReference(
                    type=r["resource_type"],
                    id=r["resource_id"],
                    label=r["resource_label"],
                ),
                outcome=r["outcome"] if r["outcome"] in ("SUCCESS", "DENIED", "FAILED") else "SUCCESS",
                reason=r["reason"],
                correlation_id=r["correlation_id"],
                related=RelatedEntities(
                    approval_id=r["intent_id"] or None,
                    task_id=r["resource_id"] if r["resource_type"] == "TASK" else None,
                ),
            )
        finally:
            conn.close()

    async def record_audit(
        self,
        record: AuditRecordDto,
        intent_id: Optional[str] = None,
        payload_hash: Optional[str] = None,
        revision: Optional[int] = None,
    ) -> AuditRecordDto:
        """Atomically append a record to the tamper-evident hash chain."""
        conn = self._get_connection()
        try:
            conn.execute("BEGIN IMMEDIATE;")

            # Fetch the latest record in the chain
            cursor = conn.cursor()
            cursor.execute(
                "SELECT sequence, record_hash FROM audit_ledger ORDER BY sequence DESC LIMIT 1;"
            )
            last_row = cursor.fetchone()
            if last_row:
                last_seq = last_row["sequence"]
                prev_hash = last_row["record_hash"]
                next_seq = last_seq + 1
            else:
                next_seq = 0
                prev_hash = "0000000000000000000000000000000000000000000000000000000000000000"

            record_hash = compute_audit_hash(
                sequence=next_seq,
                event_id=record.id,
                timestamp=record.timestamp,
                actor_id=record.actor.id,
                action=record.action,
                resource_id=record.target.id,
                outcome=record.outcome,
                reason=record.reason,
                intent_id=intent_id,
                payload_hash=payload_hash,
                previous_hash=prev_hash,
            )

            conn.execute(
                """
                INSERT INTO audit_ledger (
                    event_id, sequence, timestamp, actor_type, actor_id, actor_label,
                    action, resource_type, resource_id, resource_label, outcome, reason,
                    correlation_id, intent_id, payload_hash, revision, previous_hash, record_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    record.id,
                    next_seq,
                    record.timestamp,
                    record.actor.type,
                    record.actor.id,
                    record.actor.label or record.actor.id,
                    record.action,
                    record.target.type,
                    record.target.id,
                    record.target.label or record.target.id,
                    record.outcome,
                    record.reason,
                    record.correlation_id or "corr-unknown",
                    intent_id,
                    payload_hash,
                    revision or 1,
                    prev_hash,
                    record_hash,
                ),
            )
            conn.execute("COMMIT;")
            return record
        except Exception:
            conn.execute("ROLLBACK;")
            raise
        finally:
            conn.close()

    def verify_chain(self) -> Tuple[bool, Optional[str]]:
        """Run complete cryptographic integrity verification on the audit chain."""
        conn = self._get_connection()
        try:
            return verify_audit_chain(conn)
        finally:
            conn.close()


def append_audit_entry_to_conn(
    conn: sqlite3.Connection,
    event_id: str,
    timestamp: str,
    actor_type: str,
    actor_id: str,
    actor_label: str,
    action: str,
    resource_type: str,
    resource_id: str,
    resource_label: str,
    outcome: str,
    reason: Optional[str],
    correlation_id: str,
    intent_id: Optional[str] = None,
    payload_hash: Optional[str] = None,
    revision: Optional[int] = None,
) -> str:
    """Helper to append an audit entry within an active database connection transaction."""
    cursor = conn.cursor()
    cursor.execute("SELECT sequence, record_hash FROM audit_ledger ORDER BY sequence DESC LIMIT 1;")
    last_row = cursor.fetchone()
    if last_row:
        next_seq = last_row["sequence"] + 1
        prev_hash = last_row["record_hash"]
    else:
        next_seq = 0
        prev_hash = "0000000000000000000000000000000000000000000000000000000000000000"

    rec_hash = compute_audit_hash(
        sequence=next_seq,
        event_id=event_id,
        timestamp=timestamp,
        actor_id=actor_id,
        action=action,
        resource_id=resource_id,
        outcome=outcome,
        reason=reason,
        intent_id=intent_id,
        payload_hash=payload_hash,
        previous_hash=prev_hash,
    )

    conn.execute(
        """
        INSERT INTO audit_ledger (
            event_id, sequence, timestamp, actor_type, actor_id, actor_label,
            action, resource_type, resource_id, resource_label, outcome, reason,
            correlation_id, intent_id, payload_hash, revision, previous_hash, record_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """,
        (
            event_id,
            next_seq,
            timestamp,
            actor_type,
            actor_id,
            actor_label,
            action,
            resource_type,
            resource_id,
            resource_label,
            outcome,
            reason,
            correlation_id,
            intent_id,
            payload_hash,
            revision or 1,
            prev_hash,
            rec_hash,
        ),
    )
    return rec_hash


AuditSqliteRepository = SqliteAuditRepository

