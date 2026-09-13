import hashlib
import sqlite3
from datetime import datetime, timezone

GENESIS_PREVIOUS_HASH = "0000000000000000000000000000000000000000000000000000000000000000"
GENESIS_EVENT_ID = "aud-000000000000-genesis"


def compute_audit_hash(
    sequence: int,
    event_id: str,
    timestamp: str,
    actor_id: str,
    action: str,
    resource_id: str,
    outcome: str,
    reason: str | None,
    intent_id: str | None,
    payload_hash: str | None,
    previous_hash: str,
) -> str:
    """Deterministic SHA-256 hash chaining for tamper-evident audit ledger."""
    canonical = (
        f"{sequence}|{event_id}|{timestamp}|{actor_id}|{action}|"
        f"{resource_id}|{outcome}|{reason or ''}|{intent_id or ''}|"
        f"{payload_hash or ''}|{previous_hash}"
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def run_migrations(conn: sqlite3.Connection) -> None:
    """Execute versioned schema migrations on the Mission Control database."""
    conn.execute("BEGIN IMMEDIATE;")
    try:
        # Schema migration tracking
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                applied_at TEXT NOT NULL
            );
            """
        )

        cursor = conn.cursor()
        cursor.execute("SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;")
        row = cursor.fetchone()
        current_version = (row["version"] if isinstance(row, sqlite3.Row) else row[0]) if row else 0

        if current_version < 1:
            _apply_v1_migration(conn)
            now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            conn.execute(
                "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);",
                (1, "v1_initial_action_safety", now),
            )

        if current_version < 2:
            _apply_v2_migration(conn)
            now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            conn.execute(
                "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);",
                (2, "v2_controlled_execution_gate", now),
            )

        if current_version < 3:
            _apply_v3_migration(conn)
            now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            conn.execute(
                "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);",
                (3, "v3_execution_windows", now),
            )

        if current_version < 4:
            _apply_v4_migration(conn)
            now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            conn.execute(
                "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);",
                (4, "v4_production_execution_policy", now),
            )

        if current_version < 5:
            _apply_v5_migration(conn)
            now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            conn.execute(
                "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);",
                (5, "v5_tool_security_policy", now),
            )

        if current_version < 6:
            _apply_v6_migration(conn)
            now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            conn.execute(
                "INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);",
                (6, "v6_read_only_resource_registry", now),
            )

        conn.execute("COMMIT;")
    except Exception:
        conn.execute("ROLLBACK;")
        raise


def _apply_v1_migration(conn: sqlite3.Connection) -> None:
    """V1 Schema: Action intents, approvals, persistent idempotency, tamper-evident audit ledger, and change sets."""
    
    # 1. Action Intents Table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS action_intents (
            id TEXT PRIMARY KEY,
            action_type TEXT NOT NULL,
            target_type TEXT NOT NULL,
            target_id TEXT NOT NULL,
            requested_by TEXT NOT NULL,
            requested_at TEXT NOT NULL,
            payload TEXT NOT NULL,
            payload_hash TEXT NOT NULL,
            risk TEXT NOT NULL,
            status TEXT NOT NULL,
            requires_approval INTEGER NOT NULL DEFAULT 1,
            preflight_revision INTEGER DEFAULT 1,
            resource_revision INTEGER,
            preflight_result TEXT,
            nonce TEXT NOT NULL,
            signature TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            correlation_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            execution_authorization_id TEXT,
            execution_policy_version TEXT,
            execution_policy_hash TEXT
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_action_intents_status ON action_intents(status);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_action_intents_target ON action_intents(target_type, target_id);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_action_intents_correlation ON action_intents(correlation_id);")

    # 2. Approvals Table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS approvals (
            id TEXT PRIMARY KEY,
            intent_id TEXT,
            state TEXT NOT NULL,
            risk TEXT NOT NULL,
            action_type TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            reason_required INTEGER DEFAULT 0,
            task_id TEXT,
            agent_id TEXT,
            requested_by TEXT NOT NULL,
            requested_at TEXT NOT NULL,
            decided_at TEXT,
            decision_maker TEXT,
            decision TEXT,
            reason TEXT,
            payload_hash TEXT,
            revision INTEGER NOT NULL DEFAULT 1,
            confirmation_phrase TEXT,
            preview TEXT,
            audit_trail TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(intent_id) REFERENCES action_intents(id) ON DELETE SET NULL
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_approvals_state ON approvals(state);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_approvals_intent ON approvals(intent_id);")

    # 3. Persistent Idempotency Store Table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS idempotency_records (
            idempotency_key TEXT NOT NULL,
            scope TEXT NOT NULL,
            principal_id TEXT NOT NULL,
            method TEXT NOT NULL,
            route TEXT NOT NULL,
            payload_hash TEXT NOT NULL,
            response_code INTEGER NOT NULL,
            response_body TEXT NOT NULL,
            created_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            PRIMARY KEY (idempotency_key, scope, principal_id)
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_records(expires_at);")

    # 4. Tamper-Evident Audit Ledger Table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_ledger (
            event_id TEXT PRIMARY KEY,
            sequence INTEGER NOT NULL UNIQUE,
            timestamp TEXT NOT NULL,
            actor_type TEXT NOT NULL,
            actor_id TEXT NOT NULL,
            actor_label TEXT NOT NULL,
            action TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            resource_id TEXT NOT NULL,
            resource_label TEXT NOT NULL,
            outcome TEXT NOT NULL,
            reason TEXT,
            correlation_id TEXT NOT NULL,
            intent_id TEXT,
            payload_hash TEXT,
            revision INTEGER,
            previous_hash TEXT NOT NULL,
            record_hash TEXT NOT NULL
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_sequence ON audit_ledger(sequence);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_correlation ON audit_ledger(correlation_id);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_audit_intent ON audit_ledger(intent_id);")

    # 5. Configuration Change Sets
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS configuration_change_sets (
            id TEXT PRIMARY KEY,
            profile_id TEXT NOT NULL,
            title TEXT NOT NULL,
            description TEXT,
            changes TEXT NOT NULL,
            base_revision INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'DRAFT',
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """
    )

    # 6. Schedule Change Sets
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS schedule_change_sets (
            id TEXT PRIMARY KEY,
            schedule_id TEXT,
            action_type TEXT NOT NULL,
            payload TEXT NOT NULL,
            base_revision INTEGER NOT NULL DEFAULT 1,
            status TEXT NOT NULL DEFAULT 'DRAFT',
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """
    )

    # 7. Seed Genesis Block in Audit Ledger if table is empty
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) AS cnt FROM audit_ledger;")
    row = cursor.fetchone()
    count = (row["cnt"] if isinstance(row, sqlite3.Row) else row[0]) if row else 0
    if count == 0:
        genesis_timestamp = "2026-01-01T00:00:00Z"
        genesis_actor = "system:genesis"
        genesis_action = "AUDIT_CHAIN_GENESIS"
        genesis_resource = "sagara:mission-control"
        genesis_outcome = "INITIALIZED"
        genesis_reason = "Genesis marker for tamper-evident audit chain"
        genesis_hash = compute_audit_hash(
            sequence=0,
            event_id=GENESIS_EVENT_ID,
            timestamp=genesis_timestamp,
            actor_id=genesis_actor,
            action=genesis_action,
            resource_id=genesis_resource,
            outcome=genesis_outcome,
            reason=genesis_reason,
            intent_id=None,
            payload_hash=None,
            previous_hash=GENESIS_PREVIOUS_HASH,
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
                GENESIS_EVENT_ID,
                0,
                genesis_timestamp,
                "SYSTEM",
                genesis_actor,
                "Mission Control Genesis",
                genesis_action,
                "SYSTEM",
                genesis_resource,
                "Sagara Mission Control",
                genesis_outcome,
                "Genesis marker for tamper-evident audit chain",
                "corr-genesis-00000000",
                None,
                None,
                1,
                GENESIS_PREVIOUS_HASH,
                genesis_hash,
            ),
        )


def _apply_v2_migration(conn: sqlite3.Connection) -> None:
    """V2 Schema: Controlled Execution Gate tables.
    
    Tables:
    - execution_authorizations: Single-use, short-TTL authorization tokens bound to exact intent & payload hash.
    - execution_attempts: Track at-most-once submission state machine.
    - execution_receipts: Immutable execution receipts with deterministic SHA-256 fingerprint.
    - task_execution_correlations: Direct (non-heuristic) Task <-> Hermes Session mapping.
    - execution_locks: Persistent control DB execution lock (default: LOCKED).
    """
    # 1. Execution Authorizations Table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS execution_authorizations (
            id TEXT PRIMARY KEY,
            intent_id TEXT NOT NULL,
            payload_hash TEXT NOT NULL,
            profile_id TEXT NOT NULL,
            task_id TEXT NOT NULL,
            task_revision INTEGER NOT NULL,
            issued_to TEXT NOT NULL,
            issued_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            nonce TEXT NOT NULL,
            state TEXT NOT NULL DEFAULT 'ISSUED',
            consumed_at TEXT,
            execution_attempt_id TEXT,
            FOREIGN KEY (intent_id) REFERENCES action_intents(id)
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_exec_auth_intent ON execution_authorizations(intent_id);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_exec_auth_state ON execution_authorizations(state);")

    # 2. Execution Attempts Table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS execution_attempts (
            id TEXT PRIMARY KEY,
            intent_id TEXT NOT NULL,
            authorization_id TEXT NOT NULL,
            task_id TEXT NOT NULL,
            profile_id TEXT NOT NULL,
            correlation_id TEXT NOT NULL,
            state TEXT NOT NULL DEFAULT 'PREPARED',
            created_at TEXT NOT NULL,
            claimed_at TEXT,
            submitted_at TEXT,
            acknowledged_at TEXT,
            completed_at TEXT,
            session_id TEXT,
            error_code TEXT,
            FOREIGN KEY (intent_id) REFERENCES action_intents(id),
            FOREIGN KEY (authorization_id) REFERENCES execution_authorizations(id)
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_exec_attempts_intent ON execution_attempts(intent_id);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_exec_attempts_task ON execution_attempts(task_id);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_exec_attempts_state ON execution_attempts(state);")

    # 3. Execution Receipts Table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS execution_receipts (
            receipt_id TEXT PRIMARY KEY,
            attempt_id TEXT NOT NULL UNIQUE,
            intent_id TEXT NOT NULL,
            task_id TEXT NOT NULL,
            profile_id TEXT NOT NULL,
            hermes_session_id TEXT NOT NULL,
            submitted_at TEXT NOT NULL,
            acknowledged_at TEXT NOT NULL,
            executor_type TEXT NOT NULL,
            executor_version TEXT NOT NULL,
            correlation_id TEXT NOT NULL,
            result TEXT NOT NULL,
            receipt_hash TEXT NOT NULL,
            created_at TEXT NOT NULL,
            execution_policy_version TEXT,
            execution_policy_hash TEXT,
            execution_mode TEXT,
            FOREIGN KEY (attempt_id) REFERENCES execution_attempts(id),
            FOREIGN KEY (intent_id) REFERENCES action_intents(id)
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_exec_receipts_session ON execution_receipts(hermes_session_id);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_exec_receipts_task ON execution_receipts(task_id);")

    # 4. Direct Task <-> Session Correlations Table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS task_execution_correlations (
            task_id TEXT NOT NULL,
            intent_id TEXT NOT NULL,
            execution_attempt_id TEXT NOT NULL,
            hermes_session_id TEXT NOT NULL,
            correlation_id TEXT NOT NULL,
            created_at TEXT NOT NULL,
            PRIMARY KEY (task_id, hermes_session_id)
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_task_corr_session ON task_execution_correlations(hermes_session_id);")

    # 5. Persistent Execution Locks Table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS execution_locks (
            lock_name TEXT PRIMARY KEY,
            status TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            updated_by TEXT NOT NULL,
            reason TEXT
        );
        """
    )

    # 6. Seed Global Execution Lock as LOCKED by default (Prompt 14 Section 28)
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) AS cnt FROM execution_locks WHERE lock_name = 'global_dispatch';")
    row = cursor.fetchone()
    count = (row["cnt"] if isinstance(row, sqlite3.Row) else row[0]) if row else 0
    if count == 0:
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        conn.execute(
            """
            INSERT INTO execution_locks (lock_name, status, updated_at, updated_by, reason)
            VALUES (?, ?, ?, ?, ?);
            """,
            ("global_dispatch", "LOCKED", now, "system:init", "Default fail-closed execution lock"),
        )


