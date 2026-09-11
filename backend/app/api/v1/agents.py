from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.api.dependencies import get_agent_service
from app.schemas.agents import AgentDto
from app.services.agent_service import AgentProjectionService

router = APIRouter(prefix="/agents", tags=["Agents"])


@router.get("", response_model=list[AgentDto])
async def list_agents(
    state: Optional[str] = Query(None, description="Filter by agent state"),
    profile_id: Optional[str] = Query(None, description="Filter by agent profile ID"),
    service: AgentProjectionService = Depends(get_agent_service),
) -> list[AgentDto]:
    return await service.list_agents(state=state, profile_id=profile_id)


@router.get("/{agent_id}", response_model=AgentDto)
async def get_agent_by_id(
    agent_id: str,
    service: AgentProjectionService = Depends(get_agent_service),
) -> AgentDto:
    return await service.get_agent(agent_id)
