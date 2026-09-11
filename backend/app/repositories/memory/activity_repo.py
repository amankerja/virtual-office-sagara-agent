from typing import Optional
from app.repositories.memory.fixtures import ACTIVITY_FIXTURE
from app.schemas.activity import ActivityDto


class InMemoryActivityRepository:
    def __init__(self) -> None:
        self._activity: list[ActivityDto] = [a.model_copy(deep=True) for a in ACTIVITY_FIXTURE]

    async def list_activity(
        self,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        correlation_id: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> list[ActivityDto]:
        results = self._activity
        if category and category != "ALL":
            results = [a for a in results if a.category == category]
        if severity and severity != "ALL":
            results = [a for a in results if a.severity == severity]
        if correlation_id:
            results = [a for a in results if a.correlation_id == correlation_id]

        start_index = 0
        if cursor:
            try:
                start_index = int(cursor)
            except ValueError:
                start_index = 0

        return [a.model_copy(deep=True) for a in results[start_index : start_index + limit]]

    async def add_activity(self, activity: ActivityDto) -> ActivityDto:
        self._activity.insert(0, activity.model_copy(deep=True))
        return activity.model_copy(deep=True)
