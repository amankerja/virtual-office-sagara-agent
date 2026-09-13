import asyncio
from datetime import datetime, timedelta, timezone
import json
import sqlite3
import pytest
from fastapi import Request
from starlette.datastructures import Headers

from app.api.auth import (
    get_auth_health_status,
    get_current_principal,
    is_client_from_trusted_proxy,
    validate_trusted_proxy_cidrs,
)
from app.api.errors import AppError
from app.config import settings
from app.db.migrations import run_migrations, compute_audit_hash
from app.domain.execution import ExecutionWindow
from app.domain.principal import (
    DEFAULT_ROLE_PERMISSIONS,
    PERMISSION_ACTION_APPROVE,
    PERMISSION_ACTION_REQUEST,
    PERMISSION_EXECUTION_EXECUTE,
    PERMISSION_EXECUTION_LOCK_MANAGE,
    OperatorPrincipal,
)
from app.repositories.sqlite.audit_repo import append_audit_entry_to_conn
from app.repositories.sqlite.execution_repo import ExecutionSqliteRepository
from app.schemas.action_intents import ActionIntentDto, CreateActionIntentDto
from app.services.action_intent_service import ActionIntentService
from app.services.audit_verifier import verify_audit_chain
from app.services.execution_lock_service import (
    ExecutionLockService,
    REQUIRED_UNLOCK_CONFIRMATION_PHRASE,
)
from app.services.execution_kill_switch import ExecutionKillSwitch
from app.services.execution_readiness_service import ExecutionReadinessService
from app.services.final_preflight_service import FinalExecutionPreflightService
from app.services.executor import FakeHermesTaskDispatchExecutor


@pytest.fixture
def clean_db():
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.row_factory = sqlite3.Row
    run_migrations(conn)
    yield conn
    conn.close()


def make_mock_request(client_ip="10.0.0.1", headers_dict=None):
    scope = {
        "type": "http",
        "client": (client_ip, 50000),
        "headers": [(k.lower().encode("latin-1"), v.encode("latin-1")) for k, v in (headers_dict or {}).items()],
    }
    return Request(scope)


# ==============================================================================
# 1. Trusted Auth Boundary & CIDR Validation Tests (Section 10-16, 31-32, 106)
# ==============================================================================

def test_cidr_validation_rejects_open_world_wildcards():
    """Rule #32: Reject or loudly block 0.0.0.0/0 and ::/0."""
    with pytest.raises(ValueError, match="OPEN_WORLD_CIDR_REJECTED"):
        validate_trusted_proxy_cidrs(["0.0.0.0/0"])

    with pytest.raises(ValueError, match="OPEN_WORLD_CIDR_REJECTED"):
        validate_trusted_proxy_cidrs(["::/0"])


def test_cidr_validation_rejects_malformed_cidrs():
    """Rule #31: Reject malformed CIDRs."""
    with pytest.raises(ValueError, match="INVALID_CIDR_FORMAT"):
        validate_trusted_proxy_cidrs(["not-a-cidr"])

    with pytest.raises(ValueError, match="INVALID_CIDR_FORMAT"):
        validate_trusted_proxy_cidrs(["999.999.999.999/24"])


def test_cidr_validation_accepts_valid_ipv4_and_ipv6():
    """Rule #31: Valid CIDRs parse cleanly."""
    valid = ["10.0.0.0/8", "192.168.1.0/24", "fd00::/8", "127.0.0.1/32"]
    nets = validate_trusted_proxy_cidrs(valid)
    assert len(nets) == 4


def test_client_trusted_proxy_check():
    """Verify request client IP is properly tested against valid trusted CIDRs."""
    req_trusted = make_mock_request(client_ip="10.1.2.3")
    assert is_client_from_trusted_proxy(req_trusted, ["10.0.0.0/8"]) is True

    req_untrusted = make_mock_request(client_ip="203.0.113.5")
    assert is_client_from_trusted_proxy(req_untrusted, ["10.0.0.0/8"]) is False

    # Empty CIDR list fails closed
    assert is_client_from_trusted_proxy(req_trusted, []) is False


