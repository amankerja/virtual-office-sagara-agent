# Production Execution Policy V2 (Prompt 14.9A.7)

## 1. Overview & Policy Metadata

```yaml
policy_version: PRODUCTION_EXECUTION_POLICY_V2
policy_hash: c5dc6df112e56739f2d96c8ef195bc4711c9631473f92cae064ad88353848ba1
supersedes_version: PRODUCTION_EXECUTION_POLICY_V1
supersedes_hash: bda47521c7881dc0a46fc62c9984fa307e297013fe40abf79083d8d87e4b319a
status: ACTIVE
global_execution_enabled: false
global_tool_policy: DENY
max_global_concurrency: 1
allowed_action_types:
  - TASK_DISPATCH
bound_tool_security_policy: TOOL_SECURITY_POLICY_V1
bound_tool_security_policy_hash: 9bdd1d54102280e49f1d23a13be404c44bb0f22e2c3f100b8d6aed61e3ec033d
allowed_tools:
  - runtime_status
  - document_inspection
max_tool_invocations_per_execution: 1
created_at: "2026-09-12T12:00:00Z"
approved_by: "operator:activation_v2"
```

---

## 2. V1 Immutability Guarantee

`PRODUCTION_EXECUTION_POLICY_V1` (hash `bda47521c7881dc0a46fc62c9984fa307e297013fe40abf79083d8d87e4b319a`) remains strictly immutable in database and repository records.
- Historical receipts, ActionIntents, Canary 001, Workloads 001-003, and Safe Read-Only Canaries 001 continue to resolve to V1.
- V1 is retained in the execution policies registry with status `SUPERSEDED`.
- V2 is a distinct semantic object that governs new production intents.

---

## 3. Profile Execution Matrix (8 Canonical Profiles)

| Profile ID | Status | Allowed Execution Modes | Allowed Task Classes | Concurrency | Rate Limit | Approval |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `sagara-lab` | **LIMITED** | `SAFE_NO_TOOLS`, `SAFE_READ_ONLY` | `REASONING_ONLY`, `DRAFT_GENERATION`, `READ_ONLY_INSPECTION` | 1 | 3/hr | REQUIRED |
| `lead` | **DISABLED** | None | None | 0 | 0 | N/A |
| `personal` | **DISABLED** | None | None | 0 | 0 | N/A |
| `business` | **DISABLED** | None | None | 0 | 0 | N/A |
| `marketing` | **DISABLED** | None | None | 0 | 0 | N/A |
| `cs` | **DISABLED** | None | None | 0 | 0 | N/A |
| `it-support` | **DISABLED** | None | None | 0 | 0 | N/A |
| `it-coding` | **DISABLED** | None | None | 0 | 0 | N/A |

Fail-closed: Exactly 1 profile (`sagara-lab`) is LIMITED. All other 7 profiles are strictly DISABLED.

---

## 4. Execution Mode vs. Task Class Matrix

| Task Class | SAFE_NO_TOOLS | SAFE_READ_ONLY |
| :--- | :---: | :---: |
| `REASONING_ONLY` | **ALLOW** | **DENY** |
| `DRAFT_GENERATION` | **ALLOW** | **DENY** |
| `READ_ONLY_INSPECTION` | **DENY** | **ALLOW** |
| `CODE_CHANGE` | **DENY** | **DENY** |
| `INFRA_CHANGE` | **DENY** | **DENY** |
| `EXTERNAL_COMMUNICATION` | **DENY** | **DENY** |
| `BUSINESS_DATA_MUTATION` | **DENY** | **DENY** |
| `SCHEDULE_MUTATION` | **DENY** | **DENY** |
| `UNKNOWN` | **DENY** | **DENY** |

---

## 5. Tool Capabilities & Invariants

Under `SAFE_READ_ONLY`, only 2 read-only tool capabilities are authorized:

### 1. `runtime_status` (v1.0.0)
- Operation: `inspect_service`
- Resource: Fixed to `hermes-gateway.service`
- Property Allowlist: `ActiveState`, `SubState`, `MainPID`, `NRestarts`, `ActiveEnterTimestamp`, `UnitFileState`
- Implementation Fingerprint: `d7befb92ca4d5174`
- Invariant: Server constructs fixed invocation; no model-provided binary, service name, or systemctl operation. Systemd mutation commands (`start`, `stop`, `restart`, `kill`, `reload`) are explicitly rejected.

### 2. `document_inspection` (v1.0.0)
- Operation: `read_text`
- Implementation Fingerprint: `74ae804f084cc9bf`
- Resource: Logical resource ID resolved strictly via `ReadOnlyResourceRegistry`.
- Output Limit: Max 32 KB, max 500 lines.
- Redaction: Mandatory secret redaction before return.
- Invariant: No arbitrary directory traversal; no model-provided filesystem paths.

---

## 6. Strict Execution Constraints

1. **Single-Tool Budget:** `max_tool_invocations_per_execution = 1`. Multi-tool tasks combining `runtime_status` and `document_inspection` are rejected at preflight with `TOOL_INVOCATION_BUDGET_EXCEEDED`.
2. **Channel Denials:**
   - Network Communication: **DENY**
   - Generic Shell: **DENY**
   - Model Context Protocol (MCP): **DENY**
   - Arbitrary Subprocess: **DENY**
3. **Execution Window & TTL:** Bounded single-use window (`max_executions = 1`, `TTL <= 15 minutes`).
4. **Approval & Operator Separation:** Requester cannot self-approve. Unattended execution forbidden.
5. **Untrusted Tool Data:** All read-only tool outputs are tagged as untrusted and cannot alter system state, policy, or permissions.
6. **Production Execution State:** Locked by default (`MISSION_CONTROL_EXECUTION_ENABLED=false`, `kill_switch=LOCKED`, `active_windows=0`).
