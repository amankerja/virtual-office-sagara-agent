# Sagara Mission Control — Hermes Runtime State Derivation Reference

**Status:** Canonical Derivation Truth (Prompt 11 Hardened)  
**Authority:** Backend Operations Layer (`RuntimeEvidenceService`, `RuntimeCorrelationService`, `AgentProjectionService`)  
**Domain Authority:** Pure Domain State Module (`app/domain/runtime_state.py`)  
**Execution Authority:** Hermes Agent Core (`/home/ubuntu/.hermes/state.db`)  
**Cross-Entity Model:** See [`RUNTIME_CORRELATION_MODEL.md`](./RUNTIME_CORRELATION_MODEL.md)

---

## 1. Overview & Architecture

Sagara Mission Control provides an operational projection over two independent layers:
1. **Sagara Profile & Skill Registries:** Static definition truth (`ProfileDefinition`, `SkillDefinition`).
2. **Hermes Runtime Database (`state.db`):** Dynamic execution truth (gateway heartbeats, sessions, turn leases, delegations, model usage).

The join between Sagara Profiles and Hermes Runtime is performed deterministically by the backend `RuntimeCorrelationService` and `AgentProjectionService`. The frontend renderers (Command Center, Agents List, Office 3D, Office 2.5D) strictly consume these backend projections without inventing or altering state logic.

```text
Sagara ProfileRegistry ─────────┐
                                │
Sagara SkillRegistry ──────────┼──► RuntimeEvidenceService
                                │           │
HermesSqliteRuntimeAdapter ────┤           ▼
        │                       └──► RuntimeCorrelationService
        ├─ GatewayHeartbeatReader           │
        ├─ SessionReader                    ▼
        ├─ DelegationReader         AgentProjectionService ───► AgentProjection (DTO)
        ├─ UsageReader                      │
        └─ RuntimeEventReader               ▼
                                    Command Center / Office / Runtime
```

---

## 2. Evidence Sources

| Entity | Primary Evidence Source | Supporting Evidence Source |
|---|---|---|
| **Gateway Telemetry** | `gateway_heartbeats` table (freshest `last_heartbeat`) | Corroborating system service (`hermes-gateway.service`) |
| **Session State** | `sessions` (`ended_at`, `end_reason`, `archived`) | `session_turn_leases` (`expires_at > now`) |
| **Active Execution** | `session_turn_leases` (unexpired lease) | `async_delegations` (`state IN ('running', 'claimed')`) |
| **Agent Profile Identity**| `sessions.profile_name` (canonical normalized identity) | `async_delegations.task_json.role` (optional correlation) |
| **Token & Cost Usage** | `session_model_usage` (`input_tokens`, `output_tokens`, `reasoning_tokens`, `estimated_cost_usd`, `actual_cost_usd`) | Session-level usage columns |

---

## 3. Precedence Rules & State Derivation

The pure domain function `derive_agent_runtime_state` derives `AgentRuntimeDto.state` and `AgentRuntimeDto.confidence` using the following strict hierarchy:

```text
                     ┌────────────────────────────────┐
                     │ CONFIGURATION_INCOMPLETE ?     │──YES──► CONFIGURATION_INCOMPLETE (CONFIRMED)
                     └────────────────────────────────┘
                                     │ NO
                     ┌────────────────────────────────┐
                     │ Pending Approval for Agent?    │──YES──► AWAITING_APPROVAL (CONFIRMED)
                     └────────────────────────────────┘
                                     │ NO
                     ┌────────────────────────────────┐
                     │ Active Lease OR Running Deleg? │──YES──► ACTIVE (CONFIRMED / INFERRED / STALE)
                     └────────────────────────────────┘
                                     │ NO
                     ┌────────────────────────────────┐
                     │ Recent Failure (<= 300s)?      │──YES──► ERROR (CONFIRMED)
                     └────────────────────────────────┘
                                     │ NO
                     ┌────────────────────────────────┐
                     │ Gateway Degraded & Recent Act? │──YES──► DEGRADED (INFERRED / STALE)
                     └────────────────────────────────┘
                                     │ NO
                     ┌────────────────────────────────┐
                     │ Last Activity <= 900 seconds?  │──YES──► RECENTLY_ACTIVE (INFERRED)
                     └────────────────────────────────┘
                                     │ NO
                     ┌────────────────────────────────┐
                     │ Gateway Healthy & Session Past?│──YES──► IDLE (INFERRED)
                     └────────────────────────────────┘
                                     │ NO
                     ┌────────────────────────────────┐
                     │ No Session / Delegations Found │──YES──► UNKNOWN (UNKNOWN)
                     └────────────────────────────────┘
```

