from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.api.dependencies import get_audit_service
from app.schemas.audit import AuditRecordDto
from app.services.audit_service import AuditService

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("", response_model=list[AuditRecordDto])
async def list_audit_records(
    actor_type: Optional[str] = Query(None, description="Filter by actor type"),
    outcome: Optional[str] = Query(None, description="Filter by audit outcome"),
    correlation_id: Optional[str] = Query(None, description="Filter by correlation ID"),
    cursor: Optional[str] = Query(None, description="Opaque pagination cursor"),
    limit: int = Query(50, ge=1, le=200, description="Items limit"),
    service: AuditService = Depends(get_audit_service),
) -> list[AuditRecordDto]:
    return await service.list_audit_records(
        actor_type=actor_type,
        outcome=outcome,
        correlation_id=correlation_id,
        cursor=cursor,
        limit=limit,
    )
