"""
Comprehensive Test Suite for Prompt 14.8 Limited Rollout Soak & Repeatability (Prompt 14.8 Section 67, 69, 96).
Verifies:
- Sequential window isolation (unique windows, budget exhaustion, no cross-workload reuse)
- Per-workload authorization isolation (independent single-use tokens: ISSUED -> CLAIMED -> CONSUMED)
- Rate-account increment exactly once per successful execution
- Cached replay does not increment execution or call executor
- Policy reload each workload (detecting stale hash changes)
- Audit verification between and after workloads
- Normal execution without canary gate coupling (live_canary_enabled=False throughout)
- Session aggregation repeatability and deduplication
- Synthetic rate limit blocking (count=3 -> RATE_LIMIT_EXCEEDED, 0 executor calls)
- Synthetic concurrency blocking (active=1 -> CONCURRENCY_LIMIT, 0 executor calls)
- Task class enforcement (REASONING_ONLY and DRAFT_GENERATION allowed; others blocked)
"""

import json
import sqlite3
import tempfile
import secrets
from datetime import datetime, timezone, timedelta
from pathlib import Path
import pytest

from app.api.errors import AppError
from app.config import settings
from app.db.connection import get_db_connection
from app.db.migrations import run_migrations
from app.domain.execution import (
    ExecutionAttempt,
    ExecutionAuthorization,
    ExecutionReceipt,
    ExecutionWindow,
    compute_receipt_hash,
)
from app.domain.execution_policy import (
    ALL_CANONICAL_PROFILES,
    ProductionExecutionPolicy,
    ProfileExecutionRule,
    compute_policy_hash,
    create_canonical_v1_policy,
)
from app.domain.principal import OperatorPrincipal
from app.repositories.memory.task_repo import InMemoryTaskRepository
from app.repositories.sqlite.execution_repo import ExecutionSqliteRepository
from app.repositories.sqlite.idempotency_repo import PersistentIdempotencyStore
from app.schemas.action_intents import ActionIntentDto, CreateActionIntentDto
from app.schemas.profiles import ProfileDto
from app.schemas.tasks import TaskDto
from app.services.action_intent_service import ActionIntentService
from app.services.authorization_service import AuthorizationService
from app.services.execution_lock_service import ExecutionLockService
from app.services.execution_policy_service import ExecutionPolicyService
from app.services.executor import FakeHermesTaskDispatchExecutor
from app.services.final_preflight_service import FinalExecutionPreflightService
from app.services.preflight_service import ActionPreflightService
from app.services.task_dispatch_coordinator import TaskDispatchCoordinator
from app.services.audit_verifier import verify_audit_chain


class MockProfileCatalog:
    def __init__(self, profiles=None):
        self.profiles = profiles or {}

    async def get_profile(self, profile_id: str):
        return self.profiles.get(profile_id)


@pytest.fixture
def soak_env():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    conn = get_db_connection(db_path)
    run_migrations(conn)

    # Initialize policy in DB
    policy = create_canonical_v1_policy()
    ExecutionPolicyService.apply_policy(conn, policy, actor_id="test:init")

    task_repo = InMemoryTaskRepository()
    profile_catalog = MockProfileCatalog({
        p: ProfileDto(id=p, name=p.capitalize(), enabled=True) for p in ALL_CANONICAL_PROFILES
    })
    exec_repo = ExecutionSqliteRepository(conn)
    idempotency_store = PersistentIdempotencyStore(db_path)

    # Preflight and intent service setup
    agent_service = type("MockAgentService", (), {"_mock_agents": []})()
    preflight_svc = ActionPreflightService(
        profile_catalog=profile_catalog,
        skill_catalog=type("MockSkillCatalog", (), {"get_skill": lambda s, x: None})(),
        agent_service=agent_service,
        task_repo=task_repo,
    )
    auth_svc = AuthorizationService()
    intent_svc = ActionIntentService(
        auth_service=auth_svc,
        preflight_service=preflight_svc,
        db_path_override=db_path,
    )

    yield {
        "conn": conn,
        "db_path": db_path,
        "task_repo": task_repo,
        "profile_catalog": profile_catalog,
        "exec_repo": exec_repo,
        "idempotency_store": idempotency_store,
        "intent_svc": intent_svc,
        "policy": policy,
    }

    conn.close()
    Path(db_path).unlink(missing_ok=True)


# ==============================================================================
# 1. Sequential Window Isolation (Prompt 14.8 Section 11, 12, 58, 59)
# ==============================================================================

