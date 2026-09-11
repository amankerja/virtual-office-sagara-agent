from typing import Any, Optional
from pydantic import BaseModel, ConfigDict
from .activity import ActivityDto


class AttentionItemDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    type: str
    severity: str
    title: str
    description: Optional[str] = None
    timestamp: Optional[str] = None
    related_entity_ids: Optional[dict[str, Any]] = None
    entity_type: Optional[str] = None


class MissionControlSnapshotDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    generated_at: str
    system_pulse: Optional[dict[str, Any]] = None
    agent_counts: Optional[dict[str, Any]] = None
    task_counts: Optional[dict[str, Any]] = None
    approval_counts: Optional[dict[str, Any]] = None
    attention_items: Optional[list[AttentionItemDto]] = None
    recent_activity: Optional[list[ActivityDto]] = None
