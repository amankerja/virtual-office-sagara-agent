# SAGARA MISSION CONTROL — PRODUCTION EXECUTION OPERATOR RUNBOOK

```text
DOCUMENT_ID:         PRODUCTION_EXECUTION_OPERATOR_RUNBOOK
VERSION:             1.0.0
AUTHORITY:           SAGARA CONTROL PLANE ARCHITECTURE
ACTIVE_POLICY:       PRODUCTION_EXECUTION_POLICY_V2
TOOL_POLICY:         TOOL_SECURITY_POLICY_V1
PRIMARY_STATUS:      PRODUCTION EXECUTION LOCKED
```

This document serves as the **unified operational entry point** for Mission Control operators, site reliability engineers, and security personnel managing production task execution.

---

## 1. NORMAL STARTUP CHECKS

Before initiating any operational review or executing approved workflows, confirm the following baseline health criteria:

1. **Mission Control Backend Operational Status:**
   - Query: `GET /health` -> `status: "ok"`
   - Query: `GET /ready` -> `status: "ok"`
   - Query: `GET /api/v1/operations/readiness` -> `infrastructure_ready: true`, `execution_armed: false`
2. **Local Control Database Verification:**
   - Path: `backend/data/mission-control.db`
   - SQLite Journal Mode: `WAL`
   - Foreign Keys: `1` (ENABLED)
   - Cryptographic Audit Ledger: Verified sequentially from deterministic Genesis block (`sequence = 0`)
3. **Remote Gateway Daemon Status:**
   - Query command: `systemctl --user show hermes-gateway.service --property=ActiveState,SubState,MainPID,NRestarts,ActiveEnterTimestamp`
   - Expected State: `ActiveState=active`, `SubState=running`
   - Current Stable Baseline: `MainPID=149218`, `NRestarts=0`
4. **Session Count Telemetry Verification:**
   - Primary Store: `/home/ubuntu/.hermes/state.db` -> `central_store_sessions: 119`
   - Profile Store: `/home/ubuntu/.hermes/profiles/sagara-lab/state.db` -> `profile_local_sessions: 15`
   - Total Distinct Sessions: `aggregate_distinct_sessions: 134`

---

## 2. HOW TO INSPECT READINESS: READY ≠ ARMED

Mission Control strictly separates **infrastructure readiness** from **active execution arming** (Prompt 14.4 & 14.9A.9 Section 24).

| Operational Dimension | Healthy Quiescent Value | Armed Execution Value | Description |
| :--- | :--- | :--- | :--- |
| **`infrastructure_ready`** | `true` | `true` | All technical components (auth, DB, signing, audit, executor discovery) are operational. |
| **`execution_armed`** | `false` | `true` | Kill switch unlocked AND bounded execution window open AND execution flag enabled. |
| **`kill_switch`** | `LOCKED` | `UNLOCKED` | Persistent database lock state in `execution_locks`. |
| **`active_windows`** | `0` | `1` | Strictly bounded single-use window with active TTL. |
| **`execution_enabled`** | `false` | `true` | Server environment setting `MISSION_CONTROL_EXECUTION_ENABLED`. |

> **Key Rule:** An operator inspecting `GET /api/v1/operations/readiness` should normally observe:
> `infrastructure_ready=true` and `execution_armed=false`.
> This is the expected, healthy resting state of production.

---

## 3. HOW TO UNDERSTAND LOCKED VS ELIGIBLE

Operators must never confuse **policy eligibility** with **active execution** (Prompt 14.9A.9 Section 35):

* **`LOCKED`**: Execution gates are closed. No Hermes submissions or tool calls can be dispatched.
* **`ELIGIBLE`**: A task class or mode satisfies policy rules and *could* execute if an operator explicitly opens a bounded execution window.
* **`LIMITED`**: Profile is restricted to a narrow, audited subset of capabilities (e.g. `sagara-lab`).
* **`DISABLED`**: Profile is completely blocked from production execution (7 profiles: `lead`, `personal`, `business`, `marketing`, `cs`, `it-support`, `it-coding`).
* **`BLOCKED`**: Preflight, policy evaluation, or security boundary denied the requested action intent.

