import sqlite3
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.auth import get_current_principal
from app.api.dependencies import get_realtime_manager
from app.db.connection import get_db_connection
from app.domain.principal import OperatorPrincipal
from app.services.execution_lock_service import (
    ExecutionLockService,
    REQUIRED_UNLOCK_CONFIRMATION_PHRASE,
)


router = APIRouter(prefix="/execution-lock", tags=["Execution Kill Switch (V1.1 Proposed)"])


class RequestUnlockDto(BaseModel):
    reason: str = Field(..., min_length=3, description="Operator-supplied justification for unlocking execution")
    ttl_minutes: int = Field(15, ge=1, le=30, description="Window time-to-live in minutes (1-30)")
    max_executions: int = Field(1, ge=1, le=10, description="Maximum executions permitted in this window")
    correlation_id: Optional[str] = None


class UnlockExecutionDto(BaseModel):
    confirmation_phrase: str = Field(..., description="Exact typed confirmation phrase defined by server")
    reason: str = Field(..., min_length=3, description="Operator-supplied justification for unlocking execution")
    ttl_minutes: int = Field(15, ge=1, le=30, description="Window time-to-live in minutes (1-30)")
    max_executions: int = Field(1, ge=1, le=10, description="Maximum executions permitted in this window")
    correlation_id: Optional[str] = None


class LockExecutionDto(BaseModel):
    reason: Optional[str] = Field("Operator emergency execution lock", description="Reason for engaging execution lock")
    correlation_id: Optional[str] = None


@router.get("")
async def inspect_execution_lock(conn: sqlite3.Connection = Depends(get_db_connection)):
    """
    Inspect persistent execution lock, active window, and execution budget.
    Prompt 14.4 Section 47.
    """
    return ExecutionLockService.inspect(conn)


@router.post("/request-unlock")
async def request_execution_unlock(
    payload: RequestUnlockDto,
    principal: OperatorPrincipal = Depends(get_current_principal),
    conn: sqlite3.Connection = Depends(get_db_connection),
):
    """
    Request challenge to unlock execution.
    Requires: execution.lock.manage permission, valid reason, and intact audit chain.
    Prompt 14.4 Section 49.
    """
    return ExecutionLockService.request_unlock(
        conn=conn,
        principal=principal,
        reason=payload.reason,
        ttl_minutes=payload.ttl_minutes,
        max_executions=payload.max_executions,
        correlation_id=payload.correlation_id,
    )


@router.post("/unlock")
async def unlock_execution(
    payload: UnlockExecutionDto,
    principal: OperatorPrincipal = Depends(get_current_principal),
    conn: sqlite3.Connection = Depends(get_db_connection),
):
    """
    Open bounded execution window with server-defined typed confirmation phrase.
    Prompt 14.4 Section 49-56.
    """
    return ExecutionLockService.unlock(
        conn=conn,
        principal=principal,
        confirmation_phrase=payload.confirmation_phrase,
        reason=payload.reason,
        ttl_minutes=payload.ttl_minutes,
        max_executions=payload.max_executions,
        correlation_id=payload.correlation_id,
        realtime_service=get_realtime_manager(),
    )


@router.post("/lock")
async def emergency_lock_execution(
    payload: LockExecutionDto,
    principal: OperatorPrincipal = Depends(get_current_principal),
    conn: sqlite3.Connection = Depends(get_db_connection),
):
    """
    Emergency engagement of persistent execution kill switch.
    Immediately closes all open execution windows.
    Prompt 14.4 Section 48, 76.
    """
    return ExecutionLockService.lock(
        conn=conn,
        principal=principal,
        reason=payload.reason or "Operator emergency execution lock",
        correlation_id=payload.correlation_id,
        realtime_service=get_realtime_manager(),
    )

