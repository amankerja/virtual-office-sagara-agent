from typing import Optional
from app.api.errors import AppError
from app.domain.principal import OperatorPrincipal


class AuthorizationService:
    """Production authorization enforcement service."""

    def authorize_action_request(
        self,
        principal: OperatorPrincipal,
        action_type: str,
        target_id: str,
    ) -> None:
        """Verify principal has permission to create an ActionIntent."""
        if not (principal.has_role("operator") or principal.has_permission("action:request")):
            raise AppError(
                status_code=403,
                code="AUTHORIZATION_DENIED",
                message=f"Principal '{principal.id}' is not authorized to request action '{action_type}'.",
                details={"principal_id": principal.id, "action_type": action_type, "target_id": target_id},
            )

    def authorize_action_approval(
        self,
        principal: OperatorPrincipal,
        intent_requested_by: str,
        risk: str,
        action_type: str,
    ) -> None:
        """Verify principal has approval authority and enforce strict self-approval safety."""
        if not (principal.has_role("approver") or principal.has_permission("action:approve")):
            raise AppError(
                status_code=403,
                code="AUTHORIZATION_DENIED",
                message=f"Principal '{principal.id}' lacks approval privileges for action '{action_type}'.",
                details={"principal_id": principal.id, "action_type": action_type},
            )

        # Enforce Self-Approval Policy (Section 42)
        # For HIGH and CRITICAL risks, the requester CANNOT be the sole approver.
        if risk in ("HIGH", "CRITICAL") and principal.id == intent_requested_by:
            raise AppError(
                status_code=403,
                code="APPROVAL_SELF_APPROVAL_FORBIDDEN",
                message=f"Self-approval is strictly forbidden for {risk} risk actions. Requester '{principal.id}' cannot approve own intent.",
                details={"principal_id": principal.id, "intent_requested_by": intent_requested_by, "risk": risk},
            )

    def authorize_action_cancel(
        self,
        principal: OperatorPrincipal,
        intent_requested_by: str,
    ) -> None:
        """Verify principal can cancel an intent (requester or admin)."""
        if principal.id != intent_requested_by and not principal.has_role("admin"):
            raise AppError(
                status_code=403,
                code="AUTHORIZATION_DENIED",
                message=f"Principal '{principal.id}' cannot cancel action requested by '{intent_requested_by}'.",
            )

    def authorize_action_execution(
        self,
        principal: OperatorPrincipal,
        action_type: str,
        target_id: str,
    ) -> None:
        """Verify principal has permission to execute an approved action (Prompt 14 Section 9)."""
        if not (
            principal.has_role("admin")
            or principal.has_role("operator")
            or principal.has_permission("action:execute")
        ):
            raise AppError(
                status_code=403,
                code="EXECUTION_AUTHORIZATION_DENIED",
                message=f"Principal '{principal.id}' is not authorized to execute action '{action_type}'.",
                details={"principal_id": principal.id, "action_type": action_type, "target_id": target_id},
            )
