# IT-Support Limited Production Rollout Report

## Milestone Status: PASS

**Execution Protocol:** Prompt 15.1 — Single Consolidated Milestone  
**Active Policy:** `PRODUCTION_EXECUTION_POLICY_V3`  
**Policy Hash:** `13ef245630dc448208a408db190924119df9bcf1f602f71e0814b62226fbe95e`  
**Supersedes:** `PRODUCTION_EXECUTION_POLICY_V2` (`c5dc6df112e56739f2d96c8ef195bc4711c9631473f92cae064ad88353848ba1`)  
**Historical V1:** `PRODUCTION_EXECUTION_POLICY_V1` (`bda47521c7881dc0a46fc62c9984fa307e297013fe40abf79083d8d87e4b319a`, Immutable)  
**Tool Security Policy:** `TOOL_SECURITY_POLICY_V1` (`9bdd1d54102280e49f1d23a13be404c44bb0f22e2c3f100b8d6aed61e3ec033d`, Immutable)  

---

## 1. Production Profile Matrix

| Profile | Status | Allowed Execution Modes | Allowed Task Classes | Max Concurrency | Max Exec/Hour |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `sagara-lab` | **LIMITED** | `SAFE_NO_TOOLS`, `SAFE_READ_ONLY` | `REASONING_ONLY`, `DRAFT_GENERATION`, `READ_ONLY_INSPECTION` | 1 | 3 |
| `it-support` | **LIMITED** | `SAFE_NO_TOOLS`, `SAFE_READ_ONLY` | `REASONING_ONLY`, `DRAFT_GENERATION`, `READ_ONLY_INSPECTION` | 1 | 3 |
| `lead` | **DISABLED** | None | None | 0 | 0 |
| `personal` | **DISABLED** | None | None | 0 | 0 |
| `business` | **DISABLED** | None | None | 0 | 0 |
| `marketing` | **DISABLED** | None | None | 0 | 0 |
| `cs` | **DISABLED** | None | None | 0 | 0 |
| `it-coding` | **DISABLED** | None | None | 0 | 0 |

- **Global Concurrency:** 1 (shared across all limited profiles)
- **New Tools Added:** 0

---

## 2. Profile-Specific Tool & Resource Bindings

`it-support` is explicitly bounded to:
1. **Logical Capability:** `runtime_status.inspect_service`
   - **Allowed Resource:** `hermes-gateway.service`
   - **Allowed Properties:** `ActiveState`, `SubState`, `MainPID`, `NRestarts`, `ActiveEnterTimestamp`, `UnitFileState`
   - **Prohibited:** Arbitrary unit names, arbitrary argv, restart/start/stop/reload.
2. **Logical Capability:** `document_inspection.read_text`
   - **Allowed Resource:** `DOC-OPS-RUNBOOK-001` (`docs/PRODUCTION_EXECUTION_OPERATOR_RUNBOOK.md`)
   - **Prohibited:** Wildcards, customer records, business vaults, personal vaults, `.env` files.

---

## 3. Workload 1: Canary (SAFE_NO_TOOLS)

- **Task ID:** `task-it-canary-6c58556a`
- **Action Intent ID:** `act-int-3b6c58386cbd`
- **Authorization ID:** `exec-auth-9ace589872db`
- **Attempt ID:** `att-836d6b9c9c89a9ce`
- **Receipt ID:** `rcpt-0ad0d34bdaa75c77`
- **Receipt Hash:** `11670a5926ac1a898662fa79f7157bad2fb5f10764217fc4784c88c5b050f3ec`
- **Requested / Actual Profile:** `it-support` / `it-support`
- **Execution Mode:** `SAFE_NO_TOOLS`
- **Task Class:** `REASONING_ONLY`
- **Hermes Session ID:** `20260913_081207_b61b75`
- **Status:** `ACKNOWLEDGED` (`COMPLETED`)
- **Deterministic Marker Verified:** `IT_SUPPORT_LIMITED_CANARY_OK`
- **Tool Invocations:** 0
- **External Effects:** 0

---

## 4. Workload 2: Operational Inspection (SAFE_READ_ONLY)

