from fastapi import APIRouter, Depends, Query
from app.api.dependencies import get_runtime_service
from app.schemas.runtime import GatewayDto, RuntimeEventDto, RuntimeOverviewDto
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


@router.get("/events", response_model=list[RuntimeEventDto])
async def list_runtime_events(
    limit: int = Query(100, ge=1, le=200, description="Max event items to return"),
    service: RuntimeService = Depends(get_runtime_service),
) -> list[RuntimeEventDto]:
    return await service.list_events(limit=limit)
