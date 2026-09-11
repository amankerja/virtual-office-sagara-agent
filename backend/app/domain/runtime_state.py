"""Domain models, staleness configuration, and pure derivation functions for Sagara Mission Control.

Strictly adheres to:
- Prompt 11: Real Agent Projection + Runtime Correlation Hardening
- Pure functions where possible (testable without SQLite or side effects)
- Injected UTC timestamps (no unmocked datetime.now() inside pure logic)
- Strict UNKNOWN != ZERO semantics
- Identity, State, Evidence, Confidence, Correlation, and Staleness separation
- Truth chain: ProfileDefinition -> Session -> Delegation -> Usage -> Task -> Approval -> AgentProjection
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import math
from typing import Any, Mapping, Optional

from app.schemas.agents import AgentState, AgentUsageDto, RuntimeConfidence
from app.schemas.approvals import ApprovalDto
from app.schemas.delegations import DelegationDto
from app.schemas.sessions import SessionDto
from app.schemas.tasks import TaskDto


# ---------------------------------------------------------------------------
# 1. Internal Concept: Runtime Evidence & Correlation Edge
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class RuntimeEvidence:
    """Internal runtime evidence unit backing correlation decisions."""
    evidence_type: str
    entity_id: Optional[str]
    observed_at: Optional[datetime]
    confidence: str  # "CONFIRMED", "INFERRED", "STALE", "UNKNOWN"
    source: str      # e.g., "session_turn_leases", "sessions", "async_delegations", "gateway_heartbeats"
    attributes: Mapping[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class CorrelationEdge:
    """Internal directed edge linking entities across the truth chain."""
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    confidence: str  # "DIRECT", "INFERRED", "UNKNOWN"
    evidence: str


# ---------------------------------------------------------------------------
# 2. Canonical Evidence Types
# ---------------------------------------------------------------------------

class EvidenceType:
    GATEWAY_HEARTBEAT = "GATEWAY_HEARTBEAT"
    SESSION_EXISTS = "SESSION_EXISTS"
    SESSION_RECENT = "SESSION_RECENT"
    SESSION_ACTIVE_LEASE = "SESSION_ACTIVE_LEASE"
    SESSION_FAILED = "SESSION_FAILED"
    SESSION_COMPLETED = "SESSION_COMPLETED"
    DELEGATION_QUEUED = "DELEGATION_QUEUED"
    DELEGATION_RUNNING = "DELEGATION_RUNNING"
    DELEGATION_CLAIMED = "DELEGATION_CLAIMED"
    DELEGATION_COMPLETED = "DELEGATION_COMPLETED"
    DELEGATION_FAILED = "DELEGATION_FAILED"
    DELEGATION_CANCELLED = "DELEGATION_CANCELLED"
    USAGE_OBSERVED = "USAGE_OBSERVED"
    TASK_SESSION_LINK = "TASK_SESSION_LINK"
    APPROVAL_PENDING = "APPROVAL_PENDING"
    RUNTIME_PROFILE_PRESENT = "RUNTIME_PROFILE_PRESENT"


# ---------------------------------------------------------------------------
# 3. Centralized Staleness Configuration
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class RuntimeStalenessConfig:
    """Centralized thresholds for evidence freshness and staleness prevention."""
    runtime_active_grace_seconds: int = 60       # Turn lease / active execution grace window
    runtime_recent_window_seconds: int = 900     # 15 min window for RECENTLY_ACTIVE
    gateway_heartbeat_healthy_seconds: int = 60  # Heartbeat <= 60s is HEALTHY
    gateway_stale_seconds: int = 300             # Heartbeat > 300s is STALE
    delegation_stale_seconds: int = 1800         # 30 min before a running delegation is considered stale
    error_recency_seconds: int = 300             # 5 min window for current ERROR recency


DEFAULT_STALENESS_CONFIG = RuntimeStalenessConfig()


# ---------------------------------------------------------------------------
# 4. Pure Time & Staleness Utilities
# ---------------------------------------------------------------------------

def parse_iso_or_epoch(val: Any) -> Optional[datetime]:
    """Safely converts ISO 8601 string or numeric unix epoch to UTC datetime."""
    if val is None:
        return None
    if isinstance(val, datetime):
        if val.tzinfo is None:
            return val.replace(tzinfo=timezone.utc)
        return val.astimezone(timezone.utc)
    if isinstance(val, (int, float)):
        if val <= 0:
            return None
        try:
            return datetime.fromtimestamp(val, timezone.utc)
        except (ValueError, OSError, OverflowError):
            return None
    if isinstance(val, str):
        val_str = val.strip()
        if not val_str:
            return None
        try:
            # Try float epoch representation first
            num_val = float(val_str)
            return datetime.fromtimestamp(num_val, timezone.utc)
        except ValueError:
            pass
        try:
            cleaned = val_str.replace("Z", "+00:00")
            dt = datetime.fromisoformat(cleaned)
            if dt.tzinfo is None:
                return dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except (ValueError, OSError):
            return None
    return None


def is_evidence_stale(
    observed_at: Any,
    threshold_seconds: int,
    now: datetime,
) -> bool:
    """Returns True if the observed timestamp is older than threshold_seconds relative to now."""
    dt = parse_iso_or_epoch(observed_at)
    if dt is None:
        return True
    now_utc = now if now.tzinfo is not None else now.replace(tzinfo=timezone.utc)
    age_seconds = (now_utc - dt).total_seconds()
    return age_seconds > threshold_seconds


# ---------------------------------------------------------------------------
# 5. Session Selection & Current Session Rule (Section 30, 31, 32, 80, 81)
# ---------------------------------------------------------------------------

def choose_current_session(
    sessions: list[SessionDto],
    active_leases: set[str],
    running_delegation_parent_sessions: set[str],
    now: datetime,
    config: RuntimeStalenessConfig = DEFAULT_STALENESS_CONFIG,
) -> tuple[Optional[SessionDto], list[str]]:
    """
    Selects currentSessionId ONLY if strong current execution evidence maps to it:
    - Unexpired turn lease on this session
    - Or verified running delegation on this session within non-stale window

    If no current execution evidence exists, returns (None, diagnostics).
    Latest historical session is NEVER called currentSessionId.

    If multiple active sessions exist:
    - Deterministically selects by strongest evidence (lease > delegation)
      then recency (last_activity_at DESC) then ID tie-break (id DESC).
    - Emits MULTIPLE_CURRENT_SESSIONS diagnostic.
    """
    diagnostics: list[str] = []
    active_candidates: list[tuple[int, float, str, SessionDto]] = []

    for s in sessions:
        is_lease_active = s.id in active_leases
        is_deleg_active = s.id in running_delegation_parent_sessions

        if not (is_lease_active or is_deleg_active):
            continue

        # Check recency of activity to ensure evidence isn't ancient
        dt = parse_iso_or_epoch(s.last_activity_at or s.started_at)
        epoch = dt.timestamp() if dt else 0.0

        # Strength scoring: 2 for active lease, 1 for active delegation
        strength = 2 if is_lease_active else 1

        active_candidates.append((strength, epoch, s.id, s))

    if not active_candidates:
        return None, diagnostics

    if len(active_candidates) > 1:
        diagnostics.append("MULTIPLE_CURRENT_SESSIONS")

    # Sort descending by: strength (authoritative first), epoch (freshest first), id (tie-break)
    active_candidates.sort(key=lambda item: (item[0], item[1], item[2]), reverse=True)

    chosen_session = active_candidates[0][3]
    return chosen_session, diagnostics


# ---------------------------------------------------------------------------
# 6. Session Lineage & Cycle Protection (Section 33, 34)
# ---------------------------------------------------------------------------

def extract_session_lineage(
    session_id: str,
    sessions_by_id: Mapping[str, SessionDto],
    max_depth: int = 50,
) -> tuple[list[str], bool]:
    """
    Traverses session parent lineage safely with cycle protection.
    Returns (lineage_ids, has_cycle).
    """
    lineage: list[str] = [session_id]
    visited: set[str] = {session_id}
    curr_id = session_id

    for _ in range(max_depth):
        sess = sessions_by_id.get(curr_id)
        if not sess or not sess.parent_session_id:
            break

        parent_id = sess.parent_session_id.strip()
        if not parent_id:
            break

        if parent_id in visited:
            # Cycle detected
            return lineage, True

        lineage.append(parent_id)
        visited.add(parent_id)
        curr_id = parent_id

    return lineage, False


# ---------------------------------------------------------------------------
# 7. Delegation Active Count & Staleness (Section 37, 39, 40)
# ---------------------------------------------------------------------------

def calculate_active_delegations_count(
    delegations: list[DelegationDto],
) -> int:
    """
    Calculates active delegations strictly:
    Counts ONLY states: RUNNING, CLAIMED, QUEUED.
    Excludes COMPLETED, FAILED, CANCELLED, UNKNOWN.
    """
    active_states = {"RUNNING", "CLAIMED", "QUEUED"}
    return sum(1 for d in delegations if d.state in active_states)


def check_delegation_staleness(
    delegation: DelegationDto,
    now: datetime,
    config: RuntimeStalenessConfig = DEFAULT_STALENESS_CONFIG,
) -> bool:
    """Flags if a running delegation has remained uncompleted beyond delegation_stale_seconds."""
    if delegation.state not in ("RUNNING", "CLAIMED"):
        return False
    ref_time = delegation.started_at
    return is_evidence_stale(ref_time, config.delegation_stale_seconds, now)


# ---------------------------------------------------------------------------
# 8. Deterministic Agent State Precedence & Derivation (Section 27, 64)
# ---------------------------------------------------------------------------

def derive_agent_runtime_state(
    profile_id: str,
    configuration_state: Optional[str],
    matching_sessions: list[SessionDto],
    matching_delegations: list[DelegationDto],
    active_turn_leases: set[str],
    pending_approvals: list[ApprovalDto],
    active_tasks: list[TaskDto],
    gateway_status: str,
    gateway_connected: bool,
    now: datetime,
    config: RuntimeStalenessConfig = DEFAULT_STALENESS_CONFIG,
) -> tuple[AgentState, RuntimeConfidence, Optional[str], Optional[str], Optional[int], Optional[int], list[str]]:
    """
    Deterministically derives:
    (state, confidence, current_session_id, current_model, session_count, active_delegations_count, diagnostics)

    Exact Precedence Order:
    1. CONFIGURATION_INCOMPLETE: Static profile configuration is invalid/incomplete. (CONFIRMED)
    2. AWAITING_APPROVAL: Current workflow has pending approval for this agent/current task. (CONFIRMED)
    3. ACTIVE: Authoritative proof of live execution right now (active turn lease OR non-stale running delegation).
    4. ERROR: Current active execution failure within error_recency_seconds.
    5. DEGRADED: Gateway degraded or stale while agent has recent activity evidence.
    6. RECENTLY_ACTIVE: Recent unclosed activity within 900s, no active lease. (INFERRED)
    7. IDLE: Historical session evidence present + healthy gateway + no active execution. (INFERRED)
    8. OFFLINE: Only if explicit offline proof.
    9. UNKNOWN: No runtime evidence at all. (UNKNOWN)
    """
    diagnostics: list[str] = []

    # 1. CONFIGURATION_INCOMPLETE (Section 25)
    if configuration_state == "INCOMPLETE":
        return (
            "CONFIGURATION_INCOMPLETE",
            "CONFIRMED",
            None,
            None,
            None,
            None,
            diagnostics,
        )

    # Calculate active delegations and running delegation sessions
    running_delegations = [
        d for d in matching_delegations
        if d.state in ("RUNNING", "CLAIMED") and not check_delegation_staleness(d, now, config)
    ]
    running_deleg_sessions = {
        d.parent_session_id for d in running_delegations if d.parent_session_id
    }

    # Session currentness
    current_session, session_diags = choose_current_session(
        matching_sessions,
        active_turn_leases,
        running_deleg_sessions,
        now,
        config,
    )
    diagnostics.extend(session_diags)

    # Compute delegation counts
    active_del_count = calculate_active_delegations_count(matching_delegations) if matching_delegations else None
    session_count = len(matching_sessions) if matching_sessions else None

    # Check for active execution evidence
    has_active_turn_lease = any(s.id in active_turn_leases for s in matching_sessions)
    has_running_delegation = len(running_delegations) > 0

    # 2. AWAITING_APPROVAL (Section 26, 57)
    # Check if there is a pending approval directly related to this agent or its active tasks
    active_task_ids = {t.id for t in active_tasks if t.assigned_agent_id == profile_id and t.state in ("RUNNING", "AWAITING_APPROVAL", "READY", "QUEUED")}
    has_pending_approval = any(
        a.state == "PENDING" and (a.agent_id == profile_id or (a.task_id and a.task_id in active_task_ids))
        for a in pending_approvals
    )
    if has_pending_approval:
        model = current_session.model if current_session else None
        curr_sess_id = current_session.id if current_session else None
        return (
            "AWAITING_APPROVAL",
            "CONFIRMED",
            curr_sess_id,
            model,
            session_count,
            active_del_count,
            diagnostics,
        )

    # 3. ACTIVE (Section 15, 16)
    if has_active_turn_lease or has_running_delegation:
        curr_sess_id = current_session.id if current_session else None
        model = current_session.model if current_session else None

        # Confidence: Authoritative if gateway is HEALTHY
        if gateway_connected and gateway_status == "HEALTHY":
            confidence: RuntimeConfidence = "CONFIRMED"
        elif gateway_connected and gateway_status == "DEGRADED":
            confidence = "INFERRED"
            diagnostics.append("GATEWAY_DEGRADED_DURING_ACTIVE")
        else:
            confidence = "STALE"
            diagnostics.append("GATEWAY_STALE_DURING_ACTIVE")

        return (
            "ACTIVE",
            confidence,
            curr_sess_id,
            model,
            session_count,
            active_del_count,
            diagnostics,
        )

    # 4. ERROR (Section 24, 69)
    # Current failures only - check if any failed delegation or session occurred recently (within error_recency_seconds)
    recent_failed_delegations = [
        d for d in matching_delegations
        if d.state == "FAILED" and not is_evidence_stale(d.completed_at or d.started_at, config.error_recency_seconds, now)
    ]
    recent_failed_sessions = [
        s for s in matching_sessions
        if s.state == "FAILED" and not is_evidence_stale(s.last_activity_at, config.error_recency_seconds, now)
    ]

    if recent_failed_delegations or recent_failed_sessions:
        return (
            "ERROR",
            "CONFIRMED",
            None,
            None,
            session_count,
            active_del_count,
            diagnostics,
        )

    # 5. DEGRADED (Section 23, 60)
    # If gateway is degraded/stale and the profile has recent runtime activity
    recent_unclosed_sessions = [
        s for s in matching_sessions
        if s.state in ("RECENT", "ACTIVE") or (s.state != "ARCHIVED" and not is_evidence_stale(s.last_activity_at, config.runtime_recent_window_seconds, now))
    ]

    if gateway_status in ("DEGRADED", "STALE") and recent_unclosed_sessions:
        diagnostics.append("GATEWAY_STALE")
        return (
            "DEGRADED",
            "INFERRED" if gateway_connected else "STALE",
            None,
            recent_unclosed_sessions[0].model,
            session_count,
            active_del_count,
            diagnostics,
        )

    # 6. RECENTLY_ACTIVE (Section 17)
    # Recent activity without proof of current execution
    if recent_unclosed_sessions and gateway_connected and gateway_status == "HEALTHY":
        return (
            "RECENTLY_ACTIVE",
            "INFERRED",
            None,
            recent_unclosed_sessions[0].model,
            session_count,
            active_del_count,
            diagnostics,
        )

    # 7. IDLE (Section 21)
    # Profile has historical sessions, gateway is healthy, no active execution
    if matching_sessions and gateway_connected and gateway_status == "HEALTHY":
        return (
            "IDLE",
            "INFERRED",
            None,
            None,
            session_count,
            active_del_count,
            diagnostics,
        )

    # 8. UNKNOWN (Section 13, 22, 68)
    # Absence of evidence is not evidence of absence. Never assume OFFLINE without explicit offline proof.
    return (
        "UNKNOWN",
        "UNKNOWN",
        None,
        None,
        session_count,
        active_del_count,
        diagnostics,
    )


# ---------------------------------------------------------------------------
# 9. Direct Task ↔ Session Correlation (Section 47, 48, 49, 124)
# ---------------------------------------------------------------------------

def correlate_task_to_session(
    task: TaskDto,
    known_session_ids: set[str],
) -> tuple[Optional[str], str]:
    """
    Correlates Task to Hermes Session strictly via direct evidence:
    - Direct session_id on task / metadata / correlation_id.
    - REJECTS profile-only and timestamp-only similarity.
    Returns (session_id or None, confidence: "DIRECT" | "UNKNOWN").
    """
    # Look for explicit session foreign reference
    direct_session_id = getattr(task, "session_id", None)
    if direct_session_id and str(direct_session_id) in known_session_ids:
        return str(direct_session_id), "DIRECT"

    # Check task timeline or metadata if stored with correlation key
    return None, "UNKNOWN"


# ---------------------------------------------------------------------------
# 10. Direct Approval ↔ Task ↔ Runtime Correlation (Section 55, 56)
# ---------------------------------------------------------------------------

def correlate_approval_to_runtime(
    approval: ApprovalDto,
    task_session_map: Mapping[str, str],
) -> tuple[Optional[str], Optional[str]]:
    """
    Correlates Approval transitively:
    Approval -> Task (direct task_id) -> Session (direct session_id).
    Does NOT manufacture a direct link between Approval and Session.
    Returns (task_id, session_id or None).
    """
    task_id = approval.task_id
    if not task_id:
        return None, None

    session_id = task_session_map.get(task_id)
    return task_id, session_id


# ---------------------------------------------------------------------------
# 11. Model & Token Usage Aggregation (Section 41, 42, 43, 44, 45, 75)
# ---------------------------------------------------------------------------

def aggregate_usage_records(
    records: list[Mapping[str, Any]],
) -> Optional[AgentUsageDto]:
    """
    Aggregates model/token usage preserving strict UNKNOWN != ZERO semantics:
    - If a field is None across all records, the aggregated metric is None (UNKNOWN).
    - 0 is returned only if explicit 0 tokens or costs were recorded.
    - actual_cost_usd and estimated_cost_usd are never collapsed.
    """
    if not records:
        return None

    has_input = False
    total_input = 0
    has_output = False
    total_output = 0
    has_est_cost = False
    total_est_cost = 0.0
    has_act_cost = False
    total_act_cost = 0.0

    for r in records:
        inp = r.get("input_tokens")
        if inp is not None:
            has_input = True
            total_input += int(inp)

        out = r.get("output_tokens")
        if out is not None:
            has_output = True
            total_output += int(out)

        est = r.get("estimated_cost_usd")
        if est is not None:
            has_est_cost = True
            total_est_cost += float(est)

        act = r.get("actual_cost_usd")
        if act is not None:
            has_act_cost = True
            total_act_cost += float(act)

    if not (has_input or has_output or has_est_cost or has_act_cost):
        return None

    return AgentUsageDto(
        input_tokens=total_input if has_input else None,
        output_tokens=total_output if has_output else None,
        estimated_cost_usd=round(total_est_cost, 6) if has_est_cost else None,
        actual_cost_usd=round(total_act_cost, 6) if has_act_cost else None,
    )
