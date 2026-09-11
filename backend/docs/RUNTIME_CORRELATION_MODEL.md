# Sagara Mission Control — Runtime Correlation Model Reference

**Status:** Canonical Truth Chain Specification (Prompt 11)  
**Authority:** Operations Backend (`RuntimeEvidenceService`, `RuntimeCorrelationService`, `AgentProjectionService`)  
**Domain Layer:** `app/domain/runtime_state.py`  
**Execution Context:** Strictly Read-Only SQLite & File Inspections  

---

## 1. Overview & Architecture

Sagara Mission Control correlates multi-source operational telemetry across an end-to-end truth chain:

```text
Sagara ProfileDefinition (Static Config Authority)
        │
        ▼
Hermes Session Evidence (Runtime Sessions & Turn Leases)
        │
        ▼
Hermes Delegation Evidence (Async Delegations & Worker PIDs)
        │
        ▼
Hermes Usage Evidence (Model Calls, Token Counters & Costs)
        │
        ▼
Mission Control Task Evidence (Governed Workflow & Direct Sessions)
        │
        ▼
Mission Control Approval Evidence (Governance Approvals & Transitive Links)
        │
        ▼
AgentProjection (Canonical Domain DTO)
        │
        ▼
Command Center  •  Agents Directory  •  Runtime Browser  •  Office 3D / 2.5D / List
```

The system fundamentally distinguishes six independent concepts and **never** collapses them:
1. **IDENTITY:** Canonical `profile.id` registered in Sagara ProfileRegistry.
2. **STATE:** Operational mode (`ACTIVE`, `IDLE`, `RECENTLY_ACTIVE`, `AWAITING_APPROVAL`, `DEGRADED`, `ERROR`, `OFFLINE`, `UNKNOWN`, `CONFIGURATION_INCOMPLETE`).
3. **EVIDENCE:** Empirical observations recorded by readers (`RuntimeEvidence`).
4. **CONFIDENCE:** Verifiability level of the derived state (`CONFIRMED`, `INFERRED`, `STALE`, `UNKNOWN`).
5. **CORRELATION:** Graph edges between entities (`CorrelationEdge`), typed as `DIRECT`, `INFERRED`, or `UNKNOWN`.
6. **STALENESS:** Age evaluation against centralized thresholds (`RuntimeStalenessConfig`).

---

## 2. Canonical Identity Rules

1. **Identity Authority:**
   - The primary authority for agent identity is the Sagara `ProfileRegistry` (`profile.id`).
   - Profile matching uses **exact canonical ID matching only**.
   - Trivial surrounding whitespace normalization is permitted.
2. **Strict Prohibition of Fuzzy Matching:**
   - Matching by `display_name`, `name`, `description`, `role`, directory order, or partial substring is **strictly prohibited**.
   - Example: Directory `alpha-custom/` containing `id: dyn-custom-98765` is identified strictly as `dyn-custom-98765`. A session with `profile_name = 'alpha-custom'` is flagged as unresolved and does not match.
3. **No Phantom Agents:**
   - If a runtime session or delegation references an unregistered profile `X`:
     - An internal diagnostic `SESSION_PROFILE_UNRESOLVED` is logged.
     - The session remains visible in the Runtime and Sessions browser.
     - **No phantom Agent entity is ever created in the fleet**.
4. **Absence of Evidence ≠ OFFLINE:**
   - If a registered profile has no sessions or delegations in runtime:
     - `runtime.state = UNKNOWN`
     - `runtime.confidence = UNKNOWN`
     - `runtime.session_count = None` (preserving UNKNOWN != ZERO)
     - It is **never** coerced to `OFFLINE` or `IDLE`.

---

## 3. Evidence Types & Strength Scoring

Internal evidence is modeled via immutable `RuntimeEvidence` records:

