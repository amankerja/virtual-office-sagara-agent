import sqlite3
import tempfile
from datetime import datetime, timezone, timedelta
from pathlib import Path
import pytest

from app.config import settings
from app.db.connection import get_db_connection
from app.db.migrations import run_migrations
from app.domain.execution import ExecutionReceipt, ExecutionAuthorization, ExecutionAttempt
from app.domain.principal import OperatorPrincipal
from app.schemas.profiles import ProfileDto
from app.repositories.memory.task_repo import InMemoryTaskRepository
from app.repositories.sqlite.execution_repo import ExecutionSqliteRepository
from app.schemas.action_intents import CreateActionIntentDto, ActionIntentDto
from app.schemas.tasks import TaskDto
from app.services.action_intent_service import ActionIntentService
from app.services.authorization_service import AuthorizationService
from app.services.executor import FakeHermesTaskDispatchExecutor
from app.services.final_preflight_service import FinalExecutionPreflightService
from app.services.preflight_service import ActionPreflightService


class MockProfileCatalog:
    def __init__(self, profiles=None):
        self.profiles = profiles or {}

    async def get_profile(self, profile_id: str):
        return self.profiles.get(profile_id)


@pytest.fixture
async def preflight_env(monkeypatch):
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
        id="task-test-01",
        title="Test Task",
        state="READY",
        priority="MEDIUM",
        created_at="2026-09-11T00:00:00Z",
        assigned_agent_id="sagara-lab",
        revision=1,
    )
    task_repo._tasks.append(task)

    profile_dto = ProfileDto(id="sagara-lab", name="Sagara Agent", enabled=True)
    profile_catalog = MockProfileCatalog({"sagara-lab": profile_dto})

    auth = AuthorizationService()
    preflight = ActionPreflightService(
        profile_catalog=profile_catalog,
        skill_catalog=None,
        agent_service=None,
        task_repo=task_repo,
    )
    intent_svc = ActionIntentService(auth_service=auth, preflight_service=preflight, db_path_override=db_path)
    executor = FakeHermesTaskDispatchExecutor()

    try:
        yield {
            "conn": conn,
            "db_path": db_path,
            "intent_svc": intent_svc,
            "task_repo": task_repo,
            "profile_catalog": profile_catalog,
            "executor": executor,
        }
    finally:
        conn.close()
        Path(db_path).unlink(missing_ok=True)


@pytest.mark.asyncio
async def test_final_preflight_passes_for_valid_approved_intent(preflight_env):
    conn = preflight_env["conn"]
    intent_svc = preflight_env["intent_svc"]
    task_repo = preflight_env["task_repo"]
    profile_catalog = preflight_env["profile_catalog"]
    executor = preflight_env["executor"]

    requester = OperatorPrincipal(id="operator-1", roles=["operator"], permissions=["action:request"])
    approver = OperatorPrincipal(id="approver-1", roles=["approver"], permissions=["action:approve"])
    executor_principal = OperatorPrincipal(id="executor-1", roles=["operator", "admin"], permissions=["action:execute"])

    dto = CreateActionIntentDto(
        action_type="TASK_DISPATCH",
        target_type="TASK",
        target_id="task-test-01",
        payload={"task_id": "task-test-01", "target_profile_id": "sagara-lab", "task_class": "REASONING_ONLY"},
    )
    intent = await intent_svc.create_intent(dto, principal=requester, correlation_id="corr-1")
    approved = await intent_svc.approve_intent(intent.id, principal=approver, confirmation_phrase="APPROVE TASK DISPATCH")

    service = FinalExecutionPreflightService(
        conn=conn,
        profile_registry=profile_catalog,
        task_repository=task_repo,
        executor=executor,
    )
    res = await service.evaluate(intent=approved, principal=executor_principal)
    assert res.passed is True
    assert len(res.blocking_reasons) == 0
    assert res.targetability == "TARGETABLE"