def test_direct_header_spoofing_rejected_in_production(monkeypatch):
    """Rule #13, #80: Direct public request sending operator headers without trusted proxy -> 403."""
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "trusted_auth_proxy_enabled", True)
    monkeypatch.setattr(settings, "trusted_proxy_cidrs", ["10.0.0.0/8"])

    untrusted_req = make_mock_request(client_ip="198.51.100.22")
    with pytest.raises(AppError) as exc_info:
        get_current_principal(
            request=untrusted_req,
            x_operator_id="administrator",
            x_operator_roles="admin",
        )
    assert exc_info.value.status_code == 403
    assert exc_info.value.code == "AUTHORIZATION_DENIED"


def test_trusted_proxy_principal_accepted_in_production(monkeypatch):
    """Rule #81-82: Request through trusted proxy is accepted with server-derived principal."""
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "trusted_auth_proxy_enabled", True)
    monkeypatch.setattr(settings, "trusted_proxy_cidrs", ["10.0.0.0/8"])

    trusted_req = make_mock_request(client_ip="10.0.0.5")
    principal = get_current_principal(
        request=trusted_req,
        x_operator_id="operator-prod-42",
        x_operator_roles="operator",
        x_operator_name="Production Operator",
    )
    assert principal.id == "operator-prod-42"
    assert principal.display_name == "Production Operator"
    assert principal.roles == ["operator"]
    assert principal.source == "trusted_proxy"
    assert principal.authentication_strength == "trusted_proxy"
    assert PERMISSION_ACTION_REQUEST in principal.permissions
    assert PERMISSION_EXECUTION_EXECUTE not in principal.permissions  # Plain operator cannot execute


def test_dev_principal_escape_in_production_fails_closed(monkeypatch):
    """Rule #21-22: Dev provider / dev identities strictly rejected in production."""
    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "trusted_auth_proxy_enabled", True)
    monkeypatch.setattr(settings, "trusted_proxy_cidrs", ["10.0.0.0/8"])

    trusted_req = make_mock_request(client_ip="10.0.0.5")
    with pytest.raises(AppError) as exc_info:
        get_current_principal(
            request=trusted_req,
            x_operator_id="dev-operator-1",
            x_auth_source="dev_provider",
        )
    assert exc_info.value.status_code == 403
    assert exc_info.value.code == "AUTHORIZATION_UNAVAILABLE"


def test_auth_health_status_reporting(monkeypatch):
    """Rule #37: Diagnostic health status."""
    monkeypatch.setattr(settings, "environment", "development")
    dev_status = get_auth_health_status()
    assert dev_status["status"] == "AUTH_CONFIGURED"

    monkeypatch.setattr(settings, "environment", "production")
    monkeypatch.setattr(settings, "trusted_auth_proxy_enabled", False)
    prod_unavail = get_auth_health_status()
    assert prod_unavail["status"] == "AUTH_UNAVAILABLE"

    monkeypatch.setattr(settings, "trusted_auth_proxy_enabled", True)
    monkeypatch.setattr(settings, "trusted_proxy_cidrs", ["0.0.0.0/0"])
    prod_misconfig = get_auth_health_status()
    assert prod_misconfig["status"] == "AUTH_MISCONFIGURED"


# ==============================================================================
# 2. Operator Authorization & Permission Model Tests (Section 23-27, 107)
# ==============================================================================

def test_operator_permission_derivation():
    """Verify role-to-permission mapping and separation of concerns."""
    viewer = OperatorPrincipal(id="v1", roles=["viewer"])
    assert viewer.has_permission("audit.verify") is True
    assert viewer.has_permission("execution.lock.manage") is False
    assert viewer.has_permission("execution.execute") is False

    approver = OperatorPrincipal(id="a1", roles=["approver"], permissions=DEFAULT_ROLE_PERMISSIONS["approver"])
    assert approver.has_permission("action.approve") is True
    assert approver.has_permission("execution.execute") is False  # Rule #25: Approver != Executor

    executor = OperatorPrincipal(id="e1", roles=["executor"], permissions=DEFAULT_ROLE_PERMISSIONS["executor"])
    assert executor.has_permission("execution.execute") is True
    assert executor.has_permission("action.approve") is False

    admin = OperatorPrincipal(id="adm1", roles=["admin"], permissions=DEFAULT_ROLE_PERMISSIONS["admin"])
    assert admin.has_permission("execution.execute") is True
    assert admin.has_permission("execution.lock.manage") is True


