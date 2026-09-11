from typing import Optional
from fastapi import APIRouter, Depends, Header, Query, Response, status
from pydantic import BaseModel, ConfigDict
from app.api.auth import get_current_principal
from app.api.dependencies import (
    get_action_intent_service,
    get_correlation_id,
    get_idempotency_store,
    get_task_dispatch_coordinator,
)
from app.domain.principal import OperatorPrincipal
from app.services.task_dispatch_coordinator import TaskDispatchCoordinator
from app.repositories.sqlite.idempotency_repo import PersistentIdempotencyStore
from app.schemas.action_intents import (
    ActionIntentDto,
    CreateActionIntentDto,
    PreflightResultDto,
)
from app.services.action_intent_service import ActionIntentService

router = APIRouter(prefix="/action-intents", tags=["Action Safety"])


class ApproveIntentInput(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reason: Optional[str] = None
    confirmation_phrase: Optional[str] = None


class RejectIntentInput(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reason: str


class CancelIntentInput(BaseModel):
    model_config = ConfigDict(extra="ignore")
    reason: Optional[str] = None


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


@router.post("", response_model=ActionIntentDto, status_code=status.HTTP_201_CREATED)
async def create_action_intent(
    dto: CreateActionIntentDto,
    response: Response,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    correlation_id: str = Depends(get_correlation_id),
    principal: OperatorPrincipal = Depends(get_current_principal),
    service: ActionIntentService = Depends(get_action_intent_service),
    store: PersistentIdempotencyStore = Depends(get_idempotency_store),
) -> ActionIntentDto:
    payload_hash = store.compute_hash(dto.model_dump())
    if idempotency_key:
        cached = await store.get_response(
            key=idempotency_key,
            operation="create_action_intent",
            payload_hash=payload_hash,
            principal_id=principal.id,
        )
        if cached:
            response.headers["ETag"] = f'"v{cached.get("preflight_revision", 1)}"'
            return ActionIntentDto(**cached)

    intent = await service.create_intent(dto, principal=principal, correlation_id=correlation_id)
    response.headers["ETag"] = f'"v{intent.preflight_revision}"'

    if idempotency_key:
        await store.save_response(
            key=idempotency_key,
            operation="create_action_intent",
            payload_hash=payload_hash,
            response=intent.model_dump(),
            principal_id=principal.id,
        )

    return intent


@router.get("", response_model=list[ActionIntentDto])
async def list_action_intents(
    status: Optional[str] = Query(None, description="Filter by intent status"),
    risk: Optional[str] = Query(None, description="Filter by risk tier"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    target_id: Optional[str] = Query(None, description="Filter by target ID"),
    limit: int = Query(50, ge=1, le=100),
    service: ActionIntentService = Depends(get_action_intent_service),
) -> list[ActionIntentDto]:
    return await service.list_intents(
        status=status,
        risk=risk,
        action_type=action_type,
        target_id=target_id,
        limit=limit,
    )


@router.get("/{intent_id}", response_model=ActionIntentDto)
async def get_action_intent(
    intent_id: str,
    response: Response,
    service: ActionIntentService = Depends(get_action_intent_service),
) -> ActionIntentDto:
    intent = await service.get_intent(intent_id)
    response.headers["ETag"] = f'"v{intent.preflight_revision}"'
    return intent


@router.post("/{intent_id}/preflight", response_model=PreflightResultDto)
async def run_intent_preflight(
    intent_id: str,
    dry_run: bool = Query(False, description="Execute dry-run preflight without updating state"),
    correlation_id: str = Depends(get_correlation_id),
    service: ActionIntentService = Depends(get_action_intent_service),
) -> PreflightResultDto:
    return await service.run_preflight(intent_id, is_dry_run=dry_run, correlation_id=correlation_id)


@router.post("/{intent_id}/request-approval", response_model=ActionIntentDto)
async def request_intent_approval(
    intent_id: str,
    response: Response,
    correlation_id: str = Depends(get_correlation_id),
    principal: OperatorPrincipal = Depends(get_current_principal),
    service: ActionIntentService = Depends(get_action_intent_service),
) -> ActionIntentDto:
    intent = await service.request_approval(intent_id, principal=principal, correlation_id=correlation_id)
    response.headers["ETag"] = f'"v{intent.preflight_revision}"'
    return intent


@router.post("/{intent_id}/approve", response_model=ActionIntentDto)
async def approve_action_intent(
    intent_id: str,
    response: Response,
    payload: Optional[ApproveIntentInput] = None,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    correlation_id: str = Depends(get_correlation_id),
    principal: OperatorPrincipal = Depends(get_current_principal),
    service: ActionIntentService = Depends(get_action_intent_service),
    store: PersistentIdempotencyStore = Depends(get_idempotency_store),
) -> ActionIntentDto:
    payload_hash = store.compute_hash(payload.model_dump() if payload else {})
    if idempotency_key:
        cached = await store.get_response(
            key=idempotency_key,
            operation=f"approve_intent_{intent_id}",
            payload_hash=payload_hash,
            principal_id=principal.id,
        )
        if cached:
            response.headers["ETag"] = f'"v{cached.get("preflight_revision", 1)}"'
            return ActionIntentDto(**cached)

    expected_rev = parse_etag_version(if_match)
    reason = payload.reason if payload else None
    conf_phrase = payload.confirmation_phrase if payload else None

    approved = await service.approve_intent(
        intent_id=intent_id,
        principal=principal,
        reason=reason,
        confirmation_phrase=conf_phrase,
        expected_revision=expected_rev,
        correlation_id=correlation_id,
    )
    response.headers["ETag"] = f'"v{approved.preflight_revision}"'

    if idempotency_key:
        await store.save_response(
            key=idempotency_key,
            operation=f"approve_intent_{intent_id}",
            payload_hash=payload_hash,
            response=approved.model_dump(),
            principal_id=principal.id,
        )

    return approved


@router.post("/{intent_id}/reject", response_model=ActionIntentDto)
async def reject_action_intent(
    intent_id: str,
    payload: RejectIntentInput,
    response: Response,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    correlation_id: str = Depends(get_correlation_id),
    principal: OperatorPrincipal = Depends(get_current_principal),
    service: ActionIntentService = Depends(get_action_intent_service),
    store: PersistentIdempotencyStore = Depends(get_idempotency_store),
) -> ActionIntentDto:
    payload_hash = store.compute_hash(payload.model_dump())
    if idempotency_key:
        cached = await store.get_response(
            key=idempotency_key,
            operation=f"reject_intent_{intent_id}",
            payload_hash=payload_hash,
            principal_id=principal.id,
        )
        if cached:
            response.headers["ETag"] = f'"v{cached.get("preflight_revision", 1)}"'
            return ActionIntentDto(**cached)

    expected_rev = parse_etag_version(if_match)
    rejected = await service.reject_intent(
        intent_id=intent_id,
        principal=principal,
        reason=payload.reason,
        expected_revision=expected_rev,
        correlation_id=correlation_id,
    )
    response.headers["ETag"] = f'"v{rejected.preflight_revision}"'

    if idempotency_key:
        await store.save_response(
            key=idempotency_key,
            operation=f"reject_intent_{intent_id}",
            payload_hash=payload_hash,
            response=rejected.model_dump(),
            principal_id=principal.id,
        )

    return rejected


@router.post("/{intent_id}/cancel", response_model=ActionIntentDto)
async def cancel_action_intent(
    intent_id: str,
    response: Response,
    payload: Optional[CancelIntentInput] = None,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    correlation_id: str = Depends(get_correlation_id),
    principal: OperatorPrincipal = Depends(get_current_principal),
    service: ActionIntentService = Depends(get_action_intent_service),
    store: PersistentIdempotencyStore = Depends(get_idempotency_store),
) -> ActionIntentDto:
    payload_hash = store.compute_hash(payload.model_dump() if payload else {})
    if idempotency_key:
        cached = await store.get_response(
            key=idempotency_key,
            operation=f"cancel_intent_{intent_id}",
            payload_hash=payload_hash,
            principal_id=principal.id,
        )
        if cached:
            response.headers["ETag"] = f'"v{cached.get("preflight_revision", 1)}"'
            return ActionIntentDto(**cached)

    reason = payload.reason if payload else None
    cancelled = await service.cancel_intent(
        intent_id=intent_id,
        principal=principal,
        reason=reason,
        correlation_id=correlation_id,
    )
    response.headers["ETag"] = f'"v{cancelled.preflight_revision}"'

    if idempotency_key:
        await store.save_response(
            key=idempotency_key,
            operation=f"cancel_intent_{intent_id}",
            payload_hash=payload_hash,
            response=cancelled.model_dump(),
            principal_id=principal.id,
        )

    return cancelled


@router.post("/{intent_id}/execute", status_code=status.HTTP_200_OK)
async def execute_action_intent(
    intent_id: str,
    response: Response,
    idempotency_key: str = Header(..., alias="Idempotency-Key"),
    if_match: Optional[str] = Header(None, alias="If-Match"),
    correlation_id: str = Depends(get_correlation_id),
    principal: OperatorPrincipal = Depends(get_current_principal),
    coordinator: TaskDispatchCoordinator = Depends(get_task_dispatch_coordinator),
) -> dict:
    """
    Controlled execution of an approved action intent (Prompt 14 Section 31-34).
    V1.1 proposed mutation endpoint.
    - Requires authenticated operator with execution permission.
    - Fails closed if kill switch is engaged, intent is unapproved or expired, or final preflight fails.
    - Enforces persistent idempotency and single-use execution authorization.
    - Strictly empty execution body — target, profile, and task parameters are derived solely from approved intent.
    """
    expected_rev = parse_etag_version(if_match)
    res = await coordinator.execute_task_dispatch(
        intent_id=intent_id,
        principal=principal,
        idempotency_key=idempotency_key,
        if_match_revision=expected_rev,
    )
    return res