### Precedence 1: `CONFIGURATION_INCOMPLETE`
- **Rule:** If `ProfileDefinition.configuration_state == "INCOMPLETE"`, the state is immediately `CONFIGURATION_INCOMPLETE`.
- **Confidence:** `CONFIRMED`.
- **Rationale:** Hermes runtime cannot execute a broken or misconfigured profile. Profile configuration truth takes precedence over runtime artifacts.

### Precedence 2: `ACTIVE`
- **Rule:** `ACTIVE` represents live execution right now. It is claimed **ONLY** when at least one of the following is true:
  1. An unexpired lease exists in `session_turn_leases` for a session belonging to this profile (`expires_at > now`).
  2. An active delegation belonging to this profile has `state IN ('running', 'dispatched')`.
- **Confidence:** `CONFIRMED`.
- **Boundary:** Merely having historical messages, open sessions, or database rows does **NOT** prove `ACTIVE`.

### Precedence 3: `ERROR`
- **Rule:** A current runtime error exists (e.g. an active delegation owned by this profile failed or errored within the current window).
- **Confidence:** `CONFIRMED`.
- **Boundary:** Historical closed sessions that ended in error hours or days ago do **NOT** permanently flag the profile as `ERROR`.

### Precedence 4: `RECENTLY_ACTIVE`
- **Rule:** `ended_at IS NULL` and `last_activity_at` is within the recent threshold (<= 900 seconds / 15 minutes), but no active turn lease or running delegation is currently present.
- **Confidence:** `INFERRED`.
- **Rationale:** The agent was interacting recently but is not actively processing a turn at this instant.

### Precedence 5: `IDLE`
- **Rule:** The profile has historical sessions in the database, the gateway is `HEALTHY`, and no active execution or recent activity is observed.
- **Confidence:** `INFERRED`.
- **Boundary:** `IDLE` requires evidence of prior registration and healthy gateway. It is **NOT** assigned to profiles with zero runtime evidence.

### Precedence 6: `UNKNOWN`
- **Rule:** No sessions or delegations correlate to the canonical profile identifier.
- **Confidence:** `UNKNOWN`.
- **Boundary:** Absence of evidence is not evidence of absence. Do **NOT** assume `OFFLINE`. The profile is simply `UNKNOWN`.

---

## 4. Time Thresholds & Gateway Health

### Gateway Freshness Cadence
- **Cadence:** Hermes gateway heartbeats are evaluated relative to UTC `time.time()`.
- **Heartbeat Age:** `heartbeat_age_seconds = int(now_utc - last_heartbeat)`.

| Heartbeat Age | Gateway Status | Connected | Runtime Confidence | Description |
|---|---|---|---|---|
| **0 – 60 seconds** | `HEALTHY` | `True` | `CONFIRMED` | Gateway heartbeat is active and fresh. |
| **61 – 300 seconds** | `DEGRADED` | `True` | `INFERRED` / `STALE` | Heartbeat received but exceeds expected interval. |
| **> 300 seconds** | `STALE` | `False` | `STALE` | Gateway heartbeat is outdated; process may have terminated. |
| **No records (0 rows)**| `NOT_CONNECTED` | `False` | `UNKNOWN` | No gateway heartbeat records observed in database. |

### Multiple Gateways Observation
If multiple heartbeat rows have `last_heartbeat` within the healthy window:
- The system deterministically selects the freshest record (`ORDER BY last_heartbeat DESC LIMIT 1`).
- An internal diagnostic `MULTIPLE_ACTIVE_GATEWAYS_OBSERVED` is recorded.
- No process kill or restart is ever performed.

---

## 5. Session State Normalization