```text
CURRENT PROFILE ELIGIBILITY MATRIX:
+-------------------+---------------+------------------+------------------+
| Profile ID        | Policy Status | SAFE_NO_TOOLS    | SAFE_READ_ONLY   |
+-------------------+---------------+------------------+------------------+
| sagara-lab        | LIMITED       | ELIGIBLE         | ELIGIBLE         |
| lead              | DISABLED      | DENIED           | DENIED           |
| personal          | DISABLED      | DENIED           | DENIED           |
| business          | DISABLED      | DENIED           | DENIED           |
| marketing         | DISABLED      | DENIED           | DENIED           |
| cs                | DISABLED      | DENIED           | DENIED           |
| it-support        | DISABLED      | DENIED           | DENIED           |
| it-coding         | DISABLED      | DENIED           | DENIED           |
+-------------------+---------------+------------------+------------------+
```

---

## 4. HOW TO REQUEST EXECUTION & THE APPROVAL FLOW

All production task executions must proceed through the immutable ActionIntent pipeline:

```text
[Operator Intent Draft]
         ↓
[HMAC-SHA256 Signed Intent]
         ↓
[Automated Preflight Verification]
         ↓
[Independent Approver Review] (Self-approval strictly forbidden for HIGH/CRITICAL)
         ↓
[Server-Authoritative Final Preflight] (Fails closed on drift or lock)
         ↓
[Single-Use Bounded Window Verification]
         ↓
[Direct Hermes Dispatch & Tool Broker Observation]
         ↓
[Authoritative Direct Receipt & Immediate Relock]
```

### Constraints:
* **Requester Role Separation:** The operator creating an intent cannot approve it.
* **Two-Step Confirmation:** Unlocking requires typing the exact case-sensitive server phrase:
  `UNLOCK TASK EXECUTION`

---

## 5. BOUNDED EXECUTION WINDOW RULES

Execution windows are short-lived, single-use, and self-exhausting:

* **Maximum Executions Budget:** Exactly `1` execution per window (`max_executions = 1`).
* **Maximum Time-To-Live (TTL):** Default `15 minutes` (`900 seconds`).
* **Auto-Closure:** A window closes immediately when `executions_consumed >= max_executions` or when `now >= expires_at`.
* **Immediate Relock:** Automated scripts and operators must invoke emergency relock immediately after receipt generation.

---

## 6. SAFE READ-ONLY TOOL RULES

Under `PRODUCTION_EXECUTION_POLICY_V2` and `TOOL_SECURITY_POLICY_V1`, only two read-only capabilities are approved:

### 1. `runtime_status.inspect_service`
* **Allowed Units:** `["hermes-gateway.service"]`
* **Allowed Operations:** `inspect_service` (status query only)
* **Forbidden Operations:** `restart_service`, `stop_service`, `start_service` (ALL DENIED)
* **Implementation Fingerprint:** `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`

### 2. `document_inspection.read_text`
* **Allowed Scope:** Read-Only Resource Registry (`CANONICAL_INITIAL_RESOURCES`)
* **Limits:** Max `32,768 bytes`, Max `500 lines`
* **Forbidden Channels:** Path traversal (`../`, `%2e`), symlink escapes, hidden files (`.env`), binary files, secret patterns
* **Implementation Fingerprint:** `6b86b273ff34fce19d6b804eff5a3f5747ada4eaa22f1d49c01e52ddb7875b4b`

### Strict Tool Invariants:
* **Zero Arbitrary Shell:** No `/bin/sh`, `bash`, `cmd.exe`, or generic subprocess execution.
* **Zero Network / SSRF:** No outbound HTTP, WebSocket, cloud metadata endpoints (`169.254.169.254`), or socket bindings.
* **Zero MCP Tools:** Model Context Protocol dynamic registration is disabled in production.
* **Zero Mutation:** No filesystem writes, DB updates, or service restarts.
* **Single Tool Budget:** Maximum `1` tool call per execution window.

