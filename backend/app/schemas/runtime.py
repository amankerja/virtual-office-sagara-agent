from typing import Any, Literal, Optional
from pydantic import BaseModel, ConfigDict

RuntimeStatus = Literal["HEALTHY", "DEGRADED", "ERROR", "OFFLINE", "UNKNOWN", "NOT_CONNECTED"]


class VpsHealthDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    hostname: str
    uptime_seconds: int
    cpu_percent: Optional[float] = None
    load_1m: Optional[float] = None
    load_5m: Optional[float] = None
    load_15m: Optional[float] = None
    ram_total_mb: Optional[int] = None
    ram_used_mb: Optional[int] = None
    ram_percent: Optional[float] = None
    swap_total_mb: Optional[int] = None
    swap_used_mb: Optional[int] = None
    disk_total_gb: Optional[float] = None
    disk_used_gb: Optional[float] = None
    disk_free_gb: Optional[float] = None
    disk_percent: Optional[float] = None
    observed_at: str
    health: str = "HEALTHY"


class ServiceHealthDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    active_state: str = "UNKNOWN"
    sub_state: str = "UNKNOWN"
    main_pid: Optional[int] = None
    restart_count: Optional[int] = None
    active_since: Optional[str] = None
    observed_at: str
    health: str = "UNKNOWN"


class NineRouterHealthDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    available: bool = False
    endpoint: str = "http://127.0.0.1:20128"
    status_code: Optional[int] = None
    models_count: Optional[int] = None
    active_state: Optional[str] = None
    main_pid: Optional[int] = None
    observed_at: str
    health: str = "UNKNOWN"


class SagaraSourceDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    configured: bool = False
    discovered: bool = False
    source_version: Optional[str] = None
    commit: Optional[str] = None
    freeze_commit: str = "babbd61618f6eb3db99109ba24e0d49b2c9b97d7"
    profiles_loaded: int = 0
    skills_loaded: int = 0
    channels_loaded: int = 0
    observed_at: str
    health: str = "UNKNOWN"


class HermesSourceDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    configured: bool = False
    discovered: bool = False
    version: Optional[str] = None
    gateway: Optional[str] = None
    state_store: Optional[str] = None
    profile_stores: int = 0
    observed_at: str
    health: str = "UNKNOWN"


class SourceDiscoveryStatusDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    sagara: SagaraSourceDto
    hermes: HermesSourceDto
    runtime_contract: str = "SAGARA_HERMES_RUNTIME_CONTRACT_V1"
    observed_at: str


class ReleaseMetadataDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    platform: str = "Mission Control"
    mission_control_version: str = "1.0.0"
    mission_control_commit: Optional[str] = None
    sagara_deployed_commit: Optional[str] = None
    sagara_freeze_commit: str = "babbd61618f6eb3db99109ba24e0d49b2c9b97d7"
    hermes_version: Optional[str] = None
    runtime_contract: str = "SAGARA_HERMES_RUNTIME_CONTRACT_V1"
    production_policy: str = "PRODUCTION_EXECUTION_POLICY_V3"
    policy_hash: str = "13ef245630dc448208a408db190924119df9bcf1f602f71e0814b62226fbe95e"
    observed_at: str


class RuntimeOverviewDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    status: RuntimeStatus
    uptime_seconds: int
    active_sessions_count: int
    active_workers_count: int
    confidence: Optional[str] = None
    system_load: Optional[dict[str, Any]] = None
    central_store_sessions: Optional[int] = None
    profile_local_sessions: Optional[int] = None
    aggregate_distinct_sessions: Optional[int] = None
    current_model: Optional[str] = None
    current_provider: Optional[str] = None
    platforms: Optional[dict[str, str]] = None
    vps_health: Optional[dict[str, Any]] = None
    services_health: Optional[list[dict[str, Any]]] = None
    router_health: Optional[dict[str, Any]] = None


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
    platforms: Optional[dict[str, Any]] = None


class UsageMetricBreakdownDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    name: str
    apiCalls: Optional[int] = None
    inputTokens: Optional[int] = None
    outputTokens: Optional[int] = None
    reasoningTokens: Optional[int] = None
    cacheTokens: Optional[int] = None
    estimatedCostUsd: Optional[float] = None
    actualCostUsd: Optional[float] = None


class RuntimeUsageOverviewDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    totalApiCalls: Optional[int] = None
    inputTokens: Optional[int] = None
    outputTokens: Optional[int] = None
    reasoningTokens: Optional[int] = None
    cacheTokens: Optional[int] = None
    estimatedCostUsd: Optional[float] = None
    actualCostUsd: Optional[float] = None
    byAgent: list[UsageMetricBreakdownDto] = []
    byModel: list[UsageMetricBreakdownDto] = []
    byProvider: list[UsageMetricBreakdownDto] = []


class RuntimeEventDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    type: str
    timestamp: str
    severity: str
    message: str
    details: Optional[dict[str, Any]] = None

