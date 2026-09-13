import secrets
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from app.api.errors import AppError
from app.config import settings
from app.schemas.action_intents import ActionIntentDto
from app.services.action_intent_service import ActionIntentService
from app.domain.execution import (
    ExecutionAuthorization,
    ExecutionAttempt,
    ExecutionReceipt,
    TaskDispatchExecutionRequest,
    TaskDispatchExecutionResult,
    compute_receipt_hash,
)
from app.domain.principal import OperatorPrincipal
from app.repositories.sqlite.audit_repo import append_audit_entry_to_conn
from app.repositories.sqlite.execution_repo import ExecutionSqliteRepository
from app.repositories.sqlite.idempotency_repo import PersistentIdempotencyStore
from app.services.final_preflight_service import (
    FinalExecutionPreflightService,
    FinalPreflightResult,
)
from pathlib import Path
from app.services.signing import compute_payload_hash


def _resolve_mission_control_base_dir() -> Path:
    b = Path(__file__).resolve().parents[3]
    if not (b / "docs").exists():
        return Path.cwd()
    return b


class TaskDispatchCoordinator:
    """
    Coordinates the controlled execution of approved TASK_DISPATCH action intents (Prompt 14).
    Enforces:
    - Final execution preflight
    - Single-use authorization claim
    - At-most-once submission state machine
    - Direct task <-> session correlation
    - Tamper-evident hash-chained audit logging
    - Separation of database lock from external process execution
    """

    def __init__(
        self,
        conn: Optional[sqlite3.Connection] = None,
        executor=None,
        profile_registry=None,
        task_repository=None,
        idempotency_store: Optional[PersistentIdempotencyStore] = None,
        realtime_service=None,
        action_intent_service: Optional[ActionIntentService] = None,
    ):
        if conn is not None:
            self._conn = conn
        else:
            from app.db.connection import get_db_connection
            self._conn = get_db_connection()
        self._executor = executor
        self._profiles = profile_registry
        self._tasks = task_repository
        self._idempotency = idempotency_store or PersistentIdempotencyStore()
        self._realtime = realtime_service
        self._action_intent_service = action_intent_service

    async def execute_task_dispatch(
        self,
        intent_id: str,
        principal: OperatorPrincipal,
        idempotency_key: str,
        if_match_revision: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Execute an approved task dispatch intent.
        """
        # 1. Check Persistent Idempotency
        exec_payload_hash = self._idempotency.compute_hash({"intent_id": intent_id})
        cached = await self._idempotency.get_response(
            key=idempotency_key,
            operation="task_execution",
            payload_hash=exec_payload_hash,
            principal_id=principal.id,
        )
        if cached:
            return cached

        # 2. Load Intent
        if self._action_intent_service is not None:
            intent = await self._action_intent_service.get_intent(intent_id)
        else:
            cursor = self._conn.cursor()
            cursor.execute("SELECT * FROM action_intents WHERE id = ?", (intent_id,))
            row = cursor.fetchone()
            if not row:
                raise AppError(
                    status_code=404,
                    code="ACTION_INTENT_NOT_FOUND",
                    message=f"Action intent '{intent_id}' not found.",
                )
            import json
            preflight_res = None
            if row["preflight_result"]:
                try:
                    preflight_res = json.loads(row["preflight_result"])
                except Exception:
                    preflight_res = None
            row_keys = row.keys() if hasattr(row, "keys") else []
            intent = ActionIntentDto(
                id=row["id"],
                action_type=row["action_type"],
                target_type=row["target_type"],
                target_id=row["target_id"],
                requested_by=row["requested_by"],
                requested_at=row["requested_at"],
                payload=json.loads(row["payload"]) if isinstance(row["payload"], str) else (row["payload"] or {}),
                payload_hash=row["payload_hash"],
                risk=row["risk"],
                status=row["status"],
                requires_approval=bool(row["requires_approval"]),
                preflight_revision=row["preflight_revision"],
                resource_revision=row["resource_revision"],
                preflight_result=preflight_res,
                nonce=row["nonce"],
                signature=row["signature"],
                expires_at=row["expires_at"],
                correlation_id=row["correlation_id"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                execution_authorization_id=row["execution_authorization_id"] if "execution_authorization_id" in row_keys else None,
            )

        # Concurrency / revision check
        if if_match_revision is not None and intent.preflight_revision != if_match_revision:
            raise AppError(
                status_code=409,
                code="RESOURCE_CONFLICT",
                message=f"Preflight revision mismatch: intent is at revision {intent.preflight_revision}, client specified {if_match_revision}.",
            )

        # 3. Final Execution Preflight
        preflight_service = FinalExecutionPreflightService(
            conn=self._conn,
            profile_registry=self._profiles,
            task_repository=self._tasks,
            executor=self._executor,
        )
        preflight_res: FinalPreflightResult = await preflight_service.evaluate(
            intent=intent,
            principal=principal,
            expected_task_revision=if_match_revision,
        )

        if not preflight_res.passed:
            raise AppError(
                status_code=403,
                code="FINAL_PREFLIGHT_FAILED",
                message="Final execution preflight failed.",
                details={
                    "blocking_reasons": preflight_res.blocking_reasons,
                    "targetability": preflight_res.targetability,
                },
            )

        # 4. Atomic Preparation Transaction: Authorization & Attempt
        now_dt = datetime.now(timezone.utc)
        now_str = now_dt.isoformat().replace("+00:00", "Z")
        auth_ttl = settings.execution_auth_ttl_seconds
        expires_str = (now_dt + timedelta(seconds=auth_ttl)).isoformat().replace("+00:00", "Z")

        auth_id = f"auth-{secrets.token_hex(8)}"
        attempt_id = f"att-{secrets.token_hex(8)}"
        task_id = intent.payload.get("task_id", intent.target_id)
        profile_id = intent.payload.get("target_profile_id", intent.target_id)
        task_rev = intent.resource_revision or 1

        auth = ExecutionAuthorization(
            id=auth_id,
            intent_id=intent.id,
            payload_hash=intent.payload_hash,
            profile_id=profile_id,
            task_id=task_id,
            task_revision=task_rev,
            issued_to=principal.id,
            issued_at=now_str,
            expires_at=expires_str,
            nonce=secrets.token_hex(16),
            state="ISSUED",
            consumed_at=None,
            execution_attempt_id=None,
        )

        attempt = ExecutionAttempt(
            id=attempt_id,
            intent_id=intent.id,
            authorization_id=auth_id,
            task_id=task_id,
            profile_id=profile_id,
            correlation_id=intent.correlation_id,
            state="SUBMITTING",
            created_at=now_str,
            claimed_at=now_str,
            submitted_at=now_str,
        )

        # Commit state to database BEFORE calling external executor (Prompt 14 Section 75-76, Prompt 14.4 Section 54-56)
        exec_repo = ExecutionSqliteRepository(self._conn)

        self._conn.execute("BEGIN IMMEDIATE;")
        try:
            # If an active execution window exists, claim an execution slot from it (Prompt 14.4 Section 54-56, 95-96)
            active_window = exec_repo.get_active_execution_window("global_dispatch")
            if active_window:
                slot_claimed = exec_repo.claim_execution_slot(active_window.id, now_str)
                if not slot_claimed:
                    raise AppError(status_code=403, code="EXECUTION_BUDGET_EXHAUSTED", message=f"Execution budget exhausted or window '{active_window.id}' expired.")

            exec_repo.save_authorization(auth)
            claimed = exec_repo.claim_authorization(auth_id=auth.id, attempt_id=attempt.id, claimed_at=now_str)
            if not claimed:
                raise AppError(status_code=409, code="AUTHORIZATION_ALREADY_CLAIMED", message=f"Execution authorization '{auth.id}' could not be claimed.")
            exec_repo.save_attempt(attempt)

            # Record audit event: submission started

            append_audit_entry_to_conn(
                conn=self._conn,
                event_id=f"aud-{secrets.token_hex(8)}",
                timestamp=now_str,
                actor_type="USER",
                actor_id=principal.id,
                actor_label=principal.display_name or principal.id,
                action="execution.submission_started",
                resource_type="TASK",
                resource_id=task_id,
                resource_label=f"Task {task_id}",
                outcome="SUCCESS",
                reason=f"Execution authorization {auth_id} claimed and submission initiated",
                correlation_id=intent.correlation_id,
                intent_id=intent.id,
                payload_hash=intent.payload_hash,
                revision=task_rev,
            )
            self._conn.execute("COMMIT;")
        except Exception as e:
            self._conn.execute("ROLLBACK;")
            raise AppError(status_code=500, code="EXECUTION_PREPARATION_FAILED", message=f"Failed to record execution attempt: {e}")

        # 5. Invoke External Executor (Outside database write transaction)
        from app.services.execution_policy_service import ExecutionPolicyService
        active_policy = ExecutionPolicyService.get_active_policy(self._conn)
        prof_rule = active_policy.profiles.get(profile_id)
        effective_safe_mode = True
        effective_tools_enabled = False

        is_canary_safe_read_only = (
            intent.payload.get("execution_mode") == "SAFE_READ_ONLY"
            or intent.payload.get("task_class") == "READ_ONLY_INSPECTION"
        )
        tool_count = 0
        tool_result_content = None
        tool_policy_ver = None
        tool_policy_hash = None

        if is_canary_safe_read_only:
            from app.services.tool_security_service import ToolSecurityService
            tool_policy = ToolSecurityService.get_installed_policy(self._conn)
            tool_policy_ver = tool_policy.version
            tool_policy_hash = tool_policy.policy_hash

            req_tool = intent.payload.get("tool_id", "runtime_status")
            req_op = intent.payload.get("operation", "inspect_service")

            cap = tool_policy.approved_capabilities.get(req_tool)
            if not cap:
                raise AppError(status_code=403, code="UNAUTHORIZED_TOOL", message=f"Tool '{req_tool}' not in approved capabilities.")
            op = cap.operations.get(req_op)
            if not op:
                raise AppError(status_code=403, code="UNAUTHORIZED_OPERATION", message=f"Operation '{req_op}' not in tool capabilities.")

            if req_tool == "runtime_status":
                req_resource = intent.payload.get("resource", "hermes-gateway.service")
                req_props = intent.payload.get("properties") or ["ActiveState", "SubState", "MainPID", "NRestarts", "ActiveEnterTimestamp", "UnitFileState"]

                def server_systemctl_runner(cmd_argv, timeout_sec):
                    import subprocess
                    remote_cmd = " ".join(cmd_argv)
                    res = subprocess.run(["ssh", "sagara", remote_cmd], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=timeout_sec)
                    return res.stdout

                envelope = ToolSecurityService.execute_runtime_status(
                    unit=req_resource,
                    properties=req_props,
                    resource_scope=cap.resource_scope,
                    op_policy=op,
                    command_runner=server_systemctl_runner,
                )
                audit_args = {"unit": req_resource, "properties": req_props}

            elif req_tool == "document_inspection":
                req_resource = intent.payload.get("resource") or intent.payload.get("path")
                max_bytes = intent.payload.get("max_bytes", op.max_result_bytes)
                base_dir = _resolve_mission_control_base_dir()

                envelope = ToolSecurityService.execute_document_inspection(
                    raw_path=req_resource,
                    max_bytes=max_bytes,
                    resource_scope=cap.resource_scope,
                    op_policy=op,
                    base_dir=base_dir,
                )
                audit_args = {"path": req_resource, "max_bytes": max_bytes}

            else:
                raise AppError(status_code=403, code="UNAUTHORIZED_TOOL", message=f"Tool '{req_tool}' is unauthorized for SAFE_READ_ONLY canary.")

            tool_count = 1
            tool_result_content = envelope.content

            ToolSecurityService.record_tool_audit(
                conn=self._conn,
                intent_id=intent.id,
                tool_id=req_tool,
                operation_id=req_op,
                profile_id=profile_id,
                status="EXECUTED",
                denial_reason=None,
                arguments=audit_args,
                result_bytes=len(envelope.content),
                result_content=envelope.content,
                redacted=envelope.redacted,
            )

        prompt_text = intent.payload.get("prompt", f"Execute task {task_id}")
        if is_canary_safe_read_only and tool_result_content:
            prompt_text += f"\n\n=== UNTRUSTED TOOL DATA ({req_tool}.{req_op}) ===\n{tool_result_content}\n=======================================================\n"

        exec_request = TaskDispatchExecutionRequest(
            intent_id=intent.id,
            task_id=task_id,
            profile_id=profile_id,
            task_revision=task_rev,
            payload_hash=intent.payload_hash,
            correlation_id=intent.correlation_id,
            execution_authorization_id=auth_id,
            prompt=prompt_text,
            timeout_seconds=min(settings.execution_timeout_seconds, (prof_rule.timeout_seconds if prof_rule else 300.0)),
            tools_enabled=effective_tools_enabled,
            safe_mode=effective_safe_mode,
        )

        exec_result: TaskDispatchExecutionResult = await self._executor.dispatch_task(exec_request)

        # 6. Post-Execution Transaction: Persist Receipt and Correlation
        post_dt = datetime.now(timezone.utc)
        post_str = post_dt.isoformat().replace("+00:00", "Z")

        self._conn.execute("BEGIN IMMEDIATE;")
        try:
            if exec_result.outcome == "ACKNOWLEDGED" and exec_result.hermes_session_id:
                receipt_id = f"rcpt-{secrets.token_hex(8)}"
                rec_hash = compute_receipt_hash(
                    receipt_id=receipt_id,
                    attempt_id=attempt_id,
                    intent_id=intent.id,
                    task_id=task_id,
                    profile_id=profile_id,
                    hermes_session_id=exec_result.hermes_session_id,
                    submitted_at=now_str,
                    acknowledged_at=exec_result.acknowledged_at or post_str,
                    executor_type=exec_result.executor_type,
                    correlation_id=intent.correlation_id,
                    result="SUCCESS",
                )

                receipt = ExecutionReceipt(
                    receipt_id=receipt_id,
                    attempt_id=attempt_id,
                    intent_id=intent.id,
                    task_id=task_id,
                    profile_id=profile_id,
                    hermes_session_id=exec_result.hermes_session_id,
                    submitted_at=now_str,
                    acknowledged_at=exec_result.acknowledged_at or post_str,
                    executor_type=exec_result.executor_type,
                    executor_version=exec_result.executor_version,
                    correlation_id=intent.correlation_id,
                    result="SUCCESS",
                    receipt_hash=rec_hash,
                    created_at=post_str,
                    execution_policy_version=active_policy.version,
                    execution_policy_hash=active_policy.policy_hash,
                    execution_mode="SAFE_READ_ONLY" if is_canary_safe_read_only else ("SAFE_NO_TOOLS" if effective_safe_mode else "APPROVED_TOOLS"),
                    tool_security_policy_version=tool_policy_ver,
                    tool_security_policy_hash=tool_policy_hash,
                    tool_executions_count=tool_count,
                )

                exec_repo.save_receipt(receipt)
                exec_repo.save_correlation(
                    task_id=task_id,
                    intent_id=intent.id,
                    execution_attempt_id=attempt_id,
                    hermes_session_id=exec_result.hermes_session_id,
                    correlation_id=intent.correlation_id,
                    created_at=post_str,
                )
                exec_repo.consume_authorization(auth_id, post_str)

                exec_repo.update_attempt_state(
                    attempt_id=attempt_id,
                    state="ACKNOWLEDGED",
                    acknowledged_at=exec_result.acknowledged_at or post_str,
                    completed_at=post_str,
                    session_id=exec_result.hermes_session_id,
                )

                # Update Task state in task store if available
                if self._tasks:
                    try:
                        import inspect
                        from app.schemas.tasks import UpdateTaskDto
                        if hasattr(self._tasks, "update_task"):
                            upd_coro = self._tasks.update_task(task_id, UpdateTaskDto(state="RUNNING"))
                            if inspect.isawaitable(upd_coro):
                                await upd_coro
                        elif hasattr(self._tasks, "update_task_status"):
                            self._tasks.update_task_status(task_id, "RUNNING")
                    except Exception:
                        pass

                # Append audit record
                append_audit_entry_to_conn(
                    conn=self._conn,
                    event_id=f"aud-{secrets.token_hex(8)}",
                    timestamp=post_str,
                    actor_type="USER",
                    actor_id=principal.id,
                    actor_label=principal.display_name or principal.id,
                    action="execution.acknowledged",
                    resource_type="TASK",
                    resource_id=task_id,
                    resource_label=f"Task {task_id}",
                    outcome="SUCCESS",
                    reason=f"Hermes execution acknowledged with direct session '{exec_result.hermes_session_id}'",
                    correlation_id=intent.correlation_id,
                    intent_id=intent.id,
                    payload_hash=intent.payload_hash,
                    revision=task_rev,
                )

                response_data = {
                    "status": "ACKNOWLEDGED",
                    "receipt_id": receipt_id,
                    "attempt_id": attempt_id,
                    "hermes_session_id": exec_result.hermes_session_id,
                    "receipt_hash": rec_hash,
                    "submitted_at": now_str,
                    "acknowledged_at": exec_result.acknowledged_at or post_str,
                    "receipt": receipt.model_dump(),
                    "raw_output": exec_result.raw_output_snippet,
                }

            elif exec_result.outcome == "FAILED_PRE_SUBMISSION":
                exec_repo.update_attempt_state(
                    attempt_id=attempt_id,
                    state="FAILED_PRE_SUBMISSION",
                    error_code=exec_result.error_code,
                    completed_at=post_str,
                )
                append_audit_entry_to_conn(
                    conn=self._conn,
                    event_id=f"aud-{secrets.token_hex(8)}",
                    timestamp=post_str,
                    actor_type="USER",
                    actor_id=principal.id,
                    actor_label=principal.display_name or principal.id,
                    action="execution.failed",
                    resource_type="TASK",
                    resource_id=task_id,
                    resource_label=f"Task {task_id}",
                    outcome="FAILED",
                    reason=f"Pre-submission failure: {exec_result.error_code}",
                    correlation_id=intent.correlation_id,
                    intent_id=intent.id,
                    payload_hash=intent.payload_hash,
                    revision=task_rev,
                )
                response_data = {
                    "status": "FAILED_PRE_SUBMISSION",
                    "attempt_id": attempt_id,
                    "error_code": exec_result.error_code,
                    "detail": exec_result.raw_output_snippet,
                }

            else:
                # OUTCOME_UNKNOWN (Section 56 & 83: NO BLIND RETRY)
                exec_repo.update_attempt_state(
                    attempt_id=attempt_id,
                    state="OUTCOME_UNKNOWN",
                    error_code=exec_result.error_code or "OUTCOME_UNKNOWN",
                    completed_at=post_str,
                )
                append_audit_entry_to_conn(
                    conn=self._conn,
                    event_id=f"aud-{secrets.token_hex(8)}",
                    timestamp=post_str,
                    actor_type="USER",
                    actor_id=principal.id,
                    actor_label=principal.display_name or principal.id,
                    action="execution.outcome_unknown",
                    resource_type="TASK",
                    resource_id=task_id,
                    resource_label=f"Task {task_id}",
                    outcome="UNKNOWN",
                    reason=f"Ambiguous execution outcome: {exec_result.error_code}. Reconciliation required.",
                    correlation_id=intent.correlation_id,
                    intent_id=intent.id,
                    payload_hash=intent.payload_hash,
                    revision=task_rev,
                )
                response_data = {
                    "status": "OUTCOME_UNKNOWN",
                    "attempt_id": attempt_id,
                    "error_code": exec_result.error_code or "OUTCOME_UNKNOWN",
                    "detail": "Hermes execution request outcome is unknown. Automatic retry is forbidden. Reconciliation required.",
                }

            self._conn.execute("COMMIT;")
        except Exception as e:
            self._conn.execute("ROLLBACK;")
            raise AppError(status_code=500, code="POST_EXECUTION_STATE_FAILED", message=f"Failed to persist execution state: {e}")

        # Save Idempotency Record (outside database write lock)
        await self._idempotency.save_response(
            key=idempotency_key,
            operation="task_execution",
            payload_hash=exec_payload_hash,
            response=response_data,
            principal_id=principal.id,
            response_code=200 if response_data["status"] == "ACKNOWLEDGED" else 400,
            ttl_seconds=settings.idempotency_ttl_seconds,
        )

        # Realtime broadcast if available
        if self._realtime and hasattr(self._realtime, "broadcast"):
            try:
                self._realtime.broadcast("task_execution_update", response_data)
            except Exception:
                pass

        return response_data
