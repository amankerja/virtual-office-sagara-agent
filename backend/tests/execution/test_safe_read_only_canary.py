import copy
import hashlib
import json
import sqlite3
import tempfile
from datetime import datetime, timezone, timedelta
from pathlib import Path
import pytest

pytestmark = [pytest.mark.security, pytest.mark.execution]

from app.config import settings
from app.db.connection import get_db_connection
from app.db.migrations import run_migrations
from app.domain.principal import OperatorPrincipal
from app.domain.tool_security_policy import (
    create_canonical_tool_security_policy_v1,
    RUNTIME_STATUS_FINGERPRINT,
    DOCUMENT_INSPECTION_FINGERPRINT,
)
from app.domain.execution import ExecutionReceipt
from app.repositories.memory.task_repo import InMemoryTaskRepository
from app.repositories.sqlite.execution_repo import ExecutionSqliteRepository
from app.schemas.action_intents import CreateActionIntentDto, ActionIntentDto
from app.schemas.profiles import ProfileDto
from app.schemas.tasks import TaskDto
from app.schemas.agents import AgentDto, AgentDefinitionDto, AgentRuntimeDto, AgentCapabilitiesDto
from app.services.action_intent_service import ActionIntentService
from app.services.authorization_service import AuthorizationService
from app.services.executor import FakeHermesTaskDispatchExecutor
from app.services.final_preflight_service import FinalExecutionPreflightService
from app.services.preflight_service import ActionPreflightService
from app.services.tool_security_service import ToolSecurityService
from app.services.task_dispatch_coordinator import TaskDispatchCoordinator
from app.repositories.sqlite.idempotency_repo import PersistentIdempotencyStore
from app.api.errors import AppError


class MockProfileCatalog:
    def __init__(self, profiles=None):
        self.profiles = profiles or {}

    async def get_profile(self, profile_id: str):
        return self.profiles.get(profile_id)


class MockAgentService:
    def __init__(self, agent):
        self.agent = agent

    async def get_agent(self, agent_id: str):
        return self.agent


@pytest.fixture
async def canary_env(monkeypatch):
    monkeypatch.setattr(settings, "execution_enabled", True)
    monkeypatch.setattr(settings, "live_canary_enabled", True)
    monkeypatch.setattr(settings, "action_signing_key", "test-secret-signing-key-minimum-length-32")

    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    conn = get_db_connection(db_path)
    run_migrations(conn)

    # Set up active window & unlock kill switch via ExecutionLockService
    from app.services.execution_lock_service import ExecutionLockService
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    ExecutionLockService.unlock(
        conn=conn,
        principal=OperatorPrincipal(
            id="operator:admin",
            roles=["admin", "operator"],
            permissions=["execution.lock.manage"],
        ),
        confirmation_phrase="UNLOCK TASK EXECUTION",
        reason="Test canary fixture unlock",
        ttl_minutes=15,
        max_executions=1,
    )

    task_repo = InMemoryTaskRepository()
    task = TaskDto(
        id="task-ro-canary-01",
        title="Sagara SAFE_READ_ONLY Runtime Status Canary 001",
        state="READY",
        priority="HIGH",
        created_at=now_iso,
        assigned_agent_id="sagara-lab",
        revision=1,
    )
    task_repo._tasks.append(task)

    profile_dto = ProfileDto(id="sagara-lab", name="Sagara Lab Profile", enabled=True)
    profile_catalog = MockProfileCatalog({"sagara-lab": profile_dto})

    agent_dto = AgentDto(
        id="sagara-lab",
        definition=AgentDefinitionDto(
            id="sagara-lab",
            name="Sagara Lab",
            role="Research & Experimentation",
            description="Sandbox",
            enabled=True,
        ),
        runtime=AgentRuntimeDto(state="IDLE", confidence="CONFIRMED"),
        capabilities=AgentCapabilitiesDto(total=0, healthy=0, degraded=0, missing=0),
    )
    agent_svc = MockAgentService(agent_dto)
    preflight_svc = ActionPreflightService(
        profile_catalog=profile_catalog,
        skill_catalog=None,
        agent_service=agent_svc,
        task_repo=task_repo,
    )
    auth_svc = AuthorizationService()
    intent_svc = ActionIntentService(
        auth_service=auth_svc,
        preflight_service=preflight_svc,
        db_path_override=db_path,
    )

    requester = OperatorPrincipal(
        id="operator:admin",
        roles=["admin", "operator"],
        permissions=["action.request"],
        auth_type="proxy",
    )
    approver = OperatorPrincipal(
        id="operator:approver",
        roles=["security_officer", "approver"],
        permissions=["action.approve"],
        auth_type="proxy",
    )
    executor_operator = OperatorPrincipal(
        id="operator:executor",
        roles=["operator", "execution_lead"],
        permissions=["execution.execute", "tool.readonly.execute"],
        auth_type="proxy",
    )

    # Create & approve valid baseline canary intent
    intent = await intent_svc.create_intent(
        dto=CreateActionIntentDto(
            action_type="TASK_DISPATCH",
            target_type="PROFILE",
            target_id="sagara-lab",
            payload={
                "task_id": "task-ro-canary-01",
                "target_profile_id": "sagara-lab",
                "task_class": "READ_ONLY_INSPECTION",
                "execution_mode": "SAFE_READ_ONLY",
                "tool_id": "runtime_status",
                "tool_version": "1.0.0",
                "operation": "inspect_service",
                "resource": "hermes-gateway.service",
                "properties": ["ActiveState", "SubState", "MainPID", "NRestarts", "ActiveEnterTimestamp", "UnitFileState"],
                "implementation_fingerprint": RUNTIME_STATUS_FINGERPRINT,
                "tool_security_policy_version": "TOOL_SECURITY_POLICY_V1",
                "tool_security_policy_hash": "9bdd1d54102280e49f1d23a13be404c44bb0f22e2c3f100b8d6aed61e3ec033d",
                "prompt": "Inspect hermes-gateway.service safely.",
                "safe_mode": True,
                "tools_enabled": False,
                "network_enabled": False,
                "shell_enabled": False,
                "mcp_enabled": False,
                "document_inspection_enabled": False,
            },
            resource_revision=1,
            reason="Prompt 14.9A.5 single safe read-only tool canary",
        ),
        principal=requester,
        correlation_id="corr-test-canary-01",
    )

    intent = await intent_svc.request_approval(intent.id, requester, correlation_id="corr-test-canary-01")
    approved_intent = await intent_svc.approve_intent(
        intent_id=intent.id,
        principal=approver,
        reason="Approved canary test",
        confirmation_phrase="APPROVE TASK DISPATCH",
        correlation_id="corr-test-canary-01",
    )

    fake_executor = FakeHermesTaskDispatchExecutor()
    final_pf_svc = FinalExecutionPreflightService(
        conn=conn,
        task_repository=task_repo,
        profile_registry=profile_catalog,
        executor=fake_executor,
    )

    return {
        "conn": conn,
        "intent_svc": intent_svc,
        "final_pf_svc": final_pf_svc,
        "approved_intent": approved_intent,
        "executor_operator": executor_operator,
        "task_repo": task_repo,
        "fake_executor": fake_executor,
        "db_path": db_path,
    }


