# Sagara Mission Control — Execution Safety Runbook

**Document ID:** SAGARA-EXECUTION-SAFETY-RUNBOOK-V1  
**Audience:** Mission Control Operators, SREs, Security Leads  
**Policy:** Fail-Closed, Audit-First, Zero Blind Retries

---

## 1. How to Lock Execution (Emergency Kill Switch)

Mission Control incorporates a multi-tier kill switch to immediately halt all new task dispatches.

### 1.1 Immediate Application API Lock (Recommended)
To immediately block all execution attempts across all instances and close active execution windows:

```bash
curl -X POST http://localhost:8000/api/v1/execution-lock/lock \
  -H "Content-Type: application/json" \
  -H "X-Operator-ID: <operator-id>" \
  -H "X-Auth-Source: trusted_proxy" \
  -d '{"reason": "Emergency operator kill switch engagement"}'
```

*Effect:* Sets persistent lock to `LOCKED`, closes all open execution windows, appends `execution.locked` to the tamper-evident audit ledger, and notifies connected UI clients via realtime WebSocket. Any subsequent execution attempt receives `403 ACTION_EXECUTION_DISABLED (Kill switch is LOCKED)`.

### 1.2 Programmatic Database Lock
```python
from app.db.connection import get_db_connection
from app.domain.principal import OperatorPrincipal
from app.services.execution_lock_service import ExecutionLockService

conn = get_db_connection()
try:
    admin = OperatorPrincipal(id="operator-admin", roles=["admin"])
    ExecutionLockService.lock(conn, principal=admin, reason="Emergency shutdown")
finally:
    conn.close()
```

### 1.3 Environment Variable Disable (Process Level)
In Mission Control environment configuration (`.env`):
```bash
MISSION_CONTROL_EXECUTION_ENABLED=false
```
Restart backend. Execution coordinator will default to `DisabledActionExecutor`.

---

## 2. How to Verify Execution Readiness

Before attempting any canary or production dispatch, check the execution readiness endpoint:

```bash
curl -s http://localhost:8000/api/v1/execution-readiness | jq .
```

Inspect the response:
```json
{
  "execution_ready": false,
  "infrastructure_ready": true,
  "canary_ready": true,
  "live_canary_ready": "YES",
  "live_canary_executed": "NO",
  "components": {
    "auth_boundary": "READY",
    "operator_authorization": "READY",
    "action_signing": "READY",
    "control_database": "READY",
    "audit_integrity": "READY",
    "profile_targetability": "READY",
    "hermes_executor": "READY",
    "direct_session_receipt": "READY",
    "execution_env": "BLOCKED",
    "kill_switch": "BLOCKED",
    "canary_gate": "BLOCKED"
  }
}
```

**Preconditions for `canary_ready: true` (`live_canary_ready: "YES"`):**
1. `auth_boundary == "READY"` (Trusted proxy CIDRs valid, no open wildcards)
2. `operator_authorization == "READY"`
3. `action_signing == "READY"` (HMAC signing key active)
4. `control_database == "READY"` (SQLite schema version operational)
5. `audit_integrity == "READY"` (Tamper-evident hash chain intact)
6. `profile_targetability == "READY"` (All 8/8 canonical profiles targetable)
7. `hermes_executor == "READY"`
8. `direct_session_receipt == "READY"`


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

---

## 7. How to Inspect & Manage Production Execution Policy V1

Prompt 14.6 introduces the authoritative server-side `ProductionExecutionPolicy`.

### 7.1 Inspect Active Execution Policy
```bash
curl -s http://localhost:8000/api/v1/execution-policy | jq .
```
Verify that:
- `version`: `PRODUCTION_EXECUTION_POLICY_V1`
- `global_execution_enabled`: `false`
- `profiles.sagara-lab.status`: `LIMITED`
- All other profiles: `DISABLED`

### 7.2 Propose an Execution Policy Changeset
Policy changes must follow the structured changeset lifecycle:
```text
Draft -> Validate -> Diff -> Approval -> Apply
```
Submit a draft changeset:
```bash
curl -X POST http://localhost:8000/api/v1/execution-policy/changesets \
  -H "Content-Type: application/json" \
  -H "X-Operator-ID: <admin-id>" \
  -H "X-Auth-Source: trusted_proxy" \
  -d '{
    "title": "Enable read-only inspection for Sagara Lab",
    "description": "Safe rollout of read-only tools for architecture reviews",
    "proposed_policy": { ... }
  }'
```

### 7.3 Apply an Approved Policy Changeset
```bash
curl -X POST http://localhost:8000/api/v1/execution-policy/changesets/<cs_id>/apply \
  -H "X-Operator-ID: <admin-id>" \
  -H "X-Auth-Source: trusted_proxy"
```
*Effect:* Atomically updates the active policy record in SQLite, logs `execution_policy.applied` to the audit ledger, and invalidates stale pending intents. Does **not** arm execution (execution remains `LOCKED`).