@pytest.mark.asyncio
async def test_final_preflight_blocks_tampered_payload(preflight_env):
    conn = preflight_env["conn"]
    intent_svc = preflight_env["intent_svc"]
    task_repo = preflight_env["task_repo"]
    profile_catalog = preflight_env["profile_catalog"]
    executor = preflight_env["executor"]

    requester = OperatorPrincipal(id="operator-1", roles=["operator"])
    approver = OperatorPrincipal(id="approver-1", roles=["approver"])
    executor_principal = OperatorPrincipal(id="executor-1", roles=["operator", "admin"])

    dto = CreateActionIntentDto(
        action_type="TASK_DISPATCH",
        target_type="TASK",
        target_id="task-test-01",
        payload={"task_id": "task-test-01", "target_profile_id": "sagara-lab", "task_class": "REASONING_ONLY"},
    )
    intent = await intent_svc.create_intent(dto, principal=requester, correlation_id="corr-2")
    approved = await intent_svc.approve_intent(intent.id, principal=approver, confirmation_phrase="APPROVE TASK DISPATCH")

    # Tamper payload after approval
    tampered_dict = approved.model_dump()
    tampered_dict["payload"]["task_id"] = "task-malicious-swapped"
    tampered_intent = ActionIntentDto(**tampered_dict)

    service = FinalExecutionPreflightService(
        conn=conn,
        profile_registry=profile_catalog,
        task_repository=task_repo,
        executor=executor,
    )
    res = await service.evaluate(intent=tampered_intent, principal=executor_principal)
    assert res.passed is False
    assert any("tampering detected" in r for r in res.blocking_reasons)


@pytest.mark.asyncio
async def test_final_preflight_blocks_expired_intent(preflight_env):
    conn = preflight_env["conn"]
    intent_svc = preflight_env["intent_svc"]
    task_repo = preflight_env["task_repo"]
    profile_catalog = preflight_env["profile_catalog"]
    executor = preflight_env["executor"]

    requester = OperatorPrincipal(id="operator-1", roles=["operator"])
    approver = OperatorPrincipal(id="approver-1", roles=["approver"])
    executor_principal = OperatorPrincipal(id="executor-1", roles=["operator", "admin"])

    dto = CreateActionIntentDto(
        action_type="TASK_DISPATCH",
        target_type="TASK",
        target_id="task-test-01",
        payload={"task_id": "task-test-01", "target_profile_id": "sagara-lab", "task_class": "REASONING_ONLY"},
    )
    intent = await intent_svc.create_intent(dto, principal=requester, correlation_id="corr-3")
    approved = await intent_svc.approve_intent(intent.id, principal=approver, confirmation_phrase="APPROVE TASK DISPATCH")

    expired_dict = approved.model_dump()
    expired_dict["expires_at"] = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat()
    expired_intent = ActionIntentDto(**expired_dict)

    service = FinalExecutionPreflightService(
        conn=conn,
        profile_registry=profile_catalog,
        task_repository=task_repo,
        executor=executor,
    )
    res = await service.evaluate(intent=expired_intent, principal=executor_principal)
    assert res.passed is False
    assert any("expired" in r for r in res.blocking_reasons)


@pytest.mark.asyncio
async def test_final_preflight_blocks_when_kill_switch_locked(preflight_env):
    conn = preflight_env["conn"]
    intent_svc = preflight_env["intent_svc"]
    task_repo = preflight_env["task_repo"]
    profile_catalog = preflight_env["profile_catalog"]
    executor = preflight_env["executor"]

    requester = OperatorPrincipal(id="operator-1", roles=["operator"])
    approver = OperatorPrincipal(id="approver-1", roles=["approver"])
    executor_principal = OperatorPrincipal(id="executor-1", roles=["operator", "admin"])

    dto = CreateActionIntentDto(
        action_type="TASK_DISPATCH",
        target_type="TASK",
        target_id="task-test-01",
        payload={"task_id": "task-test-01", "target_profile_id": "sagara-lab", "task_class": "REASONING_ONLY"},
    )
    intent = await intent_svc.create_intent(dto, principal=requester, correlation_id="corr-4")
    approved = await intent_svc.approve_intent(intent.id, principal=approver, confirmation_phrase="APPROVE TASK DISPATCH")

    # Lock kill switch
    exec_repo = ExecutionSqliteRepository(conn)
    exec_repo.set_execution_lock("global_dispatch", "LOCKED")

    service = FinalExecutionPreflightService(
        conn=conn,
        profile_registry=profile_catalog,
        task_repository=task_repo,
        executor=executor,
    )
    res = await service.evaluate(intent=approved, principal=executor_principal)
    assert res.passed is False
    assert any("kill switch locked" in r for r in res.blocking_reasons)


