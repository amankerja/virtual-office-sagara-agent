import asyncio
import sqlite3
import tempfile
from datetime import datetime, timezone, timedelta
from pathlib import Path
import pytest
from app.api.errors import AppError, ConflictError
from app.db.connection import get_db_connection
from app.db.migrations import run_migrations
from app.domain.principal import OperatorPrincipal
from app.repositories.memory.task_repo import InMemoryTaskRepository
from app.schemas.action_intents import CreateActionIntentDto
from app.services.action_intent_service import ActionIntentService
from app.services.authorization_service import AuthorizationService
from app.services.preflight_service import ActionPreflightService


class StubProfileCatalog:
    async def get_profile(self, profile_id: str):
        return None


class StubSkillCatalog:
    async def get_skill(self, skill_id: str):
        return None


class StubAgentService:
    async def get_agent(self, agent_id: str):
        return None


@pytest.fixture
def test_setup():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    conn = sqlite3.connect(db_path)
    run_migrations(conn)
    conn.close()

    auth = AuthorizationService()
    task_repo = InMemoryTaskRepository()
    preflight = ActionPreflightService(
        profile_catalog=StubProfileCatalog(),
        skill_catalog=StubSkillCatalog(),
        agent_service=StubAgentService(),
        task_repo=task_repo,
    )
    svc = ActionIntentService(auth_service=auth, preflight_service=preflight, db_path_override=db_path)
    try:
        yield {"svc": svc, "db_path": db_path}
    finally:
        Path(db_path).unlink(missing_ok=True)


@pytest.mark.asyncio
async def test_high_risk_typed_confirmation_required(test_setup):
    """Section 47: High risk actions require explicit typed confirmation phrase."""
    svc = test_setup["svc"]
    requester = OperatorPrincipal(id="requester-1", roles=["operator"])
    approver = OperatorPrincipal(id="approver-2", roles=["approver"])

    dto = CreateActionIntentDto(
        action_type="TASK_DISPATCH",
        target_type="TASK",
        target_id="task-001",
        payload={"task_id": "task-001"},
    )
    intent = await svc.create_intent(dto, principal=requester, correlation_id="corr-conf-1")

    # Attempt to approve without confirmation phrase
    with pytest.raises(AppError) as exc:
        await svc.approve_intent(
            intent_id=intent.id,
            principal=approver,
            confirmation_phrase=None,
            expected_revision=1,
            correlation_id="corr-conf-1",
        )
    assert exc.value.code == "APPROVAL_CONFIRMATION_REQUIRED"

    # Attempt to approve with wrong phrase
    with pytest.raises(AppError) as exc_wrong:
        await svc.approve_intent(
            intent_id=intent.id,
            principal=approver,
            confirmation_phrase="YES PROCEED",
            expected_revision=1,
            correlation_id="corr-conf-1",
        )
    assert exc_wrong.value.code == "APPROVAL_CONFIRMATION_REQUIRED"

    # Succeeded with correct phrase
    approved = await svc.approve_intent(
        intent_id=intent.id,
        principal=approver,
        confirmation_phrase="APPROVE TASK DISPATCH",
        expected_revision=1,
        correlation_id="corr-conf-1",
    )
    assert approved.status == "READY_TO_EXECUTE"


@pytest.mark.asyncio
async def test_expired_intent_cannot_be_approved(test_setup):
    """Section 89 & 127: Expired intent cannot be approved."""
    svc = test_setup["svc"]
    db_path = test_setup["db_path"]
    requester = OperatorPrincipal(id="op-1", roles=["operator"])
    approver = OperatorPrincipal(id="approver-2", roles=["approver"])

    dto = CreateActionIntentDto(
        action_type="TASK_CANCEL",
        target_type="TASK",
        target_id="task-001",
        payload={"task_id": "task-001"},
    )
    intent = await svc.create_intent(dto, principal=requester, correlation_id="corr-exp-1")

    # Mark the intent EXPIRED
    conn = get_db_connection(db_path)
    try:
        conn.execute("UPDATE action_intents SET status = 'EXPIRED' WHERE id = ?;", (intent.id,))
    finally:
        conn.close()

    with pytest.raises(ConflictError) as exc:
        await svc.approve_intent(
            intent_id=intent.id,
            principal=approver,
            expected_revision=1,
            correlation_id="corr-exp-1",
        )
    assert exc.value.code == "ACTION_INTENT_EXPIRED"


@pytest.mark.asyncio
async def test_concurrent_approval_resolution(test_setup):
    """Section 102 & 123: Two approvers approving simultaneously: one wins, one gets 409."""
    svc = test_setup["svc"]
    requester = OperatorPrincipal(id="op-1", roles=["operator"])
    approver1 = OperatorPrincipal(id="approver-1", roles=["approver"])
    approver2 = OperatorPrincipal(id="approver-2", roles=["approver"])

    dto = CreateActionIntentDto(
        action_type="TASK_CANCEL",
        target_type="TASK",
        target_id="task-001",
        payload={"task_id": "task-001"},
    )
    intent = await svc.create_intent(dto, principal=requester, correlation_id="corr-conc-1")

    # Run two approvals concurrently
    results = await asyncio.gather(
        svc.approve_intent(intent.id, principal=approver1, expected_revision=1, correlation_id="corr-conc-1"),
        svc.approve_intent(intent.id, principal=approver2, expected_revision=1, correlation_id="corr-conc-2"),
        return_exceptions=True,
    )

    passes = [r for r in results if not isinstance(r, Exception)]
    errors = [r for r in results if isinstance(r, Exception)]

    assert len(passes) == 1, "Exactly one approval must win"
    assert len(errors) == 1, "The second approval must be rejected"
    assert errors[0].status_code == 409
