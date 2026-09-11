"""Pure domain unit tests for Sagara Mission Control runtime state derivation.

Strictly tests:
- Prompt 11: Real Agent Projection + Runtime Correlation Hardening
- Evidence Precedence, Confidence, and Staleness
- False-State Prevention:
  * Historical session -> NOT ACTIVE
  * Recent activity only -> RECENTLY_ACTIVE, NOT ACTIVE
  * Completed/failed delegation -> NOT ACTIVE
  * Owner PID only -> NOT ACTIVE
  * No session -> UNKNOWN, NOT OFFLINE
  * Historical failed session -> NOT permanent ERROR
  * Stale running delegation -> STALE flagged, NOT perpetually ACTIVE
  * Lack of evidence tends toward UNKNOWN
- Current Session Selection (Latest != Current)
- Session Lineage Cycle Protection
- Delegation Active Counts (Excludes final states)
- Usage UNKNOWN != ZERO and Cost Separation
- Direct Task & Transitive Approval Correlation
- Gateway degradation & false mass-OFFLINE prevention
"""

from datetime import datetime, timezone
import pytest

from app.domain.runtime_state import (
    DEFAULT_STALENESS_CONFIG,
    RuntimeStalenessConfig,
    aggregate_usage_records,
    calculate_active_delegations_count,
    check_delegation_staleness,
    choose_current_session,
    correlate_approval_to_runtime,
    correlate_task_to_session,
    derive_agent_runtime_state,
    extract_session_lineage,
    is_evidence_stale,
)
from app.schemas.approvals import ApprovalDto
from app.schemas.delegations import DelegationDto
from app.schemas.sessions import SessionDto
from app.schemas.tasks import TaskDto

T0 = datetime(2026, 9, 10, 12, 0, 0, tzinfo=timezone.utc)
T0_EPOCH = T0.timestamp()


def make_session(
    sid: str,
    profile_id: str = "agent-alpha",
    state: str = "COMPLETED",
    model: str = "gemini-1.5-pro",
    parent_id: str | None = None,
    last_act_seconds_ago: float = 3600.0,
    input_tokens: int | None = 1000,
    output_tokens: int | None = 200,
    est_cost: float | None = 0.01,
    act_cost: float | None = 0.01,
) -> SessionDto:
    act_epoch = T0_EPOCH - last_act_seconds_ago
    act_iso = datetime.fromtimestamp(act_epoch, timezone.utc).isoformat().replace("+00:00", "Z")
    return SessionDto(
        id=sid,
        profile_id=profile_id,
        agent_id=profile_id,
        source="hermes",
        state=state,  # type: ignore
        model=model,
        provider=None,
        started_at=act_iso,
        last_activity_at=act_iso,
        message_count=5,
        tool_call_count=1,
        parent_session_id=parent_id,
        usage={
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "reasoning_tokens": None,
            "estimated_cost_usd": est_cost,
            "actual_cost_usd": act_cost,
        },
    )


def make_delegation(
    did: str,
    target_id: str = "agent-alpha",
    state: str = "RUNNING",
    parent_session: str | None = None,
    started_seconds_ago: float = 60.0,
    completed_seconds_ago: float | None = None,
    owner_pid: int | None = 12345,
) -> DelegationDto:
    st_iso = datetime.fromtimestamp(T0_EPOCH - started_seconds_ago, timezone.utc).isoformat().replace("+00:00", "Z")
    comp_iso = (
        datetime.fromtimestamp(T0_EPOCH - completed_seconds_ago, timezone.utc).isoformat().replace("+00:00", "Z")
        if completed_seconds_ago is not None
        else None
    )
    return DelegationDto(
        id=did,
        parent_session_id=parent_session,
        target_agent_id=target_id,
        task_title=f"Task for {did}",
        state=state,  # type: ignore
        worker_pid=str(owner_pid) if owner_pid else None,
        owner_pid=owner_pid,
        started_at=st_iso,
        completed_at=comp_iso,
    )


