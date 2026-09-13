from fastapi import APIRouter, Depends
import sqlite3
from app.db.connection import get_db_connection
from app.services.execution_readiness_service import (
    ExecutionReadinessReport,
    ExecutionReadinessService,
)

router = APIRouter(prefix="/execution-readiness", tags=["Execution Readiness (V1.1 Proposed)"])


@router.get("", response_model=ExecutionReadinessReport)
async def get_execution_readiness(conn: sqlite3.Connection = Depends(get_db_connection)):
    """
    Evaluate aggregated execution readiness across all 11 security and infrastructure dimensions.
    Prompt 14.4 Section 38-43.
    """
    return ExecutionReadinessService.evaluate(conn)
