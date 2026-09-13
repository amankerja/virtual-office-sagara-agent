# SAGARA AI / HERMES RUNTIME CONTRACT V1
**Status**: FROZEN & AUTHORITATIVE  
**Milestone**: Prompt 15.0 Production Integration Freeze & Plug-and-Play Remediation  
**Authority**: Mission Control Adapter Boundary  
**Hermes Baseline**: Version 0.20.6 (commit `a9c783f21995723c812dcb2f8ae58bc6a4323e2f`)  
**Sagara Baseline**: Commit `ef03dbcd90538339cd493246959540ba628b0773`  
**Central Gateway Service**: `hermes-gateway.service` (Single singleton instance)

---

## 1. Architectural Invariants & Boundary Topology

```text
+-------------------------------------------------------------+
|               Mission Control Frontend                       |
|   (React 19 / Vite / Tailwind / Lucide stroke-based UI)      |
+-------------------------------------------------------------+
                              |
                              | Normalized DTOs & Projections
                              v
+-------------------------------------------------------------+
|               Mission Control Backend API                    |
|       (FastAPI / Python 3.13 / AsyncIO / SQLite)            |
+-------------------------------------------------------------+
                              |
                              | Frozen Adapter Boundary Layer
                              v
+-------------------------------------------------------------+
|              Normalized Adapters Boundary                   |
|  - ProfileRegistryAdapter       - HermesExecutionAdapter    |
|  - SkillRegistryAdapter         - HermesSessionAdapter      |
|  - RoutingAdapter               - GatewayHealthAdapter      |
|  - HermesRuntimeAdapter         - AuditAdapter              |
+-------------------------------------------------------------+
                              |
                              | Strictly Typed Invocations & Direct DB Reads
                              v
+-------------------------------------------------------------+
|                  Sagara / Hermes Runtime                    |
|  - Sagara Agent (core/registry, core/hermes)                |
|  - Hermes CLI (/home/ubuntu/.local/bin/hermes)              |
|  - SQLite stores (state.db, central gateway)                |
+-------------------------------------------------------------+
```

### Absolute Boundary Rules
1. **Adapter Boundary Decoupling**: Frontend and API consumers depend ONLY on normalized projections. No frontend component may ever know underlying VPS paths (`/home/ubuntu`), SQLite schemas, systemd services, or Hermes CLI flags.
2. **Singleton Gateway**: Exactly ONE central `hermes-gateway.service` runs on the host. Standalone profile gateways, secondary Discord consumers, Telegram pollers, or WhatsApp bridges are strictly prohibited.
3. **Execution Invariants**: Profile selection is executed EXCLUSIVELY via `-p <profile_id>` CLI flag with `shell=False`. Environment variable fallback (`HERMES_HOME`) is disabled to prevent accidental cross-profile leakage.

---

## 2. Canonical Profiles & Runtime Classifications

### 2.1 Canonical Sagara Profiles (8/8 Targetable)
Mission Control recognizes exactly 8 canonical Sagara agents. All 8 exist on the runtime host and are verified targetable:

| Profile ID | Canonical Name | Targetable | Mission Control Production Execution | Role & Capabilities |
|---|---|---|---|---|
| `lead` | Lead Executive Agent | Yes | DISABLED | Executive orchestration, CRM, alerts |
| `personal` | Personal Assistant | Yes | DISABLED | Personal scheduling, reminders |
| `business` | Business Intelligence | Yes | DISABLED | Financial metrics, operations |
| `marketing` | Growth & Marketing | Yes | DISABLED | Content generation, social schedules |
| `cs` | Customer Support | Yes | DISABLED | Ticket triage, customer responses |
| `it-support` | IT Operations Support | Yes | **DISABLED (LOCKED)** | System diagnostics, health checks |
| `it-coding` | IT Coding Assistant | Yes | DISABLED | Code reviews, testing, refactoring |
| `sagara-lab` | Sagara Research Lab | Yes | **LIMITED (Dual-Mode)** | Research sandbox, read-only inspection |

### 2.2 Hermes Runtime-Only Profiles (Non-Canonical)
Hermes exposes auxiliary profiles that are **NOT** canonical Sagara profiles:
- `default`: Default Hermes fallback workspace. Not a canonical Sagara agent.
- `career`: Career assistance workspace present in Hermes runtime. Classified strictly as `hermes_runtime_only`. Must NEVER be surfaced to frontend as a 9th Sagara Agent.