# ---------------------------------------------------------------------------
# Precedence Tests (Section 27, 66)
# ---------------------------------------------------------------------------

def test_precedence_configuration_incomplete_over_active():
    """CONFIGURATION_INCOMPLETE takes precedence over any runtime activity."""
    sess = make_session("s1", state="ACTIVE", last_act_seconds_ago=10)
    state, conf, curr_sid, model, sess_cnt, del_cnt, _ = derive_agent_runtime_state(
        profile_id="agent-alpha",
        configuration_state="INCOMPLETE",
        matching_sessions=[sess],
        matching_delegations=[],
        active_turn_leases={"s1"},
        pending_approvals=[],
        active_tasks=[],
        gateway_status="HEALTHY",
        gateway_connected=True,
        now=T0,
    )
    assert state == "CONFIGURATION_INCOMPLETE"
    assert conf == "CONFIRMED"
    assert curr_sid is None


def test_precedence_awaiting_approval_over_active():
    """A pending approval for an agent overrides ACTIVE state to AWAITING_APPROVAL."""
    sess = make_session("s1", state="ACTIVE", last_act_seconds_ago=10)
    approval = ApprovalDto(
        id="appr-1",
        state="PENDING",
        risk="HIGH",
        action_type="TASK_EXECUTE",
        title="Deploy to Prod",
        agent_id="agent-alpha",
        requested_at=T0.isoformat().replace("+00:00", "Z"),
    )
    state, conf, curr_sid, model, sess_cnt, del_cnt, _ = derive_agent_runtime_state(
        profile_id="agent-alpha",
        configuration_state="CONFIGURED",
        matching_sessions=[sess],
        matching_delegations=[],
        active_turn_leases={"s1"},
        pending_approvals=[approval],
        active_tasks=[],
        gateway_status="HEALTHY",
        gateway_connected=True,
        now=T0,
    )
    assert state == "AWAITING_APPROVAL"
    assert conf == "CONFIRMED"
    # Even though awaiting approval, current active session is preserved
    assert curr_sid == "s1"


def test_precedence_active_with_lease():
    """Valid active turn lease produces ACTIVE / CONFIRMED."""
    sess = make_session("s1", state="ACTIVE", last_act_seconds_ago=10)
    state, conf, curr_sid, model, sess_cnt, del_cnt, _ = derive_agent_runtime_state(
        profile_id="agent-alpha",
        configuration_state="CONFIGURED",
        matching_sessions=[sess],
        matching_delegations=[],
        active_turn_leases={"s1"},
        pending_approvals=[],
        active_tasks=[],
        gateway_status="HEALTHY",
        gateway_connected=True,
        now=T0,
    )
    assert state == "ACTIVE"
    assert conf == "CONFIRMED"
    assert curr_sid == "s1"
    assert model == "gemini-1.5-pro"


def test_precedence_active_with_running_delegation():
    """Running delegation alone (without active turn lease) produces ACTIVE / CONFIRMED."""
    deleg = make_delegation("d1", state="RUNNING", started_seconds_ago=30)
    state, conf, curr_sid, model, sess_cnt, del_cnt, _ = derive_agent_runtime_state(
        profile_id="agent-alpha",
        configuration_state="CONFIGURED",
        matching_sessions=[],
        matching_delegations=[deleg],
        active_turn_leases=set(),
        pending_approvals=[],
        active_tasks=[],
        gateway_status="HEALTHY",
        gateway_connected=True,
        now=T0,
    )
    assert state == "ACTIVE"
    assert conf == "CONFIRMED"
    assert del_cnt == 1


