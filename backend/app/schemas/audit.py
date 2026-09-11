from typing import Any, Literal, Optional
from pydantic import BaseModel, ConfigDict
from .common import EntityReference, RelatedEntities

AuditOutcome = Literal["SUCCESS", "DENIED", "FAILED"]


class AuditChangesDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    field: str
    before: Optional[Any] = None
    after: Optional[Any] = None


class AuditRecordDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    timestamp: str
    actor: EntityReference
    action: str
    target: EntityReference
    outcome: AuditOutcome
    reason: Optional[str] = None
    changes: Optional[list[AuditChangesDto]] = None
    correlation_id: Optional[str] = None
    related: Optional[RelatedEntities] = None