### 2.3 `it-support` Explicit Policy Enforcement
- In accordance with Prompt 15.0 Section 46, `it-support` remains **DISABLED** for Mission Control production execution.
- Its advisory status is `READY_FOR_LIMITED_POLICY_DESIGN`, but activation is strictly blocked until subsequent milestones.

---

## 3. Execution Invocation & Session Receipt Contract

### 3.1 Canonical Hermes CLI Invocation Form
Every execution dispatch invocation strictly adheres to the following typed list form:
```bash
hermes -p <profile_id> chat --query-file <path_to_tmp_query> --oneshot -Q [--safe-mode]
```
- **Arguments**: Delivered as a typed `list[str]`. `shell=True` and string concatenation are strictly prohibited.
- **Profile Selector**: Passed via `-p <profile_id>`. The execution environment is cleansed of `HERMES_HOME` (`env = {k: v for k, v in os.environ.items() if k != "HERMES_HOME"}`).
- **Input Delivery**: Prompt is written to an isolated temporary file passed via `--query-file <path>`, cleaned up immediately in a `finally` block.
- **Safety Flags**: When tools are disabled or safe-mode is requested, `--safe-mode` is appended.
- **Preflight Validation**: Profile targetability is verified before invocation. If uninstalled or invalid, fails closed with `PROFILE_NOT_TARGETABLE`. No fallback to `default` or `lead`.

### 3.2 Authoritative Session Receipt Parsing
- Hermes in quiet mode (`-Q`) outputs an authoritative receipt on exit.
- The session ID is parsed using direct regex matching:
  ```python
  r"(?:Session:\s+|session_id:\s+|hermes\s+--resume\s+)([a-zA-Z0-9_\-]+)"
  ```
- **NO Heuristic Correlation**: Under no circumstances will Mission Control derive a session ID via timestamp proximity, profile matching, or scanning latest rows.
- If Hermes exits with code `0` but no session ID is captured, the outcome is classified as `OUTCOME_UNKNOWN` with error `HERMES_SESSION_RECEIPT_MISSING`.

### 3.3 Ambiguous Outcome & Timeout Handling
- In the event of a subprocess timeout or missing receipt, the result outcome is strictly `OUTCOME_UNKNOWN` with error code `HERMES_TIMEOUT`.
- **NO Automatic Retry**: Retries on `OUTCOME_UNKNOWN` are strictly prohibited. The operator must reconcile state.

---

## 4. Attempt to Session Correlation & Idempotency

### 4.1 Direct Correlation Persistence
Direct 1-to-1 tracking is maintained across execution stages:
$$\text{Task} \longrightarrow \text{Action Intent} \longrightarrow \text{Attempt / Job} \longrightarrow \text{Authoritative Hermes Session ID}$$
This correlation is persisted durably in SQLite (`execution_intents` and `execution_receipts`), indexed by `intent_id` and `hermes_session_id`.

### 4.2 Terminal Event Idempotency
- Duplicate terminal events (`goal.failed` / `goal.completed`) during polling cycles are prevented via `PersistentIdempotencyStore`.
- The deduplication key is composed deterministically:
  $$\text{Key} = \text{"goal-terminal-" } + \text{goal\_id}$$
  $$\text{Hash} = \text{SHA256}(\text{payload})$$
- Subsequent polls of an already terminal goal produce cached results and **ZERO** new terminal events.

---

## 5. Skill Registry & Profile References Contract

### 5.1 Skill Registry Authority
- Sagara's `SkillRegistry` located in `core/registry/skill.py` is the single source of truth for declared skills.
- The adapter consumes managed skill definitions without ad-hoc filesystem globbing.

### 5.2 Remediated Invariants
- Invalid legacy declarations (`lead-status-check` and `cross-platform-session-coordinator`) have been remediated:
  - Stale references removed from active profile definitions.
  - Total unresolved skill references: **0**.
  - `SkillRegistry.load()` execution status: **HEALTHY**.

---

## 6. Routing Reconciliation & Authority

### 6.1 Unified Routing Projection
The backend `RoutingAdapter` exposes a single authoritative `RoutingProjection` covering all 19 effective communication channels:

