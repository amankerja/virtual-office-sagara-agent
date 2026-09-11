from fastapi import APIRouter, Depends
from app.api.dependencies import get_snapshot_service
from app.schemas.mission_control import MissionControlSnapshotDto
from app.services.mission_control import MissionControlSnapshotService

router = APIRouter(tags=["Mission Control"])


@router.get("/mission-control/snapshot", response_model=MissionControlSnapshotDto)
async def get_snapshot(
    service: MissionControlSnapshotService = Depends(get_snapshot_service),
) -> MissionControlSnapshotDto:
    return await service.get_snapshot()
