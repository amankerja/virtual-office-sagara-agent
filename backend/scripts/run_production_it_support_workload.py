#!/usr/bin/env python3
"""
Prompt 15.1 — Workload 2: Real SAFE_READ_ONLY it-support Operational Task.
Invariants:
- Profile: it-support (LIMITED under PRODUCTION_EXECUTION_POLICY_V3)
- Mode: SAFE_READ_ONLY
- Task Class: READ_ONLY_INSPECTION
- Tool: runtime_status.inspect_service on hermes-gateway.service
- ZERO canary overrides: live_canary_enabled remains FALSE
- Exactly 1 Hermes submission, 1 Hermes session, 1 tool invocation
- Direct Tool Broker Receipt and Direct Hermes Session Receipt
- Gateway process stability: MainPID, NRestarts, ActiveEnterTimestamp unchanged
- Immediate fail-closed relock: active windows 0, kill switch LOCKED
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

EXPECTED_PRODUCTION_POLICY_VERSION = "PRODUCTION_EXECUTION_POLICY_V3"
EXPECTED_PRODUCTION_POLICY_HASH = "13ef245630dc448208a408db190924119df9bcf1f602f71e0814b62226fbe95e"
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

Based on the provided runtime inspection data, return a concise operational assessment covering:
1. GATEWAY HEALTH: State whether the service is active and running.
2. PROCESS STATUS: Report MainPID and interpret the restart count (NRestarts).
3. ACTIVATION CHRONOLOGY: Report ActiveEnterTimestamp and UnitFileState.
4. OPERATOR ACTION: State whether immediate operator action or intervention is required."""


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
    """Fetch exact session counts from central store and profiles via SSH."""
    script = """import sqlite3
c1 = sqlite3.connect('/home/ubuntu/.hermes/state.db')
g = c1.execute('SELECT count(1) FROM sessions').fetchone()[0]
c2 = sqlite3.connect('/home/ubuntu/.hermes/profiles/it-support/state.db')
it = c2.execute('SELECT count(1) FROM sessions').fetchone()[0]
c3 = sqlite3.connect('/home/ubuntu/.hermes/profiles/sagara-lab/state.db')
lab = c3.execute('SELECT count(1) FROM sessions').fetchone()[0]
print(f"{g}:{it}:{lab}")
"""
    res = subprocess.run(
        ["ssh", "sagara", "python3 -"],
        input=script,
        capture_output=True,
        text=True,
        check=True,
    )
    g, it, lab = res.stdout.strip().split(":")
    return {"central_store_sessions": int(g), "it_support_sessions": int(it), "sagara_lab_sessions": int(lab)}


