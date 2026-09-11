from typing import Optional, Protocol
from app.schemas.delegations import DelegationDto
from app.schemas.runtime import GatewayDto, RuntimeEventDto, RuntimeOverviewDto
from app.schemas.sessions import SessionDto


class RuntimeReader(Protocol):
    """Clean seam for future Hermes runtime / state.db / socket integration."""

    async def get_runtime_overview(self) -> RuntimeOverviewDto:
        ...

    async def get_gateway(self) -> GatewayDto:
        ...

    async def list_sessions(
        self,
        agent_id: Optional[str] = None,
        state: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> list[SessionDto]:
        ...

    async def get_session(self, session_id: str) -> Optional[SessionDto]:
        ...

    async def list_delegations(
        self,
        agent_id: Optional[str] = None,
        state: Optional[str] = None,
    ) -> list[DelegationDto]:
        ...

    async def get_delegation(self, delegation_id: str) -> Optional[DelegationDto]:
        ...

    async def list_events(self, limit: int = 100) -> list[RuntimeEventDto]:
        ...
