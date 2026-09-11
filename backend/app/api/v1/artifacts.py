from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.api.dependencies import get_artifact_service
from app.schemas.artifacts import ArtifactDto
from app.services.artifact_service import ArtifactService

router = APIRouter(prefix="/artifacts", tags=["Artifacts"])


@router.get("", response_model=list[ArtifactDto])
async def list_artifacts(
    task_id: Optional[str] = Query(None, description="Filter by task ID"),
    session_id: Optional[str] = Query(None, description="Filter by session ID"),
    service: ArtifactService = Depends(get_artifact_service),
) -> list[ArtifactDto]:
    return await service.list_artifacts(task_id=task_id, session_id=session_id)


@router.get("/{artifact_id}", response_model=ArtifactDto)
async def get_artifact_by_id(
    artifact_id: str,
    service: ArtifactService = Depends(get_artifact_service),
) -> ArtifactDto:
    return await service.get_artifact(artifact_id)
