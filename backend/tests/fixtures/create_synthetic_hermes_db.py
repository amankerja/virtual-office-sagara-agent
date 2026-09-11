"""Generates a synthetic Hermes SQLite database fixture matching schema version 26.
Contains test cases for gateway heartbeats, sessions, turn leases, delegations, and model usage.
Enables WAL mode to verify WAL awareness.
"""

import os
import sqlite3
import time


def build_synthetic_hermes_db(db_path: str) -> None:
    if os.path.exists(db_path):
        os.remove(db_path)
    wal_path = f"{db_path}-wal"
    shm_path = f"{db_path}-shm"
    if os.path.exists(wal_path):
        os.remove(wal_path)
    if os.path.exists(shm_path):
        os.remove(shm_path)

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Enable WAL mode
    cur.execute("PRAGMA journal_mode = WAL;")

    # Schema version
    cur.execute("CREATE TABLE schema_version (version INTEGER);")
    cur.execute("INSERT INTO schema_version (version) VALUES (26);")

    # Gateway heartbeats
    cur.execute(
        """
        CREATE TABLE gateway_heartbeats (
            backend_id TEXT,
            pid INTEGER,
            started_at REAL,
            last_heartbeat REAL,
            profile TEXT,
            host TEXT
        );
    """
    )

    # Sessions
    cur.execute(
        """
        CREATE TABLE sessions (
            id TEXT PRIMARY KEY,
            source TEXT,
            user_id TEXT,
            session_key TEXT,
            chat_id TEXT,
            chat_type TEXT,
            thread_id TEXT,
            display_name TEXT,
            model TEXT,
            parent_session_id TEXT,
            started_at REAL,
            ended_at REAL,
            end_reason TEXT,
            message_count INTEGER,
            tool_call_count INTEGER,
            input_tokens INTEGER,
            output_tokens INTEGER,
            cache_read_tokens INTEGER,
            cache_write_tokens INTEGER,
            reasoning_tokens INTEGER,
            estimated_cost_usd REAL,
            actual_cost_usd REAL,
            last_activity_at REAL,
            api_call_count INTEGER,
            profile_name TEXT,
            archived INTEGER DEFAULT 0
        );
    """
    )

    # Session turn leases
    cur.execute(
        """
        CREATE TABLE session_turn_leases (
            conversation_id TEXT PRIMARY KEY,
            holder TEXT,
            acquired_at REAL,
            expires_at REAL
        );
    """
    )

    # Async delegations
    cur.execute(
        """
        CREATE TABLE async_delegations (
            delegation_id TEXT PRIMARY KEY,
            origin_session TEXT,
            parent_session_id TEXT,
            state TEXT,
            dispatched_at REAL,
            completed_at REAL,
            updated_at REAL,
            owner_pid INTEGER,
            task_json TEXT,
            delivery_claim TEXT
        );
    """
    )

    # Session model usage
    cur.execute(
        """
        CREATE TABLE session_model_usage (
            session_id TEXT,
            model TEXT,
            billing_provider TEXT,
            billing_base_url TEXT,
            billing_mode TEXT,
            task TEXT,
            api_call_count INTEGER,
            input_tokens INTEGER,
            output_tokens INTEGER,
            cache_read_tokens INTEGER,
            cache_write_tokens INTEGER,
            reasoning_tokens INTEGER,
            estimated_cost_usd REAL,
            actual_cost_usd REAL,
            cost_status TEXT,
            cost_source TEXT,
            first_seen REAL,
            last_seen REAL
        );
    """
    )

    # Messages (for privacy testing - should never be bulk loaded)
    cur.execute(
        """
        CREATE TABLE messages (
            id TEXT PRIMARY KEY,
            session_id TEXT,
            role TEXT,
            content TEXT,
            created_at REAL
        );
    """
    )

    now = time.time()

    # 1. Gateway Heartbeats:
    # Multiple records to test multi-backend detection and freshest selection
    # Record 1: Current fresh primary gateway (20s ago)
    cur.execute(
        """
        INSERT INTO gateway_heartbeats (backend_id, pid, started_at, last_heartbeat, profile, host)
        VALUES ('hermes-central-primary', 2117612, ?, ?, 'default', '127.0.0.1');
    """,
        (now - 3600, now - 20),
    )

    # Record 2: Active secondary gateway (35s ago - also active)
    cur.execute(
        """
        INSERT INTO gateway_heartbeats (backend_id, pid, started_at, last_heartbeat, profile, host)
        VALUES ('hermes-secondary-worker', 2117800, ?, ?, 'worker', '127.0.0.1');
    """,
        (now - 7200, now - 35),
    )


    # 2. Turn Leases:
    # Active turn lease for sess_active_01 (expires in 600 seconds)
    cur.execute(
        """
        INSERT INTO session_turn_leases (conversation_id, holder, acquired_at, expires_at)
        VALUES ('sess_active_01', 'hermes-worker-1', ?, ?);
    """,
        (now - 10, now + 600),
    )

    # Concurrent active turn leases for sess_concurrent_01 and sess_concurrent_02
    cur.execute(
        """
        INSERT INTO session_turn_leases (conversation_id, holder, acquired_at, expires_at)
        VALUES ('sess_concurrent_01', 'hermes-worker-2', ?, ?);
    """,
        (now - 15, now + 300),
    )
    cur.execute(
        """
        INSERT INTO session_turn_leases (conversation_id, holder, acquired_at, expires_at)
        VALUES ('sess_concurrent_02', 'hermes-worker-3', ?, ?);
    """,
        (now - 25, now + 300),
    )

    # 3. Sessions:
    # sess_active_01: Correlated to real Sagara profile 'lead', has active lease -> ACTIVE
    cur.execute(
        """
        INSERT INTO sessions (
            id, source, model, parent_session_id, started_at, ended_at, end_reason,
            message_count, tool_call_count, input_tokens, output_tokens, reasoning_tokens,
            estimated_cost_usd, actual_cost_usd, last_activity_at, profile_name, archived
        ) VALUES (
            'sess_active_01', 'discord', 'gemini-1.5-pro', NULL, ?, NULL, NULL,
            12, 4, 15000, 1200, 300, 0.045, 0.045, ?, 'lead', 0
        );
    """,
        (now - 300, now - 10),
    )

    # sess_recent_02: Correlated to 'marketing', ended_at is NULL, no active lease, recent activity (120s ago) -> RECENT
    cur.execute(
        """
        INSERT INTO sessions (
            id, source, model, parent_session_id, started_at, ended_at, end_reason,
            message_count, tool_call_count, input_tokens, output_tokens, reasoning_tokens,
            estimated_cost_usd, actual_cost_usd, last_activity_at, profile_name, archived
        ) VALUES (
            'sess_recent_02', 'telegram', 'claude-3-5-sonnet', NULL, ?, NULL, NULL,
            24, 8, 45000, 3200, NULL, 0.12, NULL, ?, 'marketing', 0
        );
    """,
        (now - 600, now - 120),
    )

    # sess_completed_03: Correlated to 'business', ended_at is set, normal close -> COMPLETED
    cur.execute(
        """
        INSERT INTO sessions (
            id, source, model, parent_session_id, started_at, ended_at, end_reason,
            message_count, tool_call_count, input_tokens, output_tokens, reasoning_tokens,
            estimated_cost_usd, actual_cost_usd, last_activity_at, profile_name, archived
        ) VALUES (
            'sess_completed_03', 'cron', 'gpt-4o', NULL, ?, ?, 'cron_complete',
            6, 2, 8000, 450, 0, 0.02, 0.02, ?, 'business', 0
        );
    """,
        (now - 3600, now - 3500, now - 3500),
    )

    # sess_failed_04: Correlated to 'alpha-custom', ended with error -> FAILED
    cur.execute(
        """
        INSERT INTO sessions (
            id, source, model, parent_session_id, started_at, ended_at, end_reason,
            message_count, tool_call_count, input_tokens, output_tokens, reasoning_tokens,
            estimated_cost_usd, actual_cost_usd, last_activity_at, profile_name, archived
        ) VALUES (
            'sess_failed_04', 'discord', 'claude-3-5-haiku', NULL, ?, ?, 'error',
            3, 0, 4000, 100, NULL, 0.005, NULL, ?, 'alpha-custom', 0
        );
    """,
        (now - 1800, now - 1790, now - 1790),
    )

    # sess_unregistered_05: Unknown/unregistered profile_name -> UNREGISTERED_RUNTIME_PROFILE
    cur.execute(
        """
        INSERT INTO sessions (
            id, source, model, parent_session_id, started_at, ended_at, end_reason,
            message_count, tool_call_count, input_tokens, output_tokens, reasoning_tokens,
            estimated_cost_usd, actual_cost_usd, last_activity_at, profile_name, archived
        ) VALUES (
            'sess_unregistered_05', 'cli', 'llama-3.3-70b', NULL, ?, NULL, NULL,
            1, 0, 500, 50, 0, 0.0, 0.0, ?, 'prof-unregistered-ghost', 0
        );
    """,
        (now - 400, now - 400),
    )

    # sess_null_profile_06: profile_name is NULL (e.g. historical unattached session)
    cur.execute(
        """
        INSERT INTO sessions (
            id, source, model, parent_session_id, started_at, ended_at, end_reason,
            message_count, tool_call_count, input_tokens, output_tokens, reasoning_tokens,
            estimated_cost_usd, actual_cost_usd, last_activity_at, profile_name, archived
        ) VALUES (
            'sess_null_profile_06', 'discord', 'gemini-2.0-flash', NULL, ?, ?, 'cli_close',
            10, 3, 12000, 800, NULL, 0.015, NULL, ?, NULL, 0
        );
    """,
        (now - 7200, now - 7100, now - 7100),
    )

    # sess_concurrent_01 & sess_concurrent_02: Concurrent active sessions for 'prof-concurrent-two'
    cur.execute(
        """
        INSERT INTO sessions (
            id, source, model, parent_session_id, started_at, ended_at, end_reason,
            message_count, tool_call_count, input_tokens, output_tokens, reasoning_tokens,
            estimated_cost_usd, actual_cost_usd, last_activity_at, profile_name, archived
        ) VALUES (
            'sess_concurrent_01', 'discord', 'gemini-1.5-flash', NULL, ?, NULL, NULL,
            5, 1, 4000, 300, 50, 0.01, 0.01, ?, 'prof-concurrent-two', 0
        );
    """,
        (now - 400, now - 15),
    )

    cur.execute(
        """
        INSERT INTO sessions (
            id, source, model, parent_session_id, started_at, ended_at, end_reason,
            message_count, tool_call_count, input_tokens, output_tokens, reasoning_tokens,
            estimated_cost_usd, actual_cost_usd, last_activity_at, profile_name, archived
        ) VALUES (
            'sess_concurrent_02', 'telegram', 'claude-3-5-sonnet', NULL, ?, NULL, NULL,
            3, 0, 2000, 150, NULL, 0.005, NULL, ?, 'prof-concurrent-two', 0
        );
    """,
        (now - 450, now - 25),
    )

    # sess_multi_model: Session with multi-model calls belonging to 'business'
    cur.execute(
        """
        INSERT INTO sessions (
            id, source, model, parent_session_id, started_at, ended_at, end_reason,
            message_count, tool_call_count, input_tokens, output_tokens, reasoning_tokens,
            estimated_cost_usd, actual_cost_usd, last_activity_at, profile_name, archived
        ) VALUES (
            'sess_multi_model', 'cli', 'gpt-4o', NULL, ?, ?, 'agent_close',
            15, 5, 10000, 1500, 200, 0.06, 0.035, ?, 'business', 0
        );
    """,
        (now - 5000, now - 4900, now - 4900),
    )

    # sess_cycle_a & sess_cycle_b: Circular parent lineage test
    cur.execute(
        """
        INSERT INTO sessions (
            id, source, model, parent_session_id, started_at, ended_at, end_reason,
            message_count, tool_call_count, input_tokens, output_tokens, reasoning_tokens,
            estimated_cost_usd, actual_cost_usd, last_activity_at, profile_name, archived
        ) VALUES (
            'sess_cycle_a', 'cli', 'gpt-4o-mini', 'sess_cycle_b', ?, ?, 'cli_close',
            2, 0, 1000, 100, NULL, 0.001, 0.001, ?, 'marketing', 0
        );
    """,
        (now - 1000, now - 950, now - 950),
    )

    cur.execute(
        """
        INSERT INTO sessions (
            id, source, model, parent_session_id, started_at, ended_at, end_reason,
            message_count, tool_call_count, input_tokens, output_tokens, reasoning_tokens,
            estimated_cost_usd, actual_cost_usd, last_activity_at, profile_name, archived
        ) VALUES (
            'sess_cycle_b', 'cli', 'gpt-4o-mini', 'sess_cycle_a', ?, ?, 'cli_close',
            2, 0, 1000, 100, NULL, 0.001, 0.001, ?, 'marketing', 0
        );
    """,
        (now - 1050, now - 1000, now - 1000),
    )

    # 4. Async Delegations:
    # del_01: Running delegation owned by lead
    cur.execute(
        """
        INSERT INTO async_delegations (
            delegation_id, origin_session, parent_session_id, state, dispatched_at,
            completed_at, updated_at, owner_pid, task_json, delivery_claim
        ) VALUES (
            'del_01', 'sess_active_01', 'sess_active_01', 'running', ?,
            NULL, ?, 2159075, '{"goal": "Coordinate subsystem integrity audit", "role": "lead"}', 'claim-01'
        );
    """,
        (now - 120, now - 10),
    )

    # del_02: Completed delegation
    cur.execute(
        """
        INSERT INTO async_delegations (
            delegation_id, origin_session, parent_session_id, state, dispatched_at,
            completed_at, updated_at, owner_pid, task_json, delivery_claim
        ) VALUES (
            'del_02', 'sess_completed_03', 'sess_completed_03', 'completed', ?,
            ?, ?, 2159075, '{"goal": "Index database telemetry schemas", "role": "business"}', 'claim-02'
        );
    """,
        (now - 3550, now - 3510, now - 3510),
    )

    # del_03: Error / Failed delegation
    cur.execute(
        """
        INSERT INTO async_delegations (
            delegation_id, origin_session, parent_session_id, state, dispatched_at,
            completed_at, updated_at, owner_pid, task_json, delivery_claim
        ) VALUES (
            'del_03', 'sess_failed_04', 'sess_failed_04', 'error', ?,
            ?, ?, 2159078, '{"goal": "Execute sandbox penetration probe", "role": "alpha-custom"}', 'claim-03'
        );
    """,
        (now - 1800, now - 1795, now - 1795),
    )

    # del_running_retired: Running delegation for profile without active lease ('retired-bot') -> Profile F
    cur.execute(
        """
        INSERT INTO async_delegations (
            delegation_id, origin_session, parent_session_id, state, dispatched_at,
            completed_at, updated_at, owner_pid, task_json, delivery_claim
        ) VALUES (
            'del_running_retired', 'sess_completed_03', 'sess_completed_03', 'running', ?,
            NULL, ?, 2159088, '{"goal": "Execute decommission validation audit", "role": "retired-bot"}', 'claim-04'
        );
    """,
        (now - 60, now - 10),
    )

    # del_stale_running: Stale running delegation (> 1800 seconds old) for 'alpha-custom'
    cur.execute(
        """
        INSERT INTO async_delegations (
            delegation_id, origin_session, parent_session_id, state, dispatched_at,
            completed_at, updated_at, owner_pid, task_json, delivery_claim
        ) VALUES (
            'del_stale_running', 'sess_failed_04', 'sess_failed_04', 'running', ?,
            NULL, ?, 2159099, '{"goal": "Stale historical background sweep", "role": "alpha-custom"}', 'claim-05'
        );
    """,
        (now - 3600, now - 3600),
    )

    # 5. Session Model Usage:
    # Multi-model and null vs zero verification
    cur.execute(
        """
        INSERT INTO session_model_usage (
            session_id, model, billing_provider, api_call_count, input_tokens, output_tokens,
            reasoning_tokens, estimated_cost_usd, actual_cost_usd, first_seen, last_seen
        ) VALUES (
            'sess_active_01', 'gemini-1.5-pro', 'google', 4, 15000, 1200,
            300, 0.045, 0.045, ?, ?
        );
    """,
        (now - 300, now - 10),
    )

    # Usage with NULL actual_cost and NULL reasoning_tokens
    cur.execute(
        """
        INSERT INTO session_model_usage (
            session_id, model, billing_provider, api_call_count, input_tokens, output_tokens,
            reasoning_tokens, estimated_cost_usd, actual_cost_usd, first_seen, last_seen
        ) VALUES (
            'sess_recent_02', 'claude-3-5-sonnet', 'anthropic', 8, 45000, 3200,
            NULL, 0.12, NULL, ?, ?
        );
    """,
        (now - 600, now - 120),
    )

    # Usage with ZERO cost confirmed
    cur.execute(
        """
        INSERT INTO session_model_usage (
            session_id, model, billing_provider, api_call_count, input_tokens, output_tokens,
            reasoning_tokens, estimated_cost_usd, actual_cost_usd, first_seen, last_seen
        ) VALUES (
            'sess_unregistered_05', 'llama-3.3-70b', 'ollama', 1, 500, 50,
            0, 0.0, 0.0, ?, ?
        );
    """,
        (now - 400, now - 400),
    )

    # sess_multi_model: Multi-model usage for single session
    cur.execute(
        """
        INSERT INTO session_model_usage (
            session_id, model, billing_provider, api_call_count, input_tokens, output_tokens,
            reasoning_tokens, estimated_cost_usd, actual_cost_usd, first_seen, last_seen
        ) VALUES (
            'sess_multi_model', 'gpt-4o', 'openai', 3, 6000, 900,
            200, 0.035, 0.035, ?, ?
        );
    """,
        (now - 5000, now - 4950),
    )

    cur.execute(
        """
        INSERT INTO session_model_usage (
            session_id, model, billing_provider, api_call_count, input_tokens, output_tokens,
            reasoning_tokens, estimated_cost_usd, actual_cost_usd, first_seen, last_seen
        ) VALUES (
            'sess_multi_model', 'claude-3-5-sonnet', 'anthropic', 2, 4000, 600,
            NULL, 0.025, NULL, ?, ?
        );
    """,
        (now - 4950, now - 4900),
    )

    # 6. Message table:
    # Add dummy sensitive message to ensure readers never select or dump message bodies
    cur.execute(
        """
        INSERT INTO messages (id, session_id, role, content, created_at)
        VALUES ('msg-01', 'sess_active_01', 'user', 'SECRET_DO_NOT_LEAK_API_KEY=xyz123', ?);
    """,
        (now - 250,),
    )

    conn.commit()
    conn.close()


if __name__ == "__main__":
    target = os.path.join(os.path.dirname(__file__), "hermes_state.db")
    build_synthetic_hermes_db(target)
    print(f"Created synthetic Hermes state DB at {target}")