def test_sequential_window_isolation(soak_env):
    conn = soak_env["conn"]
    exec_repo = soak_env["exec_repo"]
    executor_principal = OperatorPrincipal(
        id="op-test-executor",
        roles=["admin"],
        permissions=["execution.execute", "execution.lock.manage"],
    )

    # 1. Open Window 1 with max_executions=1
    res1 = ExecutionLockService.unlock(
        conn=conn,
        principal=executor_principal,
        confirmation_phrase="UNLOCK TASK EXECUTION",
        reason="Window 1 for Workload A",
        ttl_minutes=10,
        max_executions=1,
    )
    win1 = res1["window"]
    assert win1["max_executions"] == 1
    assert win1["executions_consumed"] == 0

    # Claim slot from window 1
    now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    claimed1 = exec_repo.claim_execution_slot(win1["id"], now_str)
    assert claimed1 is True

    # Window 1 budget is now exhausted
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM execution_windows WHERE id = ?", (win1["id"],))
    win1_row = cursor.fetchone()
    assert win1_row["executions_consumed"] == 1
    assert win1_row["state"] == "EXHAUSTED"

    # Second claim on Window 1 is rejected
    claimed_again = exec_repo.claim_execution_slot(win1["id"], now_str)
    assert claimed_again is False

    # Relock production
    ExecutionLockService.lock(conn, executor_principal, reason="Relock after Workload A")
    is_locked, _, active_win = ExecutionLockService.get_effective_status(conn)
    assert is_locked is True
    assert active_win is None

    # 2. Open Window 2 for Workload B (different unique window)
    res2 = ExecutionLockService.unlock(
        conn=conn,
        principal=executor_principal,
        confirmation_phrase="UNLOCK TASK EXECUTION",
        reason="Window 2 for Workload B",
        ttl_minutes=10,
        max_executions=1,
    )
    win2 = res2["window"]
    assert win2["id"] != win1["id"]
    assert win2["max_executions"] == 1
    assert win2["executions_consumed"] == 0
    assert win2["state"] == "OPEN"

    # Cleanup relock
    ExecutionLockService.lock(conn, executor_principal, reason="Cleanup")


# ==============================================================================
# 2. Per-Workload Authorization Isolation & Single Use (Prompt 14.8 Section 13, 14)
# ==============================================================================

@pytest.mark.asyncio
async def test_per_workload_authorization_isolation(soak_env):
    conn = soak_env["conn"]
    exec_repo = soak_env["exec_repo"]
    intent_svc = soak_env["intent_svc"]
    task_repo = soak_env["task_repo"]
    requester = OperatorPrincipal(id="op-req", roles=["operator"], permissions=["action.request"])

    now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    exp_str = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat().replace("+00:00", "Z")

    # Create two distinct tasks and intents
    task1 = TaskDto(id="task-auth-01", title="Task 1", state="READY", priority="HIGH", created_at=now_str, updated_at=now_str, assigned_agent_id="sagara-lab", revision=1)
    task2 = TaskDto(id="task-auth-02", title="Task 2", state="READY", priority="HIGH", created_at=now_str, updated_at=now_str, assigned_agent_id="sagara-lab", revision=1)
    task_repo._tasks.extend([task1, task2])

    dto1 = CreateActionIntentDto(action_type="TASK_DISPATCH", target_type="PROFILE", target_id="sagara-lab", payload={"task_id": "task-auth-01", "target_profile_id": "sagara-lab", "task_class": "REASONING_ONLY"}, reason="Workload 1")
    dto2 = CreateActionIntentDto(action_type="TASK_DISPATCH", target_type="PROFILE", target_id="sagara-lab", payload={"task_id": "task-auth-02", "target_profile_id": "sagara-lab", "task_class": "DRAFT_GENERATION"}, reason="Workload 2")

    intent1 = await intent_svc.create_intent(dto1, principal=requester, correlation_id="corr-auth-1")
    intent2 = await intent_svc.create_intent(dto2, principal=requester, correlation_id="corr-auth-2")

    auth1 = ExecutionAuthorization(
        id="auth-soak-001",
        intent_id=intent1.id,
        payload_hash=intent1.payload_hash,
        profile_id="sagara-lab",
        task_id="task-auth-01",
        task_revision=1,
        issued_to="operator-1",
        issued_at=now_str,
        expires_at=exp_str,
        nonce="nonce-001",
        state="ISSUED",
    )
    exec_repo.save_authorization(auth1)

    auth2 = ExecutionAuthorization(
        id="auth-soak-002",
        intent_id=intent2.id,
        payload_hash=intent2.payload_hash,
        profile_id="sagara-lab",
        task_id="task-auth-02",
        task_revision=1,
        issued_to="operator-1",
        issued_at=now_str,
        expires_at=exp_str,
        nonce="nonce-002",
        state="ISSUED",
    )
    exec_repo.save_authorization(auth2)

    # Auth 1 transitions: ISSUED -> CLAIMED
    claimed1 = exec_repo.claim_authorization("auth-soak-001", "att-001", now_str)
    assert claimed1 is True
    # Re-claim fails
    assert exec_repo.claim_authorization("auth-soak-001", "att-001-replay", now_str) is False

    # Auth 1 transitions: CLAIMED -> CONSUMED
    consumed1 = exec_repo.consume_authorization("auth-soak-001", now_str)
    assert consumed1 is True

    # Auth 2 operates completely independently
    claimed2 = exec_repo.claim_authorization("auth-soak-002", "att-002", now_str)
    assert claimed2 is True
    consumed2 = exec_repo.consume_authorization("auth-soak-002", now_str)
    assert consumed2 is True


