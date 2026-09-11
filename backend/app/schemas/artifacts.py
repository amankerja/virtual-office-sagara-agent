from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict

ArtifactStatus = Literal["AVAILABLE", "PROCESSING", "MISSING", "EXPIRED", "UNKNOWN"]


class ArtifactDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    task_id: Optional[str] = None
    session_id: Optional[str] = None
    name: str
    media_type: Optional[str] = None
    size_bytes: Optional[int] = None
    created_at: str
    status: ArtifactStatus
