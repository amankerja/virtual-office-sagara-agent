from typing import Optional
from app.repositories.memory.fixtures import ARTIFACTS_FIXTURE
from app.schemas.artifacts import ArtifactDto


class InMemoryArtifactRepository:
    def __init__(self) -> None:
        self._artifacts = [a.model_copy(deep=True) for a in ARTIFACTS_FIXTURE]

    async def list_artifacts(
        self,
        task_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> list[ArtifactDto]:
        results = self._artifacts
        if task_id:
            results = [a for a in results if a.task_id == task_id]
        if session_id:
            results = [a for a in results if a.session_id == session_id]
        return [a.model_copy(deep=True) for a in results]

    async def get_artifact(self, artifact_id: str) -> Optional[ArtifactDto]:
        for a in self._artifacts:
            if a.id == artifact_id:
                return a.model_copy(deep=True)
        return None