```python
@dataclass(frozen=True)
class RuntimeEvidence:
    evidence_type: str
    entity_id: Optional[str]
    observed_at: Optional[datetime]
    confidence: str
    source: str
    attributes: Mapping[str, Any]
```

### Supported Evidence Types:
- `GATEWAY_HEARTBEAT`: Heartbeat record from `gateway_heartbeats` table.
- `SESSION_ACTIVE_LEASE`: Unexpired turn lease in `session_turn_leases`.
- `SESSION_RECENT`: Unclosed session with activity within the freshness window.
- `SESSION_COMPLETED`: Explicitly closed session (`ended_at IS NOT NULL`).
- `SESSION_FAILED`: Closed session terminating with error or failure.
- `DELEGATION_RUNNING`: Active delegation with state `RUNNING` or `CLAIMED`.
- `DELEGATION_QUEUED`: Pending delegation in `QUEUED` state.
- `DELEGATION_COMPLETED`: Finished delegation.
- `DELEGATION_FAILED`: Errored/failed delegation.
- `USAGE_OBSERVED`: Token and billing evidence from `session_model_usage`.
- `TASK_SESSION_LINK`: Direct foreign key from Mission Control task to session.
- `APPROVAL_PENDING`: Active pending governance approval in Mission Control.

### Evidence Strength Hierarchy:
1. **AUTHORITATIVE (Score 3):** Active turn leases (`session_turn_leases.expires_at > now`), static configuration errors (`CONFIGURATION_INCOMPLETE`), pending governance approvals.
2. **STRONG (Score 2):** Authoritative gateway heartbeats (`age <= 60s`), fresh running delegations (`age <= 1800s`), explicit failure records within 300s.
3. **SUPPORTING (Score 1):** Recent unclosed sessions (within 900s), historical sessions, completed delegations.
4. **WEAK / UNCORRELATED (Score 0):** Unclosed sessions older than 900s, stale running delegations (> 1800s), owner PIDs without active execution proof.

---

## 4. Deterministic State Precedence

The backend applies a single pure precedence function (`derive_agent_runtime_state`):

```text
1. CONFIGURATION_INCOMPLETE   (Profile Definition is INCOMPLETE) ──► CONFIRMED
         │
2. AWAITING_APPROVAL          (Pending approval for agent or active task) ──► CONFIRMED
         │
3. ACTIVE                     (Unexpired turn lease OR fresh running deleg) ──► CONFIRMED / INFERRED / STALE
         │
4. ERROR                      (Delegation or session failed <= 300s) ──► CONFIRMED
         │
5. DEGRADED                   (Gateway degraded/stale with recent activity) ──► INFERRED / STALE
         │
6. RECENTLY_ACTIVE            (Unclosed session <= 900s without lease) ──► INFERRED
         │
7. IDLE                       (Historical session present + healthy gateway) ──► INFERRED
         │
8. OFFLINE                    (Explicit unavailability evidence only) ──► CONFIRMED
         │
9. UNKNOWN                    (No runtime evidence) ──► UNKNOWN
```

---

## 5. Centralized Staleness Windows & Thresholds

Thresholds are centralized in `RuntimeStalenessConfig` and never hardcoded in services:

| Config Parameter | Value | Source / Empirical Reason | Consequence of Expiry |
|---|---|---|---|
| `runtime_active_grace_seconds` | `60s` | Hermes turn lease expiration and heartbeat grace | Active status degrades if unrenewed |
| `runtime_recent_window_seconds`| `900s` (15m) | Typical agent conversation pause before idle transition | `RECENTLY_ACTIVE` transitions to `IDLE` |
| `gateway_heartbeat_healthy_seconds` | `60s` | Hermes gateway 30s background loop + 30s network buffer | Gateway status transitions to `DEGRADED` |
| `gateway_stale_seconds` | `300s` (5m) | 5x heartbeat miss indicates process failure or hang | Gateway transitions to `STALE`; agent confidence degrades |
| `delegation_stale_seconds` | `1800s` (30m) | Subagent tasks exceed reasonable execution ceiling | Delegation flagged `EVIDENCE_STALE`; excluded from `ACTIVE` |
| `error_recency_seconds` | `300s` (5m) | Operational recovery grace period | Historical failure is not permanent `ERROR` |

