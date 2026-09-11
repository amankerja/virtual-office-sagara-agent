from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.api.dependencies import get_runtime_service
from app.schemas.delegations import DelegationDto
from app.services.runtime_service import RuntimeService

router = APIRouter(prefix="/delegations", tags=["Delegations"])


@router.get("", response_model=list[DelegationDto])
async def list_delegations(
    agent_id: Optional[str] = Query(None, description="Filter by target agent ID"),
    state: Optional[str] = Query(None, description="Filter by delegation state"),
    service: RuntimeService = Depends(get_runtime_service),
) -> list[DelegationDto]:
    return await service.list_delegations(agent_id=agent_id, state=state)


@router.get("/{delegation_id}", response_model=DelegationDto)
async def get_delegation_by_id(
    delegation_id: str,
    service: RuntimeService = Depends(get_runtime_service),
) -> DelegationDto:
    return await service.get_delegation(delegation_id)