---

## 7. POST-EXECUTION VERIFICATION

Immediately following any production execution:

1. **Verify Direct Receipt Presence:**
   - Receipt must contain: `receipt_id`, `attempt_id`, `task_id`, `hermes_session_id`, `receipt_hash`, `acknowledged_at`.
   - Correlation status must be: `CONFIRMED`.
2. **Inspect Session Counter Delta:**
   - Verify on host:
     - `central_store_sessions`: expected delta = +1
     - `profile_local_sessions`: expected delta = +1
   - Any session increment without a matching Mission Control receipt is an anomaly.
3. **Verify Immediate Relock:**
   - Verify: `execution_locks.status = 'LOCKED'`
   - Verify: `active_execution_windows = 0`

---

## 8. EMERGENCY LOCK PROCEDURE (FIRST ACTION)

> [!CAUTION]
> If ANY anomaly, unexpected output, duplicate execution attempt, audit hash mismatch, or gateway instability occurs, the **FIRST ACTION IS ALWAYS TO ENGAGE THE EMERGENCY LOCK**.

### How to Lock Immediately:

#### Via Web UI:
1. Navigate to **Action Safety & Gate** page (`/action-safety`).
2. Click **Emergency Lock** button on the Kill Switch panel.
3. Verify status updates to `LOCKED (KILL SWITCH ACTIVE)`.

#### Via API:
```bash
curl -X POST http://127.0.0.1:8000/api/v1/execution-lock/lock \
  -H "Content-Type: application/json" \
  -d '{"reason": "Operator emergency execution lock engaged"}'
```

---

## 9. INCIDENT TRIAGE GUIDE

### Incident 1: `OUTCOME_UNKNOWN`
* **Trigger:** Gateway timeout (>120s), network severance, or ambiguous process state.
* **Strict Rule:** **DO NOT RETRY AUTOMATICALLY.** Auto-retry risks duplicate execution.
* **Procedure:**
  1. Verify execution is `LOCKED`.
  2. Query remote gateway session log directly:
     `sqlite3 ~/.hermes/profiles/sagara-lab/state.db "SELECT id, created_at FROM sessions ORDER BY created_at DESC LIMIT 1;"`
  3. Reconcile whether the task was actually submitted or processed.
  4. Record operator reconciliation in the audit log.

### Incident 2: Audit Hash Chain Corruption
* **Trigger:** `verify_audit_chain()` returns `valid: false`.
* **Action:**
  1. System fails closed automatically (`infrastructure_ready` becomes `false`).
  2. Inspect broken block sequence via `GET /api/v1/audit/verify`.
  3. Treat database as tampered; quarantine `mission-control.db`.

### Incident 3: Gateway Anomaly & Historical Restart
* **Historical Fact:** The gateway previously restarted unexpectedly outside Mission Control.
* **Operational Rule:**
  - If a new PID or unexpected `ActiveEnterTimestamp` is observed:
    - Gateway status transitions to `DEGRADED`.
    - Block all production execution pending review.
    - Inspect journalctl: `journalctl --user -u hermes-gateway.service -n 100 --no-pager`.

### Incident 4: Policy Drift, Tool Drift, or Resource Drift
* **Trigger:** Hash mismatch between active database record and compiled canonical constants.
* **Action:**
  - `ExecutionPolicyService` and `ToolSecurityService` fail closed immediately (`TOOL_POLICY_STALE` or `CORRUPT_EXECUTION_POLICY`).
  - Check `GET /api/v1/operations/readiness` for the failing dimension.
  - Re-apply certified policy from version control or roll back.

---

## 10. SYNTHETIC ROLLBACK & REVOCATION DRILLS

Operators can perform synthetic safety drills on isolated test databases without altering production state:

### 1. Policy Rollback Drill (V2 -> V1)
```bash
python -m pytest backend/tests/execution/test_production_execution_policy_v2.py -k "test_v2_to_v1_rollback"
```
* **Expected Result:** PASS. Demonstrates atomic downgrade to V1, immediate revocation of `SAFE_READ_ONLY` eligibility, and preservation of audit integrity.

