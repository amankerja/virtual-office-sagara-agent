"""
Production Execution Policy Domain Model (Prompt 14.6 Section 6-12).
Establishes the canonical server-side policy matrix for limited production rollout:
Profile + Action Type + Task Class + Risk + Tool Policy + Approval Policy + Execution Budget + Operator Permission.
"""

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional, Union
from pydantic import BaseModel, Field

TaskClass = Literal[
    "REASONING_ONLY",
    "DRAFT_GENERATION",
    "RESEARCH_ONLY",
    "READ_ONLY_INSPECTION",
    "CODE_CHANGE",
    "INFRA_CHANGE",
    "EXTERNAL_COMMUNICATION",
    "BUSINESS_DATA_MUTATION",
    "SCHEDULE_MUTATION",
    "UNKNOWN",
]

ExecutionMode = Literal[
    "SAFE_NO_TOOLS",
    "SAFE_READ_ONLY",
    "APPROVED_TOOLS",
    "SIDE_EFFECTING",
]

ProfileExecutionStatus = Literal[
    "DISABLED",
    "LIMITED",
    "ENABLED",
]

# Canonical 8 Profiles
ALL_CANONICAL_PROFILES = [
    "lead",
    "personal",
    "business",
    "marketing",
    "cs",
    "it-support",
    "it-coding",
    "sagara-lab",
]


class ProfileExecutionRule(BaseModel):
    """Execution policy rule for an individual profile."""
    profile_id: str
    status: ProfileExecutionStatus = "DISABLED"
    allowed_action_types: List[str] = Field(default_factory=list)
    allowed_task_classes: List[TaskClass] = Field(default_factory=list)
    allowed_execution_modes: List[ExecutionMode] = Field(default_factory=list)
    allowed_risk_tiers: List[str] = Field(default_factory=list)
    require_independent_approval: bool = True
    require_safe_mode: bool = True
    max_concurrency: int = 1
    max_executions_per_hour: int = 0
    timeout_seconds: float = 120.0
    external_side_effects_allowed: bool = False
    disabled_reason: Optional[str] = None


class ProductionExecutionPolicy(BaseModel):
    """
    Authoritative server-side production execution policy model.
    Immutable when installed/applied.
    """
    version: str = "PRODUCTION_EXECUTION_POLICY_V1"
    policy_hash: str = ""
    supersedes_version: Optional[str] = None
    global_execution_enabled: bool = False
    max_global_concurrency: int = 1
    global_tool_policy: Literal["DENY", "ALLOWLIST"] = "DENY"
    allowed_action_types: List[str] = Field(default_factory=lambda: ["TASK_DISPATCH"])
    profiles: Dict[str, ProfileExecutionRule] = Field(default_factory=dict)
    tool_security_policy_version: Optional[str] = None
    tool_security_policy_hash: Optional[str] = None
    allowed_tools: List[str] = Field(default_factory=list)
    max_tool_invocations_per_execution: int = 0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"))
    description: str = "Canonical Production Execution Policy V1 — Conservative Limited Rollout"


V1_POLICY_KEYS = {
    "version",
    "global_execution_enabled",
    "max_global_concurrency",
    "global_tool_policy",
    "allowed_action_types",
    "profiles",
    "created_at",
    "description",
}


def compute_policy_hash(policy_data: Union[dict, "ProductionExecutionPolicy"]) -> str:
    """
    Deterministic SHA-256 semantic hash of canonical JSON representation.
    Omits volatile policy_hash field if present.
    For V1 policies, preserves exact canonical V1 schema keys to guarantee immutability (Prompt 14.9A.7 Section 2).
    """
    if hasattr(policy_data, "model_dump"):
        normalized = policy_data.model_dump()
    elif isinstance(policy_data, dict):
        normalized = dict(policy_data)
    else:
        normalized = dict(policy_data)

    # Ensure all nested Pydantic models in profiles are dumped as dicts if needed
    if "profiles" in normalized and isinstance(normalized["profiles"], dict):
        norm_profiles = {}
        for k, v in normalized["profiles"].items():
            if hasattr(v, "model_dump"):
                norm_profiles[k] = v.model_dump()
            else:
                norm_profiles[k] = v
        normalized["profiles"] = norm_profiles

    normalized.pop("policy_hash", None)
    if normalized.get("version") == "PRODUCTION_EXECUTION_POLICY_V1":
        normalized = {k: v for k, v in normalized.items() if k in V1_POLICY_KEYS}
    # Recursively sort keys
    canonical_json = json.dumps(normalized, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical_json.encode("utf-8")).hexdigest()