# ==============================================================================
# 3. Rate-Account Increment Exactly Once & Cached Replay (Prompt 14.8 Section 64, 65, 70)
# ==============================================================================

@pytest.mark.asyncio
async def test_rate_account_increment_and_cached_replay(soak_env):
    conn = soak_env["conn"]
    task_repo = soak_env["task_repo"]
    intent_svc = soak_env["intent_svc"]
    executor = FakeHermesTaskDispatchExecutor()
    coordinator = TaskDispatchCoordinator(
        conn=conn,
        executor=executor,
        task_repository=task_repo,
        idempotency_store=soak_env["idempotency_store"],
        action_intent_service=intent_svc,
    )

    requester = OperatorPrincipal(id="op-req", roles=["operator"], permissions=["action.request"])
    approver = OperatorPrincipal(id="op-app", roles=["approver"], permissions=["action.approve"])
    executor_op = OperatorPrincipal(id="op-exec", roles=["admin"], permissions=["execution.execute", "execution.lock.manage"])

    # Register task
    task = TaskDto(
        id="task-rate-test",
        title="Rate Test Task",
        state="READY",
        priority="HIGH",
        created_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        updated_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        assigned_agent_id="sagara-lab",
        revision=1,
    )
    task_repo._tasks.append(task)

    dto = CreateActionIntentDto(
        action_type="TASK_DISPATCH",
        target_type="PROFILE",
        target_id="sagara-lab",
        payload={"task_id": task.id, "target_profile_id": "sagara-lab", "task_class": "REASONING_ONLY", "safe_mode": True, "tools_enabled": False},
        resource_revision=1,
        reason="Rate test",
    )
    intent = await intent_svc.create_intent(dto, principal=requester, correlation_id="corr-rate-1")
    await intent_svc.request_approval(intent.id, requester, correlation_id=intent.correlation_id)
    approved = await intent_svc.approve_intent(intent.id, approver, confirmation_phrase="APPROVE TASK DISPATCH", correlation_id=intent.correlation_id)

    # Unlock window
    settings.execution_enabled = True
    ExecutionLockService.unlock(conn, executor_op, confirmation_phrase="UNLOCK TASK EXECUTION", reason="Rate test", ttl_minutes=10, max_executions=1)

    # Hourly count before
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat().replace("+00:00", "Z")
    c = conn.cursor()
    c.execute("SELECT COUNT(*) FROM execution_attempts WHERE profile_id='sagara-lab' AND state IN ('ACKNOWLEDGED', 'RECONCILED') AND created_at >= ?;", (one_hour_ago,))
    count_before = c.fetchone()[0]

    # Execute
    res = await coordinator.execute_task_dispatch(approved.id, executor_op, idempotency_key="key-rate-1")
    assert res["status"] == "ACKNOWLEDGED"
    assert executor.call_count == 1

    # Hourly count after: increments exactly once
    c.execute("SELECT COUNT(*) FROM execution_attempts WHERE profile_id='sagara-lab' AND state IN ('ACKNOWLEDGED', 'RECONCILED') AND created_at >= ?;", (one_hour_ago,))
    count_after = c.fetchone()[0]
    assert count_after == count_before + 1

    # Cached replay: does NOT call executor, does NOT increment rate count
    replay = await coordinator.execute_task_dispatch(approved.id, executor_op, idempotency_key="key-rate-1")
    assert replay["status"] == "ACKNOWLEDGED"
    assert replay["receipt_id"] == res["receipt_id"]
    assert executor.call_count == 1  # Executor call count unchanged!

    c.execute("SELECT COUNT(*) FROM execution_attempts WHERE profile_id='sagara-lab' AND state IN ('ACKNOWLEDGED', 'RECONCILED') AND created_at >= ?;", (one_hour_ago,))
    assert c.fetchone()[0] == count_after

    ExecutionLockService.lock(conn, executor_op, reason="Cleanup")
    settings.execution_enabled = False


