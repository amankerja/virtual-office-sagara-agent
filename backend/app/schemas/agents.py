from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

AgentState = Literal[
    "ACTIVE",
    "IDLE",
    "RECENTLY_ACTIVE",
    "AWAITING_APPROVAL",
    "DEGRADED",
    "ERROR",
    "OFFLINE",
    "UNKNOWN",
    "CONFIGURATION_INCOMPLETE",
]

RuntimeConfidence = Literal[
    "CONFIRMED",
    "INFERRED",
    "STALE",
    "UNKNOWN",
]


class AgentDefinitionDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: Optional[str] = None
    name: str
    role: Optional[str] = None
    description: Optional[str] = None
    enabled: bool = True
    memory_namespace: Optional[str] = None
    allowed_skills: Optional[list[str]] = None


class AgentRuntimeDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    state: AgentState
    confidence: RuntimeConfidence
    last_activity_at: Optional[str] = None
    session_count: Optional[int] = None
    active_delegations: Optional[int] = None
    current_session_id: Optional[str] = None
    current_task_id: Optional[str] = None
    model: Optional[str] = None


class AgentCapabilitiesDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    total: Optional[int] = None
    healthy: Optional[int] = None
    degraded: Optional[int] = None
    missing: Optional[int] = None


class AgentUsageDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    input_tokens: Optional[int] = None
    output_tokens: Optional[int] = None
    estimated_cost_usd: Optional[float] = None
    actual_cost_usd: Optional[float] = None


class AgentDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    definition: AgentDefinitionDto
    runtime: AgentRuntimeDto
    capabilities: AgentCapabilitiesDto
    usage: Optional[AgentUsageDto] = None
