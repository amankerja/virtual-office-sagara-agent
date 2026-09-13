import sqlite3
import tempfile
from pathlib import Path
import pytest

pytestmark = [pytest.mark.security]
from app.api.errors import AppError, ConflictError
from app.db.connection import get_db_connection
from app.db.migrations import run_migrations
from app.domain.principal import OperatorPrincipal
from app.repositories.memory.fixtures import PROFILES_FIXTURE, SKILLS_FIXTURE
from app.repositories.memory.task_repo import InMemoryTaskRepository
from app.schemas.action_intents import CreateActionIntentDto
from app.services.action_intent_service import ActionIntentService
from app.services.authorization_service import AuthorizationService
from app.services.execution_gate import DisabledActionExecutor, ExecutionGate
from app.services.preflight_service import ActionPreflightService
from app.services.signing import verify_action_signature


class MockProfileCatalog:
    async def get_profile(self, profile_id: str):
        for p in PROFILES_FIXTURE:
            if p.id == profile_id:
                return p
        return None


class MockSkillCatalog:
    async def get_skill(self, skill_id: str):
        for s in SKILLS_FIXTURE:
            if s.id == skill_id:
                return s
        return None


class MockAgentService:
    async def get_agent(self, agent_id: str):
        class DummyRuntime:
            state = "IDLE"
            confidence = "HIGH"

        class DummyAgent:
            runtime = DummyRuntime()

        return DummyAgent()


@pytest.fixture
def test_env():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    conn = sqlite3.connect(db_path)
    run_migrations(conn)
    conn.close()

    auth_service = AuthorizationService()
    task_repo = InMemoryTaskRepository()
    preflight_service = ActionPreflightService(
        profile_catalog=MockProfileCatalog(),
        skill_catalog=MockSkillCatalog(),
        agent_service=MockAgentService(),
        task_repo=task_repo,
    )
    intent_service = ActionIntentService(
        auth_service=auth_service,
        preflight_service=preflight_service,
        db_path_override=db_path,
    )

    try:
        yield {
            "db_path": db_path,
            "intent_service": intent_service,
            "task_repo": task_repo,
        }
    finally:
        Path(db_path).unlink(missing_ok=True)


@pytest.mark.asyncio
async def test_unknown_and_generic_actions_forbidden(test_env):
    """Section 13, 15, 119: Unknown and generic actions (RUN_COMMAND, CUSTOM) are forbidden."""
    intent_svc = test_env["intent_service"]
    operator = OperatorPrincipal(id="op-1", roles=["operator"])

    for forbidden in ["RUN_COMMAND", "EXECUTE_TOOL", "CUSTOM", "RANDOM_SHELL_INJECTION"]:
        dto = CreateActionIntentDto(
            action_type=forbidden,
            target_type="SYSTEM",
            target_id="sys-1",
            payload={"cmd": "echo 1"},
        )
        with pytest.raises(AppError) as exc:
            await intent_svc.create_intent(dto, principal=operator, correlation_id="corr-test-1")
        assert exc.value.status_code == 400
        assert exc.value.code == "ACTION_NOT_ALLOWED"


@pytest.mark.asyncio
async def test_action_intent_signing_and_tamper_detection(test_env):
    """Section 23, 126: Modify payload after creation; verification fails."""
    intent_svc = test_env["intent_service"]
    operator = OperatorPrincipal(id="op-1", roles=["operator"])

    dto = CreateActionIntentDto(
        action_type="SAFETY_GATE_SELF_TEST",
        target_type="SYSTEM",
        target_id="sys-self-test",
        payload={"message": "Safe self-test ping"},
    )
    intent = await intent_svc.create_intent(dto, principal=operator, correlation_id="corr-sig-test")
    assert intent.signature is not None

    # Normal fetch passes verification
    fetched = await intent_svc.get_intent(intent.id)
    assert fetched.id == intent.id

    # Deliberately tamper with payload in DB
    conn = get_db_connection(test_env["db_path"])
    try:
        conn.execute(
            "UPDATE action_intents SET payload = '{\"message\":\"TAMPERED_INJECTED_STRING\"}' WHERE id = ?;",
            (intent.id,),
        )
    finally:
        conn.close()

    # Now get_intent must reject with ACTION_INTENT_TAMPERED
    with pytest.raises(AppError) as exc:
        await intent_svc.get_intent(intent.id)
    assert exc.value.code == "ACTION_INTENT_TAMPERED"


@pytest.mark.asyncio
async def test_complete_intent_lifecycle_to_ready_to_execute(test_env):
    """Section 120: Full lifecycle: create -> preflight -> approve -> ready_to_execute -> execution blocked."""
    intent_svc = test_env["intent_service"]
    requester = OperatorPrincipal(id="requester-1", roles=["operator"])
    approver = OperatorPrincipal(id="approver-1", roles=["approver"])

    # 1. Create a HIGH risk TASK_CANCEL action intent
    dto = CreateActionIntentDto(
        action_type="TASK_CANCEL",
        target_type="TASK",
        target_id="task-001",
        payload={"task_id": "task-001", "reason": "Operator requested cancellation"},
        resource_revision=1,
    )
    intent = await intent_svc.create_intent(dto, principal=requester, correlation_id="corr-life-1")
    assert intent.status in ("READY_FOR_APPROVAL", "PREFLIGHT_FAILED")

    # 2. Transition to PENDING_APPROVAL
    pending = await intent_svc.request_approval(intent.id, principal=requester, correlation_id="corr-life-1")
    assert pending.status == "PENDING_APPROVAL"

    # 3. Approve by distinct operator (avoid self-approval)
    approved = await intent_svc.approve_intent(
        intent_id=intent.id,
        principal=approver,
        reason="Approved cancellation",
        expected_revision=1,
        correlation_id="corr-life-1",
    )
    assert approved.status == "READY_TO_EXECUTE"
    assert approved.execution_authorization_id is not None

    # 4. Section 62 & 63: Execution Gate check
    assert ExecutionGate.is_enabled() is False

    executor = DisabledActionExecutor()
    with pytest.raises(AppError) as exc:
        await executor.execute_action(intent.id, approved.action_type, approved.payload)
    assert exc.value.code == "ACTION_EXECUTION_DISABLED"
