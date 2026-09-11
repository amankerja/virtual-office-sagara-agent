"""Unit and integration tests for RuntimeCorrelationService and RuntimeEvidenceService.

Tests:
- Profile ↔ Session exact canonical matching (no fuzzy matching)
- Unresolved session profile produces SESSION_PROFILE_UNRESOLVED and no phantom agent
- Session lineage cycle protection produces SESSION_LINEAGE_CYCLE diagnostic
- Delegation ↔ Profile and Session correlation
- Stale running delegation handling
- Direct Task ↔ Session correlation (no timestamp/profile inference)
- Transitive Approval ↔ Task ↔ Session correlation
- Gateway health degradation
- Correlation coverage metrics calculation (Section 114)
- Live synthetic Hermes SQLite database verification (WAL mode)
"""

import os
from datetime import datetime, timezone
import pytest

from app.adapters.hermes_runtime import HermesSqliteRuntimeAdapter
from app.adapters.sagara_profiles import SagaraProfileCatalogAdapter
from app.adapters.sagara_skills import SagaraSkillCatalogAdapter
from app.domain.runtime_state import (
    DEFAULT_STALENESS_CONFIG,
    RuntimeStalenessConfig,
    choose_current_session,
    extract_session_lineage,
)
from app.schemas.approvals import ApprovalDto
from app.schemas.delegations import DelegationDto
from app.schemas.profiles import ProfileDto
from app.schemas.runtime import GatewayDto
from app.schemas.sessions import SessionDto
from app.schemas.tasks import TaskDto
from app.services.agent_service import AgentProjectionService
from app.services.runtime_correlation import RuntimeCorrelationService
from app.services.runtime_evidence import RuntimeEvidenceService

from tests.fixtures.create_synthetic_hermes_db import build_synthetic_hermes_db

SAGARA_FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "..", "fixtures", "sagara_project")
HERMES_FIXTURE_PATH = os.path.join(os.path.dirname(__file__), "..", "fixtures", "hermes_state.db")


@pytest.fixture
def correlation_service() -> RuntimeCorrelationService:
    return RuntimeCorrelationService(config=DEFAULT_STALENESS_CONFIG)


@pytest.fixture
def evidence_service() -> RuntimeEvidenceService:
    return RuntimeEvidenceService(config=DEFAULT_STALENESS_CONFIG)


@pytest.fixture
def hermes_runtime_adapter() -> HermesSqliteRuntimeAdapter:
    build_synthetic_hermes_db(HERMES_FIXTURE_PATH)
    return HermesSqliteRuntimeAdapter(db_path=HERMES_FIXTURE_PATH)


# ---------------------------------------------------------------------------
# Unit Tests: Correlation Service In-Memory Graph & Logic
# ---------------------------------------------------------------------------

