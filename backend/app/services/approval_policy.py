from typing import Optional
from pydantic import BaseModel
from app.config import settings
from app.schemas.action_intents import ActionRisk


class ApprovalPolicyDecision(BaseModel):
    requires_approval: bool
    min_approvers: int
    confirmation_phrase: Optional[str] = None
    ttl_seconds: int
    allow_self_approval: bool


class ApprovalPolicyEngine:
    """Calculates approval requirements, confirmation phrases, and expiration TTLs."""

    @staticmethod
    def evaluate_policy(action_type: str, risk: ActionRisk) -> ApprovalPolicyDecision:
        if risk == "LOW":
            return ApprovalPolicyDecision(
                requires_approval=False,
                min_approvers=0,
                confirmation_phrase=None,
                ttl_seconds=settings.action_intent_default_ttl_seconds,
                allow_self_approval=True,
            )

        if risk == "MEDIUM":
            return ApprovalPolicyDecision(
                requires_approval=True,
                min_approvers=1,
                confirmation_phrase=None,
                ttl_seconds=settings.action_intent_default_ttl_seconds,
                allow_self_approval=True,
            )

        if risk == "HIGH":
            friendly_action = action_type.replace("_", " ")
            return ApprovalPolicyDecision(
                requires_approval=True,
                min_approvers=1,
                confirmation_phrase=f"APPROVE {friendly_action}",
                ttl_seconds=settings.action_intent_high_risk_ttl_seconds,
                allow_self_approval=False,  # Section 42: Requester cannot self-approve HIGH
            )

        # CRITICAL
        friendly_action = action_type.replace("_", " ")
        return ApprovalPolicyDecision(
            requires_approval=True,
            min_approvers=2,
            confirmation_phrase=f"APPROVE CRITICAL {friendly_action}",
            ttl_seconds=settings.action_intent_critical_risk_ttl_seconds,
            allow_self_approval=False,  # Section 42: Requester cannot self-approve CRITICAL
        )
