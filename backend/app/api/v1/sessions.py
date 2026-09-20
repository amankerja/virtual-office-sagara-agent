import sqlite3
from typing import Optional
from fastapi import APIRouter, Depends, Query
from app.api.dependencies import get_runtime_service
from app.config import settings
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


@router.get("/recent/logs", response_model=list[dict])
async def get_recent_session_logs(
    limit: int = Query(50, ge=1, le=500, description="Log entry limit"),
) -> list[dict]:
    db_path = settings.hermes_state_db_path or "/home/ubuntu/.hermes/state.db"
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("""
            SELECT id, session_id, role, content, tool_name, timestamp
            FROM messages
            ORDER BY id DESC
            LIMIT ?;
        """, (limit,))
        rows = cur.fetchall()
        conn.close()
        return [
            {
                "id": r["id"],
                "session_id": r["session_id"],
                "role": r["role"],
                "content": r["content"] or "",
                "tool_name": r["tool_name"],
                "timestamp": r["timestamp"],
            }
            for r in reversed(rows)
        ]
    except Exception:
        return []


@router.get("/{session_id}", response_model=SessionDto)
async def get_session_by_id(
    session_id: str,
    service: RuntimeService = Depends(get_runtime_service),
) -> SessionDto:
    return await service.get_session(session_id)


@router.get("/{session_id}/logs", response_model=list[dict])
async def get_session_logs(
    session_id: str,
    limit: int = Query(50, ge=1, le=500, description="Log entry limit"),
) -> list[dict]:
    db_path = settings.hermes_state_db_path or "/home/ubuntu/.hermes/state.db"
    try:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cur = conn.cursor()
        cur.execute("""
            SELECT id, session_id, role, content, tool_name, timestamp
            FROM messages
            WHERE session_id = ?
            ORDER BY id ASC
            LIMIT ?;
        """, (session_id, limit))
        rows = cur.fetchall()
        conn.close()
        return [
            {
                "id": r["id"],
                "session_id": r["session_id"],
                "role": r["role"],
                "content": r["content"] or "",
                "tool_name": r["tool_name"],
                "timestamp": r["timestamp"],
            }
            for r in rows
        ]
    except Exception:
        return []


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
