from datetime import datetime, timezone
from typing import Optional
from app.api.errors import ResourceNotFoundError
from app.repositories.protocols import ActivityRepository, ApprovalRepository, AuditRepository
from app.schemas.activity import ActivityDto
from app.schemas.approvals import ApprovalDecisionInputDto, ApprovalDto
from app.schemas.audit import AuditRecordDto
from app.schemas.common import EntityReference, RelatedEntities


class ApprovalService:
    def __init__(
        self,
        approval_repo: ApprovalRepository,
        audit_repo: AuditRepository,
        activity_repo: ActivityRepository,
    ) -> None:
        self._approval_repo = approval_repo
        self._audit_repo = audit_repo
        self._activity_repo = activity_repo

    async def list_approvals(
        self,
        state: Optional[str] = None,
        risk: Optional[str] = None,
        action_type: Optional[str] = None,
    ) -> list[ApprovalDto]:
        return await self._approval_repo.list_approvals(state=state, risk=risk, action_type=action_type)

    async def get_approval(self, approval_id: str) -> ApprovalDto:
        approval = await self._approval_repo.get_approval(approval_id)
        if not approval:
            raise ResourceNotFoundError(f"Approval gate with ID '{approval_id}' was not found.")
        return approval

    async def approve_action(
        self,
        approval_id: str,
        input_dto: Optional[ApprovalDecisionInputDto] = None,
        expected_revision: Optional[int] = None,
        correlation_id: Optional[str] = None,
    ) -> ApprovalDto:
        approval = await self._approval_repo.approve_action(
            approval_id=approval_id,
            input_dto=input_dto,
            expected_revision=expected_revision,
        )
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # Emit audit record
        await self._audit_repo.record_audit(
            AuditRecordDto(
                id=f"aud-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                timestamp=now,
                actor=EntityReference(type="USER", id="operator-lead", label="Operator (Lead)"),
                action="APPROVAL_APPROVED",
                target=EntityReference(type="APPROVAL", id=approval.id, label=approval.title),
                outcome="SUCCESS",
                reason=input_dto.reason if input_dto and input_dto.reason else "Authorized by operator",
                correlation_id=correlation_id,
                related=RelatedEntities(approval_id=approval.id, task_id=approval.task_id, agent_id=approval.agent_id),
            )
        )

        # Emit activity event
        await self._activity_repo.add_activity(
            ActivityDto(
                id=f"act-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                timestamp=now,
                category="APPROVAL",
                severity="INFO",
                title=f"Approval Granted: {approval.title}",
                description=f"Action authorized: {input_dto.reason if input_dto and input_dto.reason else 'Approved'}",
                actor=EntityReference(type="USER", id="operator-lead", label="Operator (Lead)"),
                entity=EntityReference(type="APPROVAL", id=approval.id, label=approval.title),
                correlation_id=correlation_id,
                related=RelatedEntities(approval_id=approval.id, task_id=approval.task_id, agent_id=approval.agent_id),
            )
        )

        return approval

    async def reject_action(
        self,
        approval_id: str,
        input_dto: ApprovalDecisionInputDto,
        expected_revision: Optional[int] = None,
        correlation_id: Optional[str] = None,
    ) -> ApprovalDto:
        approval = await self._approval_repo.reject_action(
            approval_id=approval_id,
            input_dto=input_dto,
            expected_revision=expected_revision,
        )
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # Emit audit record
        await self._audit_repo.record_audit(
            AuditRecordDto(
                id=f"aud-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                timestamp=now,
                actor=EntityReference(type="USER", id="operator-lead", label="Operator (Lead)"),
                action="APPROVAL_REJECTED",
                target=EntityReference(type="APPROVAL", id=approval.id, label=approval.title),
                outcome="DENIED",
                reason=input_dto.reason or "Action denied by operator",
                correlation_id=correlation_id,
                related=RelatedEntities(approval_id=approval.id, task_id=approval.task_id, agent_id=approval.agent_id),
            )
        )

        # Emit activity event
        await self._activity_repo.add_activity(
            ActivityDto(
                id=f"act-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                timestamp=now,
                category="APPROVAL",
                severity="WARNING",
                title=f"Approval Denied: {approval.title}",
                description=f"Action rejected: {input_dto.reason or 'Denied'}",
                actor=EntityReference(type="USER", id="operator-lead", label="Operator (Lead)"),
                entity=EntityReference(type="APPROVAL", id=approval.id, label=approval.title),
                correlation_id=correlation_id,
                related=RelatedEntities(approval_id=approval.id, task_id=approval.task_id, agent_id=approval.agent_id),
            )
        )

        return approval