def create_canonical_v1_policy() -> ProductionExecutionPolicy:
    """
    Construct the canonical V1 Limited Rollout policy (Prompt 14.6 Section 11-27).
    sagara-lab: LIMITED (safe reasoning/drafting, zero tools, approval required, max 1 concurrency).
    7 others: DISABLED.
    """
    now_str = "2026-09-11T12:00:00Z"
    
    profiles: Dict[str, ProfileExecutionRule] = {
        "lead": ProfileExecutionRule(
            profile_id="lead",
            status="DISABLED",
            allowed_action_types=[],
            allowed_task_classes=[],
            allowed_execution_modes=[],
            allowed_risk_tiers=[],
            require_independent_approval=True,
            require_safe_mode=True,
            max_concurrency=0,
            max_executions_per_hour=0,
            disabled_reason="Lead coordinates and delegates. Root execution bypass forbidden.",
        ),
        "personal": ProfileExecutionRule(
            profile_id="personal",
            status="DISABLED",
            allowed_action_types=[],
            allowed_task_classes=[],
            allowed_execution_modes=[],
            allowed_risk_tiers=[],
            require_independent_approval=True,
            require_safe_mode=True,
            max_concurrency=0,
            max_executions_per_hour=0,
            disabled_reason="Personal capabilities involve external email/workspace APIs. Production execution disabled.",
        ),
        "business": ProfileExecutionRule(
            profile_id="business",
            status="DISABLED",
            allowed_action_types=[],
            allowed_task_classes=[],
            allowed_execution_modes=[],
            allowed_risk_tiers=[],
            require_independent_approval=True,
            require_safe_mode=True,
            max_concurrency=0,
            max_executions_per_hour=0,
            disabled_reason="Business data mutation and catalog boundaries not yet formally verified.",
        ),
        "marketing": ProfileExecutionRule(
            profile_id="marketing",
            status="DISABLED",
            allowed_action_types=[],
            allowed_task_classes=[],
            allowed_execution_modes=[],
            allowed_risk_tiers=[],
            require_independent_approval=True,
            require_safe_mode=True,
            max_concurrency=0,
            max_executions_per_hour=0,
            disabled_reason="External social publishing and multiplatform posting strictly disabled.",
        ),
        "cs": ProfileExecutionRule(
            profile_id="cs",
            status="DISABLED",
            allowed_action_types=[],
            allowed_task_classes=[],
            allowed_execution_modes=[],
            allowed_risk_tiers=[],
            require_independent_approval=True,
            require_safe_mode=True,
            max_concurrency=0,
            max_executions_per_hour=0,
            disabled_reason="Customer communication workflows may cause external side effects. Disabled.",
        ),
        "it-support": ProfileExecutionRule(
            profile_id="it-support",
            status="DISABLED",
            allowed_action_types=[],
            allowed_task_classes=[],
            allowed_execution_modes=[],
            allowed_risk_tiers=[],
            require_independent_approval=True,
            require_safe_mode=True,
            max_concurrency=0,
            max_executions_per_hour=0,
            disabled_reason="Operational restart and config mutation capabilities disabled.",
        ),
        "it-coding": ProfileExecutionRule(
            profile_id="it-coding",
            status="DISABLED",
            allowed_action_types=[],
            allowed_task_classes=[],
            allowed_execution_modes=[],
            allowed_risk_tiers=[],
            require_independent_approval=True,
            require_safe_mode=True,
            max_concurrency=0,
            max_executions_per_hour=0,
            disabled_reason="Filesystem repository deployment policies not yet separately proven.",
        ),
        "sagara-lab": ProfileExecutionRule(
            profile_id="sagara-lab",
            status="LIMITED",
            allowed_action_types=["TASK_DISPATCH"],
            allowed_task_classes=["REASONING_ONLY", "DRAFT_GENERATION"],
            allowed_execution_modes=["SAFE_NO_TOOLS"],
            allowed_risk_tiers=["HIGH", "MEDIUM"],
            require_independent_approval=True,
            require_safe_mode=True,
            max_concurrency=1,
            max_executions_per_hour=3,
            timeout_seconds=120.0,
            external_side_effects_allowed=False,
            disabled_reason=None,
        ),
    }

    raw_dict = {
        "version": "PRODUCTION_EXECUTION_POLICY_V1",
        "global_execution_enabled": False,
        "max_global_concurrency": 1,
        "global_tool_policy": "DENY",
        "allowed_action_types": ["TASK_DISPATCH"],
        "profiles": {k: v.model_dump() for k, v in profiles.items()},
        "created_at": now_str,
        "description": "Canonical Production Execution Policy V1 — Conservative Limited Rollout",
    }
    phash = compute_policy_hash(raw_dict)
    raw_dict["policy_hash"] = phash
    return ProductionExecutionPolicy(**raw_dict)


