from datetime import datetime, timezone
import logging
from typing import Any, Optional

from app.adapters.profiles import ProfileCatalogAdapter
from app.adapters.runtime import RuntimeReader
from app.adapters.skills import SkillCatalogAdapter
from app.api.errors import ResourceNotFoundError
from app.domain.runtime_state import (
    DEFAULT_STALENESS_CONFIG,
    RuntimeStalenessConfig,
    aggregate_usage_records,
    derive_agent_runtime_state,
)
from app.repositories.memory.fixtures import AGENTS_FIXTURE
from app.repositories.protocols import ApprovalRepository, TaskRepository
from app.schemas.agents import (
    AgentCapabilitiesDto,
    AgentDefinitionDto,
    AgentDto,
    AgentRuntimeDto,
    AgentUsageDto,
)
from app.schemas.runtime import GatewayDto
from app.services.runtime_correlation import RuntimeCorrelationService

logger = logging.getLogger("sagara.services.agent_projection")


class AgentProjectionService:
    """
    Assembles hardened, normalized Agent Projections from Sagara Profile definitions,
    skills, and Hermes runtime correlation evidence.
    
    Adheres strictly to:
    - Truth chain: Profile -> Session -> Delegation -> Usage -> Task -> Approval -> AgentProjection
    - Bounded single-window reads without N+1 queries
    - Strict UNKNOWN != ZERO semantics
    - Latest historical session != Current execution session
    - Zero phantom agent creation from unresolvable sessions
    """

    def __init__(
        self,
        profile_catalog: Optional[ProfileCatalogAdapter] = None,
        skill_catalog: Optional[SkillCatalogAdapter] = None,
        runtime_reader: Optional[RuntimeReader] = None,
        task_repo: Optional[TaskRepository] = None,
        approval_repo: Optional[ApprovalRepository] = None,
        correlation_service: Optional[RuntimeCorrelationService] = None,
        is_mock: bool = True,
        config: RuntimeStalenessConfig = DEFAULT_STALENESS_CONFIG,
    ) -> None:
        self._profile_catalog = profile_catalog
        self._skill_catalog = skill_catalog
        self._runtime_reader = runtime_reader
        self._task_repo = task_repo
        self._approval_repo = approval_repo
        self._correlation_service = correlation_service or RuntimeCorrelationService(config=config)
        self._config = config
        self._is_mock = is_mock
        self._mock_agents: list[AgentDto] = [a.model_copy(deep=True) for a in AGENTS_FIXTURE]

    @property
    def correlation_service(self) -> RuntimeCorrelationService:
        return self._correlation_service

    async def _project_agents_from_catalog(self) -> list[AgentDto]:
        if not self._profile_catalog:
            return []

        now = datetime.now(timezone.utc)

        # 1. Bounded batch readers (Section 98, 99, 100)
        profiles = await self._profile_catalog.list_profiles()

        skills = await self._skill_catalog.list_skills() if self._skill_catalog else []
        registered_skill_ids = {s.id for s in skills if s.registration == "REGISTERED"}
        healthy_skill_ids = {s.id for s in skills if s.health == "HEALTHY"}
        degraded_skill_ids = {s.id for s in skills if s.health == "DEGRADED"}

        sessions = await self._runtime_reader.list_sessions(limit=500) if self._runtime_reader else []
        delegations = await self._runtime_reader.list_delegations() if self._runtime_reader else []
        gateway = (
            await self._runtime_reader.get_gateway()
            if self._runtime_reader
            else GatewayDto(status="NOT_CONNECTED", connected=False, latency_ms=0, last_heartbeat_at="")
        )

        tasks = await self._task_repo.list_tasks(limit=200) if self._task_repo else []
        approvals = await self._approval_repo.list_approvals() if self._approval_repo else []

        # Model usage map
        usage_map: dict[str, dict[str, Any]] = {}
        if hasattr(self._runtime_reader, "usage_reader"):
            try:
                usage_map = await self._runtime_reader.usage_reader.get_all_profiles_usage_map()
            except Exception as e:
                logger.warning("Could not read profile usage map: %s", e)
                usage_map = {}

        # 2. Build in-memory correlation graph and lookup indices (Section 52, 101)
        self._correlation_service.build_correlation_indexes(
            profiles=profiles,
            sessions=sessions,
            delegations=delegations,
            usage_map=usage_map,
            tasks=tasks,
            approvals=approvals,
            gateway=gateway,
            now=now,
        )

        # Backwards compatibility: forward diagnostics to adapter if present
        if hasattr(self._runtime_reader, "diagnostics") and getattr(self._runtime_reader, "diagnostics", None):
            for diag in self._correlation_service.get_diagnostics():
                if diag.code == "SESSION_PROFILE_UNRESOLVED":
                    unreg = diag.details.get("referenced_profile")
                    if unreg:
                        self._runtime_reader.diagnostics.record(
                            code="UNREGISTERED_RUNTIME_PROFILE",
                            message=diag.message,
                            severity=diag.severity,
                            details={"unregistered_profile": unreg},
                        )

        # 3. Assemble Agent Projections
        agents: list[AgentDto] = []
        for p in profiles:
            # Definition
            definition = AgentDefinitionDto(
                id=p.id,
                name=p.name,
                role=p.role,
                description=p.description,
                enabled=p.enabled,
                memory_namespace=p.memory_namespace,
                allowed_skills=p.allowed_skills,
            )

            # Capabilities calculation
            if p.allowed_skills is None:
                capabilities = AgentCapabilitiesDto(
                    total=None,
                    healthy=None,
                    degraded=None,
                    missing=None,
                )
            elif len(p.allowed_skills) == 0:
                capabilities = AgentCapabilitiesDto(
                    total=0,
                    healthy=None,
                    degraded=None,
                    missing=None,
                )
            else:
                total_skills = len(p.allowed_skills)
                missing_count = sum(1 for sid in p.allowed_skills if sid not in registered_skill_ids)
                has_health_evidence = any(
                    sid in healthy_skill_ids or sid in degraded_skill_ids for sid in p.allowed_skills
                )
                if has_health_evidence:
                    healthy_count = sum(1 for sid in p.allowed_skills if sid in healthy_skill_ids)
                    degraded_count = sum(1 for sid in p.allowed_skills if sid in degraded_skill_ids)
                else:
                    healthy_count = None
                    degraded_count = None

                capabilities = AgentCapabilitiesDto(
                    total=total_skills,
                    healthy=healthy_count,
                    degraded=degraded_count,
                    missing=missing_count,
                )

            # Correlated entities
            matching_sessions = self._correlation_service.sessions_by_profile.get(p.id, [])
            matching_delegations = self._correlation_service.delegations_by_profile.get(p.id, [])
            matching_approvals = self._correlation_service.approvals_by_profile.get(p.id, [])
            matching_tasks = self._correlation_service.tasks_by_profile.get(p.id, [])

            # Active leases from sessions (sessions with state == 'ACTIVE')
            active_leases = {s.id for s in matching_sessions if s.state == "ACTIVE"}

            # Usage derivation (UNKNOWN != ZERO preserved)
            profile_usage = usage_map.get(p.id)
            agent_usage: Optional[AgentUsageDto] = None
            if profile_usage:
                agent_usage = AgentUsageDto(
                    input_tokens=profile_usage.get("input_tokens"),
                    output_tokens=profile_usage.get("output_tokens"),
                    estimated_cost_usd=profile_usage.get("estimated_cost_usd"),
                    actual_cost_usd=profile_usage.get("actual_cost_usd"),
                )
            elif matching_sessions:
                raw_session_usages = [s.usage for s in matching_sessions if s.usage]
                agent_usage = aggregate_usage_records(raw_session_usages)

            # Derive runtime state using pure domain function
            state, confidence, curr_sess_id, curr_model, sess_cnt, active_del_val, _diags = derive_agent_runtime_state(
                profile_id=p.id,
                configuration_state=p.configuration_state,
                matching_sessions=matching_sessions,
                matching_delegations=matching_delegations,
                active_turn_leases=active_leases,
                pending_approvals=matching_approvals,
                active_tasks=matching_tasks,
                gateway_status=gateway.status,
                gateway_connected=gateway.connected,
                now=now,
                config=self._config,
            )

            # Current task ID (if currently running or awaiting approval)
            curr_task = next(
                (t for t in matching_tasks if t.state in ("RUNNING", "AWAITING_APPROVAL", "DISPATCHING")),
                None,
            )
            curr_task_id = curr_task.id if curr_task else None

            # Last activity timestamp
            last_act = matching_sessions[0].last_activity_at if matching_sessions else None

            runtime = AgentRuntimeDto(
                state=state,
                confidence=confidence,
                last_activity_at=last_act,
                session_count=sess_cnt,
                active_delegations=active_del_val,
                current_session_id=curr_sess_id,
                current_task_id=curr_task_id,
                model=curr_model,
            )

            agent = AgentDto(
                id=p.id,
                definition=definition,
                runtime=runtime,
                capabilities=capabilities,
                usage=agent_usage,
            )
            agents.append(agent)

        return agents

    async def list_agents(
        self,
        state: Optional[str] = None,
        profile_id: Optional[str] = None,
    ) -> list[AgentDto]:
        if self._is_mock:
            results = self._mock_agents
        else:
            results = await self._project_agents_from_catalog()

        if state and state != "ALL":
            results = [a for a in results if a.runtime.state == state]
        if profile_id and profile_id != "ALL":
            results = [a for a in results if a.definition.id == profile_id or a.id == profile_id]

        return [a.model_copy(deep=True) for a in results]

    async def get_agent(self, agent_id: str) -> AgentDto:
        if self._is_mock:
            agents = self._mock_agents
        else:
            agents = await self._project_agents_from_catalog()

        for a in agents:
            if a.id == agent_id or a.definition.id == agent_id:
                return a.model_copy(deep=True)
        raise ResourceNotFoundError(f"Agent with ID '{agent_id}' was not found.")
