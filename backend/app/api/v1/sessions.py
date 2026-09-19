from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.api.dependencies import get_runtime_service
from app.schemas.sessions import SessionDto
from app.services.runtime_service import RuntimeService

router = APIRouter(prefix="/sessions", tags=["Sessions"])


@router.get("", response_model=list[SessionDto])
async def list_sessions(
    agent_id: Optional[str] = Query(None, description="Filter by agent ID"),
    state: Optional[str] = Query(None, description="Filter by session state"),
    cursor: Optional[str] = Query(None, description="Opaque pagination cursor"),
    limit: int = Query(50, ge=1, le=200, description="Items per page limit"),
    service: RuntimeService = Depends(get_runtime_service),
) -> list[SessionDto]:
    return await service.list_sessions(agent_id=agent_id, state=state, cursor=cursor, limit=limit)


@router.get("/{session_id}", response_model=SessionDto)
async def get_session_by_id(
    session_id: str,
    service: RuntimeService = Depends(get_runtime_service),
) -> SessionDto:
    return await service.get_session(session_id)


@router.post("/{session_id}/kill", response_model=dict[str, bool])
async def kill_session(
    session_id: str,
    service: RuntimeService = Depends(get_runtime_service),
) -> dict[str, bool]:
    success = await service.kill_session(session_id)
    return {"success": success}


@router.delete("/{session_id}", response_model=dict[str, bool])
async def delete_session(
    session_id: str,
    service: RuntimeService = Depends(get_runtime_service),
) -> dict[str, bool]:
    success = await service.delete_session(session_id)
    return {"success": success}
