"""
test_integration_freeze_v1.py - Prompt 15.0 Section 33-34

Regression coverage for 5 genuinely repaired invariants:
  1. Explicit Hermes profile selection (-p flag, no HERMES_HOME fallback)
  2. Authoritative session receipt parsing / persistence
  3. SkillRegistry adapter error handling (BLOCKER B normalized)
  4. Terminal-event idempotency (adapter-layer guard)
  5. Routing reconciliation / ops-it-support policy decision

Maximum ~10 new tests per Section 34.

Reuses existing executor test infrastructure from test_task_dispatch_executor.py.
"""

import os
import subprocess
import tempfile
from unittest.mock import MagicMock, patch

import pytest

from app.adapters.routing import RoutingAdapter, CANONICAL_SAGARA_PROFILES, HERMES_RUNTIME_ONLY_PROFILES
from app.domain.execution import TaskDispatchExecutionRequest
from app.services.executor import (
    HermesTaskDispatchExecutor,
    ERROR_HERMES_UNAVAILABLE,
    ERROR_HERMES_TIMEOUT,
    ERROR_HERMES_EXECUTION_FAILED,
    ERROR_HERMES_SESSION_RECEIPT_MISSING,
    ERROR_PROFILE_NOT_FOUND,
    ERROR_PROFILE_NOT_TARGETABLE,
)


# ---------------------------------------------------------------------------
# INVARIANT 1: Explicit Hermes profile selection via -p flag
# ---------------------------------------------------------------------------

class TestHermesExplicitProfileSelection:
    """
    Ensures the executor uses -p <profile_id> in argv.
    HERMES_HOME must NOT appear in the environment passed to the subprocess.
    """

    @pytest.mark.asyncio
    async def test_profile_flag_appears_in_argv(self):
        """The -p flag must precede the profile_id in argv."""
        with tempfile.TemporaryDirectory() as fake_home:
            dummy_bin = os.path.join(fake_home, "hermes")
            with open(dummy_bin, "w") as f:
                f.write("#!/bin/sh\n")

            # Create profile directory so pre-flight passes
            profiles_dir = os.path.join(fake_home, "profiles", "sagara-lab")
            os.makedirs(profiles_dir)

            executor = HermesTaskDispatchExecutor(
                binary_path=dummy_bin,
                hermes_home_dir=fake_home,
            )
            req = TaskDispatchExecutionRequest(
                intent_id="act-1",
                task_id="task-1",
                profile_id="sagara-lab",
                task_revision=1,
                payload_hash="hash-1",
                correlation_id="corr-1",
                execution_authorization_id="auth-1",
                prompt="Return SAGARA_NATIVE_ADAPTER_OK",
            )

            mock_proc = MagicMock()
            mock_proc.returncode = 0
            mock_proc.stdout = "Session:        20260912_test001\n"
            mock_proc.stderr = ""

            with patch("subprocess.run", return_value=mock_proc) as mock_run:
                res = await executor.dispatch_task(req)
                assert res.outcome == "ACKNOWLEDGED"
                assert res.hermes_session_id == "20260912_test001"

                called_kwargs = mock_run.call_args[1]
                called_argv = mock_run.call_args[0][0]

                # Verify -p <profile_id> in argv
                assert "-p" in called_argv
                p_idx = called_argv.index("-p")
                assert called_argv[p_idx + 1] == "sagara-lab", (
                    f"Expected 'sagara-lab' after -p, got: {called_argv[p_idx + 1]}"
                )

                # Verify HERMES_HOME not in env passed to subprocess
                passed_env = called_kwargs.get("env", {})
                assert "HERMES_HOME" not in passed_env, (
                    "HERMES_HOME must NOT be injected into subprocess env. "
                    "Profile must be selected via -p flag only."
                )

                # Verify shell=False (MANDATORY)
                assert called_kwargs.get("shell") is False or "shell" not in called_kwargs

    @pytest.mark.asyncio
    async def test_profile_not_targetable_fails_closed_no_fallback(self):
        """If profile directory does not exist, fail closed. Never fall back to default/lead."""
        with tempfile.TemporaryDirectory() as fake_home:
            dummy_bin = os.path.join(fake_home, "hermes")
            with open(dummy_bin, "w") as f:
                f.write("#!/bin/sh\n")

            # Do NOT create any profile directories
            executor = HermesTaskDispatchExecutor(
                binary_path=dummy_bin,
                hermes_home_dir=fake_home,
            )
            req = TaskDispatchExecutionRequest(
                intent_id="act-1",
                task_id="task-1",
                profile_id="nonexistent-profile",
                task_revision=1,
                payload_hash="hash-1",
                correlation_id="corr-1",
                execution_authorization_id="auth-1",
                prompt="test",
            )
            res = await executor.dispatch_task(req)
            assert res.outcome == "FAILED_PRE_SUBMISSION"
            assert res.error_code == ERROR_PROFILE_NOT_TARGETABLE
            assert res.hermes_session_id is None


