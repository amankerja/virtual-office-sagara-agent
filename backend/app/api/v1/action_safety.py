import sqlite3
from fastapi import APIRouter, Depends
from pydantic import BaseModel, ConfigDict
from app.api.dependencies import get_sqlite_audit_repo
from app.config import settings
from app.db.connection import get_db_connection
from app.repositories.sqlite.audit_repo import SqliteAuditRepository
from app.schemas.action_intents import ActionSafetyStatusDto
from app.services.audit_verifier import verify_audit_chain

router = APIRouter(prefix="/action-safety", tags=["Action Safety"])


class AuditVerificationResult(BaseModel):
    model_config = ConfigDict(extra="ignore")
    valid: bool
    status: str
    detail: str
    records_checked: int


@router.get("/status", response_model=ActionSafetyStatusDto)
async def get_action_safety_status() -> ActionSafetyStatusDto:
    """Return runtime safety posture, signing status, persistence, and audit state."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS cnt FROM action_intents WHERE status NOT IN ('REJECTED', 'EXPIRED', 'CANCELLED');")
        active_intents = cursor.fetchone()["cnt"]

        cursor.execute("SELECT COUNT(*) AS cnt FROM approvals WHERE state = 'PENDING';")
        pending_approvals = cursor.fetchone()["cnt"]

        is_chain_valid, _ = verify_audit_chain(conn)
        signing_status = "CONFIGURED" if settings.action_signing_key or settings.environment == "development" else "MISSING"

        from app.repositories.sqlite.execution_repo import ExecutionSqliteRepository
        from app.services.execution_kill_switch import ExecutionKillSwitch
        import os

        exec_repo = ExecutionSqliteRepository(conn)
        db_lock = exec_repo.get_execution_lock("global_dispatch")
        is_locked, _ = ExecutionKillSwitch.is_locked(conn)

        auth_configured = (settings.trusted_auth_proxy_enabled and len(settings.trusted_proxy_cidrs) > 0) or settings.environment == "development"
        hermes_avail = bool(settings.hermes_binary and os.path.isfile(settings.hermes_binary))

        exec_ready = (
            not is_locked
            and auth_configured
            and signing_status == "CONFIGURED"
            and is_chain_valid
            and settings.execution_enabled
            and hermes_avail
        )

        return ActionSafetyStatusDto(
            execution_mode="ENABLED" if (settings.execution_enabled and not is_locked) else "DISABLED",
            action_signing=signing_status,
            persistent_idempotency="HEALTHY",
            audit_chain="VALID" if is_chain_valid else "TAMPER_DETECTED",
            approval_policy="LOADED",
            executor="HERMES_TASK_DISPATCH" if settings.execution_enabled else "DISABLED",
            control_db="CONNECTED",
            schema_version=2,
            active_intents_count=active_intents,
            pending_approvals_count=pending_approvals,
            kill_switch_status=db_lock,
            execution_feature_enabled=settings.execution_enabled,
            trusted_auth_configured=auth_configured,
            hermes_interface_available=hermes_avail,
            direct_session_receipt_supported=True,
            execution_ready=exec_ready,
        )
    finally:
        conn.close()


@router.post("/audit/verify", response_model=AuditVerificationResult)
async def run_audit_verification(
    audit_repo: SqliteAuditRepository = Depends(get_sqlite_audit_repo),
) -> AuditVerificationResult:
    """
    Run cryptographic verification over the Mission Control append-only audit chain.
    Strictly read-only inspection of Mission Control storage (never touches Hermes).
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) AS cnt FROM audit_ledger;")
        records_count = cursor.fetchone()["cnt"]

        is_valid, err_msg = verify_audit_chain(conn)
        if is_valid:
            return AuditVerificationResult(
                valid=True,
                status="VALID",
                detail=f"Audit chain intact across {records_count} records from genesis block.",
                records_checked=records_count,
            )
        else:
            return AuditVerificationResult(
                valid=False,
                status="TAMPER_DETECTED",
                detail=err_msg or "Hash chain verification failed.",
                records_checked=records_count,
            )
    finally:
        conn.close()