def create_canonical_v2_policy() -> ProductionExecutionPolicy:
    """
    Construct the canonical V2 Limited Rollout policy (Prompt 14.9A.7).
    sagara-lab: LIMITED (SAFE_NO_TOOLS: REASONING_ONLY, DRAFT_GENERATION;
                         SAFE_READ_ONLY: READ_ONLY_INSPECTION).
    Tool Security Policy: TOOL_SECURITY_POLICY_V1 (9bdd1d54102280e49f1d23a13be404c44bb0f22e2c3f100b8d6aed61e3ec033d).
    Allowed tools: runtime_status, document_inspection.
    7 others: DISABLED.
    Global Tool Policy: DENY.
    Max tool invocations per execution: 1.
    """
    now_str = "2026-09-12T12:00:00Z"

    # 7 disabled profiles copied verbatim from V1
    v1_policy = create_canonical_v1_policy()
    profiles: Dict[str, ProfileExecutionRule] = {}
    for pid, prof_rule in v1_policy.profiles.items():
        if prof_rule.status == "DISABLED":
            profiles[pid] = prof_rule.model_copy()

    # sagara-lab in V2: supports SAFE_NO_TOOLS and SAFE_READ_ONLY
    profiles["sagara-lab"] = ProfileExecutionRule(
        profile_id="sagara-lab",
        status="LIMITED",
        allowed_action_types=["TASK_DISPATCH"],
        allowed_task_classes=["REASONING_ONLY", "DRAFT_GENERATION", "READ_ONLY_INSPECTION"],
        allowed_execution_modes=["SAFE_NO_TOOLS", "SAFE_READ_ONLY"],
        allowed_risk_tiers=["HIGH", "MEDIUM"],
        require_independent_approval=True,
        require_safe_mode=True,
        max_concurrency=1,
        max_executions_per_hour=3,
        timeout_seconds=120.0,
        external_side_effects_allowed=False,
        disabled_reason=None,
    )

    raw_dict = {
        "version": "PRODUCTION_EXECUTION_POLICY_V2",
        "supersedes_version": "PRODUCTION_EXECUTION_POLICY_V1",
        "global_execution_enabled": False,
        "max_global_concurrency": 1,
        "global_tool_policy": "DENY",
        "allowed_action_types": ["TASK_DISPATCH"],
        "profiles": {k: v.model_dump() for k, v in profiles.items()},
        "tool_security_policy_version": "TOOL_SECURITY_POLICY_V1",
        "tool_security_policy_hash": "9bdd1d54102280e49f1d23a13be404c44bb0f22e2c3f100b8d6aed61e3ec033d",
        "allowed_tools": ["runtime_status", "document_inspection"],
        "max_tool_invocations_per_execution": 1,
        "created_at": now_str,
        "description": "Canonical Production Execution Policy V2 — Limited SAFE_NO_TOOLS + SAFE_READ_ONLY",
    }
    phash = compute_policy_hash(raw_dict)
    raw_dict["policy_hash"] = phash
    return ProductionExecutionPolicy(**raw_dict)


def diff_policies(old: ProductionExecutionPolicy, new: ProductionExecutionPolicy) -> Dict[str, Any]:
    """Compute exact semantic difference between two execution policies."""
    diff: Dict[str, Any] = {
        "old_version": old.version,
        "new_version": new.version,
        "old_hash": old.policy_hash,
        "new_hash": new.policy_hash,
        "supersedes": getattr(new, "supersedes_version", None),
        "changes": [],
    }
    if getattr(old, "allowed_tools", []) != getattr(new, "allowed_tools", []):
        diff["changes"].append({
            "field": "allowed_tools",
            "old": getattr(old, "allowed_tools", []),
            "new": getattr(new, "allowed_tools", []),
        })
    if getattr(old, "max_tool_invocations_per_execution", 0) != getattr(new, "max_tool_invocations_per_execution", 0):
        diff["changes"].append({
            "field": "max_tool_invocations_per_execution",
            "old": getattr(old, "max_tool_invocations_per_execution", 0),
            "new": getattr(new, "max_tool_invocations_per_execution", 0),
        })
    if getattr(old, "tool_security_policy_version", None) != getattr(new, "tool_security_policy_version", None):
        diff["changes"].append({
            "field": "tool_security_policy_version",
            "old": getattr(old, "tool_security_policy_version", None),
            "new": getattr(new, "tool_security_policy_version", None),
        })
    if getattr(old, "tool_security_policy_hash", None) != getattr(new, "tool_security_policy_hash", None):
        diff["changes"].append({
            "field": "tool_security_policy_hash",
            "old": getattr(old, "tool_security_policy_hash", None),
            "new": getattr(new, "tool_security_policy_hash", None),
        })
    for pid in ALL_CANONICAL_PROFILES:
        old_prof = old.profiles.get(pid)
        new_prof = new.profiles.get(pid)
        if old_prof and new_prof:
            if old_prof.allowed_execution_modes != new_prof.allowed_execution_modes:
                diff["changes"].append({
                    "field": f"profiles.{pid}.allowed_execution_modes",
                    "old": old_prof.allowed_execution_modes,
                    "new": new_prof.allowed_execution_modes,
                })
            if old_prof.allowed_task_classes != new_prof.allowed_task_classes:
                diff["changes"].append({
                    "field": f"profiles.{pid}.allowed_task_classes",
                    "old": old_prof.allowed_task_classes,
                    "new": new_prof.allowed_task_classes,
                })
    return diff

