from typing import Optional
from fastapi import APIRouter, Depends, Header, Query, Response
from app.api.dependencies import get_approval_service, get_correlation_id, get_idempotency_store
from app.repositories.memory.idempotency import InMemoryIdempotencyStore
from app.schemas.approvals import ApprovalDecisionInputDto, ApprovalDto
from app.services.approval_service import ApprovalService

router = APIRouter(prefix="/approvals", tags=["Approvals"])


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


@router.get("", response_model=list[ApprovalDto])
async def list_approvals(
    state: Optional[str] = Query(None, description="Filter by approval state"),
    risk: Optional[str] = Query(None, description="Filter by risk tier"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    service: ApprovalService = Depends(get_approval_service),
) -> list[ApprovalDto]:
    return await service.list_approvals(state=state, risk=risk, action_type=action_type)


@router.get("/{approval_id}", response_model=ApprovalDto)
async def get_approval_by_id(
    approval_id: str,
    response: Response,
    service: ApprovalService = Depends(get_approval_service),
) -> ApprovalDto:
    approval = await service.get_approval(approval_id)
    response.headers["ETag"] = f'"v{approval.revision}"'
    return approval


@router.post("/{approval_id}/approve", response_model=ApprovalDto)
async def approve_action(
    approval_id: str,
    response: Response,
    payload: Optional[ApprovalDecisionInputDto] = None,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    correlation_id: str = Depends(get_correlation_id),
    service: ApprovalService = Depends(get_approval_service),
    store: InMemoryIdempotencyStore = Depends(get_idempotency_store),
) -> ApprovalDto:
    payload_hash = store.compute_hash(payload.model_dump() if payload else {})
    if idempotency_key:
        cached = await store.get_response(idempotency_key, f"approve_{approval_id}", payload_hash)
        if cached:
            response.headers["ETag"] = f'"v{cached.get("revision", 1)}"'
            return ApprovalDto(**cached)

    expected_rev = parse_etag_version(if_match)
    approved = await service.approve_action(
        approval_id,
        input_dto=payload,
        expected_revision=expected_rev,
        correlation_id=correlation_id,
    )
    response.headers["ETag"] = f'"v{approved.revision}"'

    if idempotency_key:
        await store.save_response(idempotency_key, f"approve_{approval_id}", payload_hash, approved.model_dump())

    return approved


@router.post("/{approval_id}/reject", response_model=ApprovalDto)
async def reject_action(
    approval_id: str,
    payload: ApprovalDecisionInputDto,
    response: Response,
    if_match: Optional[str] = Header(None, alias="If-Match"),
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    correlation_id: str = Depends(get_correlation_id),
    service: ApprovalService = Depends(get_approval_service),
    store: InMemoryIdempotencyStore = Depends(get_idempotency_store),
) -> ApprovalDto:
    payload_hash = store.compute_hash(payload.model_dump())
    if idempotency_key:
        cached = await store.get_response(idempotency_key, f"reject_{approval_id}", payload_hash)
        if cached:
            response.headers["ETag"] = f'"v{cached.get("revision", 1)}"'
            return ApprovalDto(**cached)

    expected_rev = parse_etag_version(if_match)
    rejected = await service.reject_action(
        approval_id,
        input_dto=payload,
        expected_revision=expected_rev,
        correlation_id=correlation_id,
    )
    response.headers["ETag"] = f'"v{rejected.revision}"'

    if idempotency_key:
        await store.save_response(idempotency_key, f"reject_{approval_id}", payload_hash, rejected.model_dump())

    return rejected