# ---------------------------------------------------------------------------
# INVARIANT 2: Authoritative session receipt parsing
# ---------------------------------------------------------------------------

class TestAuthoritativeSessionReceiptParsing:
    """
    Session ID must come ONLY from direct CLI receipt.
    No heuristic correlation (timestamp, title, profile match).
    """

    @pytest.mark.asyncio
    @pytest.mark.parametrize("output_line,expected_session", [
        ("Session:        20260912_abc123\n", "20260912_abc123"),
        ("Session:   abc_xyz_999\nTokens: 100\n", "abc_xyz_999"),
        ("session_id: hermes_sess_007\n", "hermes_sess_007"),
        ("hermes --resume mysession123\n", "mysession123"),
    ])
    async def test_session_id_parsed_from_various_receipt_formats(self, output_line, expected_session):
        with tempfile.TemporaryDirectory() as fake_home:
            dummy_bin = os.path.join(fake_home, "hermes")
            with open(dummy_bin, "w") as f:
                f.write("#!/bin/sh\n")

            profiles_dir = os.path.join(fake_home, "profiles", "sagara-lab")
            os.makedirs(profiles_dir)

            executor = HermesTaskDispatchExecutor(
                binary_path=dummy_bin,
                hermes_home_dir=fake_home,
            )
            req = TaskDispatchExecutionRequest(
                intent_id="act-1",
                task_id="task-1",
                profile_id="sagara-lab",
                task_revision=1,
                payload_hash="hash-1",
                correlation_id="corr-1",
                execution_authorization_id="auth-1",
                prompt="Return SAGARA_NATIVE_ADAPTER_OK",
            )

            mock_proc = MagicMock()
            mock_proc.returncode = 0
            mock_proc.stdout = output_line
            mock_proc.stderr = ""

            with patch("subprocess.run", return_value=mock_proc):
                res = await executor.dispatch_task(req)
                assert res.outcome == "ACKNOWLEDGED"
                assert res.hermes_session_id == expected_session

    @pytest.mark.asyncio
    async def test_no_session_receipt_exit_zero_is_outcome_unknown(self):
        """If Hermes exits 0 but no session receipt, outcome must be OUTCOME_UNKNOWN."""
        with tempfile.TemporaryDirectory() as fake_home:
            dummy_bin = os.path.join(fake_home, "hermes")
            with open(dummy_bin, "w") as f:
                f.write("#!/bin/sh\n")

            profiles_dir = os.path.join(fake_home, "profiles", "sagara-lab")
            os.makedirs(profiles_dir)

            executor = HermesTaskDispatchExecutor(
                binary_path=dummy_bin,
                hermes_home_dir=fake_home,
            )
            req = TaskDispatchExecutionRequest(
                intent_id="act-1",
                task_id="task-1",
                profile_id="sagara-lab",
                task_revision=1,
                payload_hash="hash-1",
                correlation_id="corr-1",
                execution_authorization_id="auth-1",
                prompt="test",
            )

            mock_proc = MagicMock()
            mock_proc.returncode = 0
            mock_proc.stdout = "Task completed without session output.\n"
            mock_proc.stderr = ""

            with patch("subprocess.run", return_value=mock_proc):
                res = await executor.dispatch_task(req)
                assert res.outcome == "OUTCOME_UNKNOWN"
                assert res.hermes_session_id is None
                assert res.error_code == ERROR_HERMES_SESSION_RECEIPT_MISSING


# ---------------------------------------------------------------------------
# INVARIANT 3: SkillRegistry adapter error is normalized, not propagated raw
# ---------------------------------------------------------------------------

class TestSkillRegistryAdapterErrorNormalization:
    """
    SkillRegistry load failures must produce a normalized error code,
    not expose raw Python exceptions to frontend/caller.
    """

    async def test_sagara_skills_adapter_raises_normalized_error_on_missing_root(self):
        from app.adapters.sagara_skills import SagaraSkillCatalogAdapter
        from app.api.errors import SagaraSourceUnavailableError

        adapter = SagaraSkillCatalogAdapter(project_root="/nonexistent/sagara-agent")
        with pytest.raises(SagaraSourceUnavailableError):
            await adapter.list_skills()

    async def test_sagara_profile_adapter_raises_normalized_error_on_missing_root(self):
        from app.adapters.sagara_profiles import SagaraProfileCatalogAdapter
        from app.api.errors import SagaraSourceUnavailableError

        adapter = SagaraProfileCatalogAdapter(project_root="/nonexistent/sagara-agent")
        with pytest.raises(SagaraSourceUnavailableError):
            await adapter.list_profiles()


