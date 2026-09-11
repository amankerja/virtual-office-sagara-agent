from typing import Optional
from pydantic import BaseModel, ConfigDict, Field


class ProfileDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    role: Optional[str] = None
    description: Optional[str] = None
    enabled: bool = True
    memory_namespace: Optional[str] = None
    allowed_skills: Optional[list[str]] = None
    configuration_state: Optional[str] = None
    model_tier: Optional[str] = None
