from fastapi import APIRouter, Depends
from app.api.dependencies import get_governance_service
from app.schemas.governance import GovernanceSnapshotDto
from app.services.governance_service import GovernanceService

router = APIRouter(prefix="/governance", tags=["Governance"])


@router.get("", response_model=GovernanceSnapshotDto)
async def get_governance_snapshot(
    service: GovernanceService = Depends(get_governance_service),
) -> GovernanceSnapshotDto:
    return await service.get_snapshot()
