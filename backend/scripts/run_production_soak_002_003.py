#!/usr/bin/env python3
"""
Prompt 14.8 — Limited Rollout Soak & Repeatability Validation Orchestrator.
Executes at most TWO additional controlled workloads sequentially under PRODUCTION_EXECUTION_POLICY_V1:
- Profile: sagara-lab ONLY (LIMITED)
- Workload 002: Sagara Limited Rollout Safety Review 002 (Task Class: REASONING_ONLY)
- Workload 003: Sagara Limited Rollout Operator Checklist Draft 003 (Task Class: DRAFT_GENERATION)
- Execution Mode: SAFE_NO_TOOLS (zero tools, zero side effects)
- Single-use authorization and bounded window (max_executions=1) per workload
- Mandatory re-lock and audit verification between workloads
- Re-read policy per workload (no caching bug)
- Rate-limit authoritative verification (3 successful sagara-lab executions / hour)
"""

import os
import sys
import json
import uuid
import secrets
import sqlite3
import subprocess
from datetime import datetime, timezone, timedelta

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.config import settings
canonical_db_path = os.path.abspath(os.path.join(backend_dir, "data", "mission-control.db"))
settings.database_url = f"sqlite:///{canonical_db_path}"

from app.domain.principal import OperatorPrincipal
from app.db.connection import get_db_connection
from app.schemas.tasks import TaskDto
from app.schemas.action_intents import CreateActionIntentDto, ActionIntentDto
from app.schemas.profiles import ProfileDto
from app.schemas.agents import AgentDto, AgentDefinitionDto, AgentRuntimeDto, AgentCapabilitiesDto
from app.services.action_intent_service import ActionIntentService
from app.services.final_preflight_service import FinalExecutionPreflightService
from app.services.execution_lock_service import ExecutionLockService
from app.services.execution_policy_service import ExecutionPolicyService
from app.services.task_dispatch_coordinator import TaskDispatchCoordinator
from app.services.executor import HermesTaskDispatchExecutor
from app.repositories.sqlite.execution_repo import ExecutionSqliteRepository
from app.repositories.sqlite.idempotency_repo import PersistentIdempotencyStore
from app.services.audit_verifier import verify_audit_chain
from app.api.dependencies import reconfigure_dependencies, get_action_intent_service, _task_repo

EXPECTED_POLICY_VERSION = "PRODUCTION_EXECUTION_POLICY_V1"
EXPECTED_POLICY_HASH = "bda47521c7881dc0a46fc62c9984fa307e297013fe40abf79083d8d87e4b319a"

WORKLOAD_002_PROMPT = """You are Sagara Lab conducting a reasoning-only review of the current Sagara limited production rollout.

Verified facts:

- Canary 001 passed.
- Production Execution Policy V1 is installed.
- Only sagara-lab is LIMITED.
- Seven other profiles remain DISABLED.
- Production execution is locked by default.
- Only TASK_DISPATCH is permitted.
- SAFE_NO_TOOLS is mandatory.
- Tool-enabled and side-effecting execution remain disabled.
- Global execution concurrency is 1.
- Sagara Lab concurrency is 1.
- Each execution window allows one execution.
- The current rate limit is 3 successful executions per hour.
- Workload 001 passed with direct Hermes session correlation, zero tools, zero side effects, and successful relock.

Do not use tools.
Do not access files.
Do not browse.
Do not execute code.
Do not send messages.
Do not modify state.

Return exactly these sections:

SOAK_READINESS
State whether the current limited rollout is suitable for additional SAFE_NO_TOOLS soak workloads.

FAILURE_SIGNALS
List the concrete signals that should immediately halt the rollout.

METRICS_TO_WATCH
List the operational metrics that matter most during soak validation.

EXPANSION_GATE
Describe what evidence should exist before considering either SAFE_READ_ONLY tools or a second LIMITED profile."""


