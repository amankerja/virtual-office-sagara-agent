from datetime import datetime, timezone
from typing import Any, Optional
from app.repositories.protocols import TaskRepository
from app.schemas.action_intents import PreflightResultDto, ActionRisk, PreflightStatus
from app.services.risk_evaluator import ActionRiskEvaluator
from app.services.approval_policy import ApprovalPolicyEngine


class ActionPreflightService:
    """
    Read-only preflight evaluation service.
    Verifies target existence, revision concurrency, capability health,
    and runtime presence without creating any external side effects.
    """

    def __init__(
        self,
        profile_catalog: Any,
        skill_catalog: Any,
        agent_service: Any,
        task_repo: TaskRepository,
    ) -> None:
        self._profile_catalog = profile_catalog
        self._skill_catalog = skill_catalog
        self._agent_service = agent_service
        self._task_repo = task_repo

    async def evaluate_preflight(
        self,
        action_type: str,
        target_type: str,
        target_id: str,
        payload: dict[str, Any],
        resource_revision: Optional[int] = None,
        is_dry_run: bool = False,
    ) -> PreflightResultDto:
        now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        risk: ActionRisk = ActionRiskEvaluator.evaluate_risk(action_type, target_type, payload)
        policy = ApprovalPolicyEngine.evaluate_policy(action_type, risk)

        requirements: list[str] = []
        warnings: list[str] = []
        blocking_reasons: list[str] = []
        observed_revisions: dict[str, int] = {}
        runtime_evidence: dict[str, Any] = {
            "dry_run": is_dry_run,
            "evaluated_at": now_str,
            "target_type": target_type,
            "target_id": target_id,
        }

        # 1. Action Type Safety Check (Allow-list)
        allowed_actions = {
            "TASK_DISPATCH",
            "TASK_CANCEL",
            "PROFILE_CHANGE_APPLY",
            "SKILL_ASSIGNMENT_CHANGE",
            "SCHEDULE_CREATE",
            "SCHEDULE_UPDATE",
            "SCHEDULE_PAUSE",
            "SCHEDULE_CANCEL",
            "SAFETY_GATE_SELF_TEST",
        }
        if action_type not in allowed_actions:
            blocking_reasons.append(f"Action type '{action_type}' is not allowed or supported by safety gate.")

        # 2. Target Profile Verification
        target_profile_id = payload.get("profile_id") or (target_id if target_type == "PROFILE" else None)
        if target_profile_id:
            try:
                profile = await self._profile_catalog.get_profile(target_profile_id)
                if not profile:
                    blocking_reasons.append(f"Target profile '{target_profile_id}' does not exist in Sagara catalog.")
                else:
                    requirements.append(f"Profile '{target_profile_id}' exists")
                    if hasattr(profile, "status") and profile.status == "DISABLED":
                        blocking_reasons.append(f"Target profile '{target_profile_id}' is disabled.")
                    observed_revisions["profile"] = getattr(profile, "revision", 1)
            except Exception as e:
                blocking_reasons.append(f"Failed to query target profile '{target_profile_id}': {str(e)}")

        # 3. Task Verification for TASK_DISPATCH / TASK_CANCEL
        if action_type in ("TASK_DISPATCH", "TASK_CANCEL") or target_type == "TASK":
            task_id = target_id if target_type == "TASK" else payload.get("task_id")
            if not task_id:
                blocking_reasons.append("Task ID is missing from intent target/payload.")
            else:
                task = await self._task_repo.get_task(task_id)
                if not task:
                    blocking_reasons.append(f"Target task '{task_id}' was not found in task repository.")
                else:
                    observed_revisions["task"] = task.revision or 1
                    # Optimistic concurrency check
                    if resource_revision is not None and resource_revision != task.revision:
                        blocking_reasons.append(
                            f"Task revision conflict: expected revision {resource_revision}, but current is {task.revision}."
                        )

                    if action_type == "TASK_DISPATCH":
                        if task.state != "READY":
                            blocking_reasons.append(
                                f"Task '{task_id}' cannot be dispatched in state '{task.state}'. Must be READY."
                            )
                        else:
                            requirements.append("Task is in READY state")

        # 4. Capability / Skill Health Verification
        required_skills = payload.get("required_skills", [])
        for skill_id in required_skills:
            try:
                skill = await self._skill_catalog.get_skill(skill_id)
                if not skill:
                    blocking_reasons.append(f"Required skill '{skill_id}' is not registered in catalog.")
                else:
                    # Capability verification: registered != installed; installed != healthy (Section 36 & 37)
                    registration = getattr(skill, "registration", None)
                    installation = getattr(skill, "installation", None)
                    health = getattr(skill, "health", None)
                    status = getattr(skill, "status", None)

                    if registration and registration != "REGISTERED":
                        blocking_reasons.append(f"Skill '{skill_id}' is not registered ({registration}).")
                    elif installation == "UNKNOWN" or health == "UNKNOWN" or status == "UNKNOWN":
                        blocking_reasons.append(
                            f"Skill '{skill_id}' installation/health is UNKNOWN. Capability not proven."
                        )
                    elif installation and installation != "INSTALLED":
                        blocking_reasons.append(f"Skill '{skill_id}' is not installed ({installation}).")
                    elif health and health not in ("HEALTHY", "DEGRADED"):
                        blocking_reasons.append(f"Skill '{skill_id}' health is failing ({health}).")
                    else:
                        requirements.append(f"Skill '{skill_id}' verified and healthy")
            except Exception as e:
                blocking_reasons.append(f"Failed to verify skill '{skill_id}': {str(e)}")

        # 5. Runtime Target Presence & Evidence (Section 4 & 35)
        # Live limitation: 69 sessions unresolved, 0 profile-mapped sessions.
        # For execution-sensitive operations (TASK_DISPATCH), UNKNOWN runtime MUST block preflight.
        if action_type == "TASK_DISPATCH":
            agent_id = payload.get("agent_id") or target_profile_id
            if agent_id:
                try:
                    agent = await self._agent_service.get_agent(agent_id)
                    runtime_state = agent.runtime.state if agent and agent.runtime else "UNKNOWN"
                    runtime_evidence["agent_runtime_state"] = runtime_state
                    runtime_evidence["runtime_confidence"] = getattr(agent.runtime, "confidence", "UNKNOWN")

                    # Section 35: UNKNOWN runtime -> PREFLIGHT_BLOCKED. Do NOT reinterpret as IDLE!
                    if runtime_state == "UNKNOWN":
                        blocking_reasons.append(
                            f"Agent '{agent_id}' runtime target is UNKNOWN. Runtime target resolution unproven."
                        )
                    elif runtime_state in ("FAILED", "TERMINATED", "ERROR"):
                        blocking_reasons.append(
                            f"Agent '{agent_id}' runtime is in error/terminated state '{runtime_state}'."
                        )
                    else:
                        requirements.append(f"Agent runtime verified: {runtime_state}")
                except Exception:
                    blocking_reasons.append(f"Agent '{agent_id}' runtime resolution failed.")
            else:
                warnings.append("No agent target specified for runtime verification.")

        # 6. Structured Typed Action Plan (Section 109 & 110: NO shell commands)
        action_plan = {
            "action_type": action_type,
            "target_type": target_type,
            "target_id": target_id,
            "required_capabilities": required_skills,
            "expected_revisions": observed_revisions,
            "policy_approval_required": policy.requires_approval,
            "policy_confirmation_phrase": policy.confirmation_phrase,
        }

        # 7. Final Result Determination
        if blocking_reasons:
            final_status: PreflightStatus = "BLOCKED"
        elif policy.requires_approval:
            final_status = "REQUIRES_APPROVAL"
        else:
            final_status = "PASS"

        return PreflightResultDto(
            checked_at=now_str,
            result=final_status,
            risk=risk,
            requirements=requirements,
            warnings=warnings,
            blocking_reasons=blocking_reasons,
            observed_revisions=observed_revisions,
            runtime_evidence=runtime_evidence,
            action_plan=action_plan,
        )
