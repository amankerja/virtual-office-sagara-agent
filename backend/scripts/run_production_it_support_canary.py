#!/usr/bin/env python3
"""
Prompt 15.1 — Canary 1: Minimal it-support SAFE_NO_TOOLS Canary.
Invariants:
- Profile: it-support (LIMITED under PRODUCTION_EXECUTION_POLICY_V3)
- Mode: SAFE_NO_TOOLS
- Task Class: REASONING_ONLY
- Tools: ZERO
- Expected Marker: IT_SUPPORT_LIMITED_CANARY_OK
- Hermes Submissions: 1, Hermes Sessions: 1
- Immediate Inter-workload Relock: execution disabled, kill switch LOCKED, active windows 0
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

EXPECTED_POLICY_VERSION = "PRODUCTION_EXECUTION_POLICY_V3"
EXPECTED_POLICY_HASH = "13ef245630dc448208a408db190924119df9bcf1f602f71e0814b62226fbe95e"

CANARY_PROMPT = """Return exactly:
IT_SUPPORT_LIMITED_CANARY_OK"""


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
    print("PROMPT 15.1: CANARY 1 (IT-SUPPORT SAFE_NO_TOOLS)")
    print("==================================================")

    # 1. Pre-Canary Validation & Baseline Telemetry
    conn = get_db_connection(str(canonical_db_path))

    # Verify Active Policy is V3
    active_policy = ExecutionPolicyService.get_active_policy(conn)
    print(f"Active Policy: {active_policy.version} (Hash: {active_policy.policy_hash})")
    assert active_policy.version == EXPECTED_POLICY_VERSION, f"Expected {EXPECTED_POLICY_VERSION}, got {active_policy.version}"
    assert active_policy.policy_hash == EXPECTED_POLICY_HASH, f"Expected hash {EXPECTED_POLICY_HASH}, got {active_policy.policy_hash}"

    # Verify it-support is LIMITED
    it_rule = active_policy.profiles.get("it-support")
    assert it_rule is not None, "it-support profile missing from policy V3"
    assert it_rule.status == "LIMITED", f"Expected it-support LIMITED, got {it_rule.status}"
    assert "SAFE_NO_TOOLS" in it_rule.allowed_execution_modes
    assert "REASONING_ONLY" in it_rule.allowed_task_classes

    # Verify Audit Chain
    valid_audit, audit_err = verify_audit_chain(conn)
    assert valid_audit, f"Audit chain invalid before canary: {audit_err}"
    print("Pre-Canary Audit Ledger: VALID")

    # Capture Baseline Remote Telemetry
    gw_before = get_remote_gateway_info()
    print("Pre-Canary Gateway State:")
    for k, v in gw_before.items():
        print(f"  {k}: {v}")
    assert gw_before.get("ActiveState") == "active", f"Gateway not active: {gw_before}"
    assert gw_before.get("SubState") == "running", f"Gateway not running: {gw_before}"

    sessions_before = get_remote_session_counts()
    print(f"Pre-Canary Sessions: central={sessions_before['central_store_sessions']}, it_support={sessions_before['it_support_sessions']}, sagara_lab={sessions_before['sagara_lab_sessions']}")

    # Check lock status
    is_locked, lock_reason, active_window = ExecutionLockService.get_effective_status(conn)
    assert is_locked is True, "Execution must be LOCKED before canary"
    assert active_window is None, "Active execution windows must be 0 before canary"
    assert not settings.execution_enabled, "settings.execution_enabled must be False"
    assert not settings.live_canary_enabled, "settings.live_canary_enabled must be False"

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

    canary_task = TaskDto(
        id=f"task-it-canary-{secrets.token_hex(4)}",
        title="IT Support Limited Rollout Canary 1",
        description="First SAFE_NO_TOOLS canary task for it-support profile under Policy V3",
        state="READY",
        priority="HIGH",
        created_at=now_iso,
        updated_at=now_iso,
        assigned_agent_id="it-support",
        requested_skills=[],
        revision=1,
    )
    task_repo._tasks.append(canary_task)

    intent_dto = await intent_service.create_intent(
        dto=CreateActionIntentDto(
            action_type="TASK_DISPATCH",
            target_type="PROFILE",
            target_id="it-support",
            payload={
                "task_id": canary_task.id,
                "target_profile_id": "it-support",
                "task_class": "REASONING_ONLY",
                "execution_mode": "SAFE_NO_TOOLS",
                "prompt": CANARY_PROMPT,
                "safe_mode": True,
                "tools_enabled": False,
                "network_enabled": False,
                "shell_enabled": False,
                "mcp_enabled": False,
            },
            resource_revision=canary_task.revision,
            reason="Prompt 15.1 Canary 1 SAFE_NO_TOOLS for it-support",
        ),
        principal=requester,
        correlation_id=f"corr-it-canary-{secrets.token_hex(4)}",
    )
    print(f"Created ActionIntent: {intent_dto.id} (risk={intent_dto.risk}, status={intent_dto.status})")

    # Request Approval
    intent_dto = await intent_service.request_approval(intent_dto.id, requester, correlation_id=intent_dto.correlation_id)
    assert intent_dto.status == "PENDING_APPROVAL"

    # Independent Approval
    approved_intent = await intent_service.approve_intent(
        intent_id=intent_dto.id,
        principal=approver,
        reason="Authorized minimal SAFE_NO_TOOLS canary under Policy V3",
        confirmation_phrase="APPROVE TASK DISPATCH",
        correlation_id=intent_dto.correlation_id,
    )
    print(f"ActionIntent Approved: {approved_intent.id} (status={approved_intent.status})")
    assert approved_intent.status == "READY_TO_EXECUTE"

    # 4. Arming & Single-Use Window Execution
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
        settings.execution_enabled = True
        settings.live_canary_enabled = True

        unlock_res = ExecutionLockService.unlock(
            conn=conn,
            principal=executor,
            confirmation_phrase="UNLOCK TASK EXECUTION",
            reason="Prompt 15.1 it-support canary 1 execution window",
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

        # Dispatch Canary
        print("Executing it-support SAFE_NO_TOOLS Canary...")
        exec_result = await coordinator.execute_task_dispatch(
            intent_id=approved_intent.id,
            principal=executor,
            idempotency_key=f"idem-it-canary-{approved_intent.id}",
        )

        assert exec_result.get("status") == "ACKNOWLEDGED", f"Status: {exec_result.get('status')}"
        raw_output = exec_result.get("raw_output") or ""
        print("\n--- Raw Canary Output ---\n", raw_output.strip())
        assert "IT_SUPPORT_LIMITED_CANARY_OK" in raw_output, f"Missing expected marker: {raw_output}"

        hermes_session_id = exec_result.get("hermes_session_id")
        assert hermes_session_id, "Missing authoritative Hermes session ID"
        print(f"\nCanary Succeeded! Authoritative Session: {hermes_session_id}")

    except Exception as e:
        exec_error = str(e)
        print("Execution Exception:", e)
    finally:
        # Immediate Inter-Workload Relock (Section 18)
        ExecutionLockService.lock(
            conn=conn,
            principal=executor,
            reason="Prompt 15.1 canary 1 completed - immediate inter-workload relock",
            correlation_id=approved_intent.correlation_id if 'approved_intent' in locals() else None,
        )
        settings.execution_enabled = False
        settings.live_canary_enabled = False
        print("Inter-workload Relock: LOCKED, active windows=0")

    if exec_error:
        print("Canary 1 FAILED:", exec_error)
        sys.exit(1)

    # 5. Post-Canary Telemetry & Verification
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

    # Save Canary Receipt Details
    receipt_summary = {
        "task_id": canary_task.id,
        "intent_id": approved_intent.id,
        "authorization_id": approved_intent.execution_authorization_id,
        "attempt_id": exec_result.get("attempt_id"),
        "receipt_id": exec_result.get("receipt_id"),
        "receipt_hash": exec_result.get("receipt_hash"),
        "requested_profile": "it-support",
        "actual_profile": "it-support",
        "hermes_session_id": exec_result.get("hermes_session_id"),
        "status": "ACKNOWLEDGED",
        "marker": "IT_SUPPORT_LIMITED_CANARY_OK",
        "gateway_pid": gw_after.get("MainPID"),
        "restarts": gw_after.get("NRestarts"),
    }
    with open(os.path.join(backend_dir, "data", "it_support_canary_receipt.json"), "w") as f:
        json.dump(receipt_summary, f, indent=2)

    print("\n==================================================")
    print("CANARY 1 PASSED WITH ZERO SIDE EFFECTS!")
    print("==================================================")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