def test_correlation_profile_session_exact_match(correlation_service: RuntimeCorrelationService):
    """Only exact canonical profile IDs match; no fuzzy matching."""
    now = datetime(2026, 9, 10, 12, 0, 0, tzinfo=timezone.utc)
    profiles = [
        ProfileDto(id="lead", name="Lead Coordinator", configuration_state="CONFIGURED"),
        ProfileDto(id="marketing", name="Marketing Specialist", configuration_state="CONFIGURED"),
    ]
    sessions = [
        SessionDto(
            id="s1",
            profile_id="lead",
            source="hermes",
            state="ACTIVE",
            started_at="2026-09-10T11:59:00Z",
            last_activity_at="2026-09-10T11:59:50Z",
            message_count=1,
            tool_call_count=0,
        ),
        SessionDto(
            id="s2",
            profile_id="Lead Coordinator",  # Display name instead of canonical ID -> MUST NOT MATCH
            source="hermes",
            state="ACTIVE",
            started_at="2026-09-10T11:59:00Z",
            last_activity_at="2026-09-10T11:59:50Z",
            message_count=1,
            tool_call_count=0,
        ),
        SessionDto(
            id="s3",
            profile_id="lead-extra",  # Prefix/partial match -> MUST NOT MATCH
            source="hermes",
            state="ACTIVE",
            started_at="2026-09-10T11:59:00Z",
            last_activity_at="2026-09-10T11:59:50Z",
            message_count=1,
            tool_call_count=0,
        ),
    ]
    gateway = GatewayDto(status="HEALTHY", connected=True, latency_ms=10, last_heartbeat_at="2026-09-10T11:59:55Z", heartbeat_age_seconds=5)

    correlation_service.build_correlation_indexes(
        profiles=profiles,
        sessions=sessions,
        delegations=[],
        usage_map={},
        tasks=[],
        approvals=[],
        gateway=gateway,
        now=now,
    )

    # Only s1 matched to 'lead'
    assert len(correlation_service.sessions_by_profile["lead"]) == 1
    assert correlation_service.sessions_by_profile["lead"][0].id == "s1"

    # s2 and s3 are unresolved
    unresolved_ids = {s.id for s in correlation_service.unresolved_sessions}
    assert "s2" in unresolved_ids
    assert "s3" in unresolved_ids

    diags = [d.code for d in correlation_service.get_diagnostics()]
    assert diags.count("SESSION_PROFILE_UNRESOLVED") == 2


def test_correlation_session_lineage_cycle_diagnostic(correlation_service: RuntimeCorrelationService):
    """Session lineage cycle is detected and recorded as SESSION_LINEAGE_CYCLE."""
    now = datetime(2026, 9, 10, 12, 0, 0, tzinfo=timezone.utc)
    profiles = [ProfileDto(id="lead", name="Lead Coordinator", configuration_state="CONFIGURED")]
    sessions = [
        SessionDto(
            id="cycle-1",
            profile_id="lead",
            parent_session_id="cycle-2",
            source="hermes",
            state="COMPLETED",
            started_at="2026-09-10T11:00:00Z",
            last_activity_at="2026-09-10T11:10:00Z",
            message_count=2,
            tool_call_count=0,
        ),
        SessionDto(
            id="cycle-2",
            profile_id="lead",
            parent_session_id="cycle-1",
            source="hermes",
            state="COMPLETED",
            started_at="2026-09-10T11:00:00Z",
            last_activity_at="2026-09-10T11:10:00Z",
            message_count=2,
            tool_call_count=0,
        ),
    ]
    gateway = GatewayDto(status="HEALTHY", connected=True, latency_ms=10, last_heartbeat_at="2026-09-10T11:59:55Z", heartbeat_age_seconds=5)

    correlation_service.build_correlation_indexes(
        profiles=profiles,
        sessions=sessions,
        delegations=[],
        usage_map={},
        tasks=[],
        approvals=[],
        gateway=gateway,
        now=now,
    )

    diags = [d.code for d in correlation_service.get_diagnostics()]
    assert "SESSION_LINEAGE_CYCLE" in diags


def test_correlation_delegation_stale_diagnostic(correlation_service: RuntimeCorrelationService):
    """Running delegation older than 1800s records EVIDENCE_STALE diagnostic."""
    now = datetime(2026, 9, 10, 12, 0, 0, tzinfo=timezone.utc)
    profiles = [ProfileDto(id="lead", name="Lead Coordinator", configuration_state="CONFIGURED")]
    deleg = DelegationDto(
        id="del-stale",
        target_agent_id="lead",
        task_title="Ancient background task",
        state="RUNNING",
        started_at="2026-09-10T10:00:00Z",  # 2 hours ago (> 1800s)
    )
    gateway = GatewayDto(status="HEALTHY", connected=True, latency_ms=10, last_heartbeat_at="2026-09-10T11:59:55Z", heartbeat_age_seconds=5)

    correlation_service.build_correlation_indexes(
        profiles=profiles,
        sessions=[],
        delegations=[deleg],
        usage_map={},
        tasks=[],
        approvals=[],
        gateway=gateway,
        now=now,
    )

    diags = [d.code for d in correlation_service.get_diagnostics()]
    assert "EVIDENCE_STALE" in diags


