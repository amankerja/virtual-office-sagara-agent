from typing import Optional
from app.adapters.runtime import RuntimeReader
from app.api.errors import ResourceNotFoundError
from app.schemas.delegations import DelegationDto
from app.schemas.runtime import GatewayDto, RuntimeEventDto, RuntimeOverviewDto
from app.schemas.sessions import SessionDto


class RuntimeService:
    def __init__(self, reader: RuntimeReader) -> None:
        self._reader = reader

    async def get_overview(self) -> RuntimeOverviewDto:
        return await self._reader.get_runtime_overview()

    async def get_gateway(self) -> GatewayDto:
        return await self._reader.get_gateway()

    async def list_sessions(
        self,
        agent_id: Optional[str] = None,
        state: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> list[SessionDto]:
        return await self._reader.list_sessions(agent_id=agent_id, state=state, cursor=cursor, limit=limit)

    async def get_session(self, session_id: str) -> SessionDto:
        session = await self._reader.get_session(session_id)
        if not session:
            raise ResourceNotFoundError(f"Session with ID '{session_id}' was not found.")
        return session

    async def list_delegations(
        self,
        agent_id: Optional[str] = None,
        state: Optional[str] = None,
    ) -> list[DelegationDto]:
        return await self._reader.list_delegations(agent_id=agent_id, state=state)

    async def get_delegation(self, delegation_id: str) -> DelegationDto:
        delegation = await self._reader.get_delegation(delegation_id)
        if not delegation:
            raise ResourceNotFoundError(f"Delegation with ID '{delegation_id}' was not found.")
        return delegation

    async def list_events(self, limit: int = 100) -> list[RuntimeEventDto]:
        return await self._reader.list_events(limit=limit)