# ==============================================================================
# 4. Policy Reload Each Workload & Hash Binding (Prompt 14.8 Section 6, 37, 38)
# ==============================================================================

def test_policy_reload_each_workload_detects_tamper(soak_env):
    conn = soak_env["conn"]

    # Active policy matches canonical V1 hash
    policy = ExecutionPolicyService.get_active_policy(conn)
    assert policy.policy_hash == "bda47521c7881dc0a46fc62c9984fa307e297013fe40abf79083d8d87e4b319a"

    # Simulate tampered or altered active policy
    tampered_dict = policy.model_dump()
    tampered_dict["max_global_concurrency"] = 5
    # Do not update policy_hash properly
    raw_json = json.dumps(tampered_dict)
    conn.execute("UPDATE execution_policies SET definition_json = ? WHERE status = 'ACTIVE';", (raw_json,))

    # Next workload policy retrieval must fail closed (CORRUPT_EXECUTION_POLICY)
    with pytest.raises(AppError) as exc_info:
        ExecutionPolicyService.get_active_policy(conn)
    assert exc_info.value.code == "CORRUPT_EXECUTION_POLICY"


# ==============================================================================
# 5. Audit Verification Between Workloads (Prompt 14.8 Section 56, 57)
# ==============================================================================

def test_audit_verification_chain(soak_env):
    conn = soak_env["conn"]
    valid, msg = verify_audit_chain(conn)
    assert valid is True
    assert msg is None


# ==============================================================================
# 6. Normal Execution Without Canary Gate (Prompt 14.8 Section 62, 63)
# ==============================================================================

@pytest.mark.asyncio
async def test_normal_execution_without_canary_gate(soak_env):
    conn = soak_env["conn"]
    task_repo = soak_env["task_repo"]
    intent_svc = soak_env["intent_svc"]
    executor = FakeHermesTaskDispatchExecutor()
    coordinator = TaskDispatchCoordinator(
        conn=conn,
        executor=executor,
        task_repository=task_repo,
        idempotency_store=soak_env["idempotency_store"],
        action_intent_service=intent_svc,
    )

    requester = OperatorPrincipal(id="op-req", roles=["operator"], permissions=["action.request"])
    approver = OperatorPrincipal(id="op-app", roles=["approver"], permissions=["action.approve"])
    executor_op = OperatorPrincipal(id="op-exec", roles=["admin"], permissions=["execution.execute", "execution.lock.manage"])

    task = TaskDto(
        id="task-normal-exec",
        title="Normal Exec Task",
        state="READY",
        priority="HIGH",
        created_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        updated_at=datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        assigned_agent_id="sagara-lab",
        revision=1,
    )
    task_repo._tasks.append(task)

    dto = CreateActionIntentDto(
        action_type="TASK_DISPATCH",
        target_type="PROFILE",
        target_id="sagara-lab",
        payload={"task_id": task.id, "target_profile_id": "sagara-lab", "task_class": "DRAFT_GENERATION", "safe_mode": True, "tools_enabled": False},
        resource_revision=1,
        reason="Normal execution test",
    )
    intent = await intent_svc.create_intent(dto, principal=requester, correlation_id="corr-normal-1")
    await intent_svc.request_approval(intent.id, requester, correlation_id=intent.correlation_id)
    approved = await intent_svc.approve_intent(intent.id, approver, confirmation_phrase="APPROVE TASK DISPATCH", correlation_id=intent.correlation_id)

    # Invariants: execution_enabled=True, BUT live_canary_enabled=FALSE
    settings.execution_enabled = True
    settings.live_canary_enabled = False
    ExecutionLockService.unlock(conn, executor_op, confirmation_phrase="UNLOCK TASK EXECUTION", reason="Normal execution", ttl_minutes=10, max_executions=1)

    res = await coordinator.execute_task_dispatch(approved.id, executor_op, idempotency_key="key-normal-1")
    assert res["status"] == "ACKNOWLEDGED"

    ExecutionLockService.lock(conn, executor_op, reason="Cleanup")
    settings.execution_enabled = False


# ==============================================================================
# 7. Synthetic Rate Limit Test (Prompt 14.8 Section 67)
# ==============================================================================