@pytest.mark.asyncio
async def test_valid_canary_preflight_passes(canary_env):
    """Confirm the authorized baseline SAFE_READ_ONLY canary passes final preflight cleanly."""
    final_pf_svc = canary_env["final_pf_svc"]
    intent = canary_env["approved_intent"]
    executor = canary_env["executor_operator"]

    result = await final_pf_svc.evaluate(intent=intent, principal=executor)
    assert result.passed is True
    assert len(result.blocking_reasons) == 0
    assert result.targetability == "TARGETABLE"


@pytest.mark.asyncio
async def test_policy_binding_cannot_change_to_document_inspection(canary_env):
    """Section 95: ActionIntent with runtime_status cannot be changed after approval to document_inspection."""
    final_pf_svc = canary_env["final_pf_svc"]
    intent = canary_env["approved_intent"]
    executor = canary_env["executor_operator"]

    # Tamper with the intent payload after approval
    tampered_payload = copy.deepcopy(intent.payload)
    tampered_payload["tool_id"] = "document_inspection"
    tampered_intent = intent.model_copy(update={"payload": tampered_payload})

    result = await final_pf_svc.evaluate(intent=tampered_intent, principal=executor)
    assert result.passed is False
    # Either payload tampering detected or UNAUTHORIZED_TOOL caught
    reasons = " ".join(result.blocking_reasons)
    assert "UNAUTHORIZED_TOOL" in reasons or "tampering detected" in reasons


@pytest.mark.asyncio
async def test_resource_binding_cannot_change_service(canary_env):
    """Section 96: Approved hermes-gateway.service changed to another service must fail."""
    final_pf_svc = canary_env["final_pf_svc"]
    intent = canary_env["approved_intent"]
    executor = canary_env["executor_operator"]

    tampered_payload = copy.deepcopy(intent.payload)
    tampered_payload["resource"] = "sshd.service"
    tampered_intent = intent.model_copy(update={"payload": tampered_payload})

    result = await final_pf_svc.evaluate(intent=tampered_intent, principal=executor)
    assert result.passed is False
    reasons = " ".join(result.blocking_reasons)
    assert "RESOURCE_SCOPE_VIOLATION" in reasons or "tampering detected" in reasons


@pytest.mark.asyncio
async def test_property_binding_cannot_add_unapproved_property(canary_env):
    """Section 97: Adding an unapproved systemd property after approval must fail."""
    final_pf_svc = canary_env["final_pf_svc"]
    intent = canary_env["approved_intent"]
    executor = canary_env["executor_operator"]

    tampered_payload = copy.deepcopy(intent.payload)
    tampered_payload["properties"].append("Environment")
    tampered_intent = intent.model_copy(update={"payload": tampered_payload})

    result = await final_pf_svc.evaluate(intent=tampered_intent, principal=executor)
    assert result.passed is False
    reasons = " ".join(result.blocking_reasons)
    assert "PROPERTY_ALLOWLIST_VIOLATION" in reasons or "tampering detected" in reasons


