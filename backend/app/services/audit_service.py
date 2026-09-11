from typing import Optional
from app.repositories.protocols import AuditRepository
from app.schemas.audit import AuditRecordDto


class AuditService:
    def __init__(self, repo: AuditRepository) -> None:
        self._repo = repo

    async def list_audit_records(
        self,
        actor_type: Optional[str] = None,
        outcome: Optional[str] = None,
        correlation_id: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> list[AuditRecordDto]:
        return await self._repo.list_audit_records(
            actor_type=actor_type,
            outcome=outcome,
            correlation_id=correlation_id,
            cursor=cursor,
            limit=limit,
        )

    async def record_audit(self, record: AuditRecordDto) -> AuditRecordDto:
        return await self._repo.record_audit(record)