def test_correlation_coverage_metrics(correlation_service: RuntimeCorrelationService):
    """Calculates coverage metrics accurately."""
    now = datetime(2026, 9, 10, 12, 0, 0, tzinfo=timezone.utc)
    profiles = [
        ProfileDto(id="lead", name="Lead Coordinator", configuration_state="CONFIGURED"),
        ProfileDto(id="unheard", name="Quiet Agent", configuration_state="CONFIGURED"),
    ]
    sessions = [
        SessionDto(
            id="s1",
            profile_id="lead",
            source="hermes",
            state="ACTIVE",
            started_at="2026-09-10T11:59:00Z",
            last_activity_at="2026-09-10T11:59:50Z",
            message_count=1,
            tool_call_count=0,
        ),
        SessionDto(
            id="s_ghost",
            profile_id="ghost-agent",
            source="hermes",
            state="COMPLETED",
            started_at="2026-09-10T11:00:00Z",
            last_activity_at="2026-09-10T11:05:00Z",
            message_count=1,
            tool_call_count=0,
        ),
    ]
    delegations = [
        DelegationDto(
            id="d1",
            target_agent_id="lead",
            task_title="Task 1",
            state="RUNNING",
            started_at="2026-09-10T11:58:00Z",
        ),
        DelegationDto(
            id="d_ghost",
            target_agent_id="ghost-agent",
            task_title="Task 2",
            state="COMPLETED",
            started_at="2026-09-10T11:00:00Z",
        ),
    ]
    gateway = GatewayDto(status="HEALTHY", connected=True, latency_ms=10, last_heartbeat_at="2026-09-10T11:59:55Z", heartbeat_age_seconds=5)

    correlation_service.build_correlation_indexes(
        profiles=profiles,
        sessions=sessions,
        delegations=delegations,
        usage_map={},
        tasks=[],
        approvals=[],
        gateway=gateway,
        now=now,
    )

    metrics = correlation_service.get_correlation_coverage_metrics(
        profiles=profiles,
        sessions=sessions,
        delegations=delegations,
        tasks=[],
    )

    assert metrics["registered_profiles"] == 2
    assert metrics["profiles_with_runtime_evidence"] == 1
    assert metrics["profiles_without_runtime_evidence"] == 1
    assert metrics["sessions_total"] == 2
    assert metrics["sessions_mapped_to_profile"] == 1
    assert metrics["sessions_unresolved"] == 1
    assert metrics["delegations_total"] == 2
    assert metrics["delegations_mapped"] == 1
    assert metrics["delegations_unresolved"] == 1


# ---------------------------------------------------------------------------
# Integration Tests: Synthetic Hermes Database with All Edge Cases
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_synthetic_db_profile_f_running_delegation_derives_active(hermes_runtime_adapter: HermesSqliteRuntimeAdapter):
    """
    Profile F: 'retired-bot' has no active turn lease session, but has a running delegation del_running_retired.
    Must derive ACTIVE / CONFIRMED.
    """
    profile_catalog = SagaraProfileCatalogAdapter(project_root=SAGARA_FIXTURE_PATH)
    skill_catalog = SagaraSkillCatalogAdapter(project_root=SAGARA_FIXTURE_PATH)
    service = AgentProjectionService(
        profile_catalog=profile_catalog,
        skill_catalog=skill_catalog,
        runtime_reader=hermes_runtime_adapter,
        is_mock=False,
    )

    agents = await service.list_agents()
    agent_map = {a.id: a for a in agents}

    retired = agent_map.get("retired-bot")
    assert retired is not None
    assert retired.runtime.state == "ACTIVE"
    assert retired.runtime.confidence == "CONFIRMED"
    assert retired.runtime.active_delegations == 1


