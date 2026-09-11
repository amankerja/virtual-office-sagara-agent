from typing import Any
from app.schemas.action_intents import ActionRisk


class ActionRiskEvaluator:
    """Evaluates risk classification based on action semantics and impact surface."""

    @staticmethod
    def evaluate_risk(action_type: str, target_type: str, payload: dict[str, Any]) -> ActionRisk:
        # Check payload flags for elevated destruction / blast radius
        if payload.get("is_destructive") or payload.get("system_wide") or payload.get("force"):
            return "CRITICAL"

        if action_type in ("PROFILE_CHANGE_APPLY", "SKILL_ASSIGNMENT_CHANGE"):
            return "HIGH"

        if action_type == "TASK_DISPATCH":
            # Task dispatch to an external executor is a HIGH risk operation
            return "HIGH"

        if action_type in ("SCHEDULE_CREATE", "SCHEDULE_UPDATE", "SCHEDULE_PAUSE", "SCHEDULE_CANCEL"):
            return "MEDIUM"

        if action_type == "TASK_CANCEL":
            return "MEDIUM"

        if action_type == "SAFETY_GATE_SELF_TEST":
            return "LOW"

        # Default conservative stance for any unclassified action
        return "HIGH"
