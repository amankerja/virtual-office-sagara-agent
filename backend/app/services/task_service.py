from datetime import datetime, timezone
from typing import Optional
from app.api.errors import ResourceNotFoundError
from app.repositories.protocols import ActivityRepository, AuditRepository, TaskRepository
from app.schemas.activity import ActivityDto
from app.schemas.audit import AuditRecordDto
from app.schemas.common import EntityReference, RelatedEntities
from app.schemas.tasks import CreateTaskDto, TaskDto, UpdateTaskDto


class TaskService:
    def __init__(
        self,
        task_repo: TaskRepository,
        audit_repo: AuditRepository,
        activity_repo: ActivityRepository,
    ) -> None:
        self._task_repo = task_repo
        self._audit_repo = audit_repo
        self._activity_repo = activity_repo

    async def list_tasks(
        self,
        state: Optional[str] = None,
        priority: Optional[str] = None,
        agent_id: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> list[TaskDto]:
        return await self._task_repo.list_tasks(
            state=state,
            priority=priority,
            agent_id=agent_id,
            cursor=cursor,
            limit=limit,
        )

    async def get_task(self, task_id: str) -> TaskDto:
        task = await self._task_repo.get_task(task_id)
        if not task:
            raise ResourceNotFoundError(f"Task with ID '{task_id}' was not found.")
        return task

    async def create_task(self, input_dto: CreateTaskDto, correlation_id: Optional[str] = None) -> TaskDto:
        task = await self._task_repo.create_task(input_dto)
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # Emit audit record
        await self._audit_repo.record_audit(
            AuditRecordDto(
                id=f"aud-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                timestamp=now,
                actor=EntityReference(type="USER", id="operator-local", label="Operator (Local)"),
                action="TASK_CREATED",
                target=EntityReference(type="TASK", id=task.id, label=task.title),
                outcome="SUCCESS",
                reason="Task created via Mission Control API",
                correlation_id=correlation_id,
                related=RelatedEntities(task_id=task.id, agent_id=task.assigned_agent_id),
            )
        )

        # Emit operational activity event
        await self._activity_repo.add_activity(
            ActivityDto(
                id=f"act-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                timestamp=now,
                category="TASK",
                severity="INFO",
                title=f"Task Created: {task.title}",
                description=f"Task created with initial state {task.state}",
                actor=EntityReference(type="USER", id="operator-local", label="Operator (Local)"),
                entity=EntityReference(type="TASK", id=task.id, label=task.title),
                correlation_id=correlation_id,
                related=RelatedEntities(task_id=task.id, agent_id=task.assigned_agent_id),
            )
        )

        return task

    async def update_task(
        self,
        task_id: str,
        input_dto: UpdateTaskDto,
        expected_revision: Optional[int] = None,
        correlation_id: Optional[str] = None,
    ) -> TaskDto:
        task = await self._task_repo.update_task(task_id, input_dto, expected_revision=expected_revision)
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # Emit audit record
        await self._audit_repo.record_audit(
            AuditRecordDto(
                id=f"aud-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                timestamp=now,
                actor=EntityReference(type="USER", id="operator-local", label="Operator (Local)"),
                action="TASK_UPDATED",
                target=EntityReference(type="TASK", id=task.id, label=task.title),
                outcome="SUCCESS",
                reason="Task updated via Mission Control API",
                correlation_id=correlation_id,
                related=RelatedEntities(task_id=task.id, agent_id=task.assigned_agent_id),
            )
        )

        return task

    async def dispatch_task(self, task_id: str, correlation_id: Optional[str] = None) -> TaskDto:
        task = await self._task_repo.dispatch_task(task_id)
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # Emit audit record
        await self._audit_repo.record_audit(
            AuditRecordDto(
                id=f"aud-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                timestamp=now,
                actor=EntityReference(type="USER", id="operator-local", label="Operator (Local)"),
                action="TASK_DISPATCHED",
                target=EntityReference(type="TASK", id=task.id, label=task.title),
                outcome="SUCCESS",
                reason="Task dispatched for execution",
                correlation_id=correlation_id,
                related=RelatedEntities(task_id=task.id, agent_id=task.assigned_agent_id),
            )
        )

        # Emit activity event
        await self._activity_repo.add_activity(
            ActivityDto(
                id=f"act-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                timestamp=now,
                category="TASK",
                severity="INFO",
                title=f"Task Dispatched: {task.title}",
                description=f"Task transitioned to {task.state}",
                actor=EntityReference(type="USER", id="operator-local", label="Operator (Local)"),
                entity=EntityReference(type="TASK", id=task.id, label=task.title),
                correlation_id=correlation_id,
                related=RelatedEntities(task_id=task.id, agent_id=task.assigned_agent_id),
            )
        )

        return task

    async def cancel_task(self, task_id: str, correlation_id: Optional[str] = None) -> TaskDto:
        task = await self._task_repo.cancel_task(task_id)
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        # Emit audit record
        await self._audit_repo.record_audit(
            AuditRecordDto(
                id=f"aud-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                timestamp=now,
                actor=EntityReference(type="USER", id="operator-local", label="Operator (Local)"),
                action="TASK_CANCELLED",
                target=EntityReference(type="TASK", id=task.id, label=task.title),
                outcome="SUCCESS",
                reason="Task cancelled by operator",
                correlation_id=correlation_id,
                related=RelatedEntities(task_id=task.id, agent_id=task.assigned_agent_id),
            )
        )

        return task

    async def delete_task(self, task_id: str, correlation_id: Optional[str] = None) -> bool:
        if hasattr(self._task_repo, "delete_task"):
            return await self._task_repo.delete_task(task_id)
        return False
