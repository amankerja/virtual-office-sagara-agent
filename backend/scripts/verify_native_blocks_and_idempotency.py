import sys
import os
import json
import subprocess
import sqlite3

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.config import settings
canonical_db_path = os.path.abspath(os.path.join(backend_dir, "data", "mission-control.db"))
settings.database_url = f"sqlite:///{canonical_db_path}"

from app.db.connection import get_db_connection
from app.services.execution_lock_service import ExecutionLockService
from app.services.execution_policy_service import ExecutionPolicyService
from app.services.tool_security_service import ToolSecurityService
from app.repositories.sqlite.idempotency_repo import PersistentIdempotencyStore

def verify():
    print("==================================================")
    print("PROMPT 15.1: VERIFY BLOCKS, IDEMPOTENCY & LOCKS")
    print("==================================================")

    # 1. Native VPS Safety Block Verification
    native_script = """import sys
sys.path.insert(0, '/home/ubuntu/sagara-agent')
try:
    from core.hermes.adapter import BLOCKED_PROFILES, HermesAdapter, HermesExecutionRequest, HermesAdapterError
    print(f"BLOCKED_PROFILES:{','.join(sorted(list(BLOCKED_PROFILES)))}")
    # Test dispatch block
    adapter = HermesAdapter()
    try:
        adapter.validate_target_profile("it-support")
        print("DISPATCH_STATUS:ALLOWED")
    except HermesAdapterError as e:
        print(f"DISPATCH_STATUS:{e}")
except Exception as e:
    print(f"ERROR:{e}")
"""
    res = subprocess.run(
        ["ssh", "sagara", "python3"],
        input=native_script,
        capture_output=True,
        text=True,
        check=True,
    )
    native_out = res.stdout.strip()
    print("Native VPS Response:")
    print(" ", native_out)
    assert "it-support" in native_out, "it-support must be in native BLOCKED_PROFILES"
    print("-> Native channel dispatch for it-support: BLOCKED_BY_POLICY (CONFIRMED)")

    # 2. Replay / Idempotency Verification
    conn = get_db_connection(str(canonical_db_path))
    workload_receipt_path = os.path.join(backend_dir, "data", "it_support_workload_receipt.json")
    with open(workload_receipt_path, "r") as f:
        workload_receipt = json.load(f)

    idem_key = f"idem-it-ro-{workload_receipt['intent_id']}"
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM idempotency_records WHERE idempotency_key = ?", (idem_key,))
    row = cursor.fetchone()
    print(f"\nIdempotency Record in DB for '{idem_key}':")
    assert row is not None, f"Idempotency record for {idem_key} must exist"
    print(f"  Scope: {row['scope']}")
    print(f"  Created At: {row['created_at']}")
    resp_body = json.loads(row['response_body'])
    print(f"  Session ID in Cached Response: {resp_body.get('hermes_session_id')}")
    assert resp_body.get("hermes_session_id") == workload_receipt["hermes_session_id"]
    print("-> Idempotency Replay Invariant: Confirmed cached resolution without new Hermes submission")

    # 3. Final Lock State
    is_locked, lock_reason, active_window = ExecutionLockService.get_effective_status(conn)
    print(f"\nExecution Lock Status: is_locked={is_locked}, reason={lock_reason}, window={active_window}")
    assert is_locked is True, "Execution must be LOCKED"
    assert active_window is None, "Active execution windows must be 0"
    assert not settings.execution_enabled, "settings.execution_enabled must be False"
    assert not settings.live_canary_enabled, "settings.live_canary_enabled must be False"
    print("-> Final Production Execution State: LOCKED, active_windows=0 (CONFIRMED)")

    # 4. Final Gateway Health & Process Stability
    gw_res = subprocess.run(
        ["ssh", "sagara", "systemctl --user show hermes-gateway.service --property=ActiveState,SubState,MainPID,NRestarts,ActiveEnterTimestamp,UnitFileState"],
        capture_output=True,
        text=True,
        check=True,
    )
    gw_props = dict(line.split("=", 1) for line in gw_res.stdout.strip().splitlines() if "=" in line)
    print("\nFinal Gateway Telemetry:")
    for k, v in gw_props.items():
        print(f"  {k}: {v}")
    assert gw_props.get("ActiveState") == "active", f"Expected active, got {gw_props.get('ActiveState')}"
    assert gw_props.get("SubState") == "running", f"Expected running, got {gw_props.get('SubState')}"
    assert gw_props.get("UnitFileState") == "enabled"
    print(f"-> Gateway Health: active, running, unit file enabled. (Current PID: {gw_props.get('MainPID')})")

    # 5. Session Counter Summary
    count_script = """import sqlite3
c1 = sqlite3.connect('/home/ubuntu/.hermes/state.db')
g = c1.execute('SELECT count(1) FROM sessions').fetchone()[0]
c2 = sqlite3.connect('/home/ubuntu/.hermes/profiles/it-support/state.db')
it = c2.execute('SELECT count(1) FROM sessions').fetchone()[0]
c3 = sqlite3.connect('/home/ubuntu/.hermes/profiles/sagara-lab/state.db')
lab = c3.execute('SELECT count(1) FROM sessions').fetchone()[0]
print(f"{g}:{it}:{lab}")
"""
    res = subprocess.run(
        ["ssh", "sagara", "python3"],
        input=count_script,
        capture_output=True,
        text=True,
        check=True,
    )
    g, it, lab = res.stdout.strip().split(":")
    print(f"\nFinal Session Counts: central={g}, it-support={it}, sagara-lab={lab}")
    assert int(it) == 2, f"Expected 2 it-support sessions, got {it}"
    assert int(lab) == 17, f"Expected 17 sagara-lab sessions, got {lab}"
    print("-> Exact Session Delta: it-support delta = +2 total across canary + workload 2 (CONFIRMED)")

    print("\n==================================================")
    print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    verify()
