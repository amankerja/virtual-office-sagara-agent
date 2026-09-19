"""
Production Execution Policy API Router (Prompt 14.6 Section 86-90).
Provides safe inspection, draft changeset creation with diffs, and audited policy application.
"""

import json
import secrets
import sqlite3
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.api.auth import get_current_principal
from app.api.errors import AppError, ConflictError, ResourceNotFoundError
from app.db.connection import get_db_connection
from app.domain.execution_policy import (
    ProductionExecutionPolicy,
    compute_policy_hash,
)
from app.domain.principal import OperatorPrincipal
from app.services.execution_policy_service import ExecutionPolicyService


router = APIRouter(prefix="/execution-policy", tags=["Production Execution Policy (V1.1 Proposed)"])


class DraftChangeSetDto(BaseModel):
    title: str = Field(..., min_length=3, description="Brief title for the execution policy changeset")
    description: Optional[str] = Field(None, description="Detailed explanation/justification for policy changes")
    proposed_policy: Dict[str, Any] = Field(..., description="Complete proposed policy definition dictionary")


class ChangeSetResponseDto(BaseModel):
    id: str
    title: str
    description: Optional[str]
    status: str
    diff: Optional[Dict[str, Any]]
    created_by: str
    created_at: str
    approved_by: Optional[str] = None
    approved_at: Optional[str] = None
    applied_by: Optional[str] = None
    applied_at: Optional[str] = None


@router.get("", response_model=ProductionExecutionPolicy)
@router.get("/rules", response_model=ProductionExecutionPolicy)
async def get_active_execution_policy(
    conn: sqlite3.Connection = Depends(get_db_connection),
):
    """
    Get current active production execution policy.
    Prompt 14.6 Section 86.
    """
    return ExecutionPolicyService.get_active_policy(conn)


@router.get("/changesets", response_model=List[ChangeSetResponseDto])
async def list_policy_changesets(
    conn: sqlite3.Connection = Depends(get_db_connection),
):
    """
    List all execution policy changesets (DRAFT, APPROVED, APPLIED, REJECTED).
    Prompt 14.6 Section 88.
    """
    cursor = conn.cursor()
    try:
        cursor.execute(
            """
            SELECT id, title, description, status, diff_json, created_by, created_at,
                   approved_by, approved_at, applied_by, applied_at
            FROM execution_policy_change_sets
            ORDER BY created_at DESC;
            """
        )
        rows = cursor.fetchall()
        result = []
        for r in rows:
            diff = json.loads(r["diff_json"]) if r["diff_json"] else None
            result.append(
                ChangeSetResponseDto(
                    id=r["id"],
                    title=r["title"],
                    description=r["description"],
                    status=r["status"],
                    diff=diff,
                    created_by=r["created_by"],
                    created_at=r["created_at"],
                    approved_by=r["approved_by"],
                    approved_at=r["approved_at"],
                    applied_by=r["applied_by"],
                    applied_at=r["applied_at"],
                )
            )
        return result
    except sqlite3.OperationalError:
        return []


