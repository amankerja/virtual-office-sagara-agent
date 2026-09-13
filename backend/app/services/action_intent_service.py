import json
import sqlite3
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any, Optional
from app.api.errors import AppError, ConflictError, ResourceNotFoundError
from app.config import settings
from app.db.connection import get_db_connection
from app.db.migrations import compute_audit_hash
from app.domain.principal import OperatorPrincipal
from app.schemas.action_intents import (
    ActionIntentDto,
    ActionRisk,
    CreateActionIntentDto,
    PreflightResultDto,
)
from app.services.approval_policy import ApprovalPolicyEngine
from app.services.audit_verifier import verify_audit_chain
from app.services.authorization_service import AuthorizationService
from app.services.execution_policy_service import ExecutionPolicyService
from app.services.preflight_service import ActionPreflightService
from app.services.risk_evaluator import ActionRiskEvaluator
from app.services.signing import (
    canonicalize_payload,
    compute_action_signature,
    compute_payload_hash,
    generate_nonce,
    verify_action_signature,
)

ALLOWED_ACTION_TYPES = {
    "TASK_DISPATCH",
    "TASK_CANCEL",
    "PROFILE_CHANGE_APPLY",
    "SKILL_ASSIGNMENT_CHANGE",
    "SCHEDULE_CREATE",
    "SCHEDULE_UPDATE",
    "SCHEDULE_PAUSE",
    "SCHEDULE_CANCEL",
    "SAFETY_GATE_SELF_TEST",
}

FORBIDDEN_GENERIC_ACTIONS = {"RUN_COMMAND", "EXECUTE_TOOL", "CUSTOM"}


