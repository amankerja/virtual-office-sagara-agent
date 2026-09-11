from typing import Optional
from app.api.errors import ResourceNotFoundError
from app.repositories.protocols import ArtifactRepository
from app.schemas.artifacts import ArtifactDto


class ArtifactService:
    def __init__(self, repo: ArtifactRepository) -> None:
        self._repo = repo

    async def list_artifacts(
        self,
        task_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> list[ArtifactDto]:
        return await self._repo.list_artifacts(task_id=task_id, session_id=session_id)

    async def get_artifact(self, artifact_id: str) -> ArtifactDto:
        art = await self._repo.get_artifact(artifact_id)
        if not art:
            raise ResourceNotFoundError(f"Artifact with ID '{artifact_id}' was not found.")
        return art
