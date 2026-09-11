from app.repositories.protocols import GovernanceRepository
from app.schemas.governance import GovernanceSnapshotDto


class GovernanceService:
    def __init__(self, repo: GovernanceRepository) -> None:
        self._repo = repo

    async def get_snapshot(self) -> GovernanceSnapshotDto:
        return await self._repo.get_governance_snapshot()
