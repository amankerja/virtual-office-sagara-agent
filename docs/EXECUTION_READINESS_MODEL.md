# SAGARA MISSION CONTROL — EXECUTION READINESS MODEL

## 1. Overview & Objective

The Execution Readiness Model establishes multi-dimensional gating before any task dispatch can reach the Hermes agent runtime. It decouples **infrastructure readiness** from **runtime arming** and **canary gating**, ensuring zero accidental executions while certifying operational readiness.

```text
[ Technical Infrastructure & Security Checks ] ──> INFRASTRUCTURE_READY (true/false)
                          │
                          ▼
            [ CANARY READINESS DECISION ]
           Is infrastructure ready to be armed?
                          │
                          ▼
                 LIVE_CANARY_READY: YES
                          │
       ┌──────────────────┴──────────────────┐
       ▼                                     ▼
[ Execution Feature Flag ]          [ Persistent Kill Switch ]
 MISSION_CONTROL_EXECUTION_ENABLED=false  Status: LOCKED
       │                                     │
       └──────────────────┬──────────────────┘
                          ▼
                EXECUTION_READY: false
```

---

## 2. The 11 Readiness Dimensions

| # | Dimension | Evaluated Component | Readiness Invariant | Prompt 14.4 Status |
| :- | :--- | :--- | :--- | :--- |
| 1 | `auth_boundary` | Ingress proxy CIDRs & headers | Trusted proxy active, non-open CIDRs | `READY` |
| 2 | `operator_authorization` | Principal permissions | Granular role policies loaded | `READY` |
| 3 | `action_signing` | HMAC-SHA256 signature key | Server-side signing key functional | `READY` |
| 4 | `control_database` | SQLite WAL schema & tables | Core tables operational | `READY` |
| 5 | `audit_integrity` | Hash-chained audit ledger | Cryptographic chain verified to genesis | `READY` |
| 6 | `profile_targetability` | Materialized Hermes profiles | All 8/8 canonical profiles targetable | `READY` |
| 7 | `hermes_executor` | Subprocess dispatch executor | Discovery and argument builder ready | `READY` |
| 8 | `direct_session_receipt`| Correlation & receipt engine | Authoritative direct session receipt ready| `READY` |
| 9 | `execution_env` | Deployment environment flag | `MISSION_CONTROL_EXECUTION_ENABLED=true` | `BLOCKED` (false) |
| 10 | `kill_switch` | Persistent DB lock & window | DB `UNLOCKED` + active open window | `BLOCKED` (LOCKED) |
| 11 | `canary_gate` | Canary environment flag | `MISSION_CONTROL_LIVE_CANARY_ENABLED=true` | `BLOCKED` (false) |

---

## 3. Core Distinctions: Ready vs Armed vs Executed

### A. Infrastructure Ready (`infrastructure_ready = true`)
All 8 foundational technical, cryptographic, database, targetability, and executor capabilities are fully tested and healthy.

### B. Canary Ready (`canary_ready = true` / `live_canary_ready = YES`)
Certifies that:
- Infrastructure is 100% verified.
- The system can safely be armed under the dedicated Prompt 14.5 canary procedure.
- It does **NOT** mean execution is already armed.

### C. Execution Armed (`execution_ready = true`)
Requires all of:
1. `infrastructure_ready == true`
2. `MISSION_CONTROL_EXECUTION_ENABLED == true`
3. `execution_locks.status == 'UNLOCKED'`
4. An active `ExecutionWindow` with remaining budget (`executions_consumed < max_executions`) and valid TTL (`now < expires_at`).

In Prompt 14.4:
- `execution_ready`: **`false`**
- `live_canary_executed`: **`NO`**

---

## 4. Aggregator Output Contract

Exposed via `GET /api/v1/execution-readiness`:

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
  },
  "details": {
    "auth_boundary": "Trusted authentication boundary configured.",
    "profile_targetability": "8/8 canonical profiles targetable.",
    "execution_env": "MISSION_CONTROL_EXECUTION_ENABLED is false (execution disabled).",
    "kill_switch": "Persistent kill switch locked: Persistent control plane execution lock is LOCKED."
  }
}
```
