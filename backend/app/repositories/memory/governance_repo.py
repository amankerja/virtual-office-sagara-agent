from app.repositories.memory.fixtures import GOVERNANCE_FIXTURE
from app.schemas.governance import GovernanceSnapshotDto


class InMemoryGovernanceRepository:
    def __init__(self) -> None:
        self._snapshot = GOVERNANCE_FIXTURE.model_copy(deep=True)

    async def get_governance_snapshot(self) -> GovernanceSnapshotDto:
        return self._snapshot.model_copy(deep=True)
