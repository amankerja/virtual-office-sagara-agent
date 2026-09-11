from typing import Optional
from app.repositories.protocols import ActivityRepository
from app.schemas.activity import ActivityDto


class ActivityService:
    def __init__(self, repo: ActivityRepository) -> None:
        self._repo = repo

    async def list_activity(
        self,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        correlation_id: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> list[ActivityDto]:
        return await self._repo.list_activity(
            category=category,
            severity=severity,
            correlation_id=correlation_id,
            cursor=cursor,
            limit=limit,
        )

    async def record_activity(self, activity: ActivityDto) -> ActivityDto:
        return await self._repo.add_activity(activity)
