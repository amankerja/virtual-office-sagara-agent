"""
Production Execution Policy Service (Prompt 14.6 Section 6-27, 51-66, 86-90).
Central source of truth for execution policy evaluation, validation, and audited lifecycle changesets.
"""

import json
import secrets
import sqlite3
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional, Tuple

from app.api.errors import AppError, ConflictError
from app.domain.execution_policy import (
    ProductionExecutionPolicy,
    ProfileExecutionRule,
    compute_policy_hash,
    create_canonical_v1_policy,
)
from app.repositories.sqlite.audit_repo import append_audit_entry_to_conn


class ExecutionPolicyService:
    """
    Evaluates, persists, and audits production execution policy.
    Invariants:
    - Never scattered 'if profile == ...' checks across codebase
    - Immutable policy hash binding for approved action intents
    - Strict fail-closed defaults for unknown task classes or unallowed profiles
    - Zero execution arming during policy application
    """

    @classmethod
    def get_active_policy(cls, conn: sqlite3.Connection) -> ProductionExecutionPolicy:
        """
        Fetch the active production execution policy from database.
        Falls back to canonical V1 policy if table exists but empty.
        Raises AppError (500) if policy record is corrupted.
        """
        cursor = conn.cursor()
        try:
            cursor.execute(
                """
                SELECT definition_json, policy_hash, version FROM execution_policies
                WHERE status = 'ACTIVE'
                ORDER BY created_at DESC LIMIT 1;
                """
            )
            row = cursor.fetchone()
            if not row:
                # Fallback to canonical V1
                return create_canonical_v1_policy()

            raw_json = row["definition_json"] if isinstance(row, sqlite3.Row) else row[0]
            policy_dict = json.loads(raw_json)
            computed_hash = compute_policy_hash(policy_dict)
            stored_hash = row["policy_hash"] if isinstance(row, sqlite3.Row) else row[1]
            if computed_hash != stored_hash:
                raise AppError(
                    status_code=500,
                    code="CORRUPT_EXECUTION_POLICY",
                    message="Active production execution policy hash does not match computed definition hash. Fail closed.",
                )
            policy_dict["policy_hash"] = stored_hash
            return ProductionExecutionPolicy(**policy_dict)
        except sqlite3.OperationalError:
            # Table might not exist in tests without migration
            return create_canonical_v1_policy()
        except AppError:
            raise
        except Exception as e:
            raise AppError(
                status_code=500,
                code="EXECUTION_POLICY_UNAVAILABLE",
                message=f"Failed to load production execution policy: {e}. Fail closed.",
            )

    @classmethod
    def validate_intent_against_policy(
        cls,
        policy: ProductionExecutionPolicy,
        action_type: str,
        target_profile_id: str,
        payload: dict,
        risk: str,
        safe_mode: bool = True,
        tool_policy: Optional[Any] = None,
    ) -> List[str]:
        """
        Evaluate an ActionIntent against the production execution policy.
        Returns a list of blocking reason strings (empty if passed).
        Prompt 14.6 Section 10-46 & Prompt 14.9A.7 Section 4-14, 40-44.
        """
        blocking_reasons: List[str] = []

        # 1. Action Type Allowlist (Section 10)
        if action_type not in policy.allowed_action_types:
            blocking_reasons.append(
                f"Action type '{action_type}' is not allowed for production execution under {policy.version}. "
                f"Only {policy.allowed_action_types} are enabled (ACTION_TYPE_DISABLED)."
            )

        # 2. Profile Rule Lookup (Section 11-22)
        rule: Optional[ProfileExecutionRule] = policy.profiles.get(target_profile_id)
        if not rule:
            blocking_reasons.append(
                f"Profile '{target_profile_id}' is not defined in {policy.version}. Fail closed."
            )
            return blocking_reasons

        if rule.status == "DISABLED":
            reason_suffix = f": {rule.disabled_reason}" if rule.disabled_reason else ""
            blocking_reasons.append(
                f"Production execution for profile '{target_profile_id}' is DISABLED in {policy.version}{reason_suffix} (PROFILE_PRODUCTION_DISABLED)."
            )
            return blocking_reasons

        # 3. Action Type allowed for Profile
        if action_type not in rule.allowed_action_types:
            blocking_reasons.append(
                f"Action type '{action_type}' is not permitted for profile '{target_profile_id}' (PROFILE_ACTION_DISABLED)."
            )

        # 4. Risk Tier Evaluation (Section 34-37)
        if risk == "CRITICAL":
            blocking_reasons.append(
                f"CRITICAL risk actions are strictly disabled in {policy.version} (RISK_TIER_DISABLED)."
            )
        elif risk not in rule.allowed_risk_tiers:
            blocking_reasons.append(
                f"Risk tier '{risk}' is not permitted for profile '{target_profile_id}'. "
                f"Allowed tiers: {rule.allowed_risk_tiers} (RISK_TIER_DISABLED)."
            )

        # 5. Execution Mode & Task Class Matrix Evaluation (Prompt 14.9A.7 Section 5, 7, 8)
        task_class = payload.get("task_class", "UNKNOWN")
        raw_mode = payload.get("execution_mode")

        # Explicit denial of unapproved / dangerous modes (Section 5)
        if raw_mode in ("APPROVED_TOOLS", "SIDE_EFFECTING", "UNRESTRICTED", "UNKNOWN"):
            blocking_reasons.append(
                f"Execution mode '{raw_mode}' is explicitly denied in {policy.version} (EXECUTION_MODE_DISABLED)."
            )

        if raw_mode:
            execution_mode = raw_mode
        elif task_class == "READ_ONLY_INSPECTION":
            execution_mode = "SAFE_READ_ONLY"
        else:
            execution_mode = "SAFE_NO_TOOLS"

        # Check execution mode against profile rule
        if execution_mode not in rule.allowed_execution_modes:
            blocking_reasons.append(
                f"Execution mode '{execution_mode}' is not permitted for profile '{target_profile_id}'. "
                f"Allowed modes: {rule.allowed_execution_modes} (EXECUTION_MODE_DISABLED)."
            )
            return blocking_reasons

        # Check task class against profile rule
        if task_class not in rule.allowed_task_classes:
            blocking_reasons.append(
                f"Task class '{task_class}' is not permitted for profile '{target_profile_id}'. "
                f"Allowed task classes: {rule.allowed_task_classes} (TASK_CLASS_DISABLED)."
            )
            return blocking_reasons

        # Strict Mode / Task-Class Matrix (Section 8)
        if execution_mode == "SAFE_NO_TOOLS":
            if task_class not in ("REASONING_ONLY", "DRAFT_GENERATION"):
                blocking_reasons.append(
                    f"Task class '{task_class}' is not permitted under SAFE_NO_TOOLS mode. "
                    f"Only 'REASONING_ONLY' and 'DRAFT_GENERATION' are allowed (TASK_CLASS_DISABLED)."
                )
            if payload.get("tool_id") or payload.get("tools") or payload.get("tools_enabled") is True or payload.get("safe_mode") is False:
                blocking_reasons.append(
                    f"Profile '{target_profile_id}' requires SAFE_NO_TOOLS mode. Client requested tools/disabled safe mode (TOOLS_NOT_ALLOWED)."
                )

        elif execution_mode == "SAFE_READ_ONLY":
            if task_class != "READ_ONLY_INSPECTION":
                blocking_reasons.append(
                    f"Task class '{task_class}' is not permitted under SAFE_READ_ONLY mode. "
                    f"Only 'READ_ONLY_INSPECTION' is allowed (TASK_CLASS_DISABLED)."
                )

            # Tool Security Policy binding checks (Section 9)
            expected_tp_version = getattr(policy, "tool_security_policy_version", None) or "TOOL_SECURITY_POLICY_V1"
            expected_tp_hash = getattr(policy, "tool_security_policy_hash", None) or "9bdd1d54102280e49f1d23a13be404c44bb0f22e2c3f100b8d6aed61e3ec033d"

            intent_tp_version = payload.get("tool_security_policy_version")
            if intent_tp_version and intent_tp_version != expected_tp_version:
                blocking_reasons.append(
                    f"Tool security policy version mismatch: recorded '{intent_tp_version}' != required '{expected_tp_version}' (TOOL_POLICY_MISMATCH)."
                )

            intent_tp_hash = payload.get("tool_security_policy_hash")
            if intent_tp_hash and intent_tp_hash != expected_tp_hash:
                blocking_reasons.append(
                    f"Tool security policy hash mismatch: recorded '{intent_tp_hash}' != required '{expected_tp_hash}' (TOOL_POLICY_STALE)."
                )

            if tool_policy is not None:
                tp_hash = getattr(tool_policy, "policy_hash", None)
                if tp_hash and tp_hash != expected_tp_hash:
                    blocking_reasons.append(
                        f"Active tool security policy hash mismatch: active '{tp_hash}' != required '{expected_tp_hash}' (TOOL_POLICY_STALE)."
                    )

            # Tool allowance under policy (Section 10, 11, 14)
            tool_id = payload.get("tool_id")
            if not tool_id:
                blocking_reasons.append("SAFE_READ_ONLY mode requires 'tool_id' in payload (TOOL_REQUIRED).")
            else:
                allowed_tools = getattr(policy, "allowed_tools", None) or ["runtime_status", "document_inspection"]
                if tool_id not in allowed_tools:
                    blocking_reasons.append(
                        f"Tool '{tool_id}' is not authorized under {policy.version}. Allowed tools: {allowed_tools} (UNAUTHORIZED_TOOL)."
                    )

            # Single-tool budget per execution (Section 40, 41)
            tools_list = payload.get("tools") or ([tool_id] if tool_id else [])
            max_tools = getattr(policy, "max_tool_invocations_per_execution", 1)
            if len(tools_list) > max_tools:
                blocking_reasons.append(
                    f"Multi-tool execution requested ({len(tools_list)} tools). Maximum allowed per execution is {max_tools} (TOOL_INVOCATION_BUDGET_EXCEEDED)."
                )

            # Deny prohibited channels (Section 26, 27, 28)
            if payload.get("network_enabled") is True:
                blocking_reasons.append("Network access is strictly denied in SAFE_READ_ONLY (NETWORK_DENIED).")
            if payload.get("mcp_enabled") is True:
                blocking_reasons.append("MCP access is strictly denied in SAFE_READ_ONLY (MCP_DENIED).")
            if payload.get("shell_enabled") is True or payload.get("generic_shell_requested") is True:
                blocking_reasons.append("Generic shell access is strictly denied in SAFE_READ_ONLY (TOOL_NOT_ALLOWED).")

        else:
            blocking_reasons.append(
                f"Execution mode '{execution_mode}' is not recognized or permitted (EXECUTION_MODE_DISABLED)."
            )

        # 6. Side Effect Policy (Section 27, 62)
        if not rule.external_side_effects_allowed:
            if payload.get("side_effects_requested") is True:
                blocking_reasons.append(
                    f"Profile '{target_profile_id}' denies external side effects (SIDE_EFFECTS_DISABLED)."
                )

        return blocking_reasons

    @classmethod
    def check_concurrency_and_rate_limits(
        cls,
        conn: sqlite3.Connection,
        policy: ProductionExecutionPolicy,
        profile_id: str,
    ) -> List[str]:
        """
        Verify that active concurrency and hourly rate limits are not exceeded (Prompt 14.6 Section 51-55).
        """
        blocking_reasons: List[str] = []
        rule = policy.profiles.get(profile_id)
        if not rule:
            blocking_reasons.append(f"Profile '{profile_id}' not found in policy.")
            return blocking_reasons

        cursor = conn.cursor()

        # 1. Global Concurrency Check (within active execution timeout window)
        active_cutoff = (datetime.now(timezone.utc) - timedelta(seconds=600)).isoformat().replace("+00:00", "Z")
        cursor.execute(
            """
            SELECT COUNT(*) AS active_cnt FROM execution_attempts
            WHERE state IN ('CLAIMED', 'SUBMITTING') AND created_at >= ?;
            """,
            (active_cutoff,),
        )
        row = cursor.fetchone()
        global_active = (row["active_cnt"] if isinstance(row, sqlite3.Row) else row[0]) if row else 0
        if global_active >= policy.max_global_concurrency:
            blocking_reasons.append(
                f"Global execution concurrency limit ({policy.max_global_concurrency}) reached. "
                f"Active executions: {global_active} (CONCURRENCY_LIMIT)."
            )

        # 2. Profile Concurrency Check (within active execution timeout window)
        cursor.execute(
            """
            SELECT COUNT(*) AS prof_active_cnt FROM execution_attempts
            WHERE profile_id = ? AND state IN ('CLAIMED', 'SUBMITTING') AND created_at >= ?;
            """,
            (profile_id, active_cutoff),
        )
        row = cursor.fetchone()
        prof_active = (row["prof_active_cnt"] if isinstance(row, sqlite3.Row) else row[0]) if row else 0
        if prof_active >= rule.max_concurrency:
            blocking_reasons.append(
                f"Profile '{profile_id}' concurrency limit ({rule.max_concurrency}) reached. "
                f"Active executions for profile: {prof_active} (CONCURRENCY_LIMIT)."
            )

        # 3. Profile Hourly Rate Limit Check
        one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat().replace("+00:00", "Z")
        cursor.execute(
            """
            SELECT COUNT(*) AS hr_cnt FROM execution_attempts
            WHERE profile_id = ? AND state IN ('ACKNOWLEDGED', 'RECONCILED') AND created_at >= ?;
            """,
            (profile_id, one_hour_ago),
        )
        row = cursor.fetchone()
        hr_count = (row["hr_cnt"] if isinstance(row, sqlite3.Row) else row[0]) if row else 0
        if rule.max_executions_per_hour > 0 and hr_count >= rule.max_executions_per_hour:
            blocking_reasons.append(
                f"Profile '{profile_id}' execution rate limit exceeded: {hr_count}/{rule.max_executions_per_hour} "
                f"successful executions in the past hour (RATE_LIMIT_EXCEEDED)."
            )

        return blocking_reasons

    @classmethod
    def apply_policy(
        cls,
        conn: sqlite3.Connection,
        policy: ProductionExecutionPolicy,
        actor_id: str,
        reason: str = "Applied production execution policy V1",
        correlation_id: Optional[str] = None,
    ) -> str:
        """
        Persist and activate an execution policy atomically, recording a tamper-evident audit event.
        Execution remains LOCKED.
        """
        now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        policy_dict = policy.model_dump()
        phash = compute_policy_hash(policy_dict)
        policy_dict["policy_hash"] = phash

        conn.execute("BEGIN IMMEDIATE;")
        try:
            # Mark previous active policies as SUPERSEDED
            conn.execute("UPDATE execution_policies SET status = 'SUPERSEDED' WHERE status = 'ACTIVE';")

            policy_id = f"pol-{secrets.token_hex(8)}"
            conn.execute(
                """
                INSERT INTO execution_policies (
                    id, version, policy_hash, status, definition_json, created_at, created_by, applied_at, applied_by
                ) VALUES (?, ?, ?, 'ACTIVE', ?, ?, ?, ?, ?);
                """,
                (
                    policy_id,
                    policy.version,
                    phash,
                    json.dumps(policy_dict),
                    now_str,
                    actor_id,
                    now_str,
                    actor_id,
                ),
            )

            # Audit record
            append_audit_entry_to_conn(
                conn=conn,
                event_id=f"aud-{secrets.token_hex(8)}",
                timestamp=now_str,
                actor_type="USER",
                actor_id=actor_id,
                actor_label=actor_id,
                action="execution_policy.applied",
                resource_type="POLICY",
                resource_id=policy_id,
                resource_label=f"Execution Policy {policy.version}",
                outcome="SUCCESS",
                reason=f"{reason} (Hash: {phash[:16]}...)",
                correlation_id=correlation_id or f"corr-pol-{secrets.token_hex(6)}",
                intent_id=None,
                payload_hash=phash,
                revision=1,
            )

            conn.execute("COMMIT;")
            return policy_id
        except Exception:
            conn.execute("ROLLBACK;")
            raise

    @classmethod
    def rollback_to_v1(
        cls,
        conn: sqlite3.Connection,
        actor_id: str,
        reason: str = "Rollback to production execution policy V1",
        correlation_id: Optional[str] = None,
    ) -> str:
        """
        Re-activate canonical V1 policy via audited atomic changeset (Prompt 14.9A.7 Section 58).
        Disables SAFE_READ_ONLY eligibility, preserves historical records and audit trail.
        Execution remains LOCKED.
        """
        v1_policy = create_canonical_v1_policy()
        return cls.apply_policy(
            conn=conn,
            policy=v1_policy,
            actor_id=actor_id,
            reason=reason,
            correlation_id=correlation_id,
        )

    @classmethod
    def revoke_tool_capability(
        cls,
        conn: sqlite3.Connection,
        tool_id: str,
        actor_id: str,
        reason: str = "Emergency tool capability revocation",
        correlation_id: Optional[str] = None,
    ) -> str:
        """
        Emergency tool revocation (Prompt 14.9A.7 Section 59, 91).
        Immediately removes tool from active policy's allowed_tools.
        Takes effect immediately without gateway restart.
        """
        active_policy = cls.get_active_policy(conn)
        new_dict = active_policy.model_dump()
        current_tools = list(new_dict.get("allowed_tools") or [])
        if tool_id in current_tools:
            current_tools = [t for t in current_tools if t != tool_id]
        new_dict["allowed_tools"] = current_tools
        new_policy = ProductionExecutionPolicy(**new_dict)
        return cls.apply_policy(
            conn=conn,
            policy=new_policy,
            actor_id=actor_id,
            reason=f"{reason}: revoked tool {tool_id}",
            correlation_id=correlation_id,
        )

