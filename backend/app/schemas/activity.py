from typing import Optional
from pydantic import BaseModel, ConfigDict
from .common import EntityReference, RelatedEntities


class ActivityDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    timestamp: str
    category: str
    severity: str
    title: str
    description: Optional[str] = None
    actor: Optional[EntityReference] = None
    entity: Optional[EntityReference] = None
    correlation_id: Optional[str] = None
    related: Optional[RelatedEntities] = None
