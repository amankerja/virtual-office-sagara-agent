from typing import Optional
from app.repositories.memory.fixtures import (
    DELEGATIONS_FIXTURE,
    GATEWAY_FIXTURE,
    PROFILES_FIXTURE,
    RUNTIME_EVENTS_FIXTURE,
    RUNTIME_OVERVIEW_FIXTURE,
    SESSIONS_FIXTURE,
    SKILLS_FIXTURE,
)
from app.schemas.delegations import DelegationDto
from app.schemas.profiles import ProfileDto
from app.schemas.runtime import GatewayDto, RuntimeEventDto, RuntimeOverviewDto
from app.schemas.sessions import SessionDto
from app.schemas.skills import SkillDto


class MockProfileAdapter:
    """In-memory mock adapter for Sagara ProfileRegistry."""

    def __init__(self) -> None:
        self._profiles = [p.model_copy(deep=True) for p in PROFILES_FIXTURE]

    async def list_profiles(self) -> list[ProfileDto]:
        return [p.model_copy(deep=True) for p in self._profiles]

    async def get_profile(self, profile_id: str) -> Optional[ProfileDto]:
        for p in self._profiles:
            if p.id == profile_id:
                return p.model_copy(deep=True)
        return None


class MockSkillAdapter:
    """In-memory mock adapter for Sagara SkillRegistry."""

    def __init__(self) -> None:
        self._skills = [s.model_copy(deep=True) for s in SKILLS_FIXTURE]

    async def list_skills(
        self,
        registration: Optional[str] = None,
        health: Optional[str] = None,
    ) -> list[SkillDto]:
        results = self._skills
        if registration and registration != "ALL":
            results = [s for s in results if s.registration == registration]
        if health and health != "ALL":
            results = [s for s in results if s.health == health]
        return [s.model_copy(deep=True) for s in results]

    async def get_skill(self, skill_id: str) -> Optional[SkillDto]:
        for s in self._skills:
            if s.id == skill_id:
                return s.model_copy(deep=True)
        return None


class MockRuntimeAdapter:
    """In-memory mock adapter for Hermes runtime telemetry."""

    def __init__(self) -> None:
        self._gateway = GATEWAY_FIXTURE.model_copy(deep=True)
        self._runtime_overview = RUNTIME_OVERVIEW_FIXTURE.model_copy(deep=True)
        self._events = [e.model_copy(deep=True) for e in RUNTIME_EVENTS_FIXTURE]
        self._sessions = [s.model_copy(deep=True) for s in SESSIONS_FIXTURE]
        self._delegations = [d.model_copy(deep=True) for d in DELEGATIONS_FIXTURE]

    async def get_runtime_overview(self) -> RuntimeOverviewDto:
        return self._runtime_overview.model_copy(deep=True)

    async def get_gateway(self) -> GatewayDto:
        return self._gateway.model_copy(deep=True)

    async def list_sessions(
        self,
        agent_id: Optional[str] = None,
        state: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> list[SessionDto]:
        results = self._sessions
        if agent_id and agent_id != "ALL":
            results = [s for s in results if s.agent_id == agent_id]
        if state and state != "ALL":
            results = [s for s in results if s.state == state]

        start_index = 0
        if cursor:
            try:
                start_index = int(cursor)
            except ValueError:
                start_index = 0

        return [s.model_copy(deep=True) for s in results[start_index : start_index + limit]]

    async def get_session(self, session_id: str) -> Optional[SessionDto]:
        for s in self._sessions:
            if s.id == session_id:
                return s.model_copy(deep=True)
        return None

    async def list_delegations(
        self,
        agent_id: Optional[str] = None,
        state: Optional[str] = None,
    ) -> list[DelegationDto]:
        results = self._delegations
        if agent_id and agent_id != "ALL":
            results = [d for d in results if d.target_agent_id == agent_id]
        if state and state != "ALL":
            results = [d for d in results if d.state == state]
        return [d.model_copy(deep=True) for d in results]

    async def get_delegation(self, delegation_id: str) -> Optional[DelegationDto]:
        for d in self._delegations:
            if d.id == delegation_id:
                return d.model_copy(deep=True)
        return None

    async def list_events(self, limit: int = 100) -> list[RuntimeEventDto]:
        return [e.model_copy(deep=True) for e in self._events[:limit]]