# ==============================================================================
# 3. Kill-Switch & Bounded Window Workflow Tests (Section 44-71, 94-105)
# ==============================================================================

def test_unlock_requires_manage_permission(clean_db):
    """Rule #107: Operator lacking execution.lock.manage cannot unlock."""
    viewer = OperatorPrincipal(id="viewer-1", roles=["viewer"])
    with pytest.raises(AppError) as exc_info:
        ExecutionLockService.unlock(
            conn=clean_db,
            principal=viewer,
            confirmation_phrase=REQUIRED_UNLOCK_CONFIRMATION_PHRASE,
            reason="Canary preparation",
        )
    assert exc_info.value.status_code == 403
    assert exc_info.value.code == "AUTHORIZATION_DENIED"


def test_unlock_requires_exact_confirmation_phrase(clean_db):
    """Rule #50: Exact server-defined phrase required."""
    admin = OperatorPrincipal(id="admin-1", roles=["admin"], permissions=DEFAULT_ROLE_PERMISSIONS["admin"])
    with pytest.raises(AppError) as exc_info:
        ExecutionLockService.unlock(
            conn=clean_db,
            principal=admin,
            confirmation_phrase="WRONG PHRASE",
            reason="Canary preparation",
        )
    assert exc_info.value.status_code == 400
    assert exc_info.value.code == "INVALID_CONFIRMATION_PHRASE"


def test_unlock_requires_operator_reason(clean_db):
    """Rule #51: Operator reason is required."""
    admin = OperatorPrincipal(id="admin-1", roles=["admin"], permissions=DEFAULT_ROLE_PERMISSIONS["admin"])
    with pytest.raises(AppError) as exc_info:
        ExecutionLockService.unlock(
            conn=clean_db,
            principal=admin,
            confirmation_phrase=REQUIRED_UNLOCK_CONFIRMATION_PHRASE,
            reason="",
        )
    assert exc_info.value.status_code == 400
    assert exc_info.value.code == "REASON_REQUIRED"


def test_unlock_denied_on_audit_ledger_tampering(clean_db):
    """Rule #69, #99: Tampered audit ledger rejects unlock."""
    admin = OperatorPrincipal(id="admin-1", roles=["admin"], permissions=DEFAULT_ROLE_PERMISSIONS["admin"])

    # Tamper with the audit ledger
    clean_db.execute("UPDATE audit_ledger SET record_hash = 'tampered-record-hash-value-here' WHERE sequence = 0;")
    clean_db.commit()


    with pytest.raises(AppError) as exc_info:
        ExecutionLockService.unlock(
            conn=clean_db,
            principal=admin,
            confirmation_phrase=REQUIRED_UNLOCK_CONFIRMATION_PHRASE,
            reason="Testing audit protection",
        )
    assert exc_info.value.status_code == 403
    assert exc_info.value.code == "AUDIT_INTEGRITY_COMPROMISED"


def test_unlock_creates_bounded_window_and_audit_event(clean_db, monkeypatch):
    """Rule #52-56: Unlock creates bounded window and logs to audit ledger."""
    monkeypatch.setattr(settings, "execution_enabled", True)
    admin = OperatorPrincipal(id="admin-1", roles=["admin"], permissions=DEFAULT_ROLE_PERMISSIONS["admin"])

    res = ExecutionLockService.unlock(
        conn=clean_db,
        principal=admin,
        confirmation_phrase=REQUIRED_UNLOCK_CONFIRMATION_PHRASE,
        reason="Prompt 14.5 canary rehearsal",
        ttl_minutes=15,
        max_executions=1,
    )
    assert res["status"] == "UNLOCKED"
    assert res["window"]["max_executions"] == 1
    assert res["window"]["state"] == "OPEN"

    # Verify audit event appended
    cursor = clean_db.cursor()
    cursor.execute("SELECT action, outcome FROM audit_ledger WHERE action = 'execution.unlocked';")
    row = cursor.fetchone()
    assert row is not None
    assert row["outcome"] == "SUCCESS"


