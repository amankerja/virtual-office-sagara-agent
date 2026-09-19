"""
Tool Security Policy API Router (Prompt 14.9A Section 97-98).
Proposed V1.1 endpoints for inspecting tool security policy and candidate read-only capabilities.
"""

import sqlite3
from typing import Any, Dict, List
from fastapi import APIRouter, Depends

from app.db.connection import get_db_connection
from app.domain.tool_security_policy import ToolSecurityPolicy
from app.repositories.sqlite.tool_security_repo import SqliteToolSecurityRepository
from app.services.tool_security_service import ToolSecurityService

router = APIRouter(prefix="/tool-security-policy", tags=["Tool Security Policy (V1.1 Proposed)"])


@router.get("", response_model=ToolSecurityPolicy)
@router.get("/rules", response_model=ToolSecurityPolicy)
async def get_tool_security_policy(
    conn: sqlite3.Connection = Depends(get_db_connection),
):
    """
    Get current installed Tool Security Policy.
    Prompt 14.9A Section 98.
    """
    return ToolSecurityService.get_installed_policy(conn)


@router.get("/capabilities")
async def list_tool_capabilities(
    conn: sqlite3.Connection = Depends(get_db_connection),
) -> List[Dict[str, Any]]:
    """
    List candidate read-only tool capabilities and their verification status.
    Prompt 14.9A Section 98.
    """
    repo = SqliteToolSecurityRepository()
    return repo.list_capabilities()
