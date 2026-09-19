import os
from typing import Any, Literal, Optional
from pydantic import BaseModel, model_validator

try:
    from pydantic_settings import BaseSettings, SettingsConfigDict
except ImportError:
    BaseSettings = BaseModel  # type: ignore[misc,assignment]
    SettingsConfigDict = dict  # type: ignore[misc,assignment]


class Settings(BaseSettings):
    environment: str = "development"
    data_mode: Literal["mock"] = "mock"
    profile_source: Literal["mock", "sagara"] = "mock"
    skill_source: Literal["mock", "sagara"] = "mock"
    runtime_source: Literal["mock", "hermes"] = "mock"
    sagara_project_root: Optional[str] = None
    hermes_state_db_path: Optional[str] = None
    host: str = "127.0.0.1"
    port: int = 8000
    frontend_dist_path: Optional[str] = None
    cors_origins: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]
    realtime_enabled: bool = True
    realtime_interval_seconds: float = 2.0
    realtime_replay_size: int = 256
    realtime_client_queue_size: int = 64
    realtime_max_connections: int = 50
    realtime_heartbeat_interval_seconds: float = 20.0

    database_url: str = "sqlite:///./data/mission-control.db"
    action_signing_key: Optional[str] = None
    execution_enabled: bool = True  # Controlled via MISSION_CONTROL_EXECUTION_ENABLED
    live_canary_enabled: bool = True  # Gate for real production canary (MISSION_CONTROL_LIVE_CANARY_ENABLED)
    trusted_auth_proxy_enabled: bool = False  # MISSION_CONTROL_TRUSTED_AUTH_PROXY_ENABLED
    trusted_proxy_cidrs: list[str] = []  # MISSION_CONTROL_TRUSTED_PROXY_CIDRS
    hermes_binary: Optional[str] = None  # MISSION_CONTROL_HERMES_BINARY (path to executable)
    hermes_home_dir: Optional[str] = None  # MISSION_CONTROL_HERMES_HOME_DIR
    execution_auth_ttl_seconds: int = 300  # 5 minutes
    execution_timeout_seconds: float = 300.0  # 5 minutes
    action_intent_default_ttl_seconds: int = 1800  # 30 minutes
    action_intent_high_risk_ttl_seconds: int = 900  # 15 minutes
    action_intent_critical_risk_ttl_seconds: int = 600  # 10 minutes
    idempotency_ttl_seconds: int = 86400  # 24 hours

    model_config = SettingsConfigDict(
        env_prefix="MISSION_CONTROL_",
        env_file=".env",
        extra="ignore",
    )

    @model_validator(mode="before")
    @classmethod
    def check_unprefixed_env_fallbacks(cls, data: dict) -> dict:
        if isinstance(data, dict):
            # Fallback to unprefixed env vars if not provided with MISSION_CONTROL_ prefix
            if not data.get("sagara_project_root") and os.environ.get("SAGARA_PROJECT_ROOT"):
                data["sagara_project_root"] = os.environ["SAGARA_PROJECT_ROOT"]
            if not data.get("hermes_state_db_path") and os.environ.get("HERMES_STATE_DB_PATH"):
                data["hermes_state_db_path"] = os.environ["HERMES_STATE_DB_PATH"]
            if not data.get("profile_source") and os.environ.get("PROFILE_SOURCE"):
                data["profile_source"] = os.environ["PROFILE_SOURCE"]
            if not data.get("skill_source") and os.environ.get("SKILL_SOURCE"):
                data["skill_source"] = os.environ["SKILL_SOURCE"]
            if not data.get("runtime_source") and os.environ.get("RUNTIME_SOURCE"):
                data["runtime_source"] = os.environ["RUNTIME_SOURCE"]
            if not data.get("database_url") and os.environ.get("MISSION_CONTROL_DATABASE_URL"):
                data["database_url"] = os.environ["MISSION_CONTROL_DATABASE_URL"]
            elif not data.get("database_url") and os.environ.get("DATABASE_URL"):
                data["database_url"] = os.environ["DATABASE_URL"]
            if not data.get("action_signing_key") and os.environ.get("MISSION_CONTROL_ACTION_SIGNING_KEY"):
                data["action_signing_key"] = os.environ["MISSION_CONTROL_ACTION_SIGNING_KEY"]
            elif not data.get("action_signing_key") and os.environ.get("ACTION_SIGNING_KEY"):
                data["action_signing_key"] = os.environ["ACTION_SIGNING_KEY"]
            if "execution_enabled" not in data and "MISSION_CONTROL_EXECUTION_ENABLED" in os.environ:
                data["execution_enabled"] = os.environ["MISSION_CONTROL_EXECUTION_ENABLED"].lower() in ("true", "1", "yes")
            if "live_canary_enabled" not in data and "MISSION_CONTROL_LIVE_CANARY_ENABLED" in os.environ:
                data["live_canary_enabled"] = os.environ["MISSION_CONTROL_LIVE_CANARY_ENABLED"].lower() in ("true", "1", "yes")
            if not data.get("hermes_binary") and os.environ.get("HERMES_BINARY"):
                data["hermes_binary"] = os.environ["HERMES_BINARY"]
            if not data.get("frontend_dist_path") and os.environ.get("FRONTEND_DIST_PATH"):
                data["frontend_dist_path"] = os.environ["FRONTEND_DIST_PATH"]
        return data


settings = Settings()


