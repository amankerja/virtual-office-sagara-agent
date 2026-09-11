from typing import Optional
from fastapi import APIRouter, Depends, Header, Query, Response, status
from app.api.dependencies import get_correlation_id, get_idempotency_store, get_task_service
from app.repositories.memory.idempotency import InMemoryIdempotencyStore
from app.schemas.tasks import CreateTaskDto, TaskDto, UpdateTaskDto
from app.services.task_service import TaskService

router = APIRouter(prefix="/tasks", tags=["Tasks"])


def parse_etag_version(if_match: Optional[str]) -> Optional[int]:
    if not if_match:
        return None
    cleaned = if_match.strip().strip('"').strip("'")
    if cleaned.startswith("v") or cleaned.startswith("V"):
        cleaned = cleaned[1:]
    try:
        return int(cleaned)
    except ValueError:
        return None


@router.get("", response_model=list[TaskDto])
async def list_tasks(
    state: Optional[str] = Query(None, description="Filter by task state"),
    priority: Optional[str] = Query(None, description="Filter by task priority"),
    agent_id: Optional[str] = Query(None, description="Filter by assigned agent ID"),
    cursor: Optional[str] = Query(None, description="Opaque pagination cursor"),
    limit: int = Query(50, ge=1, le=200, description="Items limit"),
    service: TaskService = Depends(get_task_service),
) -> list[TaskDto]:
    return await service.list_tasks(
        state=state,
        priority=priority,
        agent_id=agent_id,
        cursor=cursor,
        limit=limit,
    )


@router.post("", response_model=TaskDto, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: CreateTaskDto,
    response: Response,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    correlation_id: str = Depends(get_correlation_id),
    service: TaskService = Depends(get_task_service),
    store: InMemoryIdempotencyStore = Depends(get_idempotency_store),
) -> TaskDto:
    payload_hash = store.compute_hash(payload.model_dump())
    if idempotency_key:
        cached = await store.get_response(idempotency_key, "create_task", payload_hash)
        if cached:
            response.headers["ETag"] = f'"v{cached.get("revision", 1)}"'
            return TaskDto(**cached)

    created = await service.create_task(payload, correlation_id=correlation_id)
    response.headers["ETag"] = f'"v{created.revision}"'

    if idempotency_key:
        await store.save_response(idempotency_key, "create_task", payload_hash, created.model_dump())

    return created


@router.get("/{task_id}", response_model=TaskDto)
async def get_task_by_id(
    task_id: str,
    response: Response,
    service: TaskService = Depends(get_task_service),
) -> TaskDto:
    task = await service.get_task(task_id)
    response.headers["ETag"] = f'"v{task.revision}"'
    return task


@router.patch("/{task_id}", response_model=TaskDto)
async def update_task(
    task_id: str,
    payload: UpdateTaskDto,
    response: Response,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    correlation_id: str = Depends(get_correlation_id),
    service: TaskService = Depends(get_task_service),
) -> TaskDto:
    expected_rev = parse_etag_version(if_match) or payload.revision
    updated = await service.update_task(
        task_id,
        payload,
        expected_revision=expected_rev,
        correlation_id=correlation_id,
    )
    response.headers["ETag"] = f'"v{updated.revision}"'
    return updated


@router.post("/{task_id}/dispatch", response_model=TaskDto)
async def dispatch_task(
    task_id: str,
    response: Response,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    correlation_id: str = Depends(get_correlation_id),
    service: TaskService = Depends(get_task_service),
    store: InMemoryIdempotencyStore = Depends(get_idempotency_store),
) -> TaskDto:
    payload_hash = f"dispatch-{task_id}"
    if idempotency_key:
        cached = await store.get_response(idempotency_key, f"dispatch_{task_id}", payload_hash)
        if cached:
            response.headers["ETag"] = f'"v{cached.get("revision", 1)}"'
            return TaskDto(**cached)

    dispatched = await service.dispatch_task(task_id, correlation_id=correlation_id)
    response.headers["ETag"] = f'"v{dispatched.revision}"'

    if idempotency_key:
        await store.save_response(idempotency_key, f"dispatch_{task_id}", payload_hash, dispatched.model_dump())

    return dispatched


@router.post("/{task_id}/cancel", response_model=TaskDto)
async def cancel_task(
    task_id: str,
    response: Response,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    correlation_id: str = Depends(get_correlation_id),
    service: TaskService = Depends(get_task_service),
    store: InMemoryIdempotencyStore = Depends(get_idempotency_store),
) -> TaskDto:
    payload_hash = f"cancel-{task_id}"
    if idempotency_key:
        cached = await store.get_response(idempotency_key, f"cancel_{task_id}", payload_hash)
        if cached:
            response.headers["ETag"] = f'"v{cached.get("revision", 1)}"'
            return TaskDto(**cached)

    cancelled = await service.cancel_task(task_id, correlation_id=correlation_id)
    response.headers["ETag"] = f'"v{cancelled.revision}"'

    if idempotency_key:
        await store.save_response(idempotency_key, f"cancel_{task_id}", payload_hash, cancelled.model_dump())

    return cancelled