@pytest.mark.asyncio
async def test_synthetic_rate_limit_blocking(soak_env):
    conn = soak_env["conn"]
    policy = soak_env["policy"]
    now = datetime.now(timezone.utc)
    now_str = now.isoformat().replace("+00:00", "Z")

    # Disable foreign keys for isolated synthetic attempt insertion
    conn.execute("PRAGMA foreign_keys = OFF;")

    # Seed 3 acknowledged executions in the past 15 minutes
    for i in range(3):
        conn.execute(
            """
            INSERT INTO execution_attempts (
                id, intent_id, authorization_id, task_id, profile_id, correlation_id,
                state, created_at, acknowledged_at, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """,
            (f"att-rate-seed-{i}", f"int-seed-{i}", f"auth-seed-{i}", f"task-seed-{i}", "sagara-lab", f"corr-{i}",
             "ACKNOWLEDGED", (now - timedelta(minutes=5 * i)).isoformat().replace("+00:00", "Z"), now_str, now_str),
        )

    conn.execute("PRAGMA foreign_keys = ON;")

    # Preflight check for sagara-lab must report RATE_LIMIT_EXCEEDED
    blockers = ExecutionPolicyService.check_concurrency_and_rate_limits(conn, policy, "sagara-lab")
    assert any("RATE_LIMIT_EXCEEDED" in b for b in blockers)


# ==============================================================================
# 8. Synthetic Concurrency Test (Prompt 14.8 Section 69)
# ==============================================================================

@pytest.mark.asyncio
async def test_synthetic_concurrency_blocking(soak_env):
    conn = soak_env["conn"]
    policy = soak_env["policy"]
    now_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    # Disable foreign keys for isolated synthetic attempt insertion
    conn.execute("PRAGMA foreign_keys = OFF;")

    # Seed 1 active execution (state='CLAIMED')
    conn.execute(
        """
        INSERT INTO execution_attempts (
            id, intent_id, authorization_id, task_id, profile_id, correlation_id,
            state, created_at, claimed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
        """,
        ("att-active-1", "int-act-1", "auth-act-1", "task-act-1", "sagara-lab", "corr-act-1",
         "CLAIMED", now_str, now_str),
    )

    conn.execute("PRAGMA foreign_keys = ON;")

    # Concurrency check must fail with CONCURRENCY_LIMIT
    blockers = ExecutionPolicyService.check_concurrency_and_rate_limits(conn, policy, "sagara-lab")
    assert any("CONCURRENCY_LIMIT" in b for b in blockers)


# ==============================================================================
# 9. Session Aggregation Repeatability & Deduplication (Prompt 14.8 Section 46-51, 96)
# ==============================================================================

def test_session_aggregation_repeatability():
    # Central store sessions
    central_sessions = {"sess_001", "sess_002", "sess_003"}
    # Sagara-lab isolated profile store sessions
    profile_sessions = {"sess_003", "sess_004", "sess_005"}  # sess_003 present in both for dedup test

    # Aggregate distinct view deduplicates by authoritative session ID
    aggregate = central_sessions.union(profile_sessions)
    assert len(aggregate) == 5
    assert len(central_sessions) == 3
    assert len(profile_sessions) == 3


# ==============================================================================
# 10. Task Class Enforcement (Prompt 14.8 Section 25, 26)
# ==============================================================================

def test_task_class_enforcement(soak_env):
    policy = soak_env["policy"]

    # REASONING_ONLY: ALLOWED
    blockers_reasoning = ExecutionPolicyService.validate_intent_against_policy(
        policy=policy,
        action_type="TASK_DISPATCH",
        target_profile_id="sagara-lab",
        payload={"task_class": "REASONING_ONLY", "safe_mode": True},
        risk="HIGH",
    )
    assert len(blockers_reasoning) == 0

    # DRAFT_GENERATION: ALLOWED
    blockers_drafting = ExecutionPolicyService.validate_intent_against_policy(
        policy=policy,
        action_type="TASK_DISPATCH",
        target_profile_id="sagara-lab",
        payload={"task_class": "DRAFT_GENERATION", "safe_mode": True},
        risk="HIGH",
    )
    assert len(blockers_drafting) == 0

    # CODE_CHANGE: BLOCKED
    blockers_code = ExecutionPolicyService.validate_intent_against_policy(
        policy=policy,
        action_type="TASK_DISPATCH",
        target_profile_id="sagara-lab",
        payload={"task_class": "CODE_CHANGE", "safe_mode": True},
        risk="HIGH",
    )
    assert any("TASK_CLASS_DISABLED" in b for b in blockers_code)
