from typing import Any, Literal, Optional
from pydantic import BaseModel, ConfigDict

TaskState = Literal[
    "DRAFT",
    "READY",
    "QUEUED",
    "DISPATCHING",
    "RUNNING",
    "AWAITING_APPROVAL",
    "BLOCKED",
    "COMPLETED",
    "FAILED",
    "CANCELLED",
]

TaskPriority = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class TaskProgressDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    completed: Optional[int] = None
    total: Optional[int] = None
    label: Optional[str] = None


class TaskTimelineEventDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    type: str
    timestamp: str
    actor: Optional[str] = None
    detail: Optional[str] = None


class TaskFailureDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    code: Optional[str] = None
    message: Optional[str] = None
    stage: Optional[str] = None
    retryable: Optional[bool] = None


class TaskArtifactDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    type: Optional[str] = None
    size_bytes: Optional[int] = None
    created_at: Optional[str] = None


class TaskResultDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    summary: Optional[str] = None
    artifact_count: Optional[int] = None
    artifacts: Optional[list[TaskArtifactDto]] = None


class TaskDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    title: str
    description: Optional[str] = None
    state: TaskState
    priority: TaskPriority
    created_at: str
    updated_at: Optional[str] = None
    assigned_agent_id: Optional[str] = None
    requested_skills: Optional[list[str]] = None
    capability_requirements: Optional[list[str]] = None
    due_at: Optional[str] = None
    progress: Optional[TaskProgressDto] = None
    timeline: Optional[list[TaskTimelineEventDto]] = None
    failure: Optional[TaskFailureDto] = None
    result: Optional[TaskResultDto] = None
    revision: Optional[int] = 1
    version: Optional[int] = 1


class CreateTaskDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: str
    description: Optional[str] = None
    priority: TaskPriority
    state: Optional[Literal["DRAFT", "READY", "QUEUED"]] = "DRAFT"
    assigned_agent_id: Optional[str] = None
    requested_skills: Optional[list[str]] = None
    capability_requirements: Optional[list[str]] = None
    due_at: Optional[str] = None


class UpdateTaskDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[TaskPriority] = None
    state: Optional[TaskState] = None
    assigned_agent_id: Optional[str] = None
    requested_skills: Optional[list[str]] = None
    capability_requirements: Optional[list[str]] = None
    due_at: Optional[str] = None
    revision: Optional[int] = None
