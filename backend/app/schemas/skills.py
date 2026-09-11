from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict

SkillRegistration = Literal["REGISTERED", "UNREGISTERED"]
SkillInstallation = Literal["INSTALLED", "MISSING", "UNKNOWN"]
SkillHealth = Literal["HEALTHY", "DEGRADED", "MISSING", "UNKNOWN"]
SkillExecution = Literal[
    "NOT_OBSERVED",
    "REQUESTED",
    "EXECUTION_UNKNOWN",
    "OBSERVED_ACTIVE",
    "COMPLETED",
    "FAILED",
]


class SkillDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    category: str
    description: Optional[str] = None
    version: Optional[str] = None
    registration: SkillRegistration
    installation: SkillInstallation
    health: SkillHealth
    execution: SkillExecution
    owner_pid: Optional[int] = None
    last_executed_at: Optional[str] = None