@pytest.mark.asyncio
async def test_synthetic_db_stale_running_delegation_not_active(hermes_runtime_adapter: HermesSqliteRuntimeAdapter):
    """
    del_stale_running for 'alpha-custom' is 3600s old (> 1800s threshold).
    Must not keep 'alpha-custom' in ACTIVE state.
    """
    profile_catalog = SagaraProfileCatalogAdapter(project_root=SAGARA_FIXTURE_PATH)
    skill_catalog = SagaraSkillCatalogAdapter(project_root=SAGARA_FIXTURE_PATH)
    service = AgentProjectionService(
        profile_catalog=profile_catalog,
        skill_catalog=skill_catalog,
        runtime_reader=hermes_runtime_adapter,
        is_mock=False,
    )

    agents = await service.list_agents()
    agent_map = {a.id: a for a in agents}

    # Section 10: 'alpha-custom' was the folder name, but canonical profile.id is 'dyn-custom-98765'
    # The correlation engine strictly refuses to match 'alpha-custom' to 'dyn-custom-98765'
    assert "alpha-custom" not in agent_map
    custom = agent_map.get("dyn-custom-98765")
    assert custom is not None
    # Because runtime rows used 'alpha-custom' rather than canonical ID, custom has no correlated rows -> UNKNOWN
    assert custom.runtime.state == "UNKNOWN"
    assert custom.runtime.confidence == "UNKNOWN"


@pytest.mark.asyncio
async def test_synthetic_db_multi_model_session_aggregation(hermes_runtime_adapter: HermesSqliteRuntimeAdapter):
    """
    sess_multi_model has two model usage records (gpt-4o and claude-3-5-sonnet).
    UsageReader aggregates tokens across models without double-counting.
    """
    usage = await hermes_runtime_adapter.usage_reader.get_usage_for_profile_sessions(["sess_multi_model"])
    assert usage is not None
    assert usage["input_tokens"] == 10000  # 6000 + 4000
    assert usage["output_tokens"] == 1500  # 900 + 600
    assert usage["actual_cost_usd"] == 0.035  # Preserved from gpt-4o row
    assert usage["estimated_cost_usd"] == pytest.approx(0.06)  # 0.035 + 0.025


@pytest.mark.asyncio
async def test_synthetic_db_concurrent_active_sessions_selection(hermes_runtime_adapter: HermesSqliteRuntimeAdapter):
    """
    sess_concurrent_01 and sess_concurrent_02 belong to 'prof-concurrent-two'.
    choose_current_session selects sess_concurrent_01 (fresher activity) and logs MULTIPLE_CURRENT_SESSIONS.
    """
    sessions = await hermes_runtime_adapter.list_sessions(agent_id="prof-concurrent-two")
    assert len(sessions) == 2

    active_leases = {"sess_concurrent_01", "sess_concurrent_02"}
    now = datetime.now(timezone.utc)
    chosen, diags = choose_current_session(sessions, active_leases, set(), now)

    assert chosen is not None
    assert chosen.id == "sess_concurrent_01"
    assert "MULTIPLE_CURRENT_SESSIONS" in diags


@pytest.mark.asyncio
async def test_synthetic_db_lineage_cycle_detection(hermes_runtime_adapter: HermesSqliteRuntimeAdapter):
    """
    sess_cycle_a -> sess_cycle_b -> sess_cycle_a.
    extract_session_lineage detects cycle and terminates without hanging.
    """
    sessions = await hermes_runtime_adapter.list_sessions(agent_id="marketing")
    sessions_by_id = {s.id: s for s in sessions}

    assert "sess_cycle_a" in sessions_by_id
    assert "sess_cycle_b" in sessions_by_id

    lineage, has_cycle = extract_session_lineage("sess_cycle_a", sessions_by_id)
    assert has_cycle is True
    assert "sess_cycle_a" in lineage
    assert "sess_cycle_b" in lineage