def _apply_v3_migration(conn: sqlite3.Connection) -> None:
    """V3 Schema: Execution windows with time-to-live and execution budget (Prompt 14.4 Section 54-56)."""
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS execution_windows (
            id TEXT PRIMARY KEY,
            lock_name TEXT NOT NULL,
            opened_by TEXT NOT NULL,
            opened_at TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            max_executions INTEGER NOT NULL DEFAULT 1,
            executions_consumed INTEGER NOT NULL DEFAULT 0,
            reason TEXT NOT NULL,
            state TEXT NOT NULL DEFAULT 'OPEN',
            closed_at TEXT,
            closed_by TEXT,
            created_at TEXT NOT NULL
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_exec_windows_state ON execution_windows(state);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_exec_windows_lock ON execution_windows(lock_name);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_exec_windows_expires ON execution_windows(expires_at);")


def _apply_v4_migration(conn: sqlite3.Connection) -> None:
    """V4 Schema: Production Execution Policy and Change Sets (Prompt 14.6 Section 6-12, 86-90)."""
    import json
    from app.domain.execution_policy import create_canonical_v1_policy, compute_policy_hash

    # 1. Execution Policies Table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS execution_policies (
            id TEXT PRIMARY KEY,
            version TEXT NOT NULL,
            policy_hash TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'ACTIVE',
            definition_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            created_by TEXT NOT NULL,
            applied_at TEXT,
            applied_by TEXT
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_exec_policies_status ON execution_policies(status);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_exec_policies_version ON execution_policies(version);")

    # 2. Execution Policy Change Sets Table (Draft -> Validate -> Diff -> Approval -> Apply)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS execution_policy_change_sets (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'DRAFT',
            proposed_policy_json TEXT NOT NULL,
            diff_json TEXT,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            approved_by TEXT,
            approved_at TEXT,
            applied_by TEXT,
            applied_at TEXT
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_exec_policy_cs_status ON execution_policy_change_sets(status);")

    # 3. Add policy binding columns to action_intents if not present
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(action_intents);")
    ai_cols = [r[1] if isinstance(r, (list, tuple)) else r["name"] for r in cursor.fetchall()]
    if "execution_policy_version" not in ai_cols:
        conn.execute("ALTER TABLE action_intents ADD COLUMN execution_policy_version TEXT;")
    if "execution_policy_hash" not in ai_cols:
        conn.execute("ALTER TABLE action_intents ADD COLUMN execution_policy_hash TEXT;")

    # 4. Add policy binding columns to execution_receipts if not present (Prompt 14.6 Section 103)
    cursor.execute("PRAGMA table_info(execution_receipts);")
    rcpt_cols = [r[1] if isinstance(r, (list, tuple)) else r["name"] for r in cursor.fetchall()]
    if "execution_policy_version" not in rcpt_cols:
        conn.execute("ALTER TABLE execution_receipts ADD COLUMN execution_policy_version TEXT;")
    if "execution_policy_hash" not in rcpt_cols:
        conn.execute("ALTER TABLE execution_receipts ADD COLUMN execution_policy_hash TEXT;")
    if "execution_mode" not in rcpt_cols:
        conn.execute("ALTER TABLE execution_receipts ADD COLUMN execution_mode TEXT;")

    # 5. Seed Canonical V1 Policy if not already present
    cursor.execute("SELECT COUNT(*) AS cnt FROM execution_policies WHERE status = 'ACTIVE';")
    row = cursor.fetchone()
    cnt = (row["cnt"] if isinstance(row, sqlite3.Row) else row[0]) if row else 0
    if cnt == 0:
        canonical = create_canonical_v1_policy()
        c_dict = canonical.model_dump()
        phash = compute_policy_hash(c_dict)
        c_dict["policy_hash"] = phash
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        conn.execute(
            """
            INSERT INTO execution_policies (
                id, version, policy_hash, status, definition_json, created_at, created_by, applied_at, applied_by
            ) VALUES (?, ?, ?, 'ACTIVE', ?, ?, 'system:init', ?, 'system:init');
            """,
            ("pol-v1-canonical", canonical.version, phash, json.dumps(c_dict), now, now),
        )


def _apply_v5_migration(conn: sqlite3.Connection) -> None:
    """V5 Schema: Tool security policies, changesets, and tool execution audit ledger (Prompt 14.9A Section 11-16, 48-60, 100)."""
    import json
    from app.domain.tool_security_policy import (
        compute_tool_policy_hash,
        create_canonical_tool_security_policy_v1,
    )

    # 1. Tool Security Policies Table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS tool_security_policies (
            id TEXT PRIMARY KEY,
            version TEXT NOT NULL,
            policy_hash TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'INSTALLED_BUT_NOT_ENABLED',
            definition_json TEXT NOT NULL,
            created_at TEXT NOT NULL,
            created_by TEXT NOT NULL,
            applied_at TEXT,
            applied_by TEXT
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tool_policies_status ON tool_security_policies(status);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tool_policies_version ON tool_security_policies(version);")

    # 2. Tool Security Policy Change Sets Table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS tool_security_policy_change_sets (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'DRAFT',
            proposed_policy_json TEXT NOT NULL,
            diff_json TEXT,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            approved_by TEXT,
            approved_at TEXT,
            applied_by TEXT,
            applied_at TEXT
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tool_policy_cs_status ON tool_security_policy_change_sets(status);")

    # 3. Tool Execution Audits Table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS tool_execution_audits (
            id TEXT PRIMARY KEY,
            intent_id TEXT,
            tool_id TEXT NOT NULL,
            operation_id TEXT NOT NULL,
            profile_id TEXT NOT NULL,
            status TEXT NOT NULL,
            denial_reason TEXT,
            arguments_hash TEXT,
            result_bytes INTEGER DEFAULT 0,
            result_hash TEXT,
            redacted INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tool_audits_tool ON tool_execution_audits(tool_id, operation_id);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_tool_audits_status ON tool_execution_audits(status);")

    # 4. Add tool policy binding columns to action_intents if not present
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(action_intents);")
    ai_cols = [r[1] if isinstance(r, (list, tuple)) else r["name"] for r in cursor.fetchall()]
    if "tool_security_policy_version" not in ai_cols:
        conn.execute("ALTER TABLE action_intents ADD COLUMN tool_security_policy_version TEXT;")
    if "tool_security_policy_hash" not in ai_cols:
        conn.execute("ALTER TABLE action_intents ADD COLUMN tool_security_policy_hash TEXT;")

    # 5. Add tool policy binding columns to execution_receipts if not present
    cursor.execute("PRAGMA table_info(execution_receipts);")
    rcpt_cols = [r[1] if isinstance(r, (list, tuple)) else r["name"] for r in cursor.fetchall()]
    if "tool_security_policy_version" not in rcpt_cols:
        conn.execute("ALTER TABLE execution_receipts ADD COLUMN tool_security_policy_version TEXT;")
    if "tool_security_policy_hash" not in rcpt_cols:
        conn.execute("ALTER TABLE execution_receipts ADD COLUMN tool_security_policy_hash TEXT;")
    if "tool_executions_count" not in rcpt_cols:
        conn.execute("ALTER TABLE execution_receipts ADD COLUMN tool_executions_count INTEGER DEFAULT 0;")

    # 6. Seed Canonical Tool Security Policy V1 (INSTALLED_BUT_NOT_ENABLED)
    cursor.execute("SELECT COUNT(*) AS cnt FROM tool_security_policies;")
    row = cursor.fetchone()
    cnt = (row["cnt"] if isinstance(row, sqlite3.Row) else row[0]) if row else 0
    if cnt == 0:
        canonical = create_canonical_tool_security_policy_v1()
        c_dict = canonical.model_dump()
        phash = compute_tool_policy_hash(c_dict)
        c_dict["policy_hash"] = phash
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        conn.execute(
            """
            INSERT INTO tool_security_policies (
                id, version, policy_hash, status, definition_json, created_at, created_by, applied_at, applied_by
            ) VALUES (?, ?, ?, 'INSTALLED_BUT_NOT_ENABLED', ?, ?, 'system:init', ?, 'system:init');
            """,
            ("tool-pol-v1-canonical", canonical.version, phash, json.dumps(c_dict), now, now),
        )


def _apply_v6_migration(conn: sqlite3.Connection) -> None:
    """V6 Schema: Read-only resource registry, changesets, and canonical seed resources (Prompt 14.9A.7 Section 15-21)."""
    # 1. Read-Only Resources Table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS read_only_resources (
            resource_id TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            canonical_path TEXT NOT NULL,
            root_id TEXT NOT NULL,
            resource_type TEXT NOT NULL DEFAULT 'DOCUMENT',
            enabled INTEGER NOT NULL DEFAULT 1,
            classification TEXT NOT NULL DEFAULT 'INTERNAL',
            max_bytes INTEGER NOT NULL DEFAULT 32768,
            max_lines INTEGER NOT NULL DEFAULT 500,
            current_hash TEXT,
            allow_redaction INTEGER NOT NULL DEFAULT 1,
            owner_policy TEXT NOT NULL DEFAULT 'MISSION_CONTROL',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ro_resources_enabled ON read_only_resources(enabled);")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ro_resources_type ON read_only_resources(resource_type);")

    # 2. Resource Change Sets Table
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS read_only_resource_change_sets (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT,
            status TEXT NOT NULL DEFAULT 'DRAFT',
            proposed_resource_json TEXT NOT NULL,
            diff_json TEXT,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL,
            approved_by TEXT,
            approved_at TEXT,
            applied_by TEXT,
            applied_at TEXT
        );
        """
    )
    conn.execute("CREATE INDEX IF NOT EXISTS idx_ro_resource_cs_status ON read_only_resource_change_sets(status);")

    # 3. Seed Canonical Resources
    from app.services.resource_registry_service import ReadOnlyResourceRegistry
    ReadOnlyResourceRegistry.seed_canonical_resources(conn)