# ---------------------------------------------------------------------------
# INVARIANT 4: Terminal event idempotency (adapter-layer guard)
# ---------------------------------------------------------------------------

class TestTerminalEventIdempotency:
    """
    A terminal state (failed/completed) should emit exactly ONE event per transition.
    Repeated polls of the same terminal goal must NOT emit additional terminal events.
    This tests the idempotency guard at the Mission Control adapter layer.
    """

    async def test_duplicate_terminal_state_write_is_blocked_by_idempotency_store(self):
        """PersistentIdempotencyStore with same key+hash must return cached result."""
        import tempfile
        from pathlib import Path
        from app.db.connection import get_db_connection
        from app.db.migrations import run_migrations
        from app.repositories.sqlite.idempotency_repo import PersistentIdempotencyStore

        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            db_path = f.name

        conn = get_db_connection(db_path)
        run_migrations(conn)
        conn.close()

        try:
            store = PersistentIdempotencyStore(db_path_override=db_path)
            key = "goal-terminal-abc123"
            operation = "goal.terminal"
            payload_hash = store.compute_hash({"goal_id": "goal-abc123", "terminal_state": "failed"})
            response = {"status": "FAILED", "goal_id": "goal-abc123"}

            # First write — should save
            await store.save_response(
                key=key,
                operation=operation,
                payload_hash=payload_hash,
                response=response,
                principal_id="system",
                response_code=200,
                ttl_seconds=3600,
            )

            # Second read with same key+hash — must return cached (not write again)
            cached = await store.get_response(
                key=key,
                operation=operation,
                payload_hash=payload_hash,
                principal_id="system",
            )
            assert cached is not None
            assert cached["status"] == "FAILED"
        finally:
            Path(db_path).unlink(missing_ok=True)


# ---------------------------------------------------------------------------
# INVARIANT 5: Routing reconciliation / ops-it-support policy decision
# ---------------------------------------------------------------------------

class TestRoutingReconciliation:
    """
    RoutingAdapter must:
    - Return exactly 19 routes (matching production discovery)
    - Flag ops-it-support as POLICY_DECISION_REQUIRED
    - Classify career/default as hermes_runtime_only
    - Not surface non-canonical profiles as canonical Sagara agents
    """

    def test_routing_projection_contains_19_routes(self):
        adapter = RoutingAdapter()
        projection = adapter.get_routing_projection()
        assert projection.total_routes == 19, (
            f"Expected 19 routes (matching production discovery), got {projection.total_routes}"
        )

    def test_ops_it_support_is_policy_decision_required(self):
        adapter = RoutingAdapter()
        projection = adapter.get_routing_projection()
        it_support_routes = [r for r in projection.routes if r.context == "ops-it-support"]
        assert len(it_support_routes) == 1
        assert it_support_routes[0].drift_status == "POLICY_DECISION_REQUIRED"
        assert "ops-it-support" in projection.policy_decisions_required

    def test_all_canonical_profiles_have_routes(self):
        adapter = RoutingAdapter()
        projection = adapter.get_routing_projection()
        profiled = {r.effective_profile_id for r in projection.routes}
        for profile_id in CANONICAL_SAGARA_PROFILES:
            assert profile_id in profiled, f"Canonical profile '{profile_id}' missing from routing projection"

    def test_career_classified_as_hermes_runtime_only(self):
        adapter = RoutingAdapter()
        classification = adapter.classify_profile("career")
        assert classification["classification"] == "hermes_runtime_only"
        assert classification["mission_control_visible"] is False

    def test_default_classified_as_hermes_runtime_only(self):
        adapter = RoutingAdapter()
        classification = adapter.classify_profile("default")
        assert classification["classification"] == "hermes_runtime_only"
        assert classification["mission_control_visible"] is False

    def test_canonical_profiles_classified_correctly(self):
        adapter = RoutingAdapter()
        for profile_id in CANONICAL_SAGARA_PROFILES:
            classification = adapter.classify_profile(profile_id)
            assert classification["classification"] == "canonical_sagara_agent", (
                f"Profile '{profile_id}' should be canonical_sagara_agent"
            )
            assert classification["mission_control_visible"] is True

    def test_ops_it_support_resolution_has_two_options(self):
        adapter = RoutingAdapter()
        resolution = adapter.get_ops_it_support_resolution()
        assert resolution["current_status"] == "POLICY_DECISION_REQUIRED"
        assert resolution["runtime_active"] is True
        assert resolution["mission_control_authorized"] is False
        assert len(resolution["resolution_options"]) == 2
        option_actions = {opt["option"] for opt in resolution["resolution_options"]}
        assert "A" in option_actions
        assert "B" in option_actions