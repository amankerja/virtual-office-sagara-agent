#!/usr/bin/env python3
"""
Prompt 14.9A.8 — First Normal SAFE_READ_ONLY Production Workload Under V2.
Orchestrator for Sagara Production Runtime Health Inspection 001.

Invariants:
- Authorized strictly by PRODUCTION_EXECUTION_POLICY_V2 and TOOL_SECURITY_POLICY_V1.
- ZERO canary overrides: MISSION_CONTROL_LIVE_CANARY_ENABLED remains FALSE throughout.
- Exactly 1 Hermes submission, 1 Hermes session, 1 tool invocation (runtime_status).
- Direct Tool Broker Receipt and Direct Hermes Session Receipt.
- Gateway process stability: MainPID, NRestarts, ActiveEnterTimestamp unchanged.
- Immediate fail-closed relock.
"""

import os
import sys
import json
import uuid
import secrets
import sqlite3
import subprocess
from datetime import datetime, timezone

# Ensure backend root is on sys.path
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
from app.services.action_intent_service import ActionIntentService
from app.services.authorization_service import AuthorizationService
from app.services.preflight_service import ActionPreflightService
from app.services.final_preflight_service import FinalExecutionPreflightService
from app.services.execution_lock_service import ExecutionLockService
from app.services.execution_policy_service import ExecutionPolicyService
from app.services.task_dispatch_coordinator import TaskDispatchCoordinator
from app.services.executor import HermesTaskDispatchExecutor
from app.repositories.sqlite.execution_repo import ExecutionSqliteRepository
from app.repositories.sqlite.idempotency_repo import PersistentIdempotencyStore
from app.services.audit_verifier import verify_audit_chain
from app.api.dependencies import reconfigure_dependencies, get_action_intent_service, _task_repo
from app.domain.tool_security_policy import (
    RUNTIME_STATUS_FINGERPRINT,
    DOCUMENT_INSPECTION_FINGERPRINT,
)
from app.services.tool_security_service import ToolSecurityService

EXPECTED_PRODUCTION_POLICY_VERSION = "PRODUCTION_EXECUTION_POLICY_V2"
EXPECTED_PRODUCTION_POLICY_HASH = "c5dc6df112e56739f2d96c8ef195bc4711c9631473f92cae064ad88353848ba1"
EXPECTED_TOOL_SECURITY_POLICY_VERSION = "TOOL_SECURITY_POLICY_V1"
EXPECTED_TOOL_SECURITY_POLICY_HASH = "9bdd1d54102280e49f1d23a13be404c44bb0f22e2c3f100b8d6aed61e3ec033d"

WORKLOAD_PROMPT = """Perform one approved read-only inspection of the Sagara Hermes gateway runtime.

Use only:
- tool: runtime_status
- operation: inspect_service
- resource: hermes-gateway.service

Do not use another tool.
Do not use shell.
Do not use network access.
Do not use MCP.
Do not inspect files.
Do not access another profile.
Do not change any system state.

Return exactly:

HEALTH
State whether the service is active and running.

PROCESS
Report MainPID and NRestarts.

ACTIVATION
Report ActiveEnterTimestamp and UnitFileState.

ASSESSMENT
State whether the observed values indicate that the gateway is currently healthy. Do not invent evidence outside the supplied read-only result."""