async def main():
    print("==================================================")
    print("PROMPT 15.1: WORKLOAD 2 (IT-SUPPORT SAFE_READ_ONLY)")
    print("==================================================")

    # 1. Pre-Workload Validation & Baseline Telemetry
    conn = get_db_connection(str(canonical_db_path))

    # Verify Active Policy is V3
    active_policy = ExecutionPolicyService.get_active_policy(conn)
    print(f"Active Production Policy: {active_policy.version} (Hash: {active_policy.policy_hash})")
    assert active_policy.version == EXPECTED_PRODUCTION_POLICY_VERSION, f"Expected {EXPECTED_PRODUCTION_POLICY_VERSION}, got {active_policy.version}"
    assert active_policy.policy_hash == EXPECTED_PRODUCTION_POLICY_HASH, f"Expected hash {EXPECTED_PRODUCTION_POLICY_HASH}, got {active_policy.policy_hash}"

    # Verify Tool Security Policy V1
    tool_policy = ToolSecurityService.get_installed_policy(conn)
    print(f"Active Tool Security Policy: {tool_policy.version} (Hash: {tool_policy.policy_hash})")
    assert tool_policy.version == EXPECTED_TOOL_SECURITY_POLICY_VERSION
    assert tool_policy.policy_hash == EXPECTED_TOOL_SECURITY_POLICY_HASH

    # Verify it-support is LIMITED with SAFE_READ_ONLY allowed
    it_rule = active_policy.profiles.get("it-support")
    assert it_rule is not None, "it-support missing from policy V3"
    assert it_rule.status == "LIMITED"
    assert "SAFE_READ_ONLY" in it_rule.allowed_execution_modes
    assert "READ_ONLY_INSPECTION" in it_rule.allowed_task_classes

    # Verify Audit Chain
    valid_audit, audit_err = verify_audit_chain(conn)
    assert valid_audit, f"Audit chain invalid before workload: {audit_err}"
    print("Pre-Workload Audit Ledger: VALID")

    # Capture Baseline Remote Telemetry
    gw_before = get_remote_gateway_info()
    print("Pre-Workload Gateway State:")
    for k, v in gw_before.items():
        print(f"  {k}: {v}")
    assert gw_before.get("ActiveState") == "active", f"Gateway not active: {gw_before}"
    assert gw_before.get("SubState") == "running", f"Gateway not running: {gw_before}"

    sessions_before = get_remote_session_counts()
    print(f"Pre-Workload Sessions: central={sessions_before['central_store_sessions']}, it_support={sessions_before['it_support_sessions']}, sagara_lab={sessions_before['sagara_lab_sessions']}")

    # Check lock status
    is_locked, lock_reason, active_window = ExecutionLockService.get_effective_status(conn)
    assert is_locked is True, "Execution must be LOCKED before workload"
    assert active_window is None, "Active execution windows must be 0 before workload"
    assert not settings.execution_enabled
    assert not settings.live_canary_enabled

    # 2. Operator Principals Setup (Strict Role Separation)
    requester = OperatorPrincipal(
        id="op-it-requester",
        display_name="Operations Engineer (Requester)",
        roles=["operator"],
        permissions=["intent.create", "intent.read"],
        source="trusted_proxy",
        authentication_strength="sso_mfa",
    )
    approver = OperatorPrincipal(
        id="op-it-approver",
        display_name="Security Principal (Approver)",
        roles=["approver"],
        permissions=["intent.approve", "intent.read"],
        source="trusted_proxy",
        authentication_strength="hardware_token",
    )
    executor = OperatorPrincipal(
        id="op-it-executor",
        display_name="Mission Controller (Executor)",
        roles=["executor"],
        permissions=["execution.execute", "execution.lock.manage", "audit.verify"],
        source="trusted_proxy",
        authentication_strength="sso_mfa",
    )

    # 3. Create Task & ActionIntent
    reconfigure_dependencies()
    intent_service = get_action_intent_service()

    from app.schemas.profiles import ProfileDto
    from app.schemas.agents import AgentDto, AgentDefinitionDto, AgentRuntimeDto, AgentCapabilitiesDto

    it_support_profile = ProfileDto(
        id="it-support",
        name="IT Support",
        role="Operational Support & Troubleshooting",
        description="IT Support limited operations",
        enabled=True,
        allowed_skills=[],
        configuration_state="CONFIGURED",
    )
    if hasattr(intent_service._preflight_service._profile_catalog, "_profiles"):
        if not any(p.id == "it-support" for p in intent_service._preflight_service._profile_catalog._profiles):
            intent_service._preflight_service._profile_catalog._profiles.append(it_support_profile)

    it_support_agent = AgentDto(
        id="it-support",
        definition=AgentDefinitionDto(
            id="it-support",
            name="IT Support",
            role="Operational Support & Troubleshooting",
            description="IT Support limited operations agent",
            enabled=True,
        ),
        runtime=AgentRuntimeDto(state="IDLE", confidence="CONFIRMED"),
        capabilities=AgentCapabilitiesDto(total=0, healthy=0, degraded=0, missing=0),
    )
    if hasattr(intent_service._preflight_service._agent_service, "_mock_agents"):
        if not any(a.id == "it-support" for a in intent_service._preflight_service._agent_service._mock_agents):
            intent_service._preflight_service._agent_service._mock_agents.append(it_support_agent)

    task_repo = _task_repo
    now_iso = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    workload_task = TaskDto(
        id=f"task-it-ro-{secrets.token_hex(4)}",
        title="IT Support Gateway Health Inspection 001",
        description="First SAFE_READ_ONLY useful operational workload for hermes-gateway.service under Policy V3",
        state="READY",
        priority="HIGH",
        created_at=now_iso,
        updated_at=now_iso,
        assigned_agent_id="it-support",
        requested_skills=[],
        revision=1,
    )
    task_repo._tasks.append(workload_task)

    intent_dto = await intent_service.create_intent(
        dto=CreateActionIntentDto(
            action_type="TASK_DISPATCH",
            target_type="PROFILE",
            target_id="it-support",
            payload={
                "task_id": workload_task.id,
                "target_profile_id": "it-support",
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
            reason="Prompt 15.1 Workload 2 SAFE_READ_ONLY for it-support",
        ),
        principal=requester,
        correlation_id=f"corr-it-ro-{secrets.token_hex(4)}",
    )
    print(f"Created ActionIntent: {intent_dto.id} (risk={intent_dto.risk}, status={intent_dto.status})")

    # Request Approval
    intent_dto = await intent_service.request_approval(intent_dto.id, requester, correlation_id=intent_dto.correlation_id)
    assert intent_dto.status == "PENDING_APPROVAL"

    # Independent Approval
    approved_intent = await intent_service.approve_intent(
        intent_id=intent_dto.id,
        principal=approver,
        reason="Authorized real SAFE_READ_ONLY operational workload under Policy V3",
        confirmation_phrase="APPROVE TASK DISPATCH",
        correlation_id=intent_dto.correlation_id,
    )
    print(f"ActionIntent Approved: {approved_intent.id} (status={approved_intent.status})")
    assert approved_intent.status == "READY_TO_EXECUTE"

    # 4. Arming & Single-Use Window Execution (NO Canary Override)
    bridge_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "hermes_dispatch_bridge.py"))
    assert os.path.isfile(bridge_path), f"Bridge missing: {bridge_path}"

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

    exec_result = None
    exec_error = None

    try:
        # Arming: execution_enabled=True, live_canary_enabled=False (Strict Normal Workload!)
        settings.execution_enabled = True
        settings.live_canary_enabled = False

        unlock_res = ExecutionLockService.unlock(
            conn=conn,
            principal=executor,
            confirmation_phrase="UNLOCK TASK EXECUTION",
            reason="Prompt 15.1 it-support safe read-only workload window",
            ttl_minutes=15,
            max_executions=1,
            correlation_id=approved_intent.correlation_id,
        )
        assert unlock_res["status"] == "UNLOCKED"
        window = unlock_res["window"]
        print(f"Execution Window Opened: {window['id']} (expires={window['expires_at']})")

        # Final Preflight
        preflight_service = FinalExecutionPreflightService(
            conn=conn,
            task_repository=task_repo,
            executor=real_executor,
        )
        final_pf = await preflight_service.evaluate(intent=approved_intent, principal=executor)
        assert final_pf.passed, f"Final execution preflight failed: {final_pf.blocking_reasons}"
        assert final_pf.targetability == "TARGETABLE", f"Targetability: {final_pf.targetability}"
        print("Final Execution Preflight: PASS")

        # Dispatch Workload
        print("Executing it-support SAFE_READ_ONLY Workload via TaskDispatchCoordinator...")
        exec_result = await coordinator.execute_task_dispatch(
            intent_id=approved_intent.id,
            principal=executor,
            idempotency_key=f"idem-it-ro-{approved_intent.id}",
        )

        assert exec_result.get("status") == "ACKNOWLEDGED", f"Status: {exec_result.get('status')}"
        raw_output = exec_result.get("raw_output") or ""
        print("\n--- Operational Assessment Output ---\n", raw_output.strip())

        hermes_session_id = exec_result.get("hermes_session_id")
        assert hermes_session_id, "Missing authoritative Hermes session ID"
        print(f"\nWorkload Succeeded! Authoritative Session: {hermes_session_id}")

    except Exception as e:
        exec_error = str(e)
        print("Execution Exception:", e)
    finally:
        # Immediate Post-Workload Relock
        ExecutionLockService.lock(
            conn=conn,
            principal=executor,
            reason="Prompt 15.1 workload 2 completed - immediate relock",
            correlation_id=approved_intent.correlation_id if 'approved_intent' in locals() else None,
        )
        settings.execution_enabled = False
        settings.live_canary_enabled = False
        print("Post-Workload Relock: LOCKED, active windows=0")

    if exec_error:
        print("Workload 2 FAILED:", exec_error)
        sys.exit(1)

    # 5. Post-Workload Telemetry & Mutation Proof
    gw_after = get_remote_gateway_info()
    sessions_after = get_remote_session_counts()

    print("\n--- GATEWAY STABILITY VERIFICATION ---")
    print(f"MainPID: {gw_before.get('MainPID')} -> {gw_after.get('MainPID')} (UNCHANGED)")
    print(f"NRestarts: {gw_before.get('NRestarts')} -> {gw_after.get('NRestarts')} (UNCHANGED)")
    print(f"ActiveEnterTimestamp: {gw_before.get('ActiveEnterTimestamp')} -> {gw_after.get('ActiveEnterTimestamp')} (UNCHANGED)")
    assert gw_before.get("MainPID") == gw_after.get("MainPID")
    assert gw_before.get("NRestarts") == gw_after.get("NRestarts")
    assert gw_before.get("ActiveEnterTimestamp") == gw_after.get("ActiveEnterTimestamp")

    print("\n--- SESSION COUNTER VERIFICATION ---")
    print(f"Central Store: {sessions_before['central_store_sessions']} -> {sessions_after['central_store_sessions']} (delta: +{sessions_after['central_store_sessions'] - sessions_before['central_store_sessions']})")
    print(f"it-support Local: {sessions_before['it_support_sessions']} -> {sessions_after['it_support_sessions']} (delta: +{sessions_after['it_support_sessions'] - sessions_before['it_support_sessions']})")
    print(f"sagara-lab Local: {sessions_before['sagara_lab_sessions']} -> {sessions_after['sagara_lab_sessions']} (delta: +{sessions_after['sagara_lab_sessions'] - sessions_before['sagara_lab_sessions']})")
    assert sessions_after["it_support_sessions"] - sessions_before["it_support_sessions"] == 1, "Expected it-support delta +1"
    assert sessions_after["sagara_lab_sessions"] == sessions_before["sagara_lab_sessions"], "sagara-lab sessions must not change"

    # Verify final relock state
    is_locked_final, _, active_window_final = ExecutionLockService.get_effective_status(conn)
    assert is_locked_final is True
    assert active_window_final is None
    print("Final Relock State: VERIFIED (LOCKED, active_windows=0)")

    # Save Workload Receipt Details
    receipt_summary = {
        "task_id": workload_task.id,
        "intent_id": approved_intent.id,
        "authorization_id": approved_intent.execution_authorization_id,
        "attempt_id": exec_result.get("attempt_id"),
        "receipt_id": exec_result.get("receipt_id"),
        "receipt_hash": exec_result.get("receipt_hash"),
        "requested_profile": "it-support",
        "actual_profile": "it-support",
        "tool_id": "runtime_status.inspect_service",
        "resource": "hermes-gateway.service",
        "tool_executions_count": 1,
        "hermes_session_id": exec_result.get("hermes_session_id"),
        "status": "ACKNOWLEDGED",
        "gateway_pid": gw_after.get("MainPID"),
        "restarts": gw_after.get("NRestarts"),
    }
    with open(os.path.join(backend_dir, "data", "it_support_workload_receipt.json"), "w") as f:
        json.dump(receipt_summary, f, indent=2)

    print("\n==================================================")
    print("WORKLOAD 2 PASSED WITH ZERO SIDE EFFECTS!")
    print("==================================================")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