@router.post("/changesets", response_model=ChangeSetResponseDto)
async def create_policy_changeset(
    payload: DraftChangeSetDto,
    principal: OperatorPrincipal = Depends(get_current_principal),
    conn: sqlite3.Connection = Depends(get_db_connection),
):
    """
    Draft an execution policy changeset with computed semantic diff against active policy.
    Flow: Draft -> Validate -> Diff -> Approval -> Apply.
    Prompt 14.6 Section 87-88.
    """
    # 1. Validate proposed policy schema
    try:
        proposed_model = ProductionExecutionPolicy(**payload.proposed_policy)
    except Exception as e:
        raise AppError(
            status_code=400,
            code="INVALID_POLICY_SCHEMA",
            message=f"Proposed execution policy schema is invalid: {e}",
        )

    # 2. Compute diff against current active policy
    active_policy = ExecutionPolicyService.get_active_policy(conn)
    active_dict = active_policy.model_dump()
    proposed_dict = proposed_model.model_dump()

    diff: Dict[str, Any] = {"changed_fields": {}}
    for k, v in proposed_dict.items():
        if k in ("policy_hash", "created_at"):
            continue
        if k not in active_dict or active_dict[k] != v:
            diff["changed_fields"][k] = {
                "old": active_dict.get(k),
                "new": v,
            }

    now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    cs_id = f"pcs-{secrets.token_hex(6)}"

    conn.execute("BEGIN IMMEDIATE;")
    try:
        conn.execute(
            """
            INSERT INTO execution_policy_change_sets (
                id, title, description, status, proposed_policy_json, diff_json,
                created_by, created_at
            ) VALUES (?, ?, ?, 'DRAFT', ?, ?, ?, ?);
            """,
            (
                cs_id,
                payload.title,
                payload.description,
                json.dumps(proposed_dict),
                json.dumps(diff),
                principal.id,
                now_str,
            ),
        )
        conn.execute("COMMIT;")
    except Exception:
        conn.execute("ROLLBACK;")
        raise

    return ChangeSetResponseDto(
        id=cs_id,
        title=payload.title,
        description=payload.description,
        status="DRAFT",
        diff=diff,
        created_by=principal.id,
        created_at=now_str,
    )


@router.post("/changesets/{cs_id}/apply")
async def apply_policy_changeset(
    cs_id: str,
    principal: OperatorPrincipal = Depends(get_current_principal),
    conn: sqlite3.Connection = Depends(get_db_connection),
):
    """
    Apply an approved execution policy changeset.
    Requires administrator role. Policy changes do NOT arm execution (Section 89).
    Prompt 14.6 Section 88-90.
    """
    if principal.role != "admin":
        raise AppError(
            status_code=403,
            code="INSUFFICIENT_PERMISSIONS",
            message="Only administrators may apply execution policy changesets.",
        )

    cursor = conn.cursor()
    cursor.execute("SELECT * FROM execution_policy_change_sets WHERE id = ?;", (cs_id,))
    row = cursor.fetchone()
    if not row:
        raise ResourceNotFoundError(f"Policy changeset '{cs_id}' not found.")

    if row["status"] == "APPLIED":
        raise ConflictError(f"Policy changeset '{cs_id}' has already been applied.")

    proposed_json = row["proposed_policy_json"]
    try:
        policy_dict = json.loads(proposed_json)
        policy_model = ProductionExecutionPolicy(**policy_dict)
    except Exception as e:
        raise AppError(
            status_code=500,
            code="CORRUPT_CHANGESET_PAYLOAD",
            message=f"Changeset contains invalid policy payload: {e}",
        )

    now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    # Apply policy via ExecutionPolicyService (audited, atomic)
    policy_id = ExecutionPolicyService.apply_policy(
        conn=conn,
        policy=policy_model,
        actor_id=principal.id,
        reason=f"Applied policy changeset {cs_id}: {row['title']}",
    )

    # Mark changeset as APPLIED
    conn.execute(
        """
        UPDATE execution_policy_change_sets
        SET status = 'APPLIED', applied_by = ?, applied_at = ?
        WHERE id = ?;
        """,
        (principal.id, now_str, cs_id),
    )
    conn.commit()

    return {
        "status": "APPLIED",
        "changeset_id": cs_id,
        "policy_id": policy_id,
        "policy_version": policy_model.version,
        "policy_hash": policy_model.policy_hash,
        "applied_by": principal.id,
        "applied_at": now_str,
    }


@router.get("/resources", response_model=List[Dict[str, Any]])
async def list_read_only_resources(
    conn: sqlite3.Connection = Depends(get_db_connection),
):
    """
    List registered read-only resources with safe metadata (Prompt 14.9A.7 Section 64, 69).
    Exposes resource_id, display_name, classification, enabled, max_bytes, etc.
    Does NOT expose host absolute paths.
    """
    from app.services.resource_registry_service import ReadOnlyResourceRegistry
    resources = ReadOnlyResourceRegistry.list_resources(conn)
    return [r.to_safe_metadata() for r in resources]


