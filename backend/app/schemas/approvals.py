from typing import Any, Literal, Optional, Union
from pydantic import BaseModel, ConfigDict

ApprovalState = Literal[
    "PENDING",
    "APPROVED",
    "REJECTED",
    "EXPIRED",
    "CANCELLED",
    "FAILED",
]

ApprovalRisk = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class ApprovalPreviewDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    summary: Optional[str] = None
    sensitive_fields: Optional[list[str]] = None
    diff: Optional[str] = None
    impact: Optional[str] = None


class ApprovalDecisionRecordDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    decided_at: str
    decision_maker: str
    reason: Optional[str] = None


class ApprovalDecisionAuditDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    stage: str
    timestamp: str
    actor: str
    note: Optional[str] = None


class ApprovalDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    state: ApprovalState
    risk: ApprovalRisk
    action_type: str
    title: str
    description: Optional[str] = None
    reason_required: Optional[Union[bool, str]] = None
    task_id: Optional[str] = None
    agent_id: Optional[str] = None
    requested_at: str
    preview: Optional[ApprovalPreviewDto] = None
    decision: Optional[ApprovalDecisionRecordDto] = None
    audit: Optional[list[ApprovalDecisionAuditDto]] = None
    revision: Optional[int] = 1
    version: Optional[int] = 1


class ApprovalDecisionInputDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    reason: Optional[str] = None
