from fastapi import APIRouter, Depends, Query
from app.api.dependencies import get_runtime_service
from app.schemas.runtime import (
    GatewayDto,
    NineRouterHealthDto,
    ReleaseMetadataDto,
    RuntimeEventDto,
    RuntimeOverviewDto,
    RuntimeUsageOverviewDto,
    ServiceHealthDto,
    SourceDiscoveryStatusDto,
    VpsHealthDto,
)
from app.services.runtime_service import RuntimeService

router = APIRouter(prefix="/runtime", tags=["Runtime"])


@router.get("", response_model=RuntimeOverviewDto)
async def get_runtime_overview(
    service: RuntimeService = Depends(get_runtime_service),
) -> RuntimeOverviewDto:
    return await service.get_overview()


@router.get("/gateway", response_model=GatewayDto)
async def get_gateway_telemetry(
    service: RuntimeService = Depends(get_runtime_service),
) -> GatewayDto:
    return await service.get_gateway()


@router.get("/vps", response_model=VpsHealthDto)
async def get_vps_telemetry(
    service: RuntimeService = Depends(get_runtime_service),
) -> VpsHealthDto:
    return await service.get_vps_health()


@router.get("/services", response_model=list[ServiceHealthDto])
async def list_services_health(
    service: RuntimeService = Depends(get_runtime_service),
) -> list[ServiceHealthDto]:
    return await service.list_services()


@router.get("/9router", response_model=NineRouterHealthDto)
async def get_router_health(
    service: RuntimeService = Depends(get_runtime_service),
) -> NineRouterHealthDto:
    return await service.get_router_health()


@router.get("/sources", response_model=SourceDiscoveryStatusDto)
async def get_source_discovery_status(
    service: RuntimeService = Depends(get_runtime_service),
) -> SourceDiscoveryStatusDto:
    return await service.get_sources()


@router.get("/release", response_model=ReleaseMetadataDto)
async def get_release_metadata(
    service: RuntimeService = Depends(get_runtime_service),
) -> ReleaseMetadataDto:
    return await service.get_release()


@router.get("/events", response_model=list[RuntimeEventDto])
async def list_runtime_events(
    limit: int = Query(100, ge=1, le=200, description="Max event items to return"),
    service: RuntimeService = Depends(get_runtime_service),
) -> list[RuntimeEventDto]:
    return await service.list_events(limit=limit)


@router.get("/usage", response_model=RuntimeUsageOverviewDto)
async def get_runtime_usage(
    service: RuntimeService = Depends(get_runtime_service),
) -> RuntimeUsageOverviewDto:
    raw = await service.get_usage()
    return RuntimeUsageOverviewDto(**raw)