---

## 6. Current Session vs. Latest Session Rules

1. **Current Session Rule:**
   - `currentSessionId` is populated **ONLY IF**:
     - An active turn lease currently binds to the session (`expires_at > now`), OR
     - An active non-stale running delegation references the session.
   - If no current execution is active, `currentSessionId = None`.
2. **Latest Historical Session ≠ Current Session:**
   - Having historical sessions does **NOT** populate `currentSessionId`.
   - The latest historical session may be displayed in historical detail views, but never masquerades as live execution.
3. **Multiple Active Sessions Resolution:**
   - If multiple active sessions exist for one profile:
     1. Sort by evidence strength (active turn lease > running delegation).
     2. Sort by recency of `last_activity_at` (DESC).
     3. Tie-break by alphanumeric `id` (DESC).
     4. Record internal diagnostic `MULTIPLE_CURRENT_SESSIONS`.
4. **Session Parent Lineage & Cycle Protection:**
   - Sessions referencing `parent_session_id` are traversed recursively with a visited set.
   - Circular references terminate safely without crashing and record `SESSION_LINEAGE_CYCLE`.

---

## 7. Delegation Correlation & Temporary Workers

1. **Direct Correlation:**
   - Correlated to profile via canonical `async_delegations.task_json.role == profile.id`.
   - Correlated to session via `parent_session_id` or `origin_session`.
2. **Active Delegations Count:**
   - `AgentRuntimeDto.active_delegations` counts strictly:
     - `RUNNING`, `CLAIMED`, `QUEUED`.
   - It strictly excludes terminal states:
     - `COMPLETED`, `FAILED`, `CANCELLED`, `UNKNOWN`.
3. **Temporary Workers (Office Projections):**
   - Derived strictly from active delegations.
   - `RUNNING` delegation spawns temporary worker dock in Office views.
   - `COMPLETED`, `FAILED`, or `CANCELLED` delegations spawn **no** active workers.
4. **Owner PID Rule:**
   - `owner_pid` represents OS process ownership evidence only.
   - It does **NOT** prove skill execution.

---

## 8. Usage Correlation & Aggregation (Unknown ≠ Zero)

1. **Session Join:**
   - Joins via explicit `session_model_usage.session_id == sessions.id`.
   - No fuzzy timestamp or model name joins.
2. **Multi-Model Aggregation:**
   - Multiple rows for different models within one session are summed cleanly.
   - Input and output tokens are aggregated per profile.
3. **Double-Counting Prevention:**
   - Canonical telemetry uses `session_model_usage` rows.
   - Fallback to `sessions` table token totals occurs **only** when `session_model_usage` has zero rows for the target session.
4. **Strict UNKNOWN ≠ ZERO:**
   - Missing token or cost metrics remain `None` (`null`).
   - `0` is emitted **only** when the database explicitly records `0` or `0.0`.
5. **Cost Separation:**
   - `estimated_cost_usd` (pricing model estimate) and `actual_cost_usd` (provider invoiced cost) are strictly separated.
   - Unverified provider costs remain `None` and log `COST_SEMANTICS_UNVERIFIED`.

---

## 9. Task ↔ Session Correlation

1. **Direct Foreign Key Requirement:**
   - Tasks correlate to Hermes sessions **ONLY** via direct explicit evidence (e.g. `task.session_id` or canonical correlation ID).
   - Timestamp proximity alone is **strictly rejected**.
   - Profile assignment alone is **strictly rejected**.
   - Title or goal similarity alone is **strictly rejected**.
