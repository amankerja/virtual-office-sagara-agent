from typing import Any, Optional, Protocol
from app.schemas.activity import ActivityDto
from app.schemas.approvals import ApprovalDecisionInputDto, ApprovalDto
from app.schemas.artifacts import ArtifactDto
from app.schemas.audit import AuditRecordDto
from app.schemas.governance import GovernanceSnapshotDto
from app.schemas.tasks import CreateTaskDto, TaskDto, UpdateTaskDto


class TaskRepository(Protocol):
    async def list_tasks(
        self,
        state: Optional[str] = None,
        priority: Optional[str] = None,
        agent_id: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> list[TaskDto]:
        ...

    async def get_task(self, task_id: str) -> Optional[TaskDto]:
        ...

    async def create_task(self, input_dto: CreateTaskDto) -> TaskDto:
        ...

    async def update_task(self, task_id: str, input_dto: UpdateTaskDto, expected_revision: Optional[int] = None) -> TaskDto:
        ...

    async def dispatch_task(self, task_id: str) -> TaskDto:
        ...

    async def cancel_task(self, task_id: str) -> TaskDto:
        ...


class ApprovalRepository(Protocol):
    async def list_approvals(
        self,
        state: Optional[str] = None,
        risk: Optional[str] = None,
        action_type: Optional[str] = None,
    ) -> list[ApprovalDto]:
        ...

    async def get_approval(self, approval_id: str) -> Optional[ApprovalDto]:
        ...

    async def approve_action(
        self,
        approval_id: str,
        input_dto: Optional[ApprovalDecisionInputDto] = None,
        expected_revision: Optional[int] = None,
    ) -> ApprovalDto:
        ...

    async def reject_action(
        self,
        approval_id: str,
        input_dto: ApprovalDecisionInputDto,
        expected_revision: Optional[int] = None,
    ) -> ApprovalDto:
        ...


class ActivityRepository(Protocol):
    async def list_activity(
        self,
        category: Optional[str] = None,
        severity: Optional[str] = None,
        correlation_id: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> list[ActivityDto]:
        ...

    async def add_activity(self, activity: ActivityDto) -> ActivityDto:
        ...


class AuditRepository(Protocol):
    async def list_audit_records(
        self,
        actor_type: Optional[str] = None,
        outcome: Optional[str] = None,
        correlation_id: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> list[AuditRecordDto]:
        ...

    async def record_audit(self, record: AuditRecordDto) -> AuditRecordDto:
        ...


class GovernanceRepository(Protocol):
    async def get_governance_snapshot(self) -> GovernanceSnapshotDto:
        ...


class ArtifactRepository(Protocol):
    async def list_artifacts(
        self,
        task_id: Optional[str] = None,
        session_id: Optional[str] = None,
    ) -> list[ArtifactDto]:
        ...

    async def get_artifact(self, artifact_id: str) -> Optional[ArtifactDto]:
        ...


class IdempotencyStore(Protocol):
    async def get_response(self, key: str, operation: str, payload_hash: str) -> Optional[dict[str, Any]]:
        ...

    async def save_response(self, key: str, operation: str, payload_hash: str, response: dict[str, Any]) -> None:
        ...
