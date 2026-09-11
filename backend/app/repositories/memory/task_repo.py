from datetime import datetime, timezone
from typing import Optional
from app.api.errors import BadRequestError, ConflictError, ResourceNotFoundError
from app.repositories.memory.fixtures import TASKS_FIXTURE
from app.schemas.tasks import CreateTaskDto, TaskDto, TaskTimelineEventDto, UpdateTaskDto


class InMemoryTaskRepository:
    def __init__(self) -> None:
        # Clone fixtures so state mutations are isolated
        self._tasks: list[TaskDto] = [t.model_copy(deep=True) for t in TASKS_FIXTURE]

    async def list_tasks(
        self,
        state: Optional[str] = None,
        priority: Optional[str] = None,
        agent_id: Optional[str] = None,
        cursor: Optional[str] = None,
        limit: int = 50,
    ) -> list[TaskDto]:
        results = self._tasks
        if state and state != "ALL":
            results = [t for t in results if t.state == state]
        if priority and priority != "ALL":
            results = [t for t in results if t.priority == priority]
        if agent_id and agent_id != "ALL":
            if agent_id == "UNASSIGNED":
                results = [t for t in results if not t.assigned_agent_id]
            else:
                results = [t for t in results if t.assigned_agent_id == agent_id]

        start_index = 0
        if cursor:
            try:
                # Opaque offset-based cursor
                start_index = int(cursor)
            except ValueError:
                start_index = 0

        return results[start_index : start_index + limit]

    async def get_task(self, task_id: str) -> Optional[TaskDto]:
        for t in self._tasks:
            if t.id == task_id:
                return t.model_copy(deep=True)
        return None

    async def create_task(self, input_dto: CreateTaskDto) -> TaskDto:
        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        new_id = f"tsk-{len(self._tasks) + 1:02d}"
        new_task = TaskDto(
            id=new_id,
            title=input_dto.title,
            description=input_dto.description,
            state=input_dto.state or "DRAFT",
            priority=input_dto.priority,
            created_at=now,
            updated_at=now,
            assigned_agent_id=input_dto.assigned_agent_id,
            requested_skills=input_dto.requested_skills,
            capability_requirements=input_dto.capability_requirements,
            due_at=input_dto.due_at,
            timeline=[
                TaskTimelineEventDto(
                    id=f"evt-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                    type="CREATED",
                    timestamp=now,
                    actor="Operator (Local)",
                    detail=f"Task created with initial state {input_dto.state or 'DRAFT'}",
                )
            ],
            revision=1,
            version=1,
        )
        self._tasks.insert(0, new_task)
        return new_task.model_copy(deep=True)

    async def update_task(
        self,
        task_id: str,
        input_dto: UpdateTaskDto,
        expected_revision: Optional[int] = None,
    ) -> TaskDto:
        target = None
        for t in self._tasks:
            if t.id == task_id:
                target = t
                break

        if not target:
            raise ResourceNotFoundError(f"Task with ID '{task_id}' not found.")

        # Revision concurrency check
        if expected_revision is not None and target.revision is not None:
            if expected_revision != target.revision:
                raise ConflictError(
                    code="RESOURCE_CONFLICT",
                    message=f"Conflict updating task: expected revision {expected_revision}, but current revision is {target.revision}.",
                    details={"current_revision": target.revision, "expected_revision": expected_revision},
                )

        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

        update_data = input_dto.model_dump(exclude_unset=True)
        # Update fields
        for field, val in update_data.items():
            if field != "revision" and hasattr(target, field):
                setattr(target, field, val)

        target.updated_at = now
        target.revision = (target.revision or 1) + 1
        target.version = target.revision

        return target.model_copy(deep=True)

    async def dispatch_task(self, task_id: str) -> TaskDto:
        target = None
        for t in self._tasks:
            if t.id == task_id:
                target = t
                break

        if not target:
            raise ResourceNotFoundError(f"Task with ID '{task_id}' not found.")

        if target.state in ["DISPATCHING", "RUNNING", "COMPLETED"]:
            raise ConflictError(
                code="TASK_ALREADY_DISPATCHED",
                message=f"Task {task_id} is already in state '{target.state}'.",
            )

        if target.state == "DRAFT":
            raise ConflictError(
                code="TASK_NOT_READY",
                message=f"Task {task_id} is in DRAFT state and cannot be dispatched without review.",
            )

        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        target.state = "DISPATCHING"
        target.updated_at = now
        target.revision = (target.revision or 1) + 1
        target.version = target.revision

        if target.timeline is None:
            target.timeline = []

        target.timeline.append(
            TaskTimelineEventDto(
                id=f"evt-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                type="DISPATCH_REQUESTED",
                timestamp=now,
                actor="Operator (Local)",
                detail="Local prototype dispatch confirmed",
            )
        )
        return target.model_copy(deep=True)

    async def cancel_task(self, task_id: str) -> TaskDto:
        target = None
        for t in self._tasks:
            if t.id == task_id:
                target = t
                break

        if not target:
            raise ResourceNotFoundError(f"Task with ID '{task_id}' not found.")

        if target.state in ["COMPLETED", "FAILED", "CANCELLED"]:
            raise ConflictError(
                code="TASK_NOT_CANCELLABLE",
                message=f"Task {task_id} is in final state '{target.state}' and cannot be cancelled.",
            )

        now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        target.state = "CANCELLED"
        target.updated_at = now
        target.revision = (target.revision or 1) + 1
        target.version = target.revision

        if target.timeline is None:
            target.timeline = []

        target.timeline.append(
            TaskTimelineEventDto(
                id=f"evt-{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                type="CANCELLED",
                timestamp=now,
                actor="Operator (Local)",
                detail="Task cancelled by operator",
            )
        )
        return target.model_copy(deep=True)
