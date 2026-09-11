from datetime import datetime, timezone
from typing import Optional
from app.api.errors import ConflictError, ResourceNotFoundError
from app.repositories.memory.fixtures import APPROVALS_FIXTURE
from app.schemas.approvals import (
    ApprovalDecisionAuditDto,
    ApprovalDecisionInputDto,
    ApprovalDecisionRecordDto,
    ApprovalDto,
)


class InMemoryApprovalRepository:
    def __init__(self) -> None:
        self._approvals: list[ApprovalDto] = [a.model_copy(deep=True) for a in APPROVALS_FIXTURE]

    async def list_approvals(
        self,
        state: Optional[str] = None,
        risk: Optional[str] = None,
        action_type: Optional[str] = None,
    ) -> list[ApprovalDto]:
        results = self._approvals
        if state and state != "ALL":
            results = [a for a in results if a.state == state]
        if risk and risk != "ALL":
            results = [a for a in results if a.risk == risk]
        if action_type and action_type != "ALL":
            results = [a for a in results if a.action_type == action_type]
        return [a.model_copy(deep=True) for a in results]

    async def get_approval(self, approval_id: str) -> Optional[ApprovalDto]:
        for a in self._approvals:
            if a.id == approval_id:
                return a.model_copy(deep=True)
        return None

    async def approve_action(
        self,
        approval_id: str,
        input_dto: Optional[ApprovalDecisionInputDto] = None,
        expected_revision: Optional[int] = None,
    ) -> ApprovalDto:
        target = None
        for a in self._approvals:
            if a.id == approval_id:
                target = a
                break

        if not target:
            raise ResourceNotFoundError(f"Approval gate with ID '{approval_id}' not found.")

        # Concurrency revision check
        if expected_revision is not None and target.revision is not None:
            if expected_revision != target.revision:
                raise ConflictError(
                    code="RESOURCE_CONFLICT",
                    message=f"Conflict deciding approval: expected revision {expected_revision}, current revision is {target.revision}.",
                    details={"current_revision": target.revision, "expected_revision": expected_revision},
                )

        if target.state in ["APPROVED", "REJECTED"]:
            raise ConflictError(
                code="APPROVAL_ALREADY_RESOLVED",
                message=f"Approval {approval_id} has already been decided as '{target.state}'.",
            )

        if target.state == "EXPIRED":
            raise ConflictError(
                code="APPROVAL_EXPIRED",
                message=f"Approval {approval_id} has expired and can no longer be approved.",
            )

        if target.state == "CANCELLED":
            raise ConflictError(
                code="APPROVAL_CANCELLED",
                message=f"Approval {approval_id} was cancelled.",
            )

        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        reason = (input_dto.reason if input_dto and input_dto.reason else "Authorized by operator")

        target.state = "APPROVED"
        target.decision = ApprovalDecisionRecordDto(
            decided_at=now,
            decision_maker="Operator (Lead)",
            reason=reason,
        )
        if target.audit is None:
            target.audit = []

        target.audit.append(
            ApprovalDecisionAuditDto(
                stage="Approved",
                timestamp=now,
                actor="Operator (Lead)",
                note=reason,
            )
        )
        target.revision = (target.revision or 1) + 1
        target.version = target.revision

        return target.model_copy(deep=True)

    async def reject_action(
        self,
        approval_id: str,
        input_dto: ApprovalDecisionInputDto,
        expected_revision: Optional[int] = None,
    ) -> ApprovalDto:
        target = None
        for a in self._approvals:
            if a.id == approval_id:
                target = a
                break

        if not target:
            raise ResourceNotFoundError(f"Approval gate with ID '{approval_id}' not found.")

        # Concurrency revision check
        if expected_revision is not None and target.revision is not None:
            if expected_revision != target.revision:
                raise ConflictError(
                    code="RESOURCE_CONFLICT",
                    message=f"Conflict deciding approval: expected revision {expected_revision}, current revision is {target.revision}.",
                    details={"current_revision": target.revision, "expected_revision": expected_revision},
                )

        if target.state in ["APPROVED", "REJECTED"]:
            raise ConflictError(
                code="APPROVAL_ALREADY_RESOLVED",
                message=f"Approval {approval_id} has already been decided as '{target.state}'.",
            )

        if target.state == "EXPIRED":
            raise ConflictError(
                code="APPROVAL_EXPIRED",
                message=f"Approval {approval_id} has expired.",
            )

        if target.state == "CANCELLED":
            raise ConflictError(
                code="APPROVAL_CANCELLED",
                message=f"Approval {approval_id} was cancelled.",
            )

        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        reason = (input_dto.reason if input_dto and input_dto.reason else "Denied by operator")

        target.state = "REJECTED"
        target.decision = ApprovalDecisionRecordDto(
            decided_at=now,
            decision_maker="Operator (Lead)",
            reason=reason,
        )
        if target.audit is None:
            target.audit = []

        target.audit.append(
            ApprovalDecisionAuditDto(
                stage="Rejected",
                timestamp=now,
                actor="Operator (Lead)",
                note=reason,
            )
        )
        target.revision = (target.revision or 1) + 1
        target.version = target.revision

        return target.model_copy(deep=True)
