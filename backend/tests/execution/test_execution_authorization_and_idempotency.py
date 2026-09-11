import asyncio
import sqlite3
import tempfile
from pathlib import Path
import pytest

from app.config import settings
from app.db.connection import get_db_connection
from app.db.migrations import run_migrations
from app.domain.execution import ExecutionAuthorization, ExecutionAttempt
from app.domain.principal import OperatorPrincipal
from app.schemas.profiles import ProfileDto
from app.repositories.memory.task_repo import InMemoryTaskRepository
from app.repositories.sqlite.execution_repo import ExecutionSqliteRepository
from app.repositories.sqlite.idempotency_repo import PersistentIdempotencyStore
from app.schemas.action_intents import CreateActionIntentDto
from app.schemas.tasks import TaskDto
from app.services.action_intent_service import ActionIntentService
from app.services.authorization_service import AuthorizationService
from app.services.executor import FakeHermesTaskDispatchExecutor
from app.services.preflight_service import ActionPreflightService
from app.services.reconciliation_service import ExecutionReconciliationService
from app.services.task_dispatch_coordinator import TaskDispatchCoordinator


class StubProfileCatalog:
    def __init__(self):
        self.profile = ProfileDto(id="profile-1", name="Agent One", enabled=True)

    async def get_profile(self, profile_id: str):
        if profile_id == "profile-1":
            return self.profile
        return None


@pytest.fixture
async def execution_env(monkeypatch):
    monkeypatch.setattr(settings, "execution_enabled", True)
    monkeypatch.setattr(settings, "action_signing_key", "test-secret-signing-key-minimum-length-32")

    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    conn = get_db_connection(db_path)
    run_migrations(conn)

    # Unlock kill switch in DB
    exec_repo = ExecutionSqliteRepository(conn)
    exec_repo.set_execution_lock("global_dispatch", "UNLOCKED")

    task_repo = InMemoryTaskRepository()
    task = TaskDto(
        id="task-dispatch-01",
        title="Dispatchable Task",
        state="READY",
        priority="MEDIUM",
        created_at="2026-09-11T00:00:00Z",
        assigned_agent_id="profile-1",
        revision=1,
    )
    task_repo._tasks.append(task)

    profile_catalog = StubProfileCatalog()
    auth = AuthorizationService()
    preflight = ActionPreflightService(
        profile_catalog=profile_catalog,
        skill_catalog=None,
        agent_service=None,
        task_repo=task_repo,
    )
    intent_svc = ActionIntentService(auth_service=auth, preflight_service=preflight, db_path_override=db_path)
    executor = FakeHermesTaskDispatchExecutor(simulated_session_id="sess-e2e")
    idempotency_store = PersistentIdempotencyStore(db_path_override=db_path)

    coordinator = TaskDispatchCoordinator(
        conn=conn,
        executor=executor,
        profile_registry=profile_catalog,
        task_repository=task_repo,
        idempotency_store=idempotency_store,
        action_intent_service=intent_svc,
    )

    try:
        yield {
            "conn": conn,
            "db_path": db_path,
            "intent_svc": intent_svc,
            "task_repo": task_repo,
            "executor": executor,
            "coordinator": coordinator,
            "exec_repo": exec_repo,
        }
    finally:
        conn.close()
        Path(db_path).unlink(missing_ok=True)


@pytest.mark.asyncio
async def test_single_use_authorization_claim(execution_env):
    conn = execution_env["conn"]
    exec_repo = execution_env["exec_repo"]
    intent_svc = execution_env["intent_svc"]

    requester = OperatorPrincipal(id="operator-1", roles=["operator"])
    dto = CreateActionIntentDto(
        action_type="TASK_DISPATCH",
        target_type="TASK",
        target_id="task-dispatch-01",
        payload={"task_id": "task-dispatch-01", "target_profile_id": "profile-1"},
    )
    intent = await intent_svc.create_intent(dto, principal=requester, correlation_id="corr-claim-1")

    auth = ExecutionAuthorization(
        id="auth-test-claim-1",
        intent_id=intent.id,
        payload_hash=intent.payload_hash,
        profile_id="profile-1",
        task_id="task-dispatch-01",
        task_revision=1,
        issued_to="operator-1",
        issued_at="2026-09-11T00:00:00Z",
        expires_at="2026-09-11T00:05:00Z",
        nonce="nonce-1",
        state="ISSUED",
    )
    exec_repo.save_authorization(auth)

    # First claim succeeds
    success1 = exec_repo.claim_authorization(
        auth_id="auth-test-claim-1",
        attempt_id="att-1",
        claimed_at="2026-09-11T00:00:10Z",
    )
    assert success1 is True

    # Second claim fails (single use)
    success2 = exec_repo.claim_authorization(
        auth_id="auth-test-claim-1",
        attempt_id="att-2",
        claimed_at="2026-09-11T00:00:12Z",
    )
    assert success2 is False