Hermes `sessions` rows are mapped to the frozen `SessionState` contract:

| Hermes Evidence | Normalized `SessionState` | Notes |
|---|---|---|
| Unexpired lease in `session_turn_leases` | `ACTIVE` | Proven live turn execution |
| `archived == 1` | `ARCHIVED` | Explicitly archived by user or system |
| `ended_at IS NOT NULL` AND `end_reason IN ('error', 'failed', 'cron_incomplete_no_output')` | `FAILED` | Terminal failure |
| `ended_at IS NOT NULL` AND `end_reason IN ('agent_close', 'cli_close', 'session_reset', 'cron_complete')` | `COMPLETED` | Normal session termination |
| `ended_at IS NULL` AND `now - last_activity_at <= 900` | `RECENT` | Recent interaction window |
| `ended_at IS NULL` AND `now - last_activity_at > 900` | `COMPLETED` / `UNKNOWN` | Unclosed stale session |

---

## 6. Delegation State Normalization

Hermes `async_delegations` rows are mapped to the frozen `DelegationState` contract:

| Hermes `state` | Normalized `DelegationState` | Worker Mapping |
|---|---|---|
| `running`, `dispatched` | `RUNNING` | `worker_pid = str(owner_pid)` |
| `queued`, `pending` | `QUEUED` | `worker_pid = None` |
| `claimed` | `CLAIMED` | `worker_pid = str(owner_pid)` |
| `completed` | `COMPLETED` | `worker_pid = str(owner_pid)` |
| `error`, `failed` | `FAILED` | `worker_pid = str(owner_pid)` |
| `cancelled` | `CANCELLED` | `worker_pid = None` |
| Other / Null | `UNKNOWN` | `worker_pid = None` |

**Worker PID Rule:** `owner_pid` represents OS process ownership evidence only. It does **NOT** prove that a specific skill was executed.

---

## 7. Model Usage & Cost Semantics (Unknown ≠ Zero)

1. **Tokens:**
   - If `input_tokens` or `output_tokens` are missing or unrecorded, the field value is `None` (`null`), **never** coerced to `0`.
   - `0` is returned only when the database explicitly stores `0`.
2. **Costs:**
   - `estimated_cost_usd`: Approximation derived from model pricing tables or Hermes estimates.
   - `actual_cost_usd`: Confirmed billing cost from provider. If unconfirmed, remains `None`.
   - Never collapse `estimated_cost_usd` into `actual_cost_usd`.
3. **Task Cost Attribution:**
   - Costs are **never** attributed to Mission Control tasks solely by timestamp overlap.
   - If no verified foreign key or explicit link exists: `task.cost = None`.

---

## 8. Privacy & Security Rules

1. **Messages Table:**
   - The `messages` table contains user prompts and assistant outputs.
   - The session list endpoint (`GET /api/v1/sessions`) **NEVER** joins or reads `messages.content`.
   - Only single-session detail (`GET /api/v1/sessions/{id}`) may selectively load messages, subject to structured redaction.
2. **Secrets Redaction:**
   - All credentials, authorization tokens, and API keys are strictly redacted.
   - System prompts (`system_prompt`) are omitted from public DTOs.

---

## 9. Diagnostic Codes Reference

| Diagnostic Code | Severity | Description |
|---|---|---|
| `HERMES_DB_UNAVAILABLE` | CRITICAL | The SQLite database at configured path cannot be accessed or read. |
| `HERMES_SCHEMA_UNSUPPORTED` | ERROR | Database schema version is incompatible with required readers. |
| `HEARTBEAT_STALE` | WARNING | Gateway heartbeat age exceeds 60 seconds. |
| `MULTIPLE_ACTIVE_GATEWAYS_OBSERVED` | WARNING | More than one gateway heartbeat record was updated recently. |
| `SESSION_PROFILE_UNRESOLVED` | INFO | Session has `profile_name` that does not match any registered Sagara profile. |
| `RUNTIME_EVENT_SOURCE_UNAVAILABLE` | INFO | Hermes database has no canonical runtime event table; events return empty `[]`. |
| `USAGE_DATA_PARTIAL` | INFO | Some sessions lack detailed `session_model_usage` rows. |