def test_window_ttl_expiration_auto_relocks(clean_db, monkeypatch):
    """Rule #53, #100, #101: Expired window automatically evaluates effective state as LOCKED."""
    monkeypatch.setattr(settings, "execution_enabled", True)
    admin = OperatorPrincipal(id="admin-1", roles=["admin"], permissions=DEFAULT_ROLE_PERMISSIONS["admin"])

    base_time = datetime(2026, 9, 11, 10, 0, 0, tzinfo=timezone.utc)
    ExecutionLockService.unlock(
        conn=clean_db,
        principal=admin,
        confirmation_phrase=REQUIRED_UNLOCK_CONFIRMATION_PHRASE,
        reason="Prompt 14.5 canary window",
        ttl_minutes=10,
        now_dt=base_time,
    )

    # 5 minutes later: still unlocked
    t_plus_5 = base_time + timedelta(minutes=5)
    is_locked_5, _, window = ExecutionLockService.get_effective_status(clean_db, now_dt=t_plus_5)
    assert is_locked_5 is False
    assert window is not None

    # 11 minutes later: TTL expired -> auto-relocks!
    t_plus_11 = base_time + timedelta(minutes=11)
    is_locked_11, reason_11, _ = ExecutionLockService.get_effective_status(clean_db, now_dt=t_plus_11)
    assert is_locked_11 is True
    assert "expired" in reason_11.lower()


def test_one_canary_budget_atomic_consumption(clean_db, monkeypatch):
    """Rule #54, #95-96: Budget=1 -> 1st claim succeeds, 2nd claim blocked."""
    monkeypatch.setattr(settings, "execution_enabled", True)
    admin = OperatorPrincipal(id="admin-1", roles=["admin"], permissions=DEFAULT_ROLE_PERMISSIONS["admin"])

    now = datetime(2026, 9, 11, 12, 0, 0, tzinfo=timezone.utc)
    ExecutionLockService.unlock(
        conn=clean_db,
        principal=admin,
        confirmation_phrase=REQUIRED_UNLOCK_CONFIRMATION_PHRASE,
        reason="Canary single dispatch test",
        ttl_minutes=15,
        max_executions=1,
        now_dt=now,
    )

    # 1st claim: permitted
    ok1, msg1, win_id1 = ExecutionLockService.claim_execution_slot(clean_db, now_dt=now)
    assert ok1 is True
    assert win_id1 is not None

    # 2nd claim: blocked because budget is exhausted!
    ok2, msg2, win_id2 = ExecutionLockService.claim_execution_slot(clean_db, now_dt=now)
    assert ok2 is False
    assert "exhausted" in msg2.lower()

    # Effective status is now LOCKED due to budget exhaustion
    is_locked, reason, _ = ExecutionLockService.get_effective_status(clean_db, now_dt=now)
    assert is_locked is True
    assert "budget exhausted" in reason.lower()


def test_emergency_lock_workflow(clean_db, monkeypatch):
    """Rule #48, #97: Emergency lock closes active window immediately."""
    monkeypatch.setattr(settings, "execution_enabled", True)
    admin = OperatorPrincipal(id="admin-1", roles=["admin"], permissions=DEFAULT_ROLE_PERMISSIONS["admin"])

    ExecutionLockService.unlock(
        conn=clean_db,
        principal=admin,
        confirmation_phrase=REQUIRED_UNLOCK_CONFIRMATION_PHRASE,
        reason="Opening window before test",
        ttl_minutes=15,
    )

    # Lock immediately
    lock_res = ExecutionLockService.lock(clean_db, principal=admin, reason="Emergency safety drill")
    assert lock_res["status"] == "LOCKED"

    # Effective status is immediately LOCKED
    is_locked, reason = ExecutionKillSwitch.is_locked(clean_db)
    assert is_locked is True
    assert "LOCKED" in reason


# ==============================================================================
# 4. Execution Readiness Aggregator Tests (Section 38-43, 109)
# ==============================================================================

