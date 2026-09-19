from typing import Optional
from app.adapters.router_health import NineRouterHealthAdapter
from app.adapters.runtime import RuntimeReader
from app.adapters.sagara_source import SourceDiscoveryAdapter
from app.adapters.service_health import ServiceHealthAdapter
from app.adapters.vps_telemetry import VpsTelemetryAdapter
from app.api.errors import ResourceNotFoundError
from app.schemas.delegations import DelegationDto
from app.schemas.runtime import (
    GatewayDto,
    NineRouterHealthDto,
    ReleaseMetadataDto,
    RuntimeEventDto,
    RuntimeOverviewDto,
    ServiceHealthDto,
    SourceDiscoveryStatusDto,
    VpsHealthDto,
)
from app.schemas.sessions import SessionDto


class RuntimeService:
    def __init__(
        self,
        reader: RuntimeReader,
        vps_adapter: Optional[VpsTelemetryAdapter] = None,
        service_adapter: Optional[ServiceHealthAdapter] = None,
        router_adapter: Optional[NineRouterHealthAdapter] = None,
        source_adapter: Optional[SourceDiscoveryAdapter] = None,
    ) -> None:
        self._reader = reader
        self._vps = vps_adapter or getattr(reader, "vps_adapter", None) or VpsTelemetryAdapter()
        self._service = service_adapter or getattr(reader, "service_adapter", None) or ServiceHealthAdapter()
        self._router = router_adapter or getattr(reader, "router_adapter", None) or NineRouterHealthAdapter(self._service)
        self._sources = source_adapter or SourceDiscoveryAdapter()

    async def get_overview(self) -> RuntimeOverviewDto:
        return await self._reader.get_runtime_overview()

    async def get_gateway(self) -> GatewayDto:
        return await self._reader.get_gateway()

    async def get_vps_health(self) -> VpsHealthDto:
        return await self._vps.get_telemetry()

    async def list_services(self) -> list[ServiceHealthDto]:
        return await self._service.list_services()

    async def get_service(self, name: str) -> Optional[ServiceHealthDto]:
        return await self._service.get_service(name)

    async def get_router_health(self) -> NineRouterHealthDto:
        return await self._router.get_health()

    async def get_sources(self) -> SourceDiscoveryStatusDto:
        return await self._sources.get_source_status()

    async def get_release(self) -> ReleaseMetadataDto:
        return await self._sources.get_release_metadata()

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

    async def get_usage(self) -> dict:
        if hasattr(self._reader, "get_runtime_usage"):
            return await self._reader.get_runtime_usage()
        return {
            "totalApiCalls": 0,
            "inputTokens": 0,
            "outputTokens": 0,
            "reasoningTokens": 0,
            "cacheTokens": 0,
            "estimatedCostUsd": 0.0,
            "actualCostUsd": None,
            "byAgent": [],
            "byModel": [],
            "byProvider": [],
        }

    async def kill_session(self, session_id: str) -> bool:
        if hasattr(self._reader, "session_reader") and hasattr(self._reader.session_reader, "kill_session"):
            return await self._reader.session_reader.kill_session(session_id)
        return False

    async def delete_session(self, session_id: str) -> bool:
        if hasattr(self._reader, "session_reader") and hasattr(self._reader.session_reader, "delete_session"):
            return await self._reader.session_reader.delete_session(session_id)
        return False
