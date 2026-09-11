from typing import Optional
from app.repositories.memory.fixtures import AUDIT_FIXTURE
from app.schemas.audit import AuditRecordDto


class InMemoryAuditRepository:
    def __init__(self) -> None:
        self._records: list[AuditRecordDto] = [a.model_copy(deep=True) for a in AUDIT_FIXTURE]

    async def list_audit_records(
        self,
        actor_type: Optional[str] = None,
        outcome: Optional[str] = None,
        correlation_id: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> list[AuditRecordDto]:
        results = self._records
        if actor_type and actor_type != "ALL":
            results = [a for a in results if a.actor.type == actor_type]
        if outcome and outcome != "ALL":
            results = [a for a in results if a.outcome == outcome]
        if correlation_id:
            results = [a for a in results if a.correlation_id == correlation_id]

        start_index = 0
        if cursor:
            try:
                start_index = int(cursor)
            except ValueError:
                start_index = 0

        return [a.model_copy(deep=True) for a in results[start_index : start_index + limit]]

    async def record_audit(self, record: AuditRecordDto) -> AuditRecordDto:
        self._records.insert(0, record.model_copy(deep=True))
        return record.model_copy(deep=True)
