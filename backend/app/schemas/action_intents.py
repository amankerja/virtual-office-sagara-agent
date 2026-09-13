from typing import Any, Literal, Optional
from pydantic import BaseModel, ConfigDict, Field

ActionType = Literal[
    "TASK_DISPATCH",
    "TASK_CANCEL",
    "PROFILE_CHANGE_APPLY",
    "SKILL_ASSIGNMENT_CHANGE",
    "SCHEDULE_CREATE",
    "SCHEDULE_UPDATE",
    "SCHEDULE_PAUSE",
    "SCHEDULE_CANCEL",
    "SAFETY_GATE_SELF_TEST",
]

ActionIntentState = Literal[
    "DRAFT",
    "PREFLIGHTING",
    "PREFLIGHT_FAILED",
    "READY_FOR_APPROVAL",
    "PENDING_APPROVAL",
    "APPROVED",
    "REJECTED",
    "EXPIRED",
    "CANCELLED",
    "READY_TO_EXECUTE",
    "EXECUTION_DISABLED",
]

ActionRisk = Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]

PreflightStatus = Literal["PASS", "FAIL", "REQUIRES_APPROVAL", "BLOCKED"]


class PreflightResultDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    checked_at: str
    result: PreflightStatus
    risk: ActionRisk
    requirements: list[str] = []
    warnings: list[str] = []
    blocking_reasons: list[str] = []
    observed_revisions: dict[str, int] = {}
    runtime_evidence: dict[str, Any] = {}
    action_plan: Optional[dict[str, Any]] = None


class CreateActionIntentDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    action_type: str
    target_type: str
    target_id: str
    payload: dict[str, Any] = Field(default_factory=dict)
    resource_revision: Optional[int] = None
    reason: Optional[str] = None


class ActionIntentDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    action_type: str
    target_type: str
    target_id: str
    requested_by: str
    requested_at: str
    payload: dict[str, Any]
    payload_hash: str
    risk: ActionRisk
    status: ActionIntentState
    requires_approval: bool
    preflight_revision: int
    resource_revision: Optional[int] = None
    preflight_result: Optional[PreflightResultDto] = None
    nonce: str
    signature: str
    expires_at: str
    correlation_id: str
    created_at: str
    updated_at: str
    execution_authorization_id: Optional[str] = None
    execution_policy_version: Optional[str] = None
    execution_policy_hash: Optional[str] = None
    tool_security_policy_version: Optional[str] = None
    tool_security_policy_hash: Optional[str] = None


class ActionSafetyStatusDto(BaseModel):
    model_config = ConfigDict(extra="ignore")

    execution_mode: str  # DISABLED
    action_signing: str  # CONFIGURED / MISSING
    persistent_idempotency: str  # HEALTHY
    audit_chain: str  # VALID / TAMPER_DETECTED
    approval_policy: str  # LOADED
    executor: str  # DISABLED
    control_db: str  # CONNECTED
    schema_version: int
    active_intents_count: int = 0
    pending_approvals_count: int = 0
    kill_switch_status: str = "LOCKED"  # LOCKED / UNLOCKED
    execution_feature_enabled: bool = False
    trusted_auth_configured: bool = False
    hermes_interface_available: bool = False
    direct_session_receipt_supported: bool = True
    execution_ready: bool = False