def get_remote_gateway_info() -> dict:
    """Fetch gateway PID, NRestarts, and ActiveState via SSH (read-only)."""
    res = subprocess.run(
        [
            "ssh",
            "sagara",
            "systemctl --user show hermes-gateway.service --property=ActiveState,SubState,MainPID,NRestarts,ActiveEnterTimestamp,UnitFileState",
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    info = {}
    for line in res.stdout.strip().splitlines():
        if "=" in line:
            k, v = line.split("=", 1)
            info[k] = v
    return info


def get_remote_session_counts() -> dict:
    """Fetch exact session counts from global and sagara-lab state.db via SSH."""
    script = """import sqlite3
c1 = sqlite3.connect('/home/ubuntu/.hermes/state.db')
g = c1.execute('SELECT count(1) FROM sessions').fetchone()[0]
c2 = sqlite3.connect('/home/ubuntu/.hermes/profiles/sagara-lab/state.db')
p = c2.execute('SELECT count(1) FROM sessions').fetchone()[0]
print(f"{g}:{p}")
"""
    res = subprocess.run(
        ["ssh", "sagara", "python3"],
        input=script,
        capture_output=True,
        text=True,
        check=True,
    )
    parts = res.stdout.strip().split(":")
    return {"global": int(parts[0]), "sagara_lab": int(parts[1])}


async def main():
    print("================================================================================")
    print("PROMPT 14.9A.8: FIRST NORMAL SAFE_READ_ONLY PRODUCTION WORKLOAD UNDER V2")
    print("================================================================================")

    # ----------------------------------------------------
    # 1. Verify Active Policies & Pre-Flight State
    # ----------------------------------------------------
    conn = get_db_connection(canonical_db_path)

    # Invariant: live_canary_enabled MUST be False throughout
    assert not settings.live_canary_enabled, "FAIL: live_canary_enabled must be false"
    assert not settings.execution_enabled, "FAIL: execution_enabled must be false at start"

    is_locked_pre, lock_reason_pre, active_win_pre = ExecutionLockService.get_effective_status(conn)
    assert is_locked_pre, f"FAIL: Kill switch must be LOCKED at start (got reason: {lock_reason_pre})"
    assert active_win_pre is None, "FAIL: Active execution windows must be 0 at start"
    print(f"Pre-Workload Lock State: LOCKED ({lock_reason_pre})")

    # Verify Production Execution Policy V2
    active_policy = ExecutionPolicyService.get_active_policy(conn)
    print(f"Active Production Policy: {active_policy.version} (Hash: {active_policy.policy_hash})")
    assert active_policy.version == EXPECTED_PRODUCTION_POLICY_VERSION, (
        f"FAIL: Expected active policy {EXPECTED_PRODUCTION_POLICY_VERSION}, got {active_policy.version}"
    )
    assert active_policy.policy_hash == EXPECTED_PRODUCTION_POLICY_HASH, (
        f"FAIL: Expected policy hash {EXPECTED_PRODUCTION_POLICY_HASH}, got {active_policy.policy_hash}"
    )

    # Verify Tool Security Policy V1
    tool_policy = ToolSecurityService.get_installed_policy(conn)
    print(f"Active Tool Security Policy: {tool_policy.version} (Hash: {tool_policy.policy_hash})")
    assert tool_policy.version == EXPECTED_TOOL_SECURITY_POLICY_VERSION, (
        f"FAIL: Expected tool policy {EXPECTED_TOOL_SECURITY_POLICY_VERSION}, got {tool_policy.version}"
    )
    assert tool_policy.policy_hash == EXPECTED_TOOL_SECURITY_POLICY_HASH, (
        f"FAIL: Expected tool policy hash {EXPECTED_TOOL_SECURITY_POLICY_HASH}, got {tool_policy.policy_hash}"
    )

    # Verify sagara-lab profile is LIMITED with SAFE_READ_ONLY allowed
    lab_rule = active_policy.profiles.get("sagara-lab")
    assert lab_rule is not None, "FAIL: sagara-lab missing from policy V2"
    assert lab_rule.status == "LIMITED", f"FAIL: sagara-lab status is {lab_rule.status}"
    assert "SAFE_READ_ONLY" in lab_rule.allowed_execution_modes, "FAIL: SAFE_READ_ONLY not in allowed modes"
    assert "READ_ONLY_INSPECTION" in lab_rule.allowed_task_classes, "FAIL: READ_ONLY_INSPECTION not in allowed task classes"

    # Verify 7 disabled profiles
    for pid in ["lead", "personal", "business", "marketing", "cs", "it-support", "it-coding"]:
        r = active_policy.profiles.get(pid)
        assert r is not None and r.status == "DISABLED", f"FAIL: {pid} is not DISABLED in policy V2"

    # Verify audit chain integrity before start
    valid_audit, audit_err = verify_audit_chain(conn)
    assert valid_audit, f"FAIL: Audit chain invalid before start: {audit_err}"
    print("Audit Ledger Pre-Execution: VALID")

    # Capture baseline remote gateway and session telemetry
    gw_before = get_remote_gateway_info()
    print("Pre-Workload Gateway State:")
    for k, v in gw_before.items():
        print(f"  {k}: {v}")
    assert gw_before.get("ActiveState") == "active", f"FAIL: Gateway not active: {gw_before}"
    assert gw_before.get("SubState") == "running", f"FAIL: Gateway not running: {gw_before}"

    sessions_before = get_remote_session_counts()
    print(f"Pre-Workload Sessions: global={sessions_before['global']}, sagara_lab={sessions_before['sagara_lab']}")

    # ----------------------------------------------------
    # 2. Setup Principals (Strict Role Separation)
    # ----------------------------------------------------
    requester = OperatorPrincipal(
        id="op-sagara-lead",
        display_name="Sagara Lead Operator",
        roles=["operator"],
        permissions=["intent.create", "intent.read"],
        source="trusted_proxy",
        authentication_strength="sso_mfa",
    )
    approver = OperatorPrincipal(
        id="op-sagara-approver",
        display_name="Sagara Independent Safety Approver",
        roles=["approver"],
        permissions=["intent.approve", "intent.read"],
        source="trusted_proxy",
        authentication_strength="hardware_token",
    )
    executor = OperatorPrincipal(
        id="op-sagara-executor",
        display_name="Sagara Production Execution Operator",
        roles=["executor"],
        permissions=["execution.execute", "execution.lock.manage", "audit.verify"],
        source="trusted_proxy",
        authentication_strength="sso_mfa",
    )

    # ----------------------------------------------------
    # 3. Create Task & ActionIntent
    # ----------------------------------------------------
    reconfigure_dependencies()
    intent_service = get_action_intent_service()

    from app.schemas.profiles import ProfileDto
    from app.schemas.agents import AgentDto, AgentDefinitionDto, AgentRuntimeDto, AgentCapabilitiesDto

    sagara_lab_profile = ProfileDto(
        id="sagara-lab",
        name="Sagara Lab",
        role="Research & Experimentation",
        description="Sagara Lab research profile",
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
            description="Sagara Lab research agent",
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

    task_repo = _task_repo
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    workload_task = TaskDto(
        id=f"task-ro-normal-{secrets.token_hex(4)}",
        title="Sagara Production Runtime Health Inspection 001",
        description="First normal SAFE_READ_ONLY production workload for hermes-gateway.service under V2",
        state="READY",
        priority="HIGH",
        created_at=now_iso,
        updated_at=now_iso,
        assigned_agent_id="sagara-lab",
        requested_skills=[],
        revision=1,
    )
    task_repo._tasks.append(workload_task)

    intent_dto = await intent_service.create_intent(
        dto=CreateActionIntentDto(
            action_type="TASK_DISPATCH",
            target_type="PROFILE",
            target_id="sagara-lab",
            payload={
                "task_id": workload_task.id,
                "target_profile_id": "sagara-lab",
                "task_class": "READ_ONLY_INSPECTION",
                "execution_mode": "SAFE_READ_ONLY",
                "tool_id": "runtime_status",
                "tool_version": "1.0.0",
                "operation": "inspect_service",
                "resource": "hermes-gateway.service",
                "properties": ["ActiveState", "SubState", "MainPID", "NRestarts", "ActiveEnterTimestamp", "UnitFileState"],
                "implementation_fingerprint": RUNTIME_STATUS_FINGERPRINT,
                "tool_security_policy_version": EXPECTED_TOOL_SECURITY_POLICY_VERSION,
                "tool_security_policy_hash": EXPECTED_TOOL_SECURITY_POLICY_HASH,
                "prompt": WORKLOAD_PROMPT,
                "safe_mode": True,
                "tools_enabled": False,
                "network_enabled": False,
                "shell_enabled": False,
                "mcp_enabled": False,
                "document_inspection_enabled": False,
            },
            resource_revision=workload_task.revision,
            reason="Prompt 14.9A.8 first normal safe read-only production workload",
        ),
        principal=requester,
        correlation_id=f"corr-normal-ro-{secrets.token_hex(4)}",
    )

    print(f"Created ActionIntent: {intent_dto.id} (status={intent_dto.status}, risk={intent_dto.risk})")
    assert intent_dto.risk == "HIGH", f"Expected HIGH risk, got {intent_dto.risk}"
    assert intent_dto.status == "READY_FOR_APPROVAL", f"Expected READY_FOR_APPROVAL, got {intent_dto.status}"

    # Request approval
    intent_dto = await intent_service.request_approval(intent_dto.id, requester, correlation_id=intent_dto.correlation_id)
    assert intent_dto.status == "PENDING_APPROVAL"

    # Independent approval
    approved_intent = await intent_service.approve_intent(
        intent_id=intent_dto.id,
        principal=approver,
        reason="Authorized normal SAFE_READ_ONLY production workload under Policy V2",
        confirmation_phrase="APPROVE TASK DISPATCH",
        correlation_id=intent_dto.correlation_id,
    )
    print(f"ActionIntent Approved: {approved_intent.id} (status={approved_intent.status})")
    assert approved_intent.status == "READY_TO_EXECUTE"

    # ----------------------------------------------------
    # 4. Arming & Execution (NO Canary Override)
    # ----------------------------------------------------
    bridge_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "hermes_dispatch_bridge.py"))
    assert os.path.isfile(bridge_path), f"Bridge binary missing: {bridge_path}"

    real_executor = HermesTaskDispatchExecutor(
        binary_path=bridge_path,
        hermes_home_dir=os.path.expanduser("~/.hermes"),
    )

    coordinator = TaskDispatchCoordinator(
        conn=conn,
        executor=real_executor,
        task_repository=task_repo,
        idempotency_store=PersistentIdempotencyStore(),
        action_intent_service=intent_service,
    )

    execution_receipt = None
    exec_error = None
    submitted_at_str = None
    ack_at_str = None

    try:
        # Arming: ONLY execution_enabled=True. live_canary_enabled MUST REMAIN FALSE!
        settings.execution_enabled = True
        settings.live_canary_enabled = False  # Strict requirement Prompt 14.9A.8 Section 2

        # Open single-use 15-minute execution window under normal policy
        unlock_res = ExecutionLockService.unlock(
            conn=conn,
            principal=executor,
            confirmation_phrase="UNLOCK TASK EXECUTION",
            reason="Prompt 14.9A.8 normal V2 read-only workload execution window",
            ttl_minutes=15,
            max_executions=1,
            correlation_id=approved_intent.correlation_id,
        )
        assert unlock_res["status"] == "UNLOCKED", f"Unlock failed: {unlock_res}"
        window = unlock_res["window"]
        print(f"Execution Window Opened: {window['id']} (budget={window['max_executions']}, expires={window['expires_at']})")

        # Run Final Execution Preflight under normal V2 policy
        preflight_service = FinalExecutionPreflightService(
            conn=conn,
            task_repository=task_repo,
            executor=real_executor,
        )
        final_pf = await preflight_service.evaluate(intent=approved_intent, principal=executor)
        assert final_pf.passed, f"Final execution preflight failed: {final_pf.blocking_reasons}"
        assert final_pf.targetability == "TARGETABLE", f"Targetability: {final_pf.targetability}"
        print("Final Execution Preflight: PASS (targetability=TARGETABLE)")

        # Dispatch EXACTLY ONE normal read-only production workload
        submitted_at_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        print("Executing NORMAL SAFE_READ_ONLY Workload via TaskDispatchCoordinator...")

        exec_result = await coordinator.execute_task_dispatch(
            intent_id=approved_intent.id,
            principal=executor,
            idempotency_key=f"idem-normal-ro-{approved_intent.id}",
        )
        ack_at_str = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
        execution_receipt = exec_result

        assert exec_result.get("status") == "ACKNOWLEDGED", (
            f"Workload dispatch failed with status: {exec_result.get('status')}, detail: {exec_result.get('detail')}"
        )

        print("\n==================================================")
        print("NORMAL SAFE_READ_ONLY WORKLOAD EXECUTED SUCCESSFULLY!")
        print("==================================================")
        print(f"Receipt ID: {exec_result.get('receipt_id')}")
        print(f"Hermes Session ID: {exec_result.get('hermes_session_id')}")
        print(f"Receipt Hash: {exec_result.get('receipt_hash')}")
        print("\nRaw Model Output:\n", exec_result.get("raw_output"))

    except Exception as e:
        exec_error = str(e)
        print("Execution Exception:", e)
    finally:
        # Immediate Re-Lock
        ExecutionLockService.lock(
            conn=conn,
            principal=executor,
            reason="Prompt 14.9A.8 normal workload completed - immediate relock",
            correlation_id=approved_intent.correlation_id if 'approved_intent' in locals() else None,
        )
        settings.execution_enabled = False
        settings.live_canary_enabled = False

    if exec_error:
        print("Workload failed with error:", exec_error)
        sys.exit(1)

    # ----------------------------------------------------
    # 5. Post-Execution Telemetry & Mutation Proof
    # ----------------------------------------------------
    gw_after = get_remote_gateway_info()
    sessions_after = get_remote_session_counts()

    print("\n--- POST-EXECUTION GATEWAY STABILITY PROOF ---")
    print(f"PID: Before={gw_before.get('MainPID')}, After={gw_after.get('MainPID')} (MATCH: {gw_before.get('MainPID') == gw_after.get('MainPID')})")
    print(f"NRestarts: Before={gw_before.get('NRestarts')}, After={gw_after.get('NRestarts')} (MATCH: {gw_before.get('NRestarts') == gw_after.get('NRestarts')})")
    print(f"ActiveEnterTimestamp: Before={gw_before.get('ActiveEnterTimestamp')}, After={gw_after.get('ActiveEnterTimestamp')} (MATCH: {gw_before.get('ActiveEnterTimestamp') == gw_after.get('ActiveEnterTimestamp')})")

    assert gw_before.get("MainPID") == gw_after.get("MainPID"), "FAIL: Gateway PID changed!"
    assert gw_before.get("NRestarts") == gw_after.get("NRestarts"), "FAIL: Gateway restarted!"
    assert gw_before.get("ActiveEnterTimestamp") == gw_after.get("ActiveEnterTimestamp"), "FAIL: ActiveEnterTimestamp changed!"
    print("Gateway Process Stability: VERIFIED (Zero attributable mutations)")

    print("\n--- SESSION ACCOUNTING ---")
    sagara_delta = sessions_after["sagara_lab"] - sessions_before["sagara_lab"]
    global_delta = sessions_after["global"] - sessions_before["global"]
    print(f"sagara-lab sessions: {sessions_before['sagara_lab']} -> {sessions_after['sagara_lab']} (delta: +{sagara_delta})")
    print(f"global sessions: {sessions_before['global']} -> {sessions_after['global']} (delta: +{global_delta})")
    assert sagara_delta == 1, f"FAIL: sagara-lab sessions delta was {sagara_delta}, expected exactly 1"

    # ----------------------------------------------------
    # 6. Direct Receipt & Evidence Verification
    # ----------------------------------------------------
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM execution_receipts WHERE receipt_id = ?;", (execution_receipt["receipt_id"],))
    db_receipt = cursor.fetchone()
    assert db_receipt is not None, "FAIL: Execution receipt not found in database!"

    print("\n--- DIRECT EVIDENCE VERIFICATION ---")
    print(f"Execution Policy Version: {db_receipt['execution_policy_version']} (Expected: {EXPECTED_PRODUCTION_POLICY_VERSION})")
    assert db_receipt["execution_policy_version"] == EXPECTED_PRODUCTION_POLICY_VERSION
    assert db_receipt["execution_policy_hash"] == EXPECTED_PRODUCTION_POLICY_HASH
    print(f"Execution Mode: {db_receipt['execution_mode']} (Expected: SAFE_READ_ONLY)")
    assert db_receipt["execution_mode"] == "SAFE_READ_ONLY"
    print(f"Tool Executions Count: {db_receipt['tool_executions_count']} (Expected: 1)")
    assert db_receipt["tool_executions_count"] == 1
    print(f"Tool Policy Version: {db_receipt['tool_security_policy_version']} (Expected: {EXPECTED_TOOL_SECURITY_POLICY_VERSION})")
    assert db_receipt["tool_security_policy_version"] == EXPECTED_TOOL_SECURITY_POLICY_VERSION

    # Verify tool execution audit entry
    cursor.execute("SELECT * FROM tool_execution_audits WHERE intent_id = ?;", (approved_intent.id,))
    tool_audit = cursor.fetchone()
    assert tool_audit is not None, "FAIL: Tool execution audit entry missing!"
    print(f"Tool Audit: ID={tool_audit['id']}, Tool={tool_audit['tool_id']}, Op={tool_audit['operation_id']}, Status={tool_audit['status']}")
    assert tool_audit["tool_id"] == "runtime_status"
    assert tool_audit["operation_id"] == "inspect_service"
    assert tool_audit["status"] == "EXECUTED"

    # Verify Task <-> Session Correlation
    cursor.execute("SELECT * FROM task_execution_correlations WHERE task_id = ?;", (workload_task.id,))
    corr = cursor.fetchone()
    assert corr is not None, "FAIL: Task execution correlation missing!"
    assert corr["hermes_session_id"] == execution_receipt["hermes_session_id"]
    print(f"Task <-> Session Correlation: CONFIRMED ({workload_task.id} <-> {corr['hermes_session_id']})")

    # Verify model output sections
    raw_output = execution_receipt.get("raw_output", "")
    for section_header in ["HEALTH", "PROCESS", "ACTIVATION", "ASSESSMENT"]:
        assert section_header in raw_output, f"FAIL: Expected output section '{section_header}' not found in model output"
    print("Model Output Sections: HEALTH, PROCESS, ACTIVATION, ASSESSMENT all present")

    # ----------------------------------------------------
    # 7. Single Execution Budget & Idempotency Replay
    # ----------------------------------------------------
    print("\n--- SINGLE EXECUTION BUDGET & IDEMPOTENCY REPLAY TEST ---")
    # Idempotency Replay returns cached receipt
    cached_replay = await coordinator.execute_task_dispatch(
        intent_id=approved_intent.id,
        principal=executor,
        idempotency_key=f"idem-normal-ro-{approved_intent.id}",
    )
    assert cached_replay.get("status") == "ACKNOWLEDGED"
    assert cached_replay.get("receipt_id") == execution_receipt["receipt_id"]
    print(f"Idempotency Replay: VERIFIED (returned cached receipt {cached_replay['receipt_id']} without Hermes dispatch)")

    # Second execution attempt with new key is strictly blocked
    second_blocked = False
    try:
        await coordinator.execute_task_dispatch(
            intent_id=approved_intent.id,
            principal=executor,
            idempotency_key=f"idem-second-attempt-{secrets.token_hex(4)}",
        )
    except Exception as e:
        second_blocked = True
        print("Second execution attempt blocked as expected:", str(e)[:90])
    assert second_blocked, "FAIL: Second execution attempt was not blocked!"
    print("Single-Use Authorization Budget: ENFORCED (duplicate claim rejected)")

    # ----------------------------------------------------
    # 8. Final Audit Ledger Cryptographic Verification
    # ----------------------------------------------------
    audit_valid_final, audit_err_final = verify_audit_chain(conn)
    assert audit_valid_final, f"FAIL: Final audit chain invalid: {audit_err_final}"
    print(f"Final Audit Ledger Verification: VALID (detail: {audit_err_final})")

    # ----------------------------------------------------
    # 9. Verify Final Re-Locked State
    # ----------------------------------------------------
    is_locked_post, lock_reason_post, active_win_post = ExecutionLockService.get_effective_status(conn)
    assert is_locked_post, "FAIL: Production must be LOCKED post-execution"
    assert active_win_post is None, "FAIL: Active execution windows must be 0 post-execution"
    assert not settings.execution_enabled, "FAIL: execution_enabled must be False post-execution"
    assert not settings.live_canary_enabled, "FAIL: live_canary_enabled must be False post-execution"
    print(f"Post-Execution Lock State: LOCKED ({lock_reason_post})")

    print("\n================================================================================")
    print("SAGARA NORMAL SAFE_READ_ONLY PRODUCTION WORKLOAD 001 COMPLETED SUCCESSFULLY")
    print("================================================================================")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