def test_precedence_recently_active():
    """Unclosed session with activity <= 900s without lease produces RECENTLY_ACTIVE / INFERRED."""
    sess = make_session("s1", state="RECENT", last_act_seconds_ago=120)
    state, conf, curr_sid, model, sess_cnt, del_cnt, _ = derive_agent_runtime_state(
        profile_id="agent-alpha",
        configuration_state="CONFIGURED",
        matching_sessions=[sess],
        matching_delegations=[],
        active_turn_leases=set(),
        pending_approvals=[],
        active_tasks=[],
        gateway_status="HEALTHY",
        gateway_connected=True,
        now=T0,
    )
    assert state == "RECENTLY_ACTIVE"
    assert conf == "INFERRED"
    assert curr_sid is None  # Recent session is NOT current execution


def test_precedence_idle():
    """Historical session + healthy gateway + no active execution produces IDLE / INFERRED."""
    sess = make_session("s1", state="COMPLETED", last_act_seconds_ago=3600)
    state, conf, curr_sid, model, sess_cnt, del_cnt, _ = derive_agent_runtime_state(
        profile_id="agent-alpha",
        configuration_state="CONFIGURED",
        matching_sessions=[sess],
        matching_delegations=[],
        active_turn_leases=set(),
        pending_approvals=[],
        active_tasks=[],
        gateway_status="HEALTHY",
        gateway_connected=True,
        now=T0,
    )
    assert state == "IDLE"
    assert conf == "INFERRED"
    assert curr_sid is None


def test_precedence_unknown_when_no_evidence():
    """No sessions or delegations produces UNKNOWN / UNKNOWN."""
    state, conf, curr_sid, model, sess_cnt, del_cnt, _ = derive_agent_runtime_state(
        profile_id="agent-alpha",
        configuration_state="CONFIGURED",
        matching_sessions=[],
        matching_delegations=[],
        active_turn_leases=set(),
        pending_approvals=[],
        active_tasks=[],
        gateway_status="HEALTHY",
        gateway_connected=True,
        now=T0,
    )
    assert state == "UNKNOWN"
    assert conf == "UNKNOWN"
    assert curr_sid is None
    assert sess_cnt is None


# ---------------------------------------------------------------------------
# False-Active Prevention Tests (Section 67)
# ---------------------------------------------------------------------------

def test_false_active_historical_session_is_not_active():
    """Historical session must never produce ACTIVE."""
    sess = make_session("s1", state="COMPLETED", last_act_seconds_ago=7200)
    state, conf, curr_sid, _, _, _, _ = derive_agent_runtime_state(
        profile_id="agent-alpha",
        configuration_state="CONFIGURED",
        matching_sessions=[sess],
        matching_delegations=[],
        active_turn_leases=set(),
        pending_approvals=[],
        active_tasks=[],
        gateway_status="HEALTHY",
        gateway_connected=True,
        now=T0,
    )
    assert state != "ACTIVE"
    assert curr_sid is None


def test_false_active_recent_activity_alone_is_not_active():
    """Recent activity (<= 900s) without active turn lease or running delegation is NOT ACTIVE."""
    sess = make_session("s1", state="RECENT", last_act_seconds_ago=60)
    state, conf, curr_sid, _, _, _, _ = derive_agent_runtime_state(
        profile_id="agent-alpha",
        configuration_state="CONFIGURED",
        matching_sessions=[sess],
        matching_delegations=[],
        active_turn_leases=set(),
        pending_approvals=[],
        active_tasks=[],
        gateway_status="HEALTHY",
        gateway_connected=True,
        now=T0,
    )
    assert state == "RECENTLY_ACTIVE"
    assert state != "ACTIVE"
    assert curr_sid is None


def test_false_active_completed_delegation_is_not_active():
    """Completed delegation does not mark agent ACTIVE."""
    deleg = make_delegation("d1", state="COMPLETED", started_seconds_ago=300, completed_seconds_ago=10)
    state, conf, curr_sid, _, _, _, _ = derive_agent_runtime_state(
        profile_id="agent-alpha",
        configuration_state="CONFIGURED",
        matching_sessions=[],
        matching_delegations=[deleg],
        active_turn_leases=set(),
        pending_approvals=[],
        active_tasks=[],
        gateway_status="HEALTHY",
        gateway_connected=True,
        now=T0,
    )
    assert state != "ACTIVE"


