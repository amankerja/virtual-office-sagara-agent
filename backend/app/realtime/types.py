from datetime import datetime, timezone
from typing import Any, Generic, Literal, Optional, TypeVar
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.agents import AgentDto
from app.schemas.approvals import ApprovalDto
from app.schemas.delegations import DelegationDto
from app.schemas.mission_control import AttentionItemDto
from app.schemas.runtime import GatewayDto, RuntimeOverviewDto

PROTOCOL_VERSION = "1"

RealtimeMessageType = Literal["snapshot", "delta", "heartbeat", "resync_required", "error"]

T = TypeVar("T")


class EntityDelta(BaseModel, Generic[T]):
    model_config = ConfigDict(extra="ignore")

    upsert: list[T] = Field(default_factory=list)
    remove: list[str] = Field(default_factory=list)

    def is_empty(self) -> bool:
        return len(self.upsert) == 0 and len(self.remove) == 0


class RealtimeChanges(BaseModel):
    model_config = ConfigDict(extra="ignore")

    gateway: Optional[GatewayDto] = None
    runtime_summary: Optional[RuntimeOverviewDto] = None
    agents: Optional[EntityDelta[AgentDto]] = None
    task_summary: Optional[dict[str, int]] = None
    approval_summary: Optional[dict[str, int]] = None
    active_delegations: Optional[EntityDelta[DelegationDto]] = None
    attention: Optional[EntityDelta[AttentionItemDto]] = None

    def has_changes(self) -> bool:
        return (
            self.gateway is not None
            or self.runtime_summary is not None
            or (self.agents is not None and not self.agents.is_empty())
            or self.task_summary is not None
            or self.approval_summary is not None
            or (self.active_delegations is not None and not self.active_delegations.is_empty())
            or (self.attention is not None and not self.attention.is_empty())
        )


class CanonicalRealtimeSnapshot(BaseModel):
    model_config = ConfigDict(extra="ignore")

    generated_at: str
    revision: int
    gateway: GatewayDto
    runtime_summary: RuntimeOverviewDto
    agents: list[AgentDto]
    task_summary: dict[str, int]
    approval_summary: dict[str, int]
    active_delegations: list[DelegationDto]
    attention: list[AttentionItemDto]


class RealtimeDelta(BaseModel):
    model_config = ConfigDict(extra="ignore")

    base_revision: int
    revision: int
    generated_at: str
    changes: RealtimeChanges


class ResyncPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    reason: str


class ErrorPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    code: str
    message: str


class RealtimeMessageEnvelope(BaseModel):
    model_config = ConfigDict(extra="ignore")

    protocol_version: str = PROTOCOL_VERSION
    type: RealtimeMessageType
    sequence: int
    generated_at: str
    server_instance_id: str
    payload: Any