@pytest.mark.smoke
def test_execution_readiness_evaluation(clean_db, monkeypatch):
    """Rule #38-43: Verify all 11 dimensions evaluated and aggregated."""
    monkeypatch.setattr(settings, "environment", "development")
    monkeypatch.setattr(settings, "execution_enabled", False)
    monkeypatch.setattr(settings, "live_canary_enabled", False)

    report = ExecutionReadinessService.evaluate(clean_db)

    # Infrastructure is ready
    assert report.infrastructure_ready is True
    assert report.canary_ready is True
    assert report.live_canary_ready == "YES"
    assert report.live_canary_executed == "NO"

    # Execution is NOT ready because execution_enabled is False and kill switch is LOCKED
    assert report.execution_ready is False
    assert report.components["execution_env"] == "BLOCKED"
    assert report.components["kill_switch"] == "BLOCKED"
    assert report.components["canary_gate"] == "BLOCKED"
    assert report.components["auth_boundary"] == "READY"
    assert report.components["profile_targetability"] == "READY"
    assert report.components["audit_integrity"] == "READY"


@pytest.mark.smoke
@pytest.mark.security
def test_readiness_detects_audit_corruption(clean_db):
    """Rule #109: Tampered audit chain causes audit_integrity to report BLOCKED."""
    clean_db.execute("UPDATE audit_ledger SET record_hash = 'tampered-record-hash-corruption' WHERE sequence = 0;")
    clean_db.commit()
    report = ExecutionReadinessService.evaluate(clean_db)

    assert report.components["audit_integrity"] == "BLOCKED"
    assert report.infrastructure_ready is False
    assert report.canary_ready is False
    assert report.live_canary_ready == "NO"


# ==============================================================================
# 5. Final Preflight Simulation Tests (Section 90-93)
# ==============================================================================

@pytest.mark.asyncio
async def test_final_preflight_simulation_blocked_at_execution_gate(monkeypatch):
    """
    Rule #90-93: Approved ActionIntent evaluated through FinalExecutionPreflightService.
    All business/security checks pass, but blocked at the intentionally locked execution gate.
    Assert zero executor calls.
    """
    import tempfile
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    run_migrations(conn)


    monkeypatch.setattr(settings, "execution_enabled", False)
    executor = FakeHermesTaskDispatchExecutor()

    from app.services.authorization_service import AuthorizationService
    from app.services.preflight_service import ActionPreflightService
    from app.repositories.memory.task_repo import InMemoryTaskRepository
    from app.schemas.tasks import TaskDto

    auth = AuthorizationService()
    task_repo = InMemoryTaskRepository()
    task = TaskDto(
        id="task-synthetic-01",
        title="Synthetic Task",
        state="READY",
        priority="MEDIUM",
        created_at="2026-09-11T00:00:00Z",
        assigned_agent_id="lead",
        revision=1,
    )
    task_repo._tasks.append(task)
    preflight = ActionPreflightService(
        profile_catalog=None,
        skill_catalog=None,
        agent_service=None,
        task_repo=task_repo,
    )
    intent_svc = ActionIntentService(
        auth_service=auth,
        preflight_service=preflight,
        db_path_override=db_path,
    )

    requester = OperatorPrincipal(id="requester-1", roles=["operator"], permissions=["action.request"])
    approver = OperatorPrincipal(id="approver-1", roles=["approver"], permissions=["action.approve"])
    executor_principal = OperatorPrincipal(id="executor-1", roles=["executor"], permissions=["execution.execute"])

    # Create approved synthetic intent
    create_dto = CreateActionIntentDto(
        action_type="TASK_DISPATCH",
        target_type="TASK",
        target_id="task-synthetic-01",
        payload={"task_id": "task-synthetic-01", "target_profile_id": "lead"},
    )
    intent = await intent_svc.create_intent(create_dto, principal=requester, correlation_id="corr-synth-1")
    approved = await intent_svc.approve_intent(intent.id, principal=approver, confirmation_phrase="APPROVE TASK DISPATCH")

    preflight_svc = FinalExecutionPreflightService(
        conn=conn,
        task_repository=task_repo,
        executor=executor,
    )

    res = await preflight_svc.evaluate(intent=approved, principal=executor_principal)

    # Preflight fails ONLY because execution gate is locked
    assert res.passed is False
    assert any("kill switch locked" in reason.lower() for reason in res.blocking_reasons)
    # Targetability is confirmed
    assert res.targetability == "TARGETABLE"
    # Zero executor dispatches (Prompt 14.4 Section 91)
    assert executor.call_count == 0