@pytest.mark.asyncio
async def test_full_execution_dispatch_and_idempotency(execution_env):
    intent_svc = execution_env["intent_svc"]
    coordinator = execution_env["coordinator"]
    executor = execution_env["executor"]
    task_repo = execution_env["task_repo"]
    exec_repo = execution_env["exec_repo"]

    requester = OperatorPrincipal(id="operator-1", roles=["operator"], permissions=["action:request"])
    approver = OperatorPrincipal(id="approver-1", roles=["approver"], permissions=["action:approve"])
    executor_principal = OperatorPrincipal(id="executor-1", roles=["operator", "admin"], permissions=["action:execute"])

    # Create & Approve intent with required confirmation phrase
    dto = CreateActionIntentDto(
        action_type="TASK_DISPATCH",
        target_type="TASK",
        target_id="task-dispatch-01",
        payload={"task_id": "task-dispatch-01", "target_profile_id": "profile-1", "prompt": "Execute task"},
    )
    intent = await intent_svc.create_intent(dto, principal=requester, correlation_id="corr-e2e-1")
    await intent_svc.approve_intent(
        intent.id,
        principal=approver,
        confirmation_phrase="APPROVE TASK DISPATCH",
    )

    # 1. Execute task dispatch
    res = await coordinator.execute_task_dispatch(
        intent_id=intent.id,
        principal=executor_principal,
        idempotency_key="key-idemp-dispatch-1",
    )

    assert res["status"] == "ACKNOWLEDGED"
    assert res["receipt"]["hermes_session_id"] == "sess-e2e-1"
    assert res["receipt"]["intent_id"] == intent.id
    assert executor.call_count == 1

    # Verify task state transitioned to RUNNING
    task = await task_repo.get_task("task-dispatch-01")
    assert task.state == "RUNNING"

    # Verify direct task <-> session correlation was persisted
    corr = exec_repo.get_correlation_by_task("task-dispatch-01")
    assert corr is not None
    assert corr["hermes_session_id"] == "sess-e2e-1"
    assert corr["intent_id"] == intent.id

    # 2. Idempotent replay with same idempotency key
    replay_res = await coordinator.execute_task_dispatch(
        intent_id=intent.id,
        principal=executor_principal,
        idempotency_key="key-idemp-dispatch-1",
    )
    assert replay_res["status"] == "ACKNOWLEDGED"
    assert replay_res["receipt"]["hermes_session_id"] == "sess-e2e-1"
    # Executor was NOT called again
    assert executor.call_count == 1


@pytest.mark.asyncio
async def test_reconciliation_with_authoritative_evidence(execution_env):
    conn = execution_env["conn"]
    exec_repo = execution_env["exec_repo"]
    intent_svc = execution_env["intent_svc"]

    requester = OperatorPrincipal(id="operator-1", roles=["operator"])
    dto = CreateActionIntentDto(
        action_type="TASK_DISPATCH",
        target_type="TASK",
        target_id="task-dispatch-01",
        payload={"task_id": "task-dispatch-01", "target_profile_id": "profile-1"},
    )
    intent = await intent_svc.create_intent(dto, principal=requester, correlation_id="corr-recon-1")

    auth = ExecutionAuthorization(
        id="auth-recon-1",
        intent_id=intent.id,
        payload_hash=intent.payload_hash,
        profile_id="profile-1",
        task_id="task-dispatch-01",
        task_revision=1,
        issued_to="operator-1",
        issued_at="2026-09-11T00:00:00Z",
        expires_at="2026-09-11T00:05:00Z",
        nonce="nonce-recon-1",
        state="CLAIMED",
        consumed_at="2026-09-11T00:00:01Z",
        execution_attempt_id="att-unreconciled-1",
    )
    exec_repo.save_authorization(auth)

    attempt = ExecutionAttempt(
        id="att-unreconciled-1",
        intent_id=intent.id,
        authorization_id="auth-recon-1",
        task_id="task-dispatch-01",
        profile_id="profile-1",
        correlation_id="corr-recon-1",
        state="OUTCOME_UNKNOWN",
        created_at="2026-09-11T00:00:00Z",
    )
    exec_repo.save_attempt(attempt)

    reconciler = ExecutionReconciliationService(conn)

    # Reconciliation without direct evidence fails closed
    no_evidence_res = await reconciler.reconcile_attempt("att-unreconciled-1")
    assert no_evidence_res["reconciled"] is False
    assert no_evidence_res["state"] == "OUTCOME_UNKNOWN"
    assert "Direct correlation evidence unavailable" in no_evidence_res["detail"]

    # Reconciliation WITH authoritative session ID succeeds
    evidence_res = await reconciler.reconcile_attempt(
        "att-unreconciled-1",
        authoritative_session_id="sess-authoritative-999",
    )
    assert evidence_res["reconciled"] is True
    assert evidence_res["receipt"]["hermes_session_id"] == "sess-authoritative-999"

    # Verify direct correlation created
    corr = exec_repo.get_correlation_by_task("task-dispatch-01")
    assert corr is not None
    assert corr["hermes_session_id"] == "sess-authoritative-999"
