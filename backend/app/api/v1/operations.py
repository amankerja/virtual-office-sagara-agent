from fastapi import APIRouter, Depends
import sqlite3
from app.db.connection import get_db_connection
from app.services.execution_readiness_service import (
    ExecutionReadinessReport,
    ExecutionReadinessService,
)

router = APIRouter(prefix="/operations", tags=["Operations Readiness"])


@router.get("/readiness", response_model=ExecutionReadinessReport)
@router.get("/summary", response_model=ExecutionReadinessReport)
async def get_operations_readiness(conn: sqlite3.Connection = Depends(get_db_connection)):
    """
    Consolidated read-only operational status model (Prompt 14.9A.9 Section 22-32).
    """
    return ExecutionReadinessService.evaluate(conn)
