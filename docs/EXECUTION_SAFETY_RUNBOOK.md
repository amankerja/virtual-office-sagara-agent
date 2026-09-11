# Sagara Mission Control — Execution Safety Runbook

**Document ID:** SAGARA-EXECUTION-SAFETY-RUNBOOK-V1  
**Audience:** Mission Control Operators, SREs, Security Leads  
**Policy:** Fail-Closed, Audit-First, Zero Blind Retries

---

## 1. How to Lock Execution (Emergency Kill Switch)

Mission Control incorporates a two-tier kill switch to immediately halt all new task dispatches.

### 1.1 Database Lock (Immediate Runtime Lock)
To immediately block all execution attempts across all running instances without restarting services:

```python
# Connect to Mission Control database (e.g. via backend python shell or migration tool):
from app.db.connection import get_db_connection
from app.repositories.sqlite.execution_repo import ExecutionSqliteRepository

conn = get_db_connection()
try:
    repo = ExecutionSqliteRepository(conn)
    repo.set_execution_lock("global_dispatch", "LOCKED")
    conn.commit()
finally:
    conn.close()
```
*Effect:* Any in-flight or subsequent execute requests receive `403 ACTION_EXECUTION_DISABLED (Kill switch is LOCKED)`.

### 1.2 Environment Variable Disable (Process Level)
In Mission Control environment configuration (`.env`):
```bash
MISSION_CONTROL_EXECUTION_ENABLED=false
```
Restart backend. Execution coordinator will default to `DisabledActionExecutor`.

---

## 2. How to Verify Execution Readiness

Before attempting any canary or production dispatch, check the execution readiness endpoint:

```bash
curl -s http://localhost:8000/api/v1/action-safety/status | jq .
```

Inspect the response keys:
```json
{
  "execution_mode": "DISABLED",
  "kill_switch_status": "LOCKED",
  "execution_feature_enabled": false,
  "trusted_auth_configured": true,
  "hermes_interface_available": true,
  "direct_session_receipt_supported": true,
  "audit_chain": "VALID",
  "execution_ready": false
}
```

**Preconditions for `execution_ready: true`:**
1. `execution_feature_enabled == true` (`MISSION_CONTROL_EXECUTION_ENABLED=true`)
2. `kill_switch_status == "UNLOCKED"`
3. `trusted_auth_configured == true` (Trusted proxy CIDRs configured)
4. `action_signing == "CONFIGURED"` (Cryptographic HMAC secret active)
5. `audit_chain == "VALID"` (Audit hash chain intact)
6. `hermes_interface_available == true` (Hermes CLI binary exists and is executable)
7. `direct_session_receipt_supported == true`

---

## 3. How to Inspect and Handle `OUTCOME_UNKNOWN`

When an execution attempt returns `OUTCOME_UNKNOWN`:
- The submission was dispatched to the Hermes subprocess, but an unexpected timeout, signal, or process disruption occurred before the exit summary was parsed.
- **CRITICAL INVARIANT:** **DO NOT RETRY THE TASK AUTOMATICALLY.** Blind retries can duplicate agent actions, produce redundant API transactions, or corrupt state.

### 3.1 Investigation Steps
1. Note the `attempt_id` and `intent_id` from the alert or UI banner.
2. Inspect the Hermes runtime log on the host:
   ```bash
   journalctl -u hermes-gateway.service -n 50 --no-pager
   ```
3. Inspect Hermes sessions database to determine if a session was created:
   ```bash
   sqlite3 /home/ubuntu/.hermes/state.db "SELECT id, created_at, title FROM sessions ORDER BY created_at DESC LIMIT 5;"
   ```
4. Check if the session correlates with the task prompt or timestamps.

---

## 4. How to Reconcile an Interrupted Attempt

Use `ExecutionReconciliationService` to resolve attempts that have authoritative external evidence:

```python
from app.db.connection import get_db_connection
from app.services.reconciliation_service import ExecutionReconciliationService

conn = get_db_connection()
try:
    reconciler = ExecutionReconciliationService(conn)
    result = reconciler.reconcile_attempt(
        attempt_id="<attempt_id>",
        hermes_session_id="<verified_hermes_session_id>",
        operator_id="operator_username"
    )
    print("Reconciliation result:", result)
finally:
    conn.close()
```
*Effect:* Atomically issues `ExecutionReceipt`, links direct session in `task_execution_correlations`, transitions task to `RUNNING`, and appends an immutable `execution.reconciled` audit record.

---

## 5. What NOT to Retry

- **NEVER retry an `OUTCOME_UNKNOWN` attempt without human verification.**
- **NEVER retry an action that failed with `FINAL_PREFLIGHT_FAILED`** until the underlying root cause (e.g. profile untargetable, revision conflict, audit break) is resolved.
- **NEVER retry by generating a new `ActionIntent` with altered parameters** to bypass an approval gate.

---

## 6. How to Inspect Audit Chain Integrity

Mission Control cryptographically signs all audit events in a SHA-256 hash sequence from genesis block.

To verify audit integrity via API:
```bash
curl -X POST http://localhost:8000/api/v1/action-safety/audit/verify
```
Expected output:
```json
{
  "valid": true,
  "status": "VALID",
  "detail": "Audit chain intact across N records from genesis block.",
  "records_checked": N
}
```

If `valid == false`:
- An unauthorized database modification occurred.
- All execution preflights will instantly FAIL CLOSED (`FINAL_PREFLIGHT_FAILED: Audit chain integrity broken`).
- Operators must inspect the damaged block sequence in `audit_ledger`.