@pytest.mark.asyncio
async def test_final_preflight_blocks_already_executed_intent(preflight_env):
    conn = preflight_env["conn"]
    intent_svc = preflight_env["intent_svc"]
    task_repo = preflight_env["task_repo"]
    profile_catalog = preflight_env["profile_catalog"]
    executor = preflight_env["executor"]

    requester = OperatorPrincipal(id="operator-1", roles=["operator"])
    approver = OperatorPrincipal(id="approver-1", roles=["approver"])
    executor_principal = OperatorPrincipal(id="executor-1", roles=["operator", "admin"])

    dto = CreateActionIntentDto(
        action_type="TASK_DISPATCH",
        target_type="TASK",
        target_id="task-test-01",
        payload={"task_id": "task-test-01", "target_profile_id": "sagara-lab", "task_class": "REASONING_ONLY"},
    )
    intent = await intent_svc.create_intent(dto, principal=requester, correlation_id="corr-5")
    approved = await intent_svc.approve_intent(intent.id, principal=approver, confirmation_phrase="APPROVE TASK DISPATCH")

    # Insert an existing receipt for this intent (satisfying foreign keys)
    exec_repo = ExecutionSqliteRepository(conn)
    auth = ExecutionAuthorization(
        id="auth-existing-1",
        intent_id=approved.id,
        payload_hash=approved.payload_hash,
        profile_id="sagara-lab",
        task_id="task-test-01",
        task_revision=1,
        issued_to="operator-1",
        issued_at="2026-09-11T00:00:00Z",
        expires_at="2026-09-11T00:05:00Z",
        nonce="nonce-existing-1",
        state="CONSUMED",
        consumed_at="2026-09-11T00:00:01Z",
        execution_attempt_id="att-existing-1",
    )
    exec_repo.save_authorization(auth)

    attempt = ExecutionAttempt(
        id="att-existing-1",
        intent_id=approved.id,
        authorization_id="auth-existing-1",
        task_id="task-test-01",
        profile_id="sagara-lab",
        correlation_id="corr-5",
        state="ACKNOWLEDGED",
        created_at="2026-09-11T00:00:00Z",
    )
    exec_repo.save_attempt(attempt)

    receipt = ExecutionReceipt(
        receipt_id="rcpt-existing-1",
        attempt_id="att-existing-1",
        intent_id=approved.id,
        task_id="task-test-01",
        profile_id="sagara-lab",
        hermes_session_id="sess-existing-1",
        submitted_at="2026-09-11T00:00:00Z",
        acknowledged_at="2026-09-11T00:00:01Z",
        executor_type="FakeHermesTaskDispatchExecutor",
        executor_version="1.0",
        correlation_id="corr-5",
        result="ACKNOWLEDGED",
        receipt_hash="hash-12345",
        created_at="2026-09-11T00:00:01Z",
    )
    exec_repo.save_receipt(receipt)

    service = FinalExecutionPreflightService(
        conn=conn,
        profile_registry=profile_catalog,
        task_repository=task_repo,
        executor=executor,
    )
    res = await service.evaluate(intent=approved, principal=executor_principal)
    assert res.passed is False
    assert any("already been executed" in r for r in res.blocking_reasons)


@pytest.mark.asyncio
async def test_final_preflight_blocks_corrupted_audit_chain(preflight_env):
    conn = preflight_env["conn"]
    intent_svc = preflight_env["intent_svc"]
    task_repo = preflight_env["task_repo"]
    profile_catalog = preflight_env["profile_catalog"]
    executor = preflight_env["executor"]

    requester = OperatorPrincipal(id="operator-1", roles=["operator"])
    approver = OperatorPrincipal(id="approver-1", roles=["approver"])
    executor_principal = OperatorPrincipal(id="executor-1", roles=["operator", "admin"])

    dto = CreateActionIntentDto(
        action_type="TASK_DISPATCH",
        target_type="TASK",
        target_id="task-test-01",
        payload={"task_id": "task-test-01", "target_profile_id": "sagara-lab", "task_class": "REASONING_ONLY"},
    )
    intent = await intent_svc.create_intent(dto, principal=requester, correlation_id="corr-6")
    approved = await intent_svc.approve_intent(intent.id, principal=approver, confirmation_phrase="APPROVE TASK DISPATCH")

    # Corrupt audit ledger
    conn.execute("UPDATE audit_ledger SET reason = 'tampered reason' WHERE intent_id = ?", (approved.id,))

    service = FinalExecutionPreflightService(
        conn=conn,
        profile_registry=profile_catalog,
        task_repository=task_repo,
        executor=executor,
    )
    res = await service.evaluate(intent=approved, principal=executor_principal)
    assert res.passed is False
    assert any("Audit ledger integrity failure" in r for r in res.blocking_reasons)