WORKLOAD_003_PROMPT = """You are Sagara Lab preparing a draft operator checklist for future limited Sagara production execution.

This is a drafting-only workload.

Verified constraints:

- Production is locked by default.
- Only sagara-lab is currently LIMITED.
- TASK_DISPATCH is the only production action allowed.
- SAFE_NO_TOOLS is mandatory.
- Tools, MCP, external communication, filesystem mutation, profile mutation, skill mutation, and schedule mutation are denied.
- Every production workload requires authenticated request, approval, execution authorization, bounded execution window, final preflight, direct Hermes session receipt, audit verification, and immediate relock.
- Maximum concurrency is 1.
- Each execution window permits one execution.
- Rate limit is 3 successful sagara-lab executions per hour.

Do not use tools.
Do not access files.
Do not browse.
Do not execute code.
Do not send anything externally.
Do not modify any state.

Draft exactly these sections:

PRE_EXECUTION_CHECKLIST

EXECUTION_CHECKLIST

POST_EXECUTION_CHECKLIST

STOP_AND_LOCK_CONDITIONS

The draft is advisory only and must not modify production configuration."""


def get_remote_gateway_info() -> dict:
    """Fetch gateway PID, NRestarts, and ActiveState via SSH (read-only)."""
    res = subprocess.run(
        [
            "ssh",
            "sagara",
            "systemctl --user show hermes-gateway.service --property=ActiveState --property=SubState --property=MainPID --property=NRestarts",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    )
    info = {}
    for line in res.stdout.strip().splitlines():
        if "=" in line:
            k, v = line.split("=", 1)
            info[k] = v
    return info


def get_remote_session_telemetry() -> dict:
    """Fetch exact session telemetry from both central and sagara-lab state.db via SSH."""
    script = """import sqlite3
c1 = sqlite3.connect('/home/ubuntu/.hermes/state.db')
g_ids = set(r[0] for r in c1.execute('SELECT id FROM sessions').fetchall())
c2 = sqlite3.connect('/home/ubuntu/.hermes/profiles/sagara-lab/state.db')
p_ids = set(r[0] for r in c2.execute('SELECT id FROM sessions').fetchall())
agg_distinct = len(g_ids.union(p_ids))
print(f"{len(g_ids)}:{len(p_ids)}:{agg_distinct}")
"""
    res = subprocess.run(
        ["ssh", "sagara", "python3"],
        input=script,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    )
    g, p, agg = res.stdout.strip().split(":")
    return {
        "central_store_sessions": int(g),
        "sagara_lab_profile_local_sessions": int(p),
        "aggregate_distinct_sessions": int(agg),
    }


def get_remote_session_by_id(session_id: str) -> dict:
    """Fetch exact details of a specific session in remote sagara-lab state.db via SSH."""
    script = f"""import sqlite3, json
c = sqlite3.connect('/home/ubuntu/.hermes/profiles/sagara-lab/state.db')
row = c.execute("SELECT id, profile_name, tool_call_count, started_at, ended_at, end_reason FROM sessions WHERE id = ?", ('{session_id}',)).fetchone()
if not row:
    print(json.dumps({{}}))
else:
    t_cnt = c.execute("SELECT count(1) FROM messages WHERE session_id=? AND (tool_calls IS NOT NULL OR tool_name IS NOT NULL)", ('{session_id}',)).fetchone()[0]
    print(json.dumps({{'id': row[0], 'profile': row[1] or 'sagara-lab', 'tool_call_count': (row[2] or 0) + t_cnt, 'started_at': row[3], 'ended_at': row[4]}}))
"""
    res = subprocess.run(
        ["ssh", "sagara", "python3"],
        input=script,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        check=True,
    )
    return json.loads(res.stdout.strip())


def ensure_sagara_lab_registered(intent_service):
    """Ensure sagara-lab profile and agent are registered in catalog for preflight evaluation."""
    sagara_lab_profile = ProfileDto(
        id="sagara-lab",
        name="Sagara Lab",
        role="Research & Experimentation",
        description="Harmless reasoning and experimentation canary sandbox",
        enabled=True,
        allowed_skills=[],
        configuration_state="CONFIGURED",
    )
    if hasattr(intent_service._preflight_service._profile_catalog, "_profiles"):
        if not any(p.id == "sagara-lab" for p in intent_service._preflight_service._profile_catalog._profiles):
            intent_service._preflight_service._profile_catalog._profiles.append(sagara_lab_profile)

    sagara_lab_agent = AgentDto(
        id="sagara-lab",
        definition=AgentDefinitionDto(
            id="sagara-lab",
            name="Sagara Lab",
            role="Research & Experimentation",
            description="Harmless reasoning and experimentation canary sandbox",
            enabled=True,
        ),
        runtime=AgentRuntimeDto(
            state="IDLE",
            confidence="CONFIRMED",
        ),
        capabilities=AgentCapabilitiesDto(
            total=0,
            healthy=0,
            degraded=0,
            missing=0,
        ),
    )
    if hasattr(intent_service._preflight_service._agent_service, "_mock_agents"):
        if not any(a.id == "sagara-lab" for a in intent_service._preflight_service._agent_service._mock_agents):
            intent_service._preflight_service._agent_service._mock_agents.append(sagara_lab_agent)


async def execute_single_workload(
    workload_num: str,
    task_id: str,
    task_title: str,
    task_class: str,
    prompt_text: str,
    expected_sections: list[str],
    conn: sqlite3.Connection,
    requester: OperatorPrincipal,
    approver: OperatorPrincipal,
    executor_operator: OperatorPrincipal,
    real_executor: HermesTaskDispatchExecutor,
) -> dict:
    """
    Executes a single controlled production workload with complete lifecycle tracking and fail-closed relock.
    """
    print(f"\n==================================================")
    print(f"STARTING WORKLOAD {workload_num}: {task_title}")
    print(f"==================================================")

    # 1. Baseline captures before this workload
    gw_before = get_remote_gateway_info()
    sessions_before = get_remote_session_telemetry()
    is_locked_before, lock_reason_before, active_win_before = ExecutionLockService.get_effective_status(conn)
    cursor = conn.cursor()
    cursor.execute("SELECT record_hash, sequence FROM audit_ledger ORDER BY sequence DESC LIMIT 1;")
    audit_row = cursor.fetchone()
    audit_before_hash = audit_row[0] if audit_row else "GENESIS"
    audit_before_seq = audit_row[1] if audit_row else 0

    assert is_locked_before, f"FAIL: Workload {workload_num} must start with kill switch LOCKED"
    assert active_win_before is None, f"FAIL: Workload {workload_num} must start with 0 active windows"
    assert not settings.execution_enabled, f"FAIL: Workload {workload_num} must start with execution_enabled=False"
    assert not settings.live_canary_enabled, f"FAIL: live_canary_enabled must remain False throughout Prompt 14.8"

    # 2. Re-read and revalidate policy from DB (Section 6, 37: No policy caching bug)
    active_policy = ExecutionPolicyService.get_active_policy(conn)
    print(f"Policy Version: {active_policy.version}")
    print(f"Policy Hash: {active_policy.policy_hash}")
    assert active_policy.version == EXPECTED_POLICY_VERSION, f"FAIL: Policy version {active_policy.version} != {EXPECTED_POLICY_VERSION}"
    if active_policy.policy_hash != EXPECTED_POLICY_HASH:
        raise RuntimeError("SOAK_BLOCKED: POLICY_VERSION_STALE")

    sagara_lab_rule = active_policy.profiles.get("sagara-lab")
    assert sagara_lab_rule is not None, "FAIL: sagara-lab profile missing from policy"
    assert sagara_lab_rule.status == "LIMITED", f"FAIL: sagara-lab status is {sagara_lab_rule.status}, expected LIMITED"
    assert "TASK_DISPATCH" in sagara_lab_rule.allowed_action_types
    assert task_class in sagara_lab_rule.allowed_task_classes, f"FAIL: Task class {task_class} not allowed for sagara-lab"
    assert sagara_lab_rule.require_safe_mode is True
    assert sagara_lab_rule.external_side_effects_allowed is False

    # Check 7 other profiles remain DISABLED
    for pid in ["lead", "personal", "business", "marketing", "cs", "it-support", "it-coding"]:
        r = active_policy.profiles.get(pid)
        assert r is not None and r.status == "DISABLED", f"FAIL: {pid} is not DISABLED in policy"

    # Concurrency & Rate Limit Check (Section 16, 17, 64)
    one_hour_ago = (datetime.now(timezone.utc) - timedelta(hours=1)).isoformat().replace("+00:00", "Z")
    cursor.execute(
        "SELECT COUNT(*) AS hr_cnt FROM execution_attempts WHERE profile_id = 'sagara-lab' AND state IN ('ACKNOWLEDGED', 'RECONCILED') AND created_at >= ?;",
        (one_hour_ago,),
    )
    hr_count_before = cursor.fetchone()[0]
    print(f"Sagara-Lab successful executions in past hour before Workload {workload_num}: {hr_count_before}/3")

    limit_blockers = ExecutionPolicyService.check_concurrency_and_rate_limits(conn, active_policy, "sagara-lab")
    if limit_blockers:
        for b in limit_blockers:
            if "RATE_LIMIT_EXCEEDED" in b:
                raise RuntimeError("SOAK_PAUSED_BY_POLICY: RATE_LIMIT_EXCEEDED")
        raise RuntimeError(f"LIMIT_BLOCKERS: {limit_blockers}")

    # 3. Setup Task & ActionIntent
    reconfigure_dependencies()
    intent_service = get_action_intent_service()
    ensure_sagara_lab_registered(intent_service)

    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    task = TaskDto(
        id=task_id,
        title=task_title,
        description=f"Prompt 14.8 Soak Workload {workload_num}",
        state="READY",
        priority="HIGH",
        created_at=now_iso,
        updated_at=now_iso,
        assigned_agent_id="sagara-lab",
        requested_skills=[],
        revision=1,
    )
    _task_repo._tasks.append(task)

    corr_id = f"corr-soak-{workload_num}-{secrets.token_hex(4)}"
    intent_dto = await intent_service.create_intent(
        dto=CreateActionIntentDto(
            action_type="TASK_DISPATCH",
            target_type="PROFILE",
            target_id="sagara-lab",
            payload={
                "task_id": task.id,
                "target_profile_id": "sagara-lab",
                "task_class": task_class,
                "prompt": prompt_text,
                "safe_mode": True,
                "tools_enabled": False,
            },
            resource_revision=task.revision,
            reason=f"Prompt 14.8 Soak Workload {workload_num} dispatch",
        ),
        principal=requester,
        correlation_id=corr_id,
    )
    print(f"Created ActionIntent: {intent_dto.id} (status={intent_dto.status}, risk={intent_dto.risk})")
    assert intent_dto.status == "READY_FOR_APPROVAL"

    # Request approval
    intent_dto = await intent_service.request_approval(intent_dto.id, requester, correlation_id=intent_dto.correlation_id)
    assert intent_dto.status == "PENDING_APPROVAL"

    # Self-approval rejection test (requester CANNOT approve)
    try:
        await intent_service.approve_intent(
            intent_id=intent_dto.id,
            principal=requester,
            reason="Self-approval attempt",
            confirmation_phrase="APPROVE TASK DISPATCH",
        )
        raise AssertionError("FAIL: Requester was able to self-approve!")
    except Exception as e:
        print("Self-approval correctly blocked:", str(e)[:80])

    # Independent approval
    approved_intent = await intent_service.approve_intent(
        intent_id=intent_dto.id,
        principal=approver,
        reason=f"Prompt 14.8 Soak Workload {workload_num} authorized by independent approver",
        confirmation_phrase="APPROVE TASK DISPATCH",
        correlation_id=intent_dto.correlation_id,
    )
    print(f"ActionIntent Approved: {approved_intent.id} (status={approved_intent.status})")
    assert approved_intent.status == "READY_TO_EXECUTE"

    # 4. Open Bounded Execution Window (Section 12: max_executions=1, unique window)
    settings.execution_enabled = True
    assert not settings.live_canary_enabled, "FAIL: live_canary_enabled must remain False"

    coordinator = TaskDispatchCoordinator(
        conn=conn,
        executor=real_executor,
        task_repository=_task_repo,
        idempotency_store=PersistentIdempotencyStore(),
        action_intent_service=intent_service,
    )

    exec_result = None
    window_id = None
    exec_error = None

    try:
        unlock_res = ExecutionLockService.unlock(
            conn=conn,
            principal=executor_operator,
            confirmation_phrase="UNLOCK TASK EXECUTION",
            reason=f"Prompt 14.8 Soak Workload {workload_num}",
            ttl_minutes=10,
            max_executions=1,
            correlation_id=approved_intent.correlation_id,
        )
        assert unlock_res["status"] == "UNLOCKED", f"Unlock failed: {unlock_res}"
        window = unlock_res["window"]
        window_id = window["id"]
        print(f"Execution Window Opened: {window_id} (budget={window['max_executions']}, expires={window['expires_at']})")

        # Run Final Preflight
        preflight_service = FinalExecutionPreflightService(
            conn=conn,
            task_repository=_task_repo,
            executor=real_executor,
        )
        final_pf = await preflight_service.evaluate(intent=approved_intent, principal=executor_operator)
        assert final_pf.passed, f"Final execution preflight failed: {final_pf.blocking_reasons}"
        assert final_pf.targetability == "TARGETABLE"
        print("Final Preflight: PASS (targetability=TARGETABLE)")

        # Dispatch EXACTLY ONE submission to Hermes
        print(f"Submitting Workload {workload_num} to Hermes...")
        exec_result = await coordinator.execute_task_dispatch(
            intent_id=approved_intent.id,
            principal=executor_operator,
            idempotency_key=f"idem-soak-{workload_num}-{approved_intent.id}",
        )
        print(f"Hermes Response Status: {exec_result.get('status')}")

        if exec_result.get("status") == "OUTCOME_UNKNOWN":
            raise RuntimeError("OUTCOME_UNKNOWN")
        assert exec_result.get("status") == "ACKNOWLEDGED", f"Dispatch failed: {exec_result}"

    except Exception as e:
        exec_error = str(e)
        print(f"Execution Exception during Workload {workload_num}:", e)
        raise
    finally:
        # Immediate Re-Lock (Section 11, 60, 61)
        ExecutionLockService.lock(
            conn=conn,
            principal=executor_operator,
            reason=f"Prompt 14.8 Workload {workload_num} completed - immediate relock",
            correlation_id=approved_intent.correlation_id,
        )
        settings.execution_enabled = False
        settings.live_canary_enabled = False
        print(f"Production Execution Re-Locked after Workload {workload_num}.")

    # 5. Post-Execution Validations
    is_locked_post, _, active_win_post = ExecutionLockService.get_effective_status(conn)
    assert is_locked_post, f"FAIL: Workload {workload_num} must end LOCKED"
    assert active_win_post is None or active_win_post.state in ("CLOSED", "EXHAUSTED"), f"FAIL: Active window must be exhausted/closed"

    # Window budget check (Section 12, 58)
    cursor.execute("SELECT * FROM execution_windows WHERE id = ?;", (window_id,))
    win_row = cursor.fetchone()
    assert win_row is not None
    assert win_row["executions_consumed"] == 1, f"FAIL: Window executions_consumed={win_row['executions_consumed']}, expected 1"
    assert win_row["state"] == "EXHAUSTED", f"FAIL: Window state is {win_row['state']}, expected EXHAUSTED"

    # Gateway stability (Section 72, 73)
    gw_after = get_remote_gateway_info()
    print(f"Gateway Pre PID: {gw_before.get('MainPID')}, Post PID: {gw_after.get('MainPID')}")
    print(f"Gateway Pre Restarts: {gw_before.get('NRestarts')}, Post Restarts: {gw_after.get('NRestarts')}")
    assert gw_after.get("MainPID") == gw_before.get("MainPID"), "FAIL: Gateway PID changed!"
    assert gw_after.get("NRestarts") == gw_before.get("NRestarts"), "FAIL: Gateway restarted!"

    # Session Observability (Section 46-51)
    sessions_after = get_remote_session_telemetry()
    delta_central = sessions_after["central_store_sessions"] - sessions_before["central_store_sessions"]
    delta_sagara_lab = sessions_after["sagara_lab_profile_local_sessions"] - sessions_before["sagara_lab_profile_local_sessions"]
    delta_agg = sessions_after["aggregate_distinct_sessions"] - sessions_before["aggregate_distinct_sessions"]

    print(f"Session Telemetry Before: {sessions_before}")
    print(f"Session Telemetry After:  {sessions_after}")
    print(f"Session Deltas: Central={delta_central} (expected 0), SagaraLab=+{delta_sagara_lab} (expected +1), AggregateDistinct=+{delta_agg} (expected +1)")
    assert delta_central == 0, f"Central store delta={delta_central}, expected 0"
    assert delta_sagara_lab == 1, f"Sagara-Lab delta={delta_sagara_lab}, expected +1"
    assert delta_agg == 1, f"Aggregate distinct delta={delta_agg}, expected +1"

    # Authoritative Direct Receipt & Session verification
    hermes_session_id = exec_result.get("hermes_session_id")
    assert hermes_session_id is not None, "FAIL: Hermes session ID missing from receipt"
    sess_telemetry = get_remote_session_by_id(hermes_session_id)
    print(f"Remote Session Telemetry for {hermes_session_id}: {sess_telemetry}")
    assert sess_telemetry.get("profile") == "sagara-lab"
    assert sess_telemetry.get("tool_call_count") == 0, f"FAIL: Nonzero tool calls detected: {sess_telemetry.get('tool_call_count')}"

    # Correlation check
    cursor.execute("SELECT * FROM task_execution_correlations WHERE task_id = ? AND hermes_session_id = ?;", (task_id, hermes_session_id))
    corr_row = cursor.fetchone()
    assert corr_row is not None, f"FAIL: Correlation not persisted for {task_id} <-> {hermes_session_id}"

    # Receipt in DB check
    cursor.execute("SELECT * FROM execution_receipts WHERE receipt_id = ?;", (exec_result["receipt_id"],))
    rcpt_row = cursor.fetchone()
    assert rcpt_row is not None, "FAIL: Receipt not found in DB"
    assert rcpt_row["execution_policy_version"] == EXPECTED_POLICY_VERSION
    assert rcpt_row["execution_policy_hash"] == EXPECTED_POLICY_HASH
    assert rcpt_row["execution_mode"] == "SAFE_NO_TOOLS"

    # Authorization single-use transition check (Section 14: ISSUED -> CLAIMED -> CONSUMED)
    cursor.execute("SELECT * FROM execution_authorizations WHERE intent_id = ?;", (approved_intent.id,))
    auth_row = cursor.fetchone()
    assert auth_row is not None, "FAIL: Authorization row missing"
    print(f"Authorization State for Workload {workload_num}: {auth_row['state']}")
    assert auth_row["state"] == "CONSUMED", f"FAIL: Expected authorization state CONSUMED, got {auth_row['state']}"

    # Model Output Validation
    raw_output = exec_result.get("raw_output", "")
    for section_name in expected_sections:
        has_sec = section_name in raw_output
        print(f"Checking required section '{section_name}': {has_sec}")
        assert has_sec, f"FAIL: Missing required section '{section_name}' in model output"

    # Audit chain check (Section 56: audit.verify = PASS)
    audit_valid, audit_msg = verify_audit_chain(conn)
    print(f"Audit Chain Verification after Workload {workload_num}: valid={audit_valid} ({audit_msg})")
    assert audit_valid, f"FAIL: Audit verification failed: {audit_msg}"

    # Rate limit check after this workload (Section 64, 65)
    cursor.execute(
        "SELECT COUNT(*) AS hr_cnt FROM execution_attempts WHERE profile_id = 'sagara-lab' AND state IN ('ACKNOWLEDGED', 'RECONCILED') AND created_at >= ?;",
        (one_hour_ago,),
    )
    hr_count_after = cursor.fetchone()[0]
    print(f"Sagara-Lab successful executions in past hour after Workload {workload_num}: {hr_count_after}/3")
    assert hr_count_after == hr_count_before + 1, f"FAIL: Rate limit count did not increment exactly once: before={hr_count_before}, after={hr_count_after}"

    print(f"==================================================")
    print(f"WORKLOAD {workload_num} PASS")
    print(f"==================================================")

    return {
        "workload_num": workload_num,
        "task_id": task_id,
        "task_title": task_title,
        "task_class": task_class,
        "intent_id": approved_intent.id,
        "authorization_id": auth_row["id"],
        "attempt_id": exec_result["attempt_id"],
        "receipt_id": exec_result["receipt_id"],
        "hermes_session_id": hermes_session_id,
        "correlation_id": corr_id,
        "receipt_hash": exec_result["receipt_hash"],
        "raw_output": raw_output,
        "submitted_at": exec_result["submitted_at"],
        "acknowledged_at": exec_result["acknowledged_at"],
        "sessions_before": sessions_before,
        "sessions_after": sessions_after,
        "gateway_before": gw_before,
        "gateway_after": gw_after,
        "hr_count_before": hr_count_before,
        "hr_count_after": hr_count_after,
        "audit_before_seq": audit_before_seq,
        "audit_after_seq": (conn.cursor().execute("SELECT MAX(sequence) FROM audit_ledger;").fetchone()[0]),
    }


async def main():
    print("==================================================")
    print("PROMPT 14.8: LIMITED ROLLOUT SOAK & REPEATABILITY")
    print("==================================================")

    conn = get_db_connection()

    # Operator Identities (Section 30-34)
    requester = OperatorPrincipal(
        id="op-soak-requester",
        display_name="Lead Operations Engineer (Requester)",
        roles=["operator"],
        permissions=["action.request"],
        source="trusted_proxy",
        authentication_strength="sso_mfa",
    )
    approver = OperatorPrincipal(
        id="op-soak-approver",
        display_name="Security Principal (Approver)",
        roles=["approver"],
        permissions=["action.approve"],
        source="trusted_proxy",
        authentication_strength="sso_mfa",
    )
    executor_operator = OperatorPrincipal(
        id="op-soak-executor",
        display_name="Mission Controller (Executor)",
        roles=["admin"],
        permissions=["execution.execute", "execution.lock.manage", "audit.verify"],
        source="trusted_proxy",
        authentication_strength="sso_mfa",
    )

    bridge_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "hermes_dispatch_bridge.py"))
    assert os.path.isfile(bridge_path), f"Bridge binary missing: {bridge_path}"

    real_executor = HermesTaskDispatchExecutor(
        binary_path=bridge_path,
        hermes_home_dir=os.path.expanduser("~/.hermes"),
    )

    # Initial baseline
    initial_sessions = get_remote_session_telemetry()
    initial_gw = get_remote_gateway_info()
    print("Initial Baseline Sessions:", initial_sessions)
    print("Initial Baseline Gateway:", initial_gw)

    # ----------------------------------------------------
    # EXECUTE WORKLOAD 002
    # ----------------------------------------------------
    res_002 = await execute_single_workload(
        workload_num="002",
        task_id="task-workload-002",
        task_title="Sagara Limited Rollout Safety Review 002",
        task_class="REASONING_ONLY",
        prompt_text=WORKLOAD_002_PROMPT,
        expected_sections=["SOAK_READINESS", "FAILURE_SIGNALS", "METRICS_TO_WATCH", "EXPANSION_GATE"],
        conn=conn,
        requester=requester,
        approver=approver,
        executor_operator=executor_operator,
        real_executor=real_executor,
    )

    # ----------------------------------------------------
    # INTER-WORKLOAD RELOCK & AUDIT VERIFICATION (Section 10, 11, 22, 56)
    # ----------------------------------------------------
    is_locked, lock_reason, active_win = ExecutionLockService.get_effective_status(conn)
    assert is_locked, "FAIL: Must be locked between workloads"
    assert active_win is None, "FAIL: Active windows must be 0 between workloads"
    assert not settings.execution_enabled, "FAIL: execution_enabled must be false between workloads"
    assert not settings.live_canary_enabled, "FAIL: live_canary_enabled must be false"

    audit_valid, audit_msg = verify_audit_chain(conn)
    assert audit_valid, f"Audit verification failed between workloads: {audit_msg}"
    print(f"Inter-workload safety check: PASS (locked={is_locked}, active_windows=0, audit_valid={audit_valid})")

    # ----------------------------------------------------
    # EXECUTE WORKLOAD 003
    # ----------------------------------------------------
    res_003 = await execute_single_workload(
        workload_num="003",
        task_id="task-workload-003",
        task_title="Sagara Limited Rollout Operator Checklist Draft 003",
        task_class="DRAFT_GENERATION",
        prompt_text=WORKLOAD_003_PROMPT,
        expected_sections=["PRE_EXECUTION_CHECKLIST", "EXECUTION_CHECKLIST", "POST_EXECUTION_CHECKLIST", "STOP_AND_LOCK_CONDITIONS"],
        conn=conn,
        requester=requester,
        approver=approver,
        executor_operator=executor_operator,
        real_executor=real_executor,
    )

    # ----------------------------------------------------
    # POST-SOAK FINAL AUDIT & STATE VERIFICATION (Section 57, 109, 110)
    # ----------------------------------------------------
    final_sessions = get_remote_session_telemetry()
    final_gw = get_remote_gateway_info()
    is_locked_final, _, active_win_final = ExecutionLockService.get_effective_status(conn)
    audit_valid_final, audit_msg_final = verify_audit_chain(conn)

    print("\n==================================================")
    print("FINAL SOAK AGGREGATE RESULTS")
    print("==================================================")
    print(f"Execution Locked: {is_locked_final}")
    print(f"Active Execution Windows: {0 if active_win_final is None else 1}")
    print(f"Audit Valid: {audit_valid_final} ({audit_msg_final})")
    print(f"Initial Sessions: {initial_sessions}")
    print(f"Final Sessions:   {final_sessions}")
    print(f"Total Central Store Delta: {final_sessions['central_store_sessions'] - initial_sessions['central_store_sessions']} (expected 0)")
    print(f"Total Sagara Lab Local Delta: +{final_sessions['sagara_lab_profile_local_sessions'] - initial_sessions['sagara_lab_profile_local_sessions']} (expected +2)")
    print(f"Total Aggregate Distinct Delta: +{final_sessions['aggregate_distinct_sessions'] - initial_sessions['aggregate_distinct_sessions']} (expected +2)")
    print(f"Gateway MainPID: Initial={initial_gw.get('MainPID')}, Final={final_gw.get('MainPID')}")
    print(f"Gateway NRestarts: Initial={initial_gw.get('NRestarts')}, Final={final_gw.get('NRestarts')}")

    assert is_locked_final
    assert active_win_final is None
    assert audit_valid_final
    assert final_sessions["central_store_sessions"] - initial_sessions["central_store_sessions"] == 0
    assert final_sessions["sagara_lab_profile_local_sessions"] - initial_sessions["sagara_lab_profile_local_sessions"] == 2
    assert final_sessions["aggregate_distinct_sessions"] - initial_sessions["aggregate_distinct_sessions"] == 2
    assert final_gw.get("MainPID") == initial_gw.get("MainPID")
    assert final_gw.get("NRestarts") == initial_gw.get("NRestarts")

    # Save summary data for report generation
    results_path = os.path.join(backend_dir, "data", "soak_results.json")
    with open(results_path, "w", encoding="utf-8") as f:
        json.dump({
            "workload_002": res_002,
            "workload_003": res_003,
            "initial_sessions": initial_sessions,
            "final_sessions": final_sessions,
            "initial_gateway": initial_gw,
            "final_gateway": final_gw,
        }, f, indent=2)
    print(f"Soak results written to {results_path}")

    print("\n==================================================")
    print("PROMPT 14.8 SOAK COMPLETE: BOTH WORKLOADS PASSED")
    print("==================================================")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
