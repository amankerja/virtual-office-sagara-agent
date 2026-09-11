from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict

DelegationState = Literal[
    "QUEUED",
    "CLAIMED",
    "RUNNING",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
    "UNKNOWN",
]


class DelegationDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    parent_session_id: Optional[str] = None
    target_agent_id: Optional[str] = None
    task_title: str
    state: DelegationState
    worker_pid: Optional[str] = None
    owner_pid: Optional[int] = None
    started_at: str
    completed_at: Optional[str] = None
