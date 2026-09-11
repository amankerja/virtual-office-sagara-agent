from typing import Any, Literal, Optional
from pydantic import BaseModel, ConfigDict

RuntimeStatus = Literal["HEALTHY", "DEGRADED", "ERROR", "OFFLINE", "UNKNOWN", "NOT_CONNECTED"]


class RuntimeOverviewDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: RuntimeStatus
    uptime_seconds: int
    active_sessions_count: int
    active_workers_count: int
    confidence: Optional[str] = None
    system_load: Optional[dict[str, Any]] = None


class GatewayDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: str
    connected: bool
    latency_ms: int
    last_heartbeat_at: str
    host: Optional[str] = None
    pid: Optional[int] = None
    backend_id: Optional[str] = None
    heartbeat_age_seconds: Optional[int] = None
    restart_count: Optional[int] = None


class RuntimeEventDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    type: str
    timestamp: str
    severity: str
    message: str
    details: Optional[dict[str, Any]] = None
