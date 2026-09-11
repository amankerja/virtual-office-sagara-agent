from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.api.dependencies import get_activity_service
from app.schemas.activity import ActivityDto
from app.services.activity_service import ActivityService

router = APIRouter(prefix="/activity", tags=["Activity"])


@router.get("", response_model=list[ActivityDto])
async def list_activity(
    category: Optional[str] = Query(None, description="Filter by event category"),
    severity: Optional[str] = Query(None, description="Filter by event severity"),
    correlation_id: Optional[str] = Query(None, description="Filter by correlation ID"),
    cursor: Optional[str] = Query(None, description="Opaque pagination cursor"),
    limit: int = Query(50, ge=1, le=200, description="Items limit"),
    service: ActivityService = Depends(get_activity_service),
) -> list[ActivityDto]:
    return await service.list_activity(
        category=category,
        severity=severity,
        correlation_id=correlation_id,
        cursor=cursor,
        limit=limit,
    )