@pytest.mark.asyncio
async def test_implementation_drift_rejected(canary_env):
    """Section 98: Implementation drift detected if fingerprint does not match canonical fingerprint."""
    final_pf_svc = canary_env["final_pf_svc"]
    intent = canary_env["approved_intent"]
    executor = canary_env["executor_operator"]

    tampered_payload = copy.deepcopy(intent.payload)
    tampered_payload["implementation_fingerprint"] = "drifted_fingerprint_123"
    tampered_intent = intent.model_copy(update={"payload": tampered_payload})

    result = await final_pf_svc.evaluate(intent=tampered_intent, principal=executor)
    assert result.passed is False
    reasons = " ".join(result.blocking_reasons)
    assert "TOOL_IMPLEMENTATION_DRIFT" in reasons or "tampering detected" in reasons


@pytest.mark.asyncio
async def test_non_sagara_lab_profile_rejected_for_read_only_canary(canary_env):
    """Section 2: SAFE_READ_ONLY canary is only authorized for profile sagara-lab."""
    final_pf_svc = canary_env["final_pf_svc"]
    intent = canary_env["approved_intent"]
    executor = canary_env["executor_operator"]

    tampered_intent = intent.model_copy(update={"target_id": "it-support"})
    result = await final_pf_svc.evaluate(intent=tampered_intent, principal=executor)
    assert result.passed is False
    reasons = " ".join(result.blocking_reasons)
    assert "RESOURCE_SCOPE_DENIED" in reasons or "tampering detected" in reasons


@pytest.mark.asyncio
async def test_unauthorized_task_class_rejected(canary_env):
    """Section 21: Task class must be READ_ONLY_INSPECTION."""
    final_pf_svc = canary_env["final_pf_svc"]
    intent = canary_env["approved_intent"]
    executor = canary_env["executor_operator"]

    tampered_payload = copy.deepcopy(intent.payload)
    tampered_payload["task_class"] = "REASONING_ONLY"
    tampered_intent = intent.model_copy(update={"payload": tampered_payload})

    result = await final_pf_svc.evaluate(intent=tampered_intent, principal=executor)
    assert result.passed is False
    reasons = " ".join(result.blocking_reasons)
    assert "TASK_CLASS_DISABLED" in reasons or "tampering detected" in reasons


@pytest.mark.asyncio
async def test_prohibited_capabilities_rejected(canary_env):
    """Sections 14-18: Generic shell, network, and MCP are rejected in preflight."""
    final_pf_svc = canary_env["final_pf_svc"]
    intent = canary_env["approved_intent"]
    executor = canary_env["executor_operator"]

    for flag, expected in [
        ("network_enabled", "NETWORK_DENIED"),
        ("shell_enabled", "TOOL_NOT_ALLOWED"),
        ("mcp_enabled", "MCP_DENIED"),
        ("document_inspection_enabled", "TOOL_NOT_ALLOWED"),
    ]:
        tampered_payload = copy.deepcopy(intent.payload)
        tampered_payload[flag] = True
        tampered_intent = intent.model_copy(update={"payload": tampered_payload})

        result = await final_pf_svc.evaluate(intent=tampered_intent, principal=executor)
        assert result.passed is False
        reasons = " ".join(result.blocking_reasons)
        assert expected in reasons or "tampering detected" in reasons


@pytest.mark.asyncio
async def test_second_execution_blocked_after_budget_exhaustion(canary_env):
    """Section 70-71, 99: Second execution attempt is blocked after budget consumption."""
    conn = canary_env["conn"]
    task_repo = canary_env["task_repo"]
    fake_executor = canary_env["fake_executor"]
    intent = canary_env["approved_intent"]
    executor = canary_env["executor_operator"]
    intent_svc = canary_env["intent_svc"]

    coordinator = TaskDispatchCoordinator(
        conn=conn,
        executor=fake_executor,
        task_repository=task_repo,
        idempotency_store=PersistentIdempotencyStore(db_path_override=canary_env["db_path"]),
        action_intent_service=intent_svc,
    )

    import secrets
    call_key_1 = f"idem-call-1-{secrets.token_hex(4)}"
    call_key_2 = f"idem-call-2-{secrets.token_hex(4)}"

    # First dispatch succeeds
    res1 = await coordinator.execute_task_dispatch(
        intent_id=intent.id,
        principal=executor,
        idempotency_key=call_key_1,
    )
    assert res1["status"] == "ACKNOWLEDGED"

    # Second dispatch with new idempotency key must be blocked (authorization consumed / window exhausted)
    with pytest.raises(AppError) as exc_info:
        await coordinator.execute_task_dispatch(
            intent_id=intent.id,
            principal=executor,
            idempotency_key=call_key_2,
        )
    assert exc_info.value.code in ("FINAL_PREFLIGHT_FAILED", "AUTHORIZATION_INVALID", "EXECUTION_NOT_AUTHORIZED", "CONCURRENCY_LIMIT")