def test_false_active_owner_pid_alone_is_not_active():
    """Owner PID on a completed or cancelled delegation is NOT active skill execution."""
    deleg = make_delegation("d1", state="CANCELLED", owner_pid=9999)
    state, _, curr_sid, _, _, del_cnt, _ = derive_agent_runtime_state(
        profile_id="agent-alpha",
        configuration_state="CONFIGURED",
        matching_sessions=[],
        matching_delegations=[deleg],
        active_turn_leases=set(),
        pending_approvals=[],
        active_tasks=[],
        gateway_status="HEALTHY",
        gateway_connected=True,
        now=T0,
    )
    assert state != "ACTIVE"
    assert del_cnt == 0


# ---------------------------------------------------------------------------
# False-Offline Prevention Tests (Section 68)
# ---------------------------------------------------------------------------

def test_false_offline_no_session_is_unknown_not_offline():
    """Profile with no sessions must be UNKNOWN, NEVER OFFLINE."""
    state, conf, _, _, _, _, _ = derive_agent_runtime_state(
        profile_id="new-agent",
        configuration_state="CONFIGURED",
        matching_sessions=[],
        matching_delegations=[],
        active_turn_leases=set(),
        pending_approvals=[],
        active_tasks=[],
        gateway_status="HEALTHY",
        gateway_connected=True,
        now=T0,
    )
    assert state == "UNKNOWN"
    assert state != "OFFLINE"


def test_false_offline_gateway_unavailable_does_not_mass_offline():
    """Gateway outage makes confidence UNKNOWN/STALE, not mass OFFLINE."""
    state, conf, _, _, _, _, _ = derive_agent_runtime_state(
        profile_id="agent-alpha",
        configuration_state="CONFIGURED",
        matching_sessions=[],
        matching_delegations=[],
        active_turn_leases=set(),
        pending_approvals=[],
        active_tasks=[],
        gateway_status="NOT_CONNECTED",
        gateway_connected=False,
        now=T0,
    )
    assert state == "UNKNOWN"
    assert state != "OFFLINE"


# ---------------------------------------------------------------------------
# False-Error Prevention Tests (Section 69)
# ---------------------------------------------------------------------------

def test_false_error_historical_failed_session_is_not_error():
    """A session that failed hours ago must not permanently leave the agent in ERROR."""
    # Failed 3600 seconds ago (outside 300s error window)
    failed_sess = make_session("s_fail", state="FAILED", last_act_seconds_ago=3600)
    state, conf, _, _, _, _, _ = derive_agent_runtime_state(
        profile_id="agent-alpha",
        configuration_state="CONFIGURED",
        matching_sessions=[failed_sess],
        matching_delegations=[],
        active_turn_leases=set(),
        pending_approvals=[],
        active_tasks=[],
        gateway_status="HEALTHY",
        gateway_connected=True,
        now=T0,
    )
    assert state == "IDLE"  # Historical session evidence, gateway healthy
    assert state != "ERROR"


def test_current_error_within_recency_window():
    """A session or delegation that failed within 300s window correctly produces ERROR."""
    failed_sess = make_session("s_fail", state="FAILED", last_act_seconds_ago=60)
    state, conf, _, _, _, _, _ = derive_agent_runtime_state(
        profile_id="agent-alpha",
        configuration_state="CONFIGURED",
        matching_sessions=[failed_sess],
        matching_delegations=[],
        active_turn_leases=set(),
        pending_approvals=[],
        active_tasks=[],
        gateway_status="HEALTHY",
        gateway_connected=True,
        now=T0,
    )
    assert state == "ERROR"
    assert conf == "CONFIRMED"