class RollbackPolicyRequestDto(BaseModel):
    reason: str = Field("Emergency rollback to Production Execution Policy V1", description="Operator justification for rollback")
    correlation_id: Optional[str] = None


@router.post("/rollback", response_model=Dict[str, Any])
async def rollback_execution_policy(
    payload: RollbackPolicyRequestDto,
    principal: OperatorPrincipal = Depends(get_current_principal),
    conn: sqlite3.Connection = Depends(get_db_connection),
):
    """
    Atomic rollback of production execution policy from V2 -> V1 (Prompt 14.9A.7 Section 58).
    Disables SAFE_READ_ONLY eligibility, preserves historical records and audit.
    Execution remains LOCKED.
    """
    if not (principal.has_permission("execution.lock.manage") or principal.has_role("admin") or principal.has_role("security_officer")):
        raise AppError(
            status_code=403,
            code="PERMISSION_DENIED",
            message=f"Principal '{principal.id}' lacks authority to rollback execution policy.",
        )

    policy_id = ExecutionPolicyService.rollback_to_v1(
        conn=conn,
        actor_id=principal.id,
        reason=payload.reason,
        correlation_id=payload.correlation_id,
    )
    active_policy = ExecutionPolicyService.get_active_policy(conn)
    return {
        "status": "ROLLED_BACK",
        "policy_id": policy_id,
        "active_version": active_policy.version,
        "active_hash": active_policy.policy_hash,
        "execution_locked": True,
    }


class RevokeToolRequestDto(BaseModel):
    tool_id: str
    reason: str = Field(..., description="Justification for emergency tool revocation")
    correlation_id: Optional[str] = None


@router.post("/revoke-tool", response_model=Dict[str, Any])
async def revoke_tool_capability(
    payload: RevokeToolRequestDto,
    principal: OperatorPrincipal = Depends(get_current_principal),
    conn: sqlite3.Connection = Depends(get_db_connection),
):
    """
    Emergency tool revocation (Prompt 14.9A.7 Section 59).
    Immediately removes tool from allowed_tools in active policy without gateway restart.
    """
    if not (principal.has_permission("execution.lock.manage") or principal.has_role("admin") or principal.has_role("security_officer")):
        raise AppError(
            status_code=403,
            code="PERMISSION_DENIED",
            message=f"Principal '{principal.id}' lacks authority to revoke tools.",
        )

    policy_id = ExecutionPolicyService.revoke_tool_capability(
        conn=conn,
        tool_id=payload.tool_id,
        actor_id=principal.id,
        reason=payload.reason,
        correlation_id=payload.correlation_id,
    )
    active_policy = ExecutionPolicyService.get_active_policy(conn)
    return {
        "status": "REVOKED",
        "tool_id": payload.tool_id,
        "policy_id": policy_id,
        "active_allowed_tools": getattr(active_policy, "allowed_tools", []),
    }


class ToggleResourceRequestDto(BaseModel):
    resource_id: str
    enabled: bool
    reason: str
    correlation_id: Optional[str] = None


@router.post("/resources/toggle", response_model=Dict[str, Any])
async def toggle_resource(
    payload: ToggleResourceRequestDto,
    principal: OperatorPrincipal = Depends(get_current_principal),
    conn: sqlite3.Connection = Depends(get_db_connection),
):
    """
    Emergency resource status toggle/revocation (Prompt 14.9A.7 Section 60).
    """
    if not (principal.has_permission("execution.lock.manage") or principal.has_role("admin") or principal.has_role("security_officer")):
        raise AppError(
            status_code=403,
            code="PERMISSION_DENIED",
            message=f"Principal '{principal.id}' lacks authority to toggle resources.",
        )

    from app.services.resource_registry_service import ReadOnlyResourceRegistry
    updated = ReadOnlyResourceRegistry.set_resource_enabled(
        conn=conn,
        resource_id=payload.resource_id,
        enabled=payload.enabled,
        actor_id=principal.id,
        reason=payload.reason,
    )
    return {
        "status": "UPDATED",
        "resource": updated.to_safe_metadata(),
    }