### 2. Tool Revocation Drill
```bash
python -m pytest backend/tests/execution/test_production_execution_policy_v2.py -k "test_tool_revocation"
```
* **Expected Result:** PASS. Demonstrates instant preflight blocking when a tool capability is revoked.

### 3. Resource Revocation Drill
```bash
python -m pytest backend/tests/execution/test_production_execution_policy_v2.py -k "test_resource_revocation"
```
* **Expected Result:** PASS. Demonstrates instant blocking of document inspection when a resource is marked `enabled = 0`.

---

## 11. DEEP TECHNICAL DOCUMENTATION INDEX

For exhaustive technical specifications, refer to the underlying milestone records:

* **Production Execution Policies:**
  - [PRODUCTION_EXECUTION_POLICY_V1.md](file:///d:/SAGARA%20AI/MAIN%20DASHBOARD/sagara-mission-control/docs/PRODUCTION_EXECUTION_POLICY_V1.md)
  - [PRODUCTION_EXECUTION_POLICY_V2.md](file:///d:/SAGARA%20AI/MAIN%20DASHBOARD/sagara-mission-control/docs/PRODUCTION_EXECUTION_POLICY_V2.md)
* **Tool Security & Sandbox Architecture:**
  - [TOOL_SECURITY_POLICY_V1.md](file:///d:/SAGARA%20AI/MAIN%20DASHBOARD/sagara-mission-control/docs/TOOL_SECURITY_POLICY_V1.md)
  - [SAFE_READ_ONLY_THREAT_MODEL.md](file:///d:/SAGARA%20AI/MAIN%20DASHBOARD/sagara-mission-control/docs/SAFE_READ_ONLY_THREAT_MODEL.md)
  - [SAFE_READ_ONLY_TOOL_INVENTORY.md](file:///d:/SAGARA%20AI/MAIN%20DASHBOARD/sagara-mission-control/docs/SAFE_READ_ONLY_TOOL_INVENTORY.md)
  - [READ_ONLY_RESOURCE_REGISTRY.md](file:///d:/SAGARA%20AI/MAIN%20DASHBOARD/sagara-mission-control/docs/READ_ONLY_RESOURCE_REGISTRY.md)
* **Operational Reports & Canaries:**
  - [SAFE_READ_ONLY_CANARY_001_REPORT.md](file:///d:/SAGARA%20AI/MAIN%20DASHBOARD/sagara-mission-control/docs/SAFE_READ_ONLY_CANARY_001_REPORT.md)
  - [SAFE_READ_ONLY_DOCUMENT_CANARY_001_REPORT.md](file:///d:/SAGARA%20AI/MAIN%20DASHBOARD/sagara-mission-control/docs/SAFE_READ_ONLY_DOCUMENT_CANARY_001_REPORT.md)
  - [NORMAL_SAFE_READ_ONLY_WORKLOAD_001_REPORT.md](file:///d:/SAGARA%20AI/MAIN%20DASHBOARD/sagara-mission-control/docs/NORMAL_SAFE_READ_ONLY_WORKLOAD_001_REPORT.md)
* **Incident Response & Kill Switch:**
  - [EXECUTION_INCIDENT_RESPONSE.md](file:///d:/SAGARA%20AI/MAIN%20DASHBOARD/sagara-mission-control/docs/EXECUTION_INCIDENT_RESPONSE.md)
  - [EXECUTION_KILL_SWITCH_RUNBOOK.md](file:///d:/SAGARA%20AI/MAIN%20DASHBOARD/sagara-mission-control/docs/EXECUTION_KILL_SWITCH_RUNBOOK.md)
  - [SESSION_OBSERVABILITY_SEMANTICS.md](file:///d:/SAGARA%20AI/MAIN%20DASHBOARD/sagara-mission-control/docs/SESSION_OBSERVABILITY_SEMANTICS.md)