# ---------------------------------------------------------------------------
# Stale Running Delegation Prevention (Section 70)
# ---------------------------------------------------------------------------

def test_stale_running_delegation_is_not_active():
    """A delegation stuck in RUNNING for > 1800s is flagged stale and not treated as ACTIVE."""
    stale_del = make_delegation("d_stale", state="RUNNING", started_seconds_ago=3600)
    assert check_delegation_staleness(stale_del, T0, DEFAULT_STALENESS_CONFIG) is True

    state, conf, _, _, _, _, _ = derive_agent_runtime_state(
        profile_id="agent-alpha",
        configuration_state="CONFIGURED",
        matching_sessions=[],
        matching_delegations=[stale_del],
        active_turn_leases=set(),
        pending_approvals=[],
        active_tasks=[],
        gateway_status="HEALTHY",
        gateway_connected=True,
        now=T0,
    )
    assert state != "ACTIVE"


# ---------------------------------------------------------------------------
# Current Session Selection Tests (Section 30, 31, 32, 80, 81)
# ---------------------------------------------------------------------------

def test_current_session_rule_latest_historical_is_not_current():
    """Latest historical session is NOT currentSessionId."""
    s1 = make_session("s1", state="COMPLETED", last_act_seconds_ago=7200)
    s2 = make_session("s2", state="COMPLETED", last_act_seconds_ago=3600)
    chosen, diags = choose_current_session(
        sessions=[s1, s2],
        active_leases=set(),
        running_delegation_parent_sessions=set(),
        now=T0,
    )
    assert chosen is None


def test_current_session_active_lease_wins():
    """Session with active turn lease is selected as current."""
    s1 = make_session("s1", state="ACTIVE", last_act_seconds_ago=10)
    s2 = make_session("s2", state="COMPLETED", last_act_seconds_ago=3600)
    chosen, diags = choose_current_session(
        sessions=[s1, s2],
        active_leases={"s1"},
        running_delegation_parent_sessions=set(),
        now=T0,
    )
    assert chosen is not None
    assert chosen.id == "s1"


def test_current_session_multiple_active_deterministic():
    """Multiple active sessions trigger MULTIPLE_CURRENT_SESSIONS diagnostic and deterministic selection."""
    s1 = make_session("s1", state="ACTIVE", last_act_seconds_ago=20)
    s2 = make_session("s2", state="ACTIVE", last_act_seconds_ago=10)  # Fresher
    chosen, diags = choose_current_session(
        sessions=[s1, s2],
        active_leases={"s1", "s2"},
        running_delegation_parent_sessions=set(),
        now=T0,
    )
    assert chosen is not None
    assert chosen.id == "s2"  # Fresher activity wins
    assert "MULTIPLE_CURRENT_SESSIONS" in diags


# ---------------------------------------------------------------------------
# Session Lineage Cycle Protection Tests (Section 33, 34)
# ---------------------------------------------------------------------------

def test_session_lineage_cycle_protection():
    """Circular parent_session_id does not hang and flags cycle."""
    s_a = make_session("sess_a", parent_id="sess_b")
    s_b = make_session("sess_b", parent_id="sess_a")
    sessions_map = {"sess_a": s_a, "sess_b": s_b}

    lineage, has_cycle = extract_session_lineage("sess_a", sessions_map)
    assert has_cycle is True
    assert lineage == ["sess_a", "sess_b"]


def test_session_lineage_clean_traversal():
    """Linear parent lineage traverses without cycle."""
    s_root = make_session("sess_root", parent_id=None)
    s_mid = make_session("sess_mid", parent_id="sess_root")
    s_leaf = make_session("sess_leaf", parent_id="sess_mid")
    sessions_map = {"sess_root": s_root, "sess_mid": s_mid, "sess_leaf": s_leaf}

    lineage, has_cycle = extract_session_lineage("sess_leaf", sessions_map)
    assert has_cycle is False
    assert lineage == ["sess_leaf", "sess_mid", "sess_root"]