| Context | Platform | Profile | Mention Required | Status | Policy / Action |
|---|---|---|---|---|---|
| `ops-general` | Discord | `lead` | Yes | ALIGNED | Standard ops channel |
| `ops-personal` | Discord | `personal` | Yes | ALIGNED | Personal workflows |
| `ops-business` | Discord | `business` | Yes | ALIGNED | Business workflows |
| `ops-marketing` | Discord | `marketing` | Yes | ALIGNED | Marketing workflows |
| `ops-cs` | Discord | `cs` | Yes | ALIGNED | Support workflows |
| `ops-it-coding` | Discord | `it-coding` | Yes | ALIGNED | Coding workflows |
| `ops-lab` | Discord | `sagara-lab` | Yes | ALIGNED | Lab sandbox workflows |
| `ops-it-support` | Discord | `it-support` | Yes | **POLICY_DECISION_REQUIRED** | Routed in Discord, but DISABLED in MC execution |
| `command-home` | Discord | `lead` | No | DRIFT | Monitored route |
| `status` | Discord | `lead` | No | DRIFT | Monitored status broadcast |
| `alerts` | Discord | `lead` | No | DRIFT | Alert feed |
| `content` | Discord | `marketing` | No | DRIFT | Marketing content staging |
| `posting` | Discord | `marketing` | No | DRIFT | Scheduled publications |
| `system` | Discord | `lead` | No | DRIFT | Infrastructure notifications |
| `telegram-personal` | Telegram | `personal` | No | ALIGNED | Telegram direct bridge |
| `telegram-business` | Telegram | `business` | No | ALIGNED | Telegram business bridge |
| `telegram-lead` | Telegram | `lead` | No | ALIGNED | Telegram lead bridge |
| `whatsapp-cs` | WhatsApp | `cs` | No | ALIGNED | WhatsApp CS bridge |
| `whatsapp-business` | WhatsApp | `business` | No | ALIGNED | WhatsApp business bridge |

### 6.2 `ops-it-support` Route Reconciliation Policy
Context `ops-it-support` is explicitly flagged as `POLICY_DECISION_REQUIRED`. While the Discord route routes inbound traffic to `it-support`, Mission Control execution remains locked down. Two valid long-term resolution pathways exist:
1. Add `ops-it-support` to formal execution policy when `it-support` profile is activated.
2. Remove the route from runtime Discord matrix if automated handling is undesired.

---

## 7. Session Observability Semantics

To eliminate ambiguity between central gateway and individual profile databases, session metrics are split into three explicit contracts:
1. `central_store_sessions`: Total sessions recorded in central gateway database (`/home/ubuntu/.hermes/hermes.db`).
2. `profile_local_sessions`: Count of sessions stored across isolated profile databases (`~/.hermes/profiles/<profile_id>/state.db`).
3. `aggregate_distinct_sessions`: True global deduplicated count of unique `session_id` UUIDs across all stores.

The ambiguous field `global_sessions` is deprecated and forbidden.

---

## 8. Frozen Error Codes Contract

All adapters and services emit only frozen error codes from `AdapterErrorCode`:

| Error Code | HTTP Status | Description |
|---|---|---|
| `PROFILE_NOT_FOUND` | 404 | Requested profile does not exist in registry. |
| `PROFILE_NOT_TARGETABLE` | 422 | Profile directory not installed in Hermes profiles path. |
| `SKILL_REGISTRY_INVALID` | 500 | Skill registry structure or dependency failed validation. |
| `HERMES_UNAVAILABLE` | 503 | Hermes binary missing or subprocess launch failed. |
| `HERMES_TIMEOUT` | 504 | Hermes CLI timed out; outcome unknown. |
| `HERMES_EXECUTION_FAILED` | 502 | Hermes process exited with non-zero status without session receipt. |
| `HERMES_SESSION_RECEIPT_MISSING` | 502 | Hermes exited 0 but emitted no valid session receipt. |
| `ROUTING_DRIFT` | 409 | Configured routing does not match live gateway routing. |
| `AUDIT_UNAVAILABLE` | 500 | Audit logging repository or write stream unavailable. |

---

## 9. Conceptual Adapter Catalog

The backend implements the following clean adapter contracts:
1. `ProfileRegistryAdapter`: Read-only projection of Sagara profiles.
2. `SkillRegistryAdapter`: Canonical skill loader with error normalization.
3. `RoutingAdapter`: Single projection of 19 channel routes with drift status.
4. `CapabilityManifestAdapter`: Normalized profile security and capability flags.
5. `HermesExecutionAdapter`: Safe subprocess dispatcher with CLI receipt extraction.
6. `HermesSessionAdapter`: Reads direct profile session databases.
7. `GatewayHealthAdapter`: Health and process state of `hermes-gateway.service`.
8. `AuditAdapter`: Durable append-only security and intent logging.
