import hashlib
from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, Field


def compute_receipt_hash(
    receipt_id: str,
    attempt_id: str,
    intent_id: str,
    task_id: str,
    profile_id: str,
    hermes_session_id: str,
    submitted_at: str,
    acknowledged_at: str,
    executor_type: str,
    correlation_id: str,
    result: str,
) -> str:
    """Compute deterministic SHA-256 fingerprint for ExecutionReceipt (Prompt 14 Section 66)."""
    canonical = (
        f"{receipt_id}|{attempt_id}|{intent_id}|{task_id}|{profile_id}|"
        f"{hermes_session_id}|{submitted_at}|{acknowledged_at}|{executor_type}|"
        f"{correlation_id}|{result}"
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class ExecutionAuthorization(BaseModel):
    """
    Persistent single-use authorization token for task execution (Prompt 14 Section 45-51).
    Binds exact intent, payload hash, profile, task revision, and operator.
    Short TTL (default 5 min). Single-use atomic claim.
    """
    id: str
    intent_id: str
    payload_hash: str
    profile_id: str
    task_id: str
    task_revision: int
    issued_to: str
    issued_at: str
    expires_at: str
    nonce: str
    state: Literal["ISSUED", "CLAIMED", "CONSUMED", "EXPIRED", "REVOKED"] = "ISSUED"
    consumed_at: Optional[str] = None
    execution_attempt_id: Optional[str] = None


class ExecutionAttempt(BaseModel):
    """
    At-most-once execution attempt state machine (Prompt 14 Section 54-58).
    Persisted before external execution call.
    """
    id: str
    intent_id: str
    authorization_id: str
    task_id: str
    profile_id: str
    correlation_id: str
    state: Literal[
        "PREPARED",
        "CLAIMED",
        "SUBMITTING",
        "ACKNOWLEDGED",
        "FAILED_PRE_SUBMISSION",
        "OUTCOME_UNKNOWN",
        "RECONCILED",
    ] = "PREPARED"
    created_at: str
    claimed_at: Optional[str] = None
    submitted_at: Optional[str] = None
    acknowledged_at: Optional[str] = None
    completed_at: Optional[str] = None
    session_id: Optional[str] = None
    error_code: Optional[str] = None


class ExecutionReceipt(BaseModel):
    """
    Authoritative immutable execution receipt (Prompt 14 Section 65-66).
    Links Task directly to confirmed Hermes Session ID.
    """
    receipt_id: str
    attempt_id: str
    intent_id: str
    task_id: str
    profile_id: str
    hermes_session_id: str
    submitted_at: str
    acknowledged_at: str
    executor_type: str
    executor_version: str
    correlation_id: str
    result: str = "SUCCESS"
    receipt_hash: str
    created_at: str
    execution_policy_version: Optional[str] = None
    execution_policy_hash: Optional[str] = None
    execution_mode: Optional[str] = None
    tool_security_policy_version: Optional[str] = None
    tool_security_policy_hash: Optional[str] = None
    tool_executions_count: int = 0


class TaskDispatchExecutionRequest(BaseModel):
    """
    Typed dispatch request passed to TaskDispatchExecutor (Prompt 14 Section 31).
    Derived exclusively from approved ActionIntent; cannot be overridden by endpoint body.
    """
    intent_id: str
    task_id: str
    profile_id: str
    task_revision: int
    payload_hash: str
    correlation_id: str
    execution_authorization_id: str
    prompt: str
    timeout_seconds: float = 300.0
    tools_enabled: bool = True
    safe_mode: bool = False


class TaskDispatchExecutionResult(BaseModel):
    """Execution outcome returned by TaskDispatchExecutor."""
    hermes_session_id: Optional[str] = None
    outcome: Literal["ACKNOWLEDGED", "FAILED_PRE_SUBMISSION", "OUTCOME_UNKNOWN"]
    submitted_at: str
    acknowledged_at: Optional[str] = None
    executor_type: str
    executor_version: str
    raw_output_snippet: str = ""
    error_code: Optional[str] = None


class ExecutionWindow(BaseModel):
    """
    Time-bounded, budget-constrained execution window for canary and production dispatches (Prompt 14.4 Section 54-56).
    """
    id: str
    lock_name: str = "global_dispatch"
    opened_by: str
    opened_at: str
    expires_at: str
    max_executions: int = 1
    executions_consumed: int = 0
    reason: str
    state: Literal["OPEN", "EXHAUSTED", "EXPIRED", "CLOSED"] = "OPEN"
    closed_at: Optional[str] = None
    closed_by: Optional[str] = None
    created_at: Optional[str] = None

