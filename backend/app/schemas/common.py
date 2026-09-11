from typing import Any, Generic, Optional, TypeVar
from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ApiErrorDetails(BaseModel):
    model_config = ConfigDict(extra="forbid")

    code: str = Field(..., description="Machine-readable error code")
    message: str = Field(..., description="Safe human-readable error description")
    correlation_id: Optional[str] = Field(None, description="Request tracking correlation ID")
    details: Optional[dict[str, Any]] = Field(None, description="Contextual error details")


class ApiErrorResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    error: ApiErrorDetails


class PageInfo(BaseModel):
    model_config = ConfigDict(extra="forbid")

    next_cursor: Optional[str] = None
    has_more: bool = False
    total_count: Optional[int] = None


class PageResult(BaseModel, Generic[T]):
    model_config = ConfigDict(extra="forbid")

    items: list[T]
    page_info: PageInfo


class EntityReference(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: str
    id: Optional[str] = None
    label: Optional[str] = None


class RelatedEntities(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task_id: Optional[str] = None
    agent_id: Optional[str] = None
    profile_id: Optional[str] = None
    session_id: Optional[str] = None
    delegation_id: Optional[str] = None
    approval_id: Optional[str] = None
    skill_id: Optional[str] = None
    artifact_id: Optional[str] = None


class RedactedValue(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: Optional[Any] = None
    redacted: bool = True
