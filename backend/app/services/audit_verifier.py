import sqlite3
from typing import Optional, Tuple
from app.db.migrations import compute_audit_hash, GENESIS_EVENT_ID, GENESIS_PREVIOUS_HASH


def verify_audit_chain(conn: sqlite3.Connection) -> Tuple[bool, Optional[str]]:
    """
    Verify the complete cryptographic integrity of the append-only audit ledger.
    Returns (True, None) if unbroken, or (False, error_detail) if any tampering is detected.
    """
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT sequence, event_id, timestamp, actor_id, action, resource_id,
               outcome, reason, intent_id, payload_hash, previous_hash, record_hash
        FROM audit_ledger
        ORDER BY sequence ASC;
        """
    )
    rows = cursor.fetchall()
    if not rows:
        return False, "Audit ledger is empty: missing genesis record."

    prev_hash = GENESIS_PREVIOUS_HASH
    expected_seq = 0

    for row in rows:
        seq = row["sequence"]
        event_id = row["event_id"]
        timestamp = row["timestamp"]
        actor_id = row["actor_id"]
        action = row["action"]
        resource_id = row["resource_id"]
        outcome = row["outcome"]
        reason = row["reason"]
        intent_id = row["intent_id"]
        payload_hash = row["payload_hash"]
        previous_hash = row["previous_hash"]
        stored_record_hash = row["record_hash"]

        # Check sequence continuity
        if seq != expected_seq:
            return False, f"Sequence gap/ordering violation: expected {expected_seq}, got {seq} (event {event_id})"

        # Check previous hash link
        if previous_hash != prev_hash:
            return (
                False,
                f"Broken audit hash link at sequence {seq} (event {event_id}): "
                f"expected previous_hash '{prev_hash}', got '{previous_hash}'",
            )

        # Recompute expected hash
        recomputed_hash = compute_audit_hash(
            sequence=seq,
            event_id=event_id,
            timestamp=timestamp,
            actor_id=actor_id,
            action=action,
            resource_id=resource_id,
            outcome=outcome,
            reason=reason,
            intent_id=intent_id,
            payload_hash=payload_hash,
            previous_hash=previous_hash,
        )

        if recomputed_hash != stored_record_hash:
            return (
                False,
                f"Tamper detected at sequence {seq} (event {event_id}): "
                f"computed hash '{recomputed_hash}' does not match stored hash '{stored_record_hash}'",
            )

        # Advance pointer
        prev_hash = stored_record_hash
        expected_seq += 1

    return True, None