2. **Absence Handling:**
   - Uncorrelated tasks record `task.runtime_session = UNKNOWN` (`None`).
   - Diagnostic `TASK_SESSION_UNRESOLVED` is logged.

---

## 10. Approval ↔ Task ↔ Runtime Correlation

1. **Transitive Correlation Chain:**
   - Approvals correlate directly to tasks: `Approval.task_id == Task.id`.
   - Approvals correlate to Hermes sessions **transitively only**: `Approval -> Task -> Session`.
   - Direct Approval ↔ Hermes Session links are never fabricated without explicit proof.
2. **Awaiting Approval Derivation:**
   - `AWAITING_APPROVAL` is triggered **only** when `approval.state == "PENDING"` and the approval targets the agent or an active task assigned to the agent.
   - Historical or resolved approvals (`APPROVED`, `REJECTED`, `CANCELLED`) never trigger `AWAITING_APPROVAL`.
3. **Approval Risk Isolation:**
   - High or Critical approval risk is governance governance metadata; it **never** triggers an agent runtime `ERROR`.

---

## 11. Gateway Health Impact & False Mass-OFFLINE Prevention

1. **Gateway Freshness Impact:**
   - `HEALTHY` (heartbeat <= 60s): Full confidence (`CONFIRMED`).
   - `DEGRADED` (61s – 300s): Degrades confidence to `INFERRED` or state to `DEGRADED`.
   - `STALE` (> 300s): Degrades confidence to `STALE`.
2. **Outage Behavior:**
   - When the gateway is disconnected or unavailable, agents with prior evidence transition to `UNKNOWN` confidence or `DEGRADED`.
   - They are **NEVER** mass-converted to `OFFLINE`.

---

## 12. Unresolved Cases & Diagnostics Reference

| Diagnostic Code | Severity | Trigger Condition | Operational Impact |
|---|---|---|---|
| `SESSION_PROFILE_UNRESOLVED` | INFO | Session references a profile not in Sagara registry | Session stays in Runtime view; no phantom agent created |
| `SESSION_CURRENTNESS_UNPROVEN` | INFO | Session updated recently but lacks active turn lease or running delegation | Agent marked `RECENTLY_ACTIVE`, not `ACTIVE` |
| `MULTIPLE_CURRENT_SESSIONS` | WARNING | Two or more concurrent active leases/delegations for one profile | Deterministic tie-break selects primary; all preserved in detail |
| `SESSION_LINEAGE_CYCLE` | WARNING | Recursive `parent_session_id` forms a closed cycle | Traversal terminates safely at cycle entry |
| `DELEGATION_SESSION_UNRESOLVED` | INFO | Delegation references `parent_session_id` absent from `sessions` | Delegation recorded; session link remains `None` |
| `EVIDENCE_STALE` | WARNING | Delegation or lease exceeds staleness window | Evidence excluded from `ACTIVE` derivation |
| `TASK_SESSION_UNRESOLVED` | INFO | Task lacks explicit `session_id` foreign key | Task runtime session remains `None` |
| `APPROVAL_RUNTIME_UNRESOLVED` | INFO | Approval targets Task, but Task lacks direct Hermes session | Transitive runtime link remains `None` |
| `GATEWAY_STALE` | WARNING | Gateway heartbeat age exceeds 300s | Runtime confidence degraded |
| `COST_SEMANTICS_UNVERIFIED` | INFO | Provider billing cost absent from model usage | `actual_cost_usd` left `None` |

---

## 13. Hard Safety Boundary Compliance

1. **Zero Database Writes:** All SQLite connections use `mode=ro` URI and `PRAGMA query_only = ON`.
2. **Zero WAL Mutation:** No `wal_checkpoint`, no table alteration, no schema migrations.
3. **Zero External Side Effects:** No Hermes gateway stop/restart, no task dispatch, no approval mutations, no Telegram/Discord messages.
4. **Strict Privacy:** The `messages` table is never bulk-loaded; prompts and secret API keys are never ingested or logged.