- **Task ID:** `task-it-ro-541561d9`
- **Action Intent ID:** `act-int-a251ddcc9958`
- **Authorization ID:** `exec-auth-2eba96f410bd`
- **Attempt ID:** `att-49ce2c5a58410f11`
- **Receipt ID:** `rcpt-19e1bf5b68506a3a`
- **Receipt Hash:** `e0cf0afee7da403ac47787be01940d69f7144a35356796f88e980ab4a3ec2a2b`
- **Requested / Actual Profile:** `it-support` / `it-support`
- **Execution Mode:** `SAFE_READ_ONLY`
- **Task Class:** `READ_ONLY_INSPECTION`
- **Brokered Tool:** `runtime_status.inspect_service`
- **Target Resource:** `hermes-gateway.service`
- **Hermes Session ID:** `20260913_081415_27f3d5`
- **Status:** `ACKNOWLEDGED` (`COMPLETED`)
- **Tool Invocations:** 1 (authorized typed read-only inspection)
- **Unauthorized Tool Invocations:** 0
- **Model Assessment Returned:**
  ```text
  1. GATEWAY HEALTH: Service active, running.
  2. PROCESS STATUS: MainPID 436674. NRestarts 0; stable operation.
  3. ACTIVATION CHRONOLOGY: Active since Sun 2026-09-13 07:50:43 CST. Unit file enabled.
  4. OPERATOR ACTION: No immediate action required.
  ```

---

## 5. Gateway Stability & Mutation Proof

| Property | Pre-Workload | Post-Workload | Status |
| :--- | :--- | :--- | :--- |
| `ActiveState` | `active` | `active` | Unchanged |
| `SubState` | `running` | `running` | Unchanged |
| `MainPID` | `436674` | `436674` | **Unchanged** |
| `NRestarts` | `0` | `0` | **Unchanged** |
| `ActiveEnterTimestamp` | `Sun 2026-09-13 07:50:43 CST` | `Sun 2026-09-13 07:50:43 CST` | **Unchanged** |

Zero lifecycle mutations, zero restarts caused by Mission Control execution.

---

## 6. Authoritative Session Accounting

| Scope | Pre-Rollout Baseline | Post-Canary 1 | Post-Workload 2 | Total Delta |
| :--- | :--- | :--- | :--- | :--- |
| `central_store_sessions` | 125 | 125 | 125 | +0 |
| `it-support` (profile local) | 0 | 1 | 2 | **+2** |
| `sagara-lab` (profile local) | 17 | 17 | 17 | +0 |

- **Total Hermes Submissions:** Exactly 2
- **Total Hermes Sessions:** Exactly 2
- **Direct Correlation:** Confirmed (`Task → Intent → Auth → Attempt → Receipt → Hermes Session`)

---

## 7. Native Channel Routing Distinction

| Channel / Profile | Configuration State | Authorization | Effective Dispatch |
| :--- | :--- | :--- | :--- |
| `ops-it-support` Discord Route | `CONFIGURED` | `NO` | **`BLOCKED_BY_POLICY`** |
| `it-support` Telegram Menu | `CONFIGURED` | `NO` | **`BLOCKED_BY_POLICY`** |

`HermesAdapter.validate_target_profile("it-support")` strictly enforces `BLOCKED_PROFILES`. Mission Control LIMITED policy eligibility does NOT enable autonomous channel dispatch.

---

## 8. Idempotency & Replay Verification

- Key: `idem-it-ro-act-int-a251ddcc9958`
- Cached Attempt: `att-49ce2c5a58410f11`
- Cached Session: `20260913_081415_27f3d5`
- Replay Invariant: Replay resolves to existing execution receipt without creating any new Hermes submission or session.

---

## 9. Regression Test Results

- **Mission Control Backend:** 328 passed, 0 failed (13.47s)
- **Mission Control Frontend:** 99 passed, 0 failed (491ms)
- **Native Sagara Source:** Unchanged (0 mutations)

---

## 10. Final Relocked State

- `MISSION_CONTROL_EXECUTION_ENABLED`: `false`
- `MISSION_CONTROL_LIVE_CANARY_ENABLED`: `false`
- `kill_switch`: `LOCKED`
- `active_execution_windows`: `0`
- `central_gateway_count`: `1`