class ActionIntentService:
    """Core service managing persistent ActionIntent lifecycle, authorization, preflight, and approvals."""

    def __init__(
        self,
        auth_service: AuthorizationService,
        preflight_service: ActionPreflightService,
        db_path_override: Optional[str] = None,
    ) -> None:
        self._auth_service = auth_service
        self._preflight_service = preflight_service
        self._db_path_override = db_path_override

    def _get_connection(self) -> sqlite3.Connection:
        return get_db_connection(self._db_path_override)

    async def create_intent(
        self,
        dto: CreateActionIntentDto,
        principal: OperatorPrincipal,
        correlation_id: str,
    ) -> ActionIntentDto:
        # Section 13 & 15: Strict allow-list & No generic escape hatches
        if dto.action_type in FORBIDDEN_GENERIC_ACTIONS or dto.action_type not in ALLOWED_ACTION_TYPES:
            raise AppError(
                status_code=400,
                code="ACTION_NOT_ALLOWED",
                message=f"Action type '{dto.action_type}' is not allowed or supported by safety gate.",
                details={"action_type": dto.action_type},
            )

        # Section 17: Backend authorization check
        self._auth_service.authorize_action_request(principal, dto.action_type, dto.target_id)

        now = datetime.now(timezone.utc)
        now_str = now.isoformat().replace("+00:00", "Z")

        # Canonicalize payload and compute SHA-256 fingerprint
        canonical_str = canonicalize_payload(dto.payload)
        payload_hash = compute_payload_hash(dto.payload)

        # Risk & Policy evaluation
        risk = ActionRiskEvaluator.evaluate_risk(dto.action_type, dto.target_type, dto.payload)
        policy = ApprovalPolicyEngine.evaluate_policy(dto.action_type, risk)

        intent_id = f"act-int-{uuid.uuid4().hex[:12]}"
        nonce = generate_nonce()
        expires_at = (now + timedelta(seconds=policy.ttl_seconds)).isoformat().replace("+00:00", "Z")

        # Server-side HMAC-SHA256 signature
        signature = compute_action_signature(
            intent_id=intent_id,
            action_type=dto.action_type,
            target_type=dto.target_type,
            target_id=dto.target_id,
            payload_hash=payload_hash,
            operator_id=principal.id,
            created_at=now_str,
            expires_at=expires_at,
            nonce=nonce,
        )

        # Run initial read-only preflight
        preflight_res = await self._preflight_service.evaluate_preflight(
            action_type=dto.action_type,
            target_type=dto.target_type,
            target_id=dto.target_id,
            payload=dto.payload,
            resource_revision=dto.resource_revision,
        )

        # Determine initial intent status
        if preflight_res.result == "BLOCKED":
            status = "PREFLIGHT_FAILED"
        elif policy.requires_approval:
            status = "READY_FOR_APPROVAL"
        else:
            status = "READY_TO_EXECUTE"

        conn = self._get_connection()
        try:
            conn.execute("BEGIN IMMEDIATE;")

            # Section 71: Audit verification before safety-critical write
            is_audit_valid, audit_err = verify_audit_chain(conn)
            if not is_audit_valid:
                raise AppError(
                    status_code=500,
                    code="AUDIT_INTEGRITY_FAILURE",
                    message=f"Audit chain verification failed: {audit_err}. Mutation rejected.",
                )

            # Get active production execution policy to bind version and hash (Prompt 14.6 Section 62-66)
            try:
                active_exec_policy = ExecutionPolicyService.get_active_policy(conn)
                exec_policy_version = active_exec_policy.version
                exec_policy_hash = active_exec_policy.policy_hash
            except Exception:
                exec_policy_version = "PRODUCTION_EXECUTION_POLICY_V1"
                exec_policy_hash = None

            # Insert into action_intents table
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(action_intents);")
            ai_cols = [r[1] if isinstance(r, (list, tuple)) else r["name"] for r in cursor.fetchall()]

            if "execution_policy_version" in ai_cols and "execution_policy_hash" in ai_cols:
                conn.execute(
                    """
                    INSERT INTO action_intents (
                        id, action_type, target_type, target_id, requested_by,
                        requested_at, payload, payload_hash, risk, status,
                        requires_approval, preflight_revision, resource_revision,
                        preflight_result, nonce, signature, expires_at,
                        correlation_id, created_at, updated_at,
                        execution_policy_version, execution_policy_hash
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        intent_id,
                        dto.action_type,
                        dto.target_type,
                        dto.target_id,
                        principal.id,
                        now_str,
                        canonical_str,
                        payload_hash,
                        risk,
                        status,
                        1 if policy.requires_approval else 0,
                        1,
                        dto.resource_revision,
                        preflight_res.model_dump_json(),
                        nonce,
                        signature,
                        expires_at,
                        correlation_id,
                        now_str,
                        now_str,
                        exec_policy_version,
                        exec_policy_hash,
                    ),
                )
            else:
                conn.execute(
                    """
                    INSERT INTO action_intents (
                        id, action_type, target_type, target_id, requested_by,
                        requested_at, payload, payload_hash, risk, status,
                        requires_approval, preflight_revision, resource_revision,
                        preflight_result, nonce, signature, expires_at,
                        correlation_id, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        intent_id,
                        dto.action_type,
                        dto.target_type,
                        dto.target_id,
                        principal.id,
                        now_str,
                        canonical_str,
                        payload_hash,
                        risk,
                        status,
                        1 if policy.requires_approval else 0,
                        1,
                        dto.resource_revision,
                        preflight_res.model_dump_json(),
                        nonce,
                        signature,
                        expires_at,
                        correlation_id,
                        now_str,
                        now_str,
                    ),
                )

            # If approval is required, create the approval gate record
            approval_id = f"appr-{uuid.uuid4().hex[:12]}"
            if policy.requires_approval:
                preview_dict = {
                    "summary": dto.reason or f"Request to execute {dto.action_type} on {dto.target_id}",
                    "fields": dto.payload,
                }
                conn.execute(
                    """
                    INSERT INTO approvals (
                        id, intent_id, state, risk, action_type, title,
                        description, reason_required, task_id, agent_id,
                        requested_by, requested_at, payload_hash, revision,
                        confirmation_phrase, preview, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        approval_id,
                        intent_id,
                        "PENDING" if status == "PENDING_APPROVAL" else "PENDING",
                        risk,
                        dto.action_type,
                        f"Action: {dto.action_type} -> {dto.target_id}",
                        dto.reason or f"Authorization gate for {dto.action_type}",
                        1 if risk in ("HIGH", "CRITICAL") else 0,
                        dto.target_id if dto.target_type == "TASK" else None,
                        dto.target_id if dto.target_type == "AGENT" else None,
                        principal.id,
                        now_str,
                        payload_hash,
                        1,
                        policy.confirmation_phrase,
                        json.dumps(preview_dict),
                        now_str,
                        now_str,
                    ),
                )

            # Append audit event to tamper-evident ledger (Section 65-68, 101)
            self._append_audit_record(
                conn=conn,
                event_id=f"aud-{uuid.uuid4().hex[:12]}",
                timestamp=now_str,
                actor_id=principal.id,
                action="ACTION_INTENT_CREATED",
                resource_id=intent_id,
                outcome="SUCCESS",
                reason=f"Created intent for {dto.action_type} with risk {risk}",
                correlation_id=correlation_id,
                intent_id=intent_id,
                payload_hash=payload_hash,
                revision=1,
            )

            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise
        finally:
            conn.close()

        return ActionIntentDto(
            id=intent_id,
            action_type=dto.action_type,
            target_type=dto.target_type,
            target_id=dto.target_id,
            requested_by=principal.id,
            requested_at=now_str,
            payload=dto.payload,
            payload_hash=payload_hash,
            risk=risk,
            status=status,
            requires_approval=policy.requires_approval,
            preflight_revision=1,
            resource_revision=dto.resource_revision,
            preflight_result=preflight_res,
            nonce=nonce,
            signature=signature,
            expires_at=expires_at,
            correlation_id=correlation_id,
            created_at=now_str,
            updated_at=now_str,
            execution_policy_version=exec_policy_version,
            execution_policy_hash=exec_policy_hash,
            tool_security_policy_version=dto.payload.get("tool_security_policy_version"),
            tool_security_policy_hash=dto.payload.get("tool_security_policy_hash"),
        )

    async def get_intent(self, intent_id: str) -> ActionIntentDto:
        conn = self._get_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM action_intents WHERE id = ?;", (intent_id,))
            row = cursor.fetchone()
            if not row:
                raise ResourceNotFoundError(f"ActionIntent '{intent_id}' not found.")

            intent = self._map_row_to_intent(row)

            # Verify payload hash matches stored payload
            recomputed_hash = compute_payload_hash(intent.payload)
            if recomputed_hash != intent.payload_hash:
                raise AppError(
                    status_code=400,
                    code="ACTION_INTENT_TAMPERED",
                    message="ActionIntent payload does not match payload_hash fingerprint. Intent has been tampered with.",
                )

            # Verify cryptographic signature and payload hash (Section 23, 59)
            is_valid_sig = verify_action_signature(
                signature=intent.signature,
                intent_id=intent.id,
                action_type=intent.action_type,
                target_type=intent.target_type,
                target_id=intent.target_id,
                payload_hash=intent.payload_hash,
                operator_id=intent.requested_by,
                created_at=intent.created_at,
                expires_at=intent.expires_at,
                nonce=intent.nonce,
            )
            if not is_valid_sig:
                raise AppError(
                    status_code=400,
                    code="ACTION_INTENT_TAMPERED",
                    message="ActionIntent signature verification failed. Intent has been tampered with.",
                )

            # Check expiration
            now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            if now_str > intent.expires_at and intent.status not in ("EXPIRED", "REJECTED", "CANCELLED"):
                conn.execute(
                    "UPDATE action_intents SET status = 'EXPIRED', updated_at = ? WHERE id = ?;",
                    (now_str, intent_id),
                )
                intent.status = "EXPIRED"

            return intent
        finally:
            conn.close()

    async def list_intents(
        self,
        status: Optional[str] = None,
        risk: Optional[str] = None,
        action_type: Optional[str] = None,
        target_id: Optional[str] = None,
        limit: int = 50,
    ) -> list[ActionIntentDto]:
        conn = self._get_connection()
        try:
            query = "SELECT * FROM action_intents WHERE 1=1"
            params = []
            if status and status != "ALL":
                query += " AND status = ?"
                params.append(status)
            if risk and risk != "ALL":
                query += " AND risk = ?"
                params.append(risk)
            if action_type and action_type != "ALL":
                query += " AND action_type = ?"
                params.append(action_type)
            if target_id:
                query += " AND target_id = ?"
                params.append(target_id)

            query += " ORDER BY created_at DESC LIMIT ?"
            params.append(limit)

            cursor = conn.cursor()
            cursor.execute(query, params)
            rows = cursor.fetchall()
            return [self._map_row_to_intent(r) for r in rows]
        finally:
            conn.close()

    async def run_preflight(
        self,
        intent_id: str,
        is_dry_run: bool = False,
        correlation_id: Optional[str] = None,
    ) -> PreflightResultDto:
        intent = await self.get_intent(intent_id)

        preflight_res = await self._preflight_service.evaluate_preflight(
            action_type=intent.action_type,
            target_type=intent.target_type,
            target_id=intent.target_id,
            payload=intent.payload,
            resource_revision=intent.resource_revision,
            is_dry_run=is_dry_run,
        )

        if not is_dry_run:
            now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
            new_rev = intent.preflight_revision + 1
            new_status = intent.status
            if preflight_res.result == "BLOCKED":
                new_status = "PREFLIGHT_FAILED"
            elif preflight_res.result == "REQUIRES_APPROVAL":
                if intent.status == "PREFLIGHT_FAILED":
                    new_status = "READY_FOR_APPROVAL"

            conn = self._get_connection()
            try:
                conn.execute("BEGIN IMMEDIATE;")
                conn.execute(
                    """
                    UPDATE action_intents
                    SET preflight_result = ?, preflight_revision = ?, status = ?, updated_at = ?
                    WHERE id = ?;
                    """,
                    (preflight_res.model_dump_json(), new_rev, new_status, now_str, intent_id),
                )
                self._append_audit_record(
                    conn=conn,
                    event_id=f"aud-{uuid.uuid4().hex[:12]}",
                    timestamp=now_str,
                    actor_id="system",
                    action="ACTION_INTENT_PREFLIGHTED",
                    resource_id=intent_id,
                    outcome=preflight_res.result,
                    reason=f"Preflight status: {preflight_res.result}",
                    correlation_id=correlation_id or intent.correlation_id,
                    intent_id=intent_id,
                    payload_hash=intent.payload_hash,
                    revision=new_rev,
                )
                conn.execute("COMMIT;")
            except Exception:
                conn.execute("ROLLBACK;")
                raise
            finally:
                conn.close()

        return preflight_res

    async def request_approval(
        self,
        intent_id: str,
        principal: OperatorPrincipal,
        correlation_id: str,
    ) -> ActionIntentDto:
        intent = await self.get_intent(intent_id)

        if intent.status in ("APPROVED", "REJECTED", "CANCELLED", "EXPIRED"):
            raise ConflictError(
                code="APPROVAL_ALREADY_RESOLVED",
                message=f"ActionIntent {intent_id} cannot request approval in state '{intent.status}'.",
            )

        now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        conn = self._get_connection()
        try:
            conn.execute("BEGIN IMMEDIATE;")
            conn.execute(
                "UPDATE action_intents SET status = 'PENDING_APPROVAL', updated_at = ? WHERE id = ?;",
                (now_str, intent_id),
            )
            conn.execute(
                "UPDATE approvals SET state = 'PENDING', updated_at = ? WHERE intent_id = ?;",
                (now_str, intent_id),
            )
            self._append_audit_record(
                conn=conn,
                event_id=f"aud-{uuid.uuid4().hex[:12]}",
                timestamp=now_str,
                actor_id=principal.id,
                action="APPROVAL_REQUESTED",
                resource_id=intent_id,
                outcome="SUCCESS",
                reason="Operator submitted intent for human approval",
                correlation_id=correlation_id,
                intent_id=intent_id,
                payload_hash=intent.payload_hash,
            )
            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise
        finally:
            conn.close()

        intent.status = "PENDING_APPROVAL"
        intent.updated_at = now_str
        return intent

    async def approve_intent(
        self,
        intent_id: str,
        principal: OperatorPrincipal,
        reason: Optional[str] = None,
        confirmation_phrase: Optional[str] = None,
        expected_revision: Optional[int] = None,
        correlation_id: Optional[str] = None,
    ) -> ActionIntentDto:
        intent = await self.get_intent(intent_id)

        # 1. State check
        if intent.status == "EXPIRED":
            raise ConflictError(code="ACTION_INTENT_EXPIRED", message="ActionIntent has expired and cannot be approved.")
        if intent.status in ("APPROVED", "REJECTED", "READY_TO_EXECUTE"):
            raise ConflictError(code="APPROVAL_ALREADY_RESOLVED", message=f"ActionIntent is already '{intent.status}'.")

        # 2. Concurrency Revision Check (Section 49)
        if expected_revision is not None and intent.preflight_revision != expected_revision:
            raise ConflictError(
                code="RESOURCE_CONFLICT",
                message=f"Conflict approving intent: expected revision {expected_revision}, current is {intent.preflight_revision}.",
            )

        # 3. Backend Authorization and Self-Approval Enforcement (Section 42 & 44)
        self._auth_service.authorize_action_approval(
            principal=principal,
            intent_requested_by=intent.requested_by,
            risk=intent.risk,
            action_type=intent.action_type,
        )

        # 4. Two-Step Explicit Confirmation for HIGH / CRITICAL (Section 47)
        policy = ApprovalPolicyEngine.evaluate_policy(intent.action_type, intent.risk)
        if policy.confirmation_phrase:
            if not confirmation_phrase or confirmation_phrase.strip().upper() != policy.confirmation_phrase.strip().upper():
                raise AppError(
                    status_code=400,
                    code="APPROVAL_CONFIRMATION_REQUIRED",
                    message=f"Action requires explicit confirmation phrase: '{policy.confirmation_phrase}'.",
                    details={"expected_phrase": policy.confirmation_phrase},
                )

        now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        auth_exec_id = f"exec-auth-{uuid.uuid4().hex[:12]}"
        new_rev = intent.preflight_revision + 1

        conn = self._get_connection()
        try:
            conn.execute("BEGIN IMMEDIATE;")

            # Verify audit chain integrity before resolving
            is_valid, err = verify_audit_chain(conn)
            if not is_valid:
                raise AppError(
                    status_code=500,
                    code="AUDIT_INTEGRITY_FAILURE",
                    message=f"Audit chain verification failed: {err}. Approval locked.",
                )

            # Pessimistic atomic transition to APPROVED and READY_TO_EXECUTE (Section 60, 61, 100)
            conn.execute(
                """
                UPDATE action_intents
                SET status = 'READY_TO_EXECUTE',
                    preflight_revision = ?,
                    execution_authorization_id = ?,
                    updated_at = ?
                WHERE id = ?;
                """,
                (new_rev, auth_exec_id, now_str, intent_id),
            )

            # Update corresponding approval record
            conn.execute(
                """
                UPDATE approvals
                SET state = 'APPROVED',
                    decision = 'APPROVE',
                    decision_maker = ?,
                    decided_at = ?,
                    reason = ?,
                    revision = revision + 1,
                    updated_at = ?
                WHERE intent_id = ?;
                """,
                (principal.id, now_str, reason or "Approved by operator", now_str, intent_id),
            )

            # Append audit records atomically
            self._append_audit_record(
                conn=conn,
                event_id=f"aud-{uuid.uuid4().hex[:12]}",
                timestamp=now_str,
                actor_id=principal.id,
                action="APPROVAL_APPROVED",
                resource_id=intent_id,
                outcome="SUCCESS",
                reason=reason or "Approved by operator",
                correlation_id=correlation_id or intent.correlation_id,
                intent_id=intent_id,
                payload_hash=intent.payload_hash,
                revision=new_rev,
            )

            self._append_audit_record(
                conn=conn,
                event_id=f"aud-{uuid.uuid4().hex[:12]}",
                timestamp=now_str,
                actor_id="system:safety_gate",
                action="ACTION_READY_TO_EXECUTE",
                resource_id=intent_id,
                outcome="SUCCESS",
                reason="Intent is approved and ready. Production execution remains disabled.",
                correlation_id=correlation_id or intent.correlation_id,
                intent_id=intent_id,
                payload_hash=intent.payload_hash,
                revision=new_rev,
            )

            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise
        finally:
            conn.close()

        intent.status = "READY_TO_EXECUTE"
        intent.preflight_revision = new_rev
        intent.execution_authorization_id = auth_exec_id
        intent.updated_at = now_str
        return intent

    async def reject_intent(
        self,
        intent_id: str,
        principal: OperatorPrincipal,
        reason: str,
        expected_revision: Optional[int] = None,
        correlation_id: Optional[str] = None,
    ) -> ActionIntentDto:
        intent = await self.get_intent(intent_id)

        if intent.status in ("APPROVED", "REJECTED", "READY_TO_EXECUTE"):
            raise ConflictError(code="APPROVAL_ALREADY_RESOLVED", message=f"ActionIntent is already '{intent.status}'.")

        if expected_revision is not None and intent.preflight_revision != expected_revision:
            raise ConflictError(
                code="RESOURCE_CONFLICT",
                message=f"Conflict rejecting intent: expected revision {expected_revision}, current is {intent.preflight_revision}.",
            )

        now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        new_rev = intent.preflight_revision + 1

        conn = self._get_connection()
        try:
            conn.execute("BEGIN IMMEDIATE;")
            conn.execute(
                "UPDATE action_intents SET status = 'REJECTED', preflight_revision = ?, updated_at = ? WHERE id = ?;",
                (new_rev, now_str, intent_id),
            )
            conn.execute(
                """
                UPDATE approvals
                SET state = 'REJECTED',
                    decision = 'REJECT',
                    decision_maker = ?,
                    decided_at = ?,
                    reason = ?,
                    revision = revision + 1,
                    updated_at = ?
                WHERE intent_id = ?;
                """,
                (principal.id, now_str, reason, now_str, intent_id),
            )
            self._append_audit_record(
                conn=conn,
                event_id=f"aud-{uuid.uuid4().hex[:12]}",
                timestamp=now_str,
                actor_id=principal.id,
                action="APPROVAL_REJECTED",
                resource_id=intent_id,
                outcome="DENIED",
                reason=reason,
                correlation_id=correlation_id or intent.correlation_id,
                intent_id=intent_id,
                payload_hash=intent.payload_hash,
                revision=new_rev,
            )
            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise
        finally:
            conn.close()

        intent.status = "REJECTED"
        intent.preflight_revision = new_rev
        intent.updated_at = now_str
        return intent

    async def cancel_intent(
        self,
        intent_id: str,
        principal: OperatorPrincipal,
        reason: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> ActionIntentDto:
        intent = await self.get_intent(intent_id)
        self._auth_service.authorize_action_cancel(principal, intent.requested_by)

        if intent.status in ("APPROVED", "READY_TO_EXECUTE", "REJECTED", "EXPIRED"):
            raise ConflictError(
                code="APPROVAL_ALREADY_RESOLVED",
                message=f"ActionIntent cannot be cancelled in state '{intent.status}'.",
            )

        now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        new_rev = intent.preflight_revision + 1

        conn = self._get_connection()
        try:
            conn.execute("BEGIN IMMEDIATE;")
            conn.execute(
                "UPDATE action_intents SET status = 'CANCELLED', preflight_revision = ?, updated_at = ? WHERE id = ?;",
                (new_rev, now_str, intent_id),
            )
            conn.execute(
                """
                UPDATE approvals
                SET state = 'CANCELLED',
                    decision = 'CANCEL',
                    decision_maker = ?,
                    decided_at = ?,
                    reason = ?,
                    revision = revision + 1,
                    updated_at = ?
                WHERE intent_id = ?;
                """,
                (principal.id, now_str, reason or "Cancelled by operator", now_str, intent_id),
            )
            self._append_audit_record(
                conn=conn,
                event_id=f"aud-{uuid.uuid4().hex[:12]}",
                timestamp=now_str,
                actor_id=principal.id,
                action="ACTION_INTENT_CANCELLED",
                resource_id=intent_id,
                outcome="SUCCESS",
                reason=reason or "Cancelled by operator",
                correlation_id=correlation_id or intent.correlation_id,
                intent_id=intent_id,
                payload_hash=intent.payload_hash,
                revision=new_rev,
            )
            conn.execute("COMMIT;")
        except Exception:
            conn.execute("ROLLBACK;")
            raise
        finally:
            conn.close()

        intent.status = "CANCELLED"
        intent.preflight_revision = new_rev
        intent.updated_at = now_str
        return intent

    def _append_audit_record(
        self,
        conn: sqlite3.Connection,
        event_id: str,
        timestamp: str,
        actor_id: str,
        action: str,
        resource_id: str,
        outcome: str,
        reason: Optional[str],
        correlation_id: str,
        intent_id: Optional[str] = None,
        payload_hash: Optional[str] = None,
        revision: int = 1,
    ) -> None:
        cursor = conn.cursor()
        cursor.execute("SELECT sequence, record_hash FROM audit_ledger ORDER BY sequence DESC LIMIT 1;")
        last_row = cursor.fetchone()
        if last_row:
            next_seq = last_row["sequence"] + 1
            prev_hash = last_row["record_hash"]
        else:
            next_seq = 0
            prev_hash = "0000000000000000000000000000000000000000000000000000000000000000"

        rec_hash = compute_audit_hash(
            sequence=next_seq,
            event_id=event_id,
            timestamp=timestamp,
            actor_id=actor_id,
            action=action,
            resource_id=resource_id,
            outcome=outcome,
            reason=reason,
            intent_id=intent_id,
            payload_hash=payload_hash,
            previous_hash=prev_hash,
        )

        conn.execute(
            """
            INSERT INTO audit_ledger (
                event_id, sequence, timestamp, actor_type, actor_id, actor_label,
                action, resource_type, resource_id, resource_label, outcome, reason,
                correlation_id, intent_id, payload_hash, revision, previous_hash, record_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (
                event_id,
                next_seq,
                timestamp,
                "USER" if not actor_id.startswith("system") else "SYSTEM",
                actor_id,
                actor_id,
                action,
                "ACTION_INTENT",
                resource_id,
                resource_id,
                outcome,
                reason,
                correlation_id,
                intent_id,
                payload_hash,
                revision,
                prev_hash,
                rec_hash,
            ),
        )

    def _map_row_to_intent(self, row: sqlite3.Row) -> ActionIntentDto:
        payload = json.loads(row["payload"]) if row["payload"] else {}
        preflight_dict = json.loads(row["preflight_result"]) if row["preflight_result"] else None
        preflight_res = PreflightResultDto(**preflight_dict) if preflight_dict else None

        keys = row.keys() if hasattr(row, "keys") else []
        exec_pol_ver = row["execution_policy_version"] if "execution_policy_version" in keys else None
        exec_pol_hash = row["execution_policy_hash"] if "execution_policy_hash" in keys else None

        return ActionIntentDto(
            id=row["id"],
            action_type=row["action_type"],
            target_type=row["target_type"],
            target_id=row["target_id"],
            requested_by=row["requested_by"],
            requested_at=row["requested_at"],
            payload=payload,
            payload_hash=row["payload_hash"],
            risk=row["risk"],
            status=row["status"],
            requires_approval=bool(row["requires_approval"]),
            preflight_revision=row["preflight_revision"] or 1,
            resource_revision=row["resource_revision"],
            preflight_result=preflight_res,
            nonce=row["nonce"],
            signature=row["signature"],
            expires_at=row["expires_at"],
            correlation_id=row["correlation_id"],
            created_at=row["created_at"],
            updated_at=row["updated_at"],
            execution_authorization_id=row["execution_authorization_id"],
            execution_policy_version=exec_pol_ver,
            execution_policy_hash=exec_pol_hash,
            tool_security_policy_version=payload.get("tool_security_policy_version"),
            tool_security_policy_hash=payload.get("tool_security_policy_hash"),
        )
