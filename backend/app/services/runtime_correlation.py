"""RuntimeCorrelationService: In-memory correlation engine linking Sagara Profiles,
Hermes Sessions, Delegations, Usage, Tasks, and Approvals.

Strictly adheres to:
- Prompt 11: Truth Chain Hardening & False-State Prevention
- Strict canonical identity matching (No fuzzy matching, no partial strings)
- Unresolved profiles do not create phantom agents
- Bounded batch loading & in-memory indexing (No N+1 queries)
- Explainable correlation graph & internal diagnostics
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
import logging
from typing import Any, Mapping, Optional

from app.domain.runtime_state import (
    CorrelationEdge,
    DEFAULT_STALENESS_CONFIG,
    EvidenceType,
    RuntimeStalenessConfig,
    check_delegation_staleness,
    correlate_approval_to_runtime,
    correlate_task_to_session,
    extract_session_lineage,
    is_evidence_stale,
)
from app.schemas.approvals import ApprovalDto
from app.schemas.delegations import DelegationDto
from app.schemas.profiles import ProfileDto
from app.schemas.runtime import GatewayDto
from app.schemas.sessions import SessionDto
from app.schemas.tasks import TaskDto

logger = logging.getLogger("sagara.runtime.correlation")


@dataclass
class CorrelationDiagnostic:
    code: str
    message: str
    severity: str  # "INFO", "WARNING", "ERROR"
    details: dict[str, Any] = field(default_factory=dict)


class RuntimeCorrelationService:
    """
    Constructs an in-memory correlation graph and lookup indices for a single read window.
    Evaluates cross-entity links and captures anomalies as internal diagnostics.
    """

    def __init__(self, config: RuntimeStalenessConfig = DEFAULT_STALENESS_CONFIG) -> None:
        self._config = config
        self._diagnostics: list[CorrelationDiagnostic] = []
        self._edges: list[CorrelationEdge] = []

        # In-memory indexes
        self.sessions_by_profile: dict[str, list[SessionDto]] = {}
        self.delegations_by_profile: dict[str, list[DelegationDto]] = {}
        self.delegations_by_session: dict[str, list[DelegationDto]] = {}
        self.usage_by_session: dict[str, dict[str, Any]] = {}
        self.tasks_by_profile: dict[str, list[TaskDto]] = {}
        self.approvals_by_task: dict[str, list[ApprovalDto]] = {}
        self.approvals_by_profile: dict[str, list[ApprovalDto]] = {}
        self.task_to_session_map: dict[str, str] = {}
        self.unresolved_sessions: list[SessionDto] = []
        self.unresolved_delegations: list[DelegationDto] = []

    def record_diagnostic(
        self,
        code: str,
        message: str,
        severity: str = "INFO",
        details: Optional[dict[str, Any]] = None,
    ) -> None:
        diag = CorrelationDiagnostic(
            code=code,
            message=message,
            severity=severity,
            details=details or {},
        )
        self._diagnostics.append(diag)
        logger.debug("Runtime Correlation Diagnostic [%s] %s: %s", severity, code, message)

    def get_diagnostics(self) -> list[CorrelationDiagnostic]:
        return list(self._diagnostics)

    def get_edges(self) -> list[CorrelationEdge]:
        return list(self._edges)

    def build_correlation_indexes(
        self,
        profiles: list[ProfileDto],
        sessions: list[SessionDto],
        delegations: list[DelegationDto],
        usage_map: dict[str, dict[str, Any]],
        tasks: list[TaskDto],
        approvals: list[ApprovalDto],
        gateway: GatewayDto,
        now: datetime,
    ) -> None:
        """
        Builds in-memory correlation indices across all entities for a cohesive snapshot window.
        """
        self._diagnostics.clear()
        self._edges.clear()
        self.sessions_by_profile = {p.id: [] for p in profiles}
        self.delegations_by_profile = {p.id: [] for p in profiles}
        self.delegations_by_session = {}
        self.usage_by_session = dict(usage_map)
        self.tasks_by_profile = {p.id: [] for p in profiles}
        self.approvals_by_task = {}
        self.approvals_by_profile = {p.id: [] for p in profiles}
        self.task_to_session_map = {}
        self.unresolved_sessions = []
        self.unresolved_delegations = []

        registered_profile_ids = {p.id for p in profiles}
        sessions_by_id = {s.id: s for s in sessions}

        # 1. Gateway Health Evaluation (Section 60, 61, 150)
        if gateway.heartbeat_age_seconds is not None:
            if gateway.heartbeat_age_seconds > self._config.gateway_stale_seconds:
                self.record_diagnostic(
                    "GATEWAY_STALE",
                    f"Gateway heartbeat is stale ({gateway.heartbeat_age_seconds}s old).",
                    severity="WARNING",
                    details={"heartbeat_age_seconds": gateway.heartbeat_age_seconds},
                )
            elif gateway.heartbeat_age_seconds > self._config.gateway_heartbeat_healthy_seconds:
                self.record_diagnostic(
                    "GATEWAY_DEGRADED",
                    f"Gateway heartbeat is degraded ({gateway.heartbeat_age_seconds}s old).",
                    severity="WARNING",
                    details={"heartbeat_age_seconds": gateway.heartbeat_age_seconds},
                )

        # 2. Session ↔ Profile Correlation (Section 10, 11, 12)
        for s in sessions:
            # Canonical match: strip safe whitespace, but NO fuzzy matching
            p_id = (s.profile_id or s.agent_id or "").strip()
            if p_id and p_id in registered_profile_ids:
                self.sessions_by_profile[p_id].append(s)
                self._edges.append(
                    CorrelationEdge(
                        source_type="Session",
                        source_id=s.id,
                        target_type="Profile",
                        target_id=p_id,
                        confidence="DIRECT",
                        evidence="sessions.profile_name exact match",
                    )
                )
            else:
                self.unresolved_sessions.append(s)
                self.record_diagnostic(
                    "SESSION_PROFILE_UNRESOLVED",
                    f"Session '{s.id}' references profile '{p_id or 'None'}' which is not in the Sagara Profile Registry.",
                    severity="INFO",
                    details={"session_id": s.id, "referenced_profile": p_id or None},
                )

            # Cycle protection check on parent lineage (Section 33, 34)
            if s.parent_session_id:
                lineage, has_cycle = extract_session_lineage(s.id, sessions_by_id)
                if has_cycle:
                    self.record_diagnostic(
                        "SESSION_LINEAGE_CYCLE",
                        f"Detected circular parent lineage for session '{s.id}': {' -> '.join(lineage)}",
                        severity="WARNING",
                        details={"session_id": s.id, "lineage": lineage},
                    )

        # 3. Delegation ↔ Profile & Session Correlation (Section 35, 36, 37, 39)
        for d in delegations:
            # Origin / Target mapping
            target_id = (d.target_agent_id or "").strip()
            if target_id and target_id in registered_profile_ids:
                self.delegations_by_profile[target_id].append(d)
                self._edges.append(
                    CorrelationEdge(
                        source_type="Delegation",
                        source_id=d.id,
                        target_type="Profile",
                        target_id=target_id,
                        confidence="DIRECT",
                        evidence="async_delegations.task_json.role exact match",
                    )
                )
            else:
                self.unresolved_delegations.append(d)

            # Session correlation
            parent_sess = (d.parent_session_id or "").strip()
            if parent_sess:
                if parent_sess not in self.delegations_by_session:
                    self.delegations_by_session[parent_sess] = []
                self.delegations_by_session[parent_sess].append(d)

                if parent_sess in sessions_by_id:
                    self._edges.append(
                        CorrelationEdge(
                            source_type="Delegation",
                            source_id=d.id,
                            target_type="Session",
                            target_id=parent_sess,
                            confidence="DIRECT",
                            evidence="async_delegations.parent_session_id match",
                        )
                    )
                else:
                    self.record_diagnostic(
                        "DELEGATION_SESSION_UNRESOLVED",
                        f"Delegation '{d.id}' references parent session '{parent_sess}' which does not exist in sessions table.",
                        severity="INFO",
                        details={"delegation_id": d.id, "parent_session_id": parent_sess},
                    )

            # Delegation staleness check (Section 39)
            if check_delegation_staleness(d, now, self._config):
                self.record_diagnostic(
                    "EVIDENCE_STALE",
                    f"Running delegation '{d.id}' has exceeded staleness threshold ({self._config.delegation_stale_seconds}s).",
                    severity="WARNING",
                    details={"delegation_id": d.id, "started_at": d.started_at},
                )

        # 4. Task ↔ Profile & Session Correlation (Section 47, 48, 49)
        for t in tasks:
            assigned = (t.assigned_agent_id or "").strip()
            if assigned and assigned in registered_profile_ids:
                self.tasks_by_profile[assigned].append(t)

            # Check direct session correlation (Section 48)
            sess_id, conf = correlate_task_to_session(t, set(sessions_by_id.keys()))
            if sess_id and conf == "DIRECT":
                self.task_to_session_map[t.id] = sess_id
                self._edges.append(
                    CorrelationEdge(
                        source_type="Task",
                        source_id=t.id,
                        target_type="Session",
                        target_id=sess_id,
                        confidence="DIRECT",
                        evidence="task.session_id exact match",
                    )
                )
            else:
                self.record_diagnostic(
                    "TASK_SESSION_UNRESOLVED",
                    f"Task '{t.id}' has no direct foreign key to Hermes session (timestamp/profile proximity rejected).",
                    severity="INFO",
                    details={"task_id": t.id},
                )

        # 5. Approval ↔ Task ↔ Runtime Correlation (Section 55, 56)
        tasks_by_id = {t.id: t for t in tasks}
        for a in approvals:
            if a.task_id:
                if a.task_id not in self.approvals_by_task:
                    self.approvals_by_task[a.task_id] = []
                self.approvals_by_task[a.task_id].append(a)

                self._edges.append(
                    CorrelationEdge(
                        source_type="Approval",
                        source_id=a.id,
                        target_type="Task",
                        target_id=a.task_id,
                        confidence="DIRECT",
                        evidence="approval.task_id exact match",
                    )
                )

                # Transitive link to Session via Task
                task_id, sess_id = correlate_approval_to_runtime(a, self.task_to_session_map)
                if sess_id:
                    self._edges.append(
                        CorrelationEdge(
                            source_type="Approval",
                            source_id=a.id,
                            target_type="Session",
                            target_id=sess_id,
                            confidence="INFERRED",
                            evidence=f"Transitive via Task '{task_id}'",
                        )
                    )
                else:
                    self.record_diagnostic(
                        "APPROVAL_RUNTIME_UNRESOLVED",
                        f"Approval '{a.id}' correlates to Task '{task_id}', but Task has no direct Hermes session.",
                        severity="INFO",
                        details={"approval_id": a.id, "task_id": task_id},
                    )

            if a.agent_id and a.agent_id in registered_profile_ids:
                self.approvals_by_profile[a.agent_id].append(a)
            elif a.task_id and a.task_id in tasks_by_id:
                t_assigned = tasks_by_id[a.task_id].assigned_agent_id
                if t_assigned and t_assigned in registered_profile_ids:
                    self.approvals_by_profile[t_assigned].append(a)

    def get_correlation_coverage_metrics(
        self,
        profiles: list[ProfileDto],
        sessions: list[SessionDto],
        delegations: list[DelegationDto],
        tasks: list[TaskDto],
    ) -> dict[str, int]:
        """Calculates accurate correlation coverage metrics (Section 114)."""
        registered_count = len(profiles)
        profiles_with_evidence = sum(
            1 for p in profiles
            if len(self.sessions_by_profile.get(p.id, [])) > 0 or len(self.delegations_by_profile.get(p.id, [])) > 0
        )
        profiles_without_evidence = registered_count - profiles_with_evidence

        sessions_total = len(sessions)
        sessions_mapped = sessions_total - len(self.unresolved_sessions)
        sessions_unresolved = len(self.unresolved_sessions)

        delegations_total = len(delegations)
        delegations_unresolved = len(self.unresolved_delegations)
        delegations_mapped = delegations_total - delegations_unresolved

        tasks_total = len(tasks)
        tasks_correlated = len(self.task_to_session_map)
        tasks_uncorrelated = tasks_total - tasks_correlated

        return {
            "registered_profiles": registered_count,
            "profiles_with_runtime_evidence": profiles_with_evidence,
            "profiles_without_runtime_evidence": profiles_without_evidence,
            "sessions_total": sessions_total,
            "sessions_mapped_to_profile": sessions_mapped,
            "sessions_unresolved": sessions_unresolved,
            "delegations_total": delegations_total,
            "delegations_mapped": delegations_mapped,
            "delegations_unresolved": delegations_unresolved,
            "tasks_total": tasks_total,
            "tasks_directly_correlated": tasks_correlated,
            "tasks_uncorrelated": tasks_uncorrelated,
        }
