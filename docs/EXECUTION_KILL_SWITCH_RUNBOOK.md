# SAGARA MISSION CONTROL — EXECUTION KILL SWITCH RUNBOOK

## 1. Overview & Policy

The Execution Kill Switch provides deterministic, multi-barrier protection against unauthorized, runaway, or accidental agent execution.

### Non-Negotiable Invariants
- **Default State**: Persistent database lock is `LOCKED`.
- **Fail-Closed**: Any missing record, database query error, or audit compromise causes immediate fallback to `LOCKED`.
- **No Raw Database Manipulation (Rule #117)**: Operators must NEVER execute raw SQL queries (`UPDATE execution_locks...`). All transitions must proceed through authenticated, typed application APIs to preserve audit ledger hash chaining.

---

## 2. Inspecting Kill Switch State

To inspect current kill switch status and active execution window:

```http
GET /api/v1/execution-lock
Headers:
  X-Operator-ID: <operator-id>
  X-Auth-Source: trusted_proxy
```

### Response Example
```json
{
  "is_locked": true,
  "status": "LOCKED",
  "reason": "Persistent control plane execution lock is LOCKED.",
  "active_window": null,
  "environment_enabled": false,
  "live_canary_enabled": false
}
```

---

## 3. Opening a Bounded Execution Window (High-Risk Unlock)

Unlocking task execution is a two-step high-risk procedure.

### Step 1: Request Challenge
```http
POST /api/v1/execution-lock/request-unlock
Content-Type: application/json

{
  "reason": "Prompt 14.5 single canary execution test",
  "ttl_minutes": 15,
  "max_executions": 1
}
```

### Step 2: Confirm Unlock with Exact Server-Defined Phrase
```http
POST /api/v1/execution-lock/unlock
Content-Type: application/json

{
  "confirmation_phrase": "UNLOCK TASK EXECUTION",
  "reason": "Prompt 14.5 single canary execution test",
  "ttl_minutes": 15,
  "max_executions": 1
}
```

### Validation Gates During Unlock
1. Operator must possess permission `execution.lock.manage` (or role `admin`).
2. Confirmation phrase must match `"UNLOCK TASK EXECUTION"` exactly.
3. Reason string must be non-empty.
4. Tamper-evident audit ledger integrity must verify successfully (`verify_audit_chain(conn)`).
5. Previous open windows are automatically marked `CLOSED`.
6. A new `ExecutionWindow` record is created with bounded TTL (default 15 minutes) and execution budget (`max_executions=1`).
7. Event `execution.unlocked` is written to the cryptographic audit ledger.

---

## 4. Execution Budget & Auto-Relock Behavior

1. **One-Canary Budget (`max_executions = 1`)**:
   - Each dispatch atomically claims 1 execution slot.
   - When claimed, `executions_consumed` increments to 1 and state transitions to `EXHAUSTED`.
   - Any concurrent or subsequent dispatch attempt immediately receives:
     `403 EXECUTION_BUDGET_EXHAUSTED`.
2. **Time-to-Live (TTL) Auto-Relock**:
   - Every execution evaluation checks `now >= window.expires_at`.
   - If expired, effective state is automatically evaluated as `LOCKED` even if background sweep timers fail.

---

## 5. Emergency Execution Lock (Immediate Relock)

Locking should always be easy and requires no confirmation phrase:

```http
POST /api/v1/execution-lock/lock
Content-Type: application/json

{
  "reason": "Emergency operator shutdown"
}
```

### Action Taken
- `execution_locks.status` set to `LOCKED`.
- All `OPEN` execution windows marked `CLOSED`.
- Audit event `execution.locked` recorded with timestamp and operator ID.
- Realtime WebSocket broadcast dispatched to all connected UI clients.
- In-flight submissions block immediately from submitting new Hermes sessions.