# ---------------------------------------------------------------------------
# Delegation Active Count Tests (Section 37)
# ---------------------------------------------------------------------------

def test_delegation_active_count_excludes_final_states():
    """active_delegations counts only RUNNING, CLAIMED, QUEUED."""
    delegations = [
        make_delegation("d1", state="RUNNING"),
        make_delegation("d2", state="CLAIMED"),
        make_delegation("d3", state="QUEUED"),
        make_delegation("d4", state="COMPLETED"),
        make_delegation("d5", state="FAILED"),
        make_delegation("d6", state="CANCELLED"),
    ]
    count = calculate_active_delegations_count(delegations)
    assert count == 3


# ---------------------------------------------------------------------------
# Usage Semantics Tests (Section 43, 44, 45)
# ---------------------------------------------------------------------------

def test_usage_unknown_not_zero_and_cost_separation():
    """Tokens and costs preserve None vs explicit 0 and actual vs estimated."""
    records = [
        {"input_tokens": 1000, "output_tokens": None, "estimated_cost_usd": 0.01, "actual_cost_usd": None},
        {"input_tokens": 500, "output_tokens": 100, "estimated_cost_usd": 0.005, "actual_cost_usd": 0.005},
    ]
    agg = aggregate_usage_records(records)
    assert agg is not None
    assert agg.input_tokens == 1500
    assert agg.output_tokens == 100  # None + 100 preserves 100
    assert agg.estimated_cost_usd == 0.015
    assert agg.actual_cost_usd == 0.005  # Preserved distinct from estimated


def test_usage_all_none_returns_none():
    """All-none usage returns None rather than 0."""
    records = [{"input_tokens": None, "output_tokens": None, "estimated_cost_usd": None, "actual_cost_usd": None}]
    agg = aggregate_usage_records(records)
    assert agg is None


# ---------------------------------------------------------------------------
# Task & Approval Correlation Tests (Section 47, 48, 55, 56)
# ---------------------------------------------------------------------------

def test_task_session_correlation_direct_only():
    """Direct session_id correlates; missing foreign key remains UNKNOWN."""
    # Direct task with session_id
    task_direct = TaskDto(
        id="t1",
        title="Direct Task",
        state="RUNNING",
        priority="HIGH",
        created_at=T0.isoformat().replace("+00:00", "Z"),
    )
    # Simulate dynamic attribute
    object.__setattr__(task_direct, "session_id", "sess_100")
    sess_id, conf = correlate_task_to_session(task_direct, {"sess_100"})
    assert sess_id == "sess_100"
    assert conf == "DIRECT"

    # Task without direct link
    task_no_link = TaskDto(
        id="t2",
        title="Orphan Task",
        state="RUNNING",
        priority="MEDIUM",
        created_at=T0.isoformat().replace("+00:00", "Z"),
        assigned_agent_id="lead",
    )
    sess_id, conf = correlate_task_to_session(task_no_link, {"sess_100"})
    assert sess_id is None
    assert conf == "UNKNOWN"


def test_approval_runtime_correlation_transitive():
    """Approval correlates to Session transitively through Task only."""
    appr = ApprovalDto(
        id="appr-1",
        state="PENDING",
        risk="HIGH",
        action_type="RUN",
        title="Test Approval",
        task_id="t1",
        requested_at=T0.isoformat().replace("+00:00", "Z"),
    )
    task_session_map = {"t1": "sess_100"}
    task_id, sess_id = correlate_approval_to_runtime(appr, task_session_map)
    assert task_id == "t1"
    assert sess_id == "sess_100"

    # If task has no session
    task_session_map_empty = {}
    task_id, sess_id = correlate_approval_to_runtime(appr, task_session_map_empty)
    assert task_id == "t1"
    assert sess_id is None
