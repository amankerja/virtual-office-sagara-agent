from typing import Any, Literal, Optional
from pydantic import BaseModel, ConfigDict

SessionState = Literal[
    "ACTIVE",
    "RECENT",
    "COMPLETED",
    "FAILED",
    "ARCHIVED",
    "UNKNOWN",
]


class SessionDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    profile_id: Optional[str] = None
    agent_id: Optional[str] = None
    source: Optional[str] = None
    state: Optional[SessionState] = None
    model: Optional[str] = None
    provider: Optional[str] = None
    started_at: str
    last_activity_at: str
    message_count: int
    tool_call_count: Optional[int] = None
    parent_session_id: Optional[str] = None
    usage: Optional[dict[str, Any]] = None
