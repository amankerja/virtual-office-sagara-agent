# Sagara Mission Control: Implementation-Ready Architectural Specification & Engineering Master Plan

**Document Version:** 1.2.0-RUNTIME-ALIGNED  
**Previous Version:** 1.1.0-PROD-PLAN  
**Base Specification:** `PRD V3 — Sagara Mission Control: Interactive Agent Operations Dashboard`  
**Sagara Project Authority:** `~/sagara-agent` (Profiles, Skills, Policies, Routing, Tasks)  
**Underlying Runtime:** Hermes Agent by Nous Research (`~/.hermes`, Central Gateway Multiplex Topology)  
**Target Environment:** Python FastAPI Operations Backend (`mission_control/`) + React 19 / Vite / Tailwind CSS v4 Frontend  
**Status:** Architecture Locked, Runtime-Aligned & Implementation Ready

---

# 1. PRODUCT UNDERSTANDING & REVISED SOURCE-OF-TRUTH MODEL

### 1.1 What Sagara Mission Control Is
Sagara Mission Control is a **visual business operations layer and orchestration cockpit** deployed on top of Sagara Agent and the Hermes Agent runtime. It translates raw autonomous agent execution, messaging streams, and runtime sessions into observable business workflows, governed tasks, human-in-the-loop decision checkpoints, and financial/operational health telemetry.

Mission Control **does not recreate Sagara** and **does not replace Hermes**. It operationally exposes Sagara to human operators.

---

### 1.2 The Precise Dual-Authority Architecture

```
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           SAGARA MISSION CONTROL                                  │
│             (Human Cockpit, Read Projections, Governed Orchestration)             │
│   • Command Center & Incident Queue         • 2.5D Isometric Virtual Office       │
│   • Governed Task Lifecycle & Kanban        • Read-Only Catalog & Telemetry Views │
│   • Human RBAC & Pessimistic Approvals      • Immutable Business Audit Trail      │
└───────────────────────────┬───────────────────────────────────┬───────────────────┘
                            │                                   │
                Consumes Business Registry            Observes Execution & Telemetry
                            │                                   │
┌───────────────────────────▼───────────────────────┐ ┌─────────▼───────────────────┐
│             SAGARA PROJECT CONTRACTS              │ │        HERMES AGENT RUNTIME         │
│           (Project Root: ~/sagara-agent)          │ │       (Runtime Root: ~/.hermes)     │
│                                                   │ │                                     │
│  AUTHORITY FOR:                                   │ │  AUTHORITY FOR:                     │
│  • Persistent profile definitions                 │ │  • Sessions & conversation threads  │
│  • Profile business roles & enablement            │ │  • Canonical messages & FTS5 index  │
│  • Allowed skills & skill-to-profile policy       │ │  • Model execution & context loops  │
│  • Profile memory namespaces                      │ │  • Token consumption & USD cost    │
│  • Channel routing metadata & profile routing     │ │  • Gateway heartbeat & channel state│
│  • Managed skill registry & skill sync            │ │  • Tool execution & sandbox         │
│  • Business permissions & delivery policies       │ │  • Asynchronous delegations         │
│  • Task definitions, priorities & Kanban state    │ │  • Subagent execution processes     │
│                                                   │ │  • Runtime permission lifecycles    │
│  EXISTING AUTHORITATIVE COMPONENTS:               │ │                                     │
│  • core/registry/profile.py (ProfileRegistry)     │ │  PRIMARY RUNTIME DATA SOURCES:      │
│  • core/registry/skill.py (SkillRegistry)         │ │  • ~/.hermes/state.db (SQLite WAL)  │
│  • core/routing/profile.py (ProfileRouter)        │ │  • ~/.hermes/config.yaml            │
│  • core/runtime/skill_sync.py (SkillSync)         │ │  • hermes-gateway.service (PID)     │
│  • config/skills.yaml                             │ │  • Hermes MCP interfaces (stdio)    │
│  • deploy/hermes-skills.json                      │ │                                     │
│  • deploy/hermes-runtime-lock.json                │ │                                     │
└───────────────────────────────────────────────────┘ └─────────────────────────────────────┘
```

### 1.3 What Must Explicitly NOT Be Rebuilt
1. **No Replacement Profile Registry:** Mission Control will not maintain an independent database of agent profile definitions. It consumes `ProfileRegistry.load(...)`.
2. **No Parallel Skill Registry or Marketplace:** Sagara's `SkillRegistry` and `SkillSync` remain authoritative for managed skills. Mission Control reads them via catalog adapters.
3. **No New LLM Runtime / Tool Loop:** Sagara will never evaluate system prompts, manage prompt caches, or run LLM completions directly.
4. **No Secondary Cron Scheduler:** Sagara will not run a competing quartz/cron scheduler; it queries and monitors Hermes' native cron.
5. **No Messaging Gateway Engine:** The existing central `hermes-gateway.service` multiplexing daemon is the sole gateway authority.
6. **No Arbitrary Shell Bridge:** Sagara will not expose any raw `POST /api/shell` endpoint.

---

# 2. ARCHITECTURE DECISIONS (ADR SUMMARY)

| Decision | Recommended Choice | Rationale | Alternatives Evaluated | Risks & Mitigation |
|---|---|---|---|---|
| **ADR-001: Deployment Shell** | **Standalone React 19 SPA + Dedicated FastAPI Operations Middleware (`mission_control/`)** | Provides complete UI isolation, custom branding, enterprise multi-user RBAC, WebSocket multiplexing, and clean boundary separation without risking breakage on core Hermes upgrades. | Hermes Dashboard Plugin / Extension | *Risk:* Two services to run. *Mitigation:* Single Docker Compose or systemd target orchestrating both. |
| **ADR-002: Sagara Database** | **SQLite (WAL Mode) with Prisma / SQLAlchemy ORM** | Zero-latency local reads, local single-host parity with Hermes (`state.db`), transactional integrity for Kanban, zero cloud database egress cost. Can migrate to PostgreSQL via ORM if multi-node is required later. | PostgreSQL / Supabase Cloud | *Risk:* Database locking during high concurrent writes. *Mitigation:* SQLite WAL mode with 5000ms busy timeout and single-writer queue. |
| **ADR-003: Hermes & Sagara Integration Layer** | **Read-Only SQLite (`state.db`) + Sagara Registry Imports + Hermes MCP JSON-RPC + Service Control CLI** | Direct read-only query on `~/.hermes/state.db` provides sub-millisecond session history and FTS5 search. `ProfileRegistry` and `SkillRegistry` provide business truth. MCP provides native `events_wait`, `messages_send`, and `permissions_respond`. | Pure REST Polling or Pure MCP stdio | *Risk:* Schema drift on Hermes core update. *Mitigation:* Read-only connection, strict schema probe at boot, graceful field fallbacks. |
| **ADR-004: Realtime Architecture** | **REST Initial Snapshot (`GET /snapshot`) + Native WebSocket Delta Stream** | Guaranteed consistency. Clients fetch a unified snapshot, then apply strictly sequenced delta packets (`event_id`, `sequence`). If socket breaks, fallback to snapshot resync. | Server-Sent Events (SSE) or HTTP Long Polling | *Risk:* Client state desynchronization on missed packets. *Mitigation:* Client sequence gap detector forces silent snapshot revalidation. |
| **ADR-005: Authentication & Session** | **HttpOnly, Secure, SameSite=Strict Session Cookies via JWT/Session Store** | Prevents XSS token theft. No raw tokens stored in `localStorage` or `sessionStorage`. Simple token exchange for WebSocket handshakes. | Bearer Tokens in LocalStorage | *Risk:* CSRF vulnerability. *Mitigation:* Double-submit CSRF cookie token on all mutating REST endpoints. |
| **ADR-006: RBAC & Governance** | **Granular Backend Capability Matrix (Owner, Operator, Approver, Viewer)** | Ensures actions like `task:dispatch`, `gateway:restart`, and `approval:respond` are strictly gated on backend API endpoints. | Flat Admin/User binary | *Risk:* Privilege leakage. *Mitigation:* Route-level middleware dependencies verifying permission claims. |
| **ADR-007: Task-to-Session Correlation** | **Deterministic Metadata Tagging (`sagara_task_id:<uuid>`) injected into Hermes Dispatches** | Correlates Sagara task entities to Hermes session IDs, task runs, and tool outputs even when executed across disconnected processes. | Parsing free-form chat messages | *Risk:* Session loss if agent restarts mid-loop. *Mitigation:* Sagara stores bidirectional mappings in `task_runs` table with PID tracking. |
| **ADR-008: Artifact Storage Convention** | **Deterministic Filesystem Vault (`/var/sagara/artifacts/<task_id>/`) with Hash Registry** | File system storage prevents bloating SQLite database. Sagara registers metadata, MIME type, size, and SHA256 checksums in the DB. | Direct DB BLOB storage | *Risk:* Disk space exhaustion. *Mitigation:* Disk quota policies and automatic cleanup rules for ephemeral scratch files. |
| **ADR-009: Agent State Inference** | **Explicit Dual-State Engine: Confirmed vs. Inferred State** | Prevents false UI claims (e.g., displaying "Active" just because a message arrived). State is confirmed only via active process heartbeat or tool-loop event. | Pure event heuristic | *Risk:* Operator confusion over latency. *Mitigation:* UI clearly displays confidence tag (`Confirmed` vs `Inferred`) and elapsed freshness. |
| **ADR-010: Virtual Office Rendering** | **2.5D Isometric SVG/HTML5 Canvas with State Data Binding** | Lightweight, zero-dependency 3D overhead, accessible DOM tree, rapid rendering, mobile responsive, upgradeable to Three.js in V2 without touching state engine. | Three.js / React Three Fiber in V1 | *Risk:* Visual aesthetics feeling flat. *Mitigation:* Pixel-perfect isometric asset pipeline, smooth SVG transforms, and rich micro-animations. |
| **ADR-011: Skills Subsystem Architecture** | **Catalog Adapter over `SkillRegistry` + `config/skills.yaml`** | Consumes Sagara's existing managed skill contracts instead of doing raw filesystem scraping. Maps effective installed and healthy skills to profile capabilities. | Generic directory recursive crawler | *Risk:* Inconsistent runtime sync. *Mitigation:* Observes `deploy/hermes-skills.json` and `SkillSync` health directly. |

---

# 3. SYSTEM ARCHITECTURE

```
                                  BROWSER CLIENT
   ┌────────────────────────────────────────────────────────────────────────┐
   │ React 19 SPA (Vite + Tailwind v4 + TanStack Query + Zustand UI Store)  │
   │                                                                        │
   │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
   │  │  Command Center  │  │  Tasks & Kanban  │  │  2.5D Virtual Office │  │
   │  └────────┬─────────┘  └────────┬─────────┘  └──────────┬───────────┘  │
   │           │                     │                       │              │
   │  ┌────────▼─────────────────────▼───────────────────────▼───────────┐  │
   │  │   Realtime Client Store & Deduplication Engine (Sequence Gap)    │  │
   │  └───────────────────▲─────────────────────────────▲────────────────┘  │
   └──────────────────────┼─────────────────────────────┼───────────────────┘
                          │ REST (Snapshot / Mutations) │ WebSocket (Deltas)
                          │                             │
   ┌──────────────────────▼─────────────────────────────▼───────────────────┐
   │                   SAGARA CONTROL & OPERATIONS API                      │
   │                     (FastAPI Package: mission_control/)                │
   │                                                                        │
   │ ┌────────────────────────────────────────────────────────────────────┐ │
   │ │ Security & Auth: JWT / Secure Cookie / RBAC Middleware / Audit Log │ │
   │ └────────────────────────────────────────────────────────────────────┘ │
   │ ┌───────────────────┐  ┌────────────────────┐  ┌───────────────────┐   │
   │ │   Task Engine     │  │  Approval Adapter  │  │ Cost & Governance │   │
   │ │ (Kanban/Dispatch) │  │(Pessimistic Bridge)│  │ (Budget Enforcer) │   │
   │ └─────────┬─────────┘  └─────────┬──────────┘  └─────────┬─────────┘   │
   │           │                      │                       │             │
   │ ┌─────────▼──────────────────────▼───────────────────────▼─────────┐   │
   │ │            Event Normalizer & Sequence Engine (Envelope)         │   │
   │ └────────────────────────────────┬─────────────────────────────────┘   │
   │                                  │                                     │
   │         ┌────────────────────────┴────────────────────────┐            │
   │         ▼                                                 ▼            │
   │ ┌───────────────┐                             ┌──────────────────────┐ │
   │ │ Sagara DB     │                             │  Service & Gateway   │ │
   │ │ (SQLite WAL)  │                             │  Adapter (systemd)   │ │
   │ │ tasks, audit, │                             │  hermes-gateway.svc  │ │
   │ │ artifacts     │                             └──────────────────────┘ │
   │ └───────────────┘                                                      │
   │                                                                        │
   │ ┌────────────────────────────────────────────────────────────────────┐ │
   │ │                    READ MODEL INTEGRATION ADAPTERS                 │ │
   │ │ ┌───────────────────────────┐ ┌──────────────────────────────────┐ │ │
   │ │ │   ProfileCatalogAdapter   │ │        SkillCatalogAdapter       │ │ │
   │ │ │ (core.registry.profile)   │ │     (core.registry.skill)        │ │ │
   │ │ └─────────────┬─────────────┘ └─────────────────┬────────────────┘ │ │
   │ │               │                                 │                  │ │
   │ │               ▼                                 ▼                  │ │
   │ │ ┌────────────────────────────────────────────────────────────────┐ │ │
   │ │ │                     AgentProjectionService                     │ │ │
   │ │ │          (Produces unified UI-facing AgentProjection)          │ │ │
   │ │ └───────────────────────────────▲────────────────────────────────┘ │ │
   │ │                                 │                                  │ │
   │ │               ┌─────────────────┴────────────────┐                 │ │
   │ │               │       HermesRuntimeAdapter       │                 │ │
   │ │               │  (Read-Only ~/.hermes/state.db)  │                 │ │
   │ │               └─────────────────┬────────────────┘                 │ │
   │ └─────────────────────────────────┼──────────────────────────────────┘ │
   └───────────────────────────────────┼────────────────────────────────────┘
                                       │
                ┌──────────────────────┴──────────────────────┐
                │ stdio / JSON-RPC / SQLite Read-Only         │ Python Import / Config
                ▼                                             ▼
   ┌───────────────────────────────┐             ┌──────────────────────────┐
   │     HERMES RUNTIME ENGINE     │             │      SAGARA PROJECT      │
   │  • central gateway (PID)      │             │  • ProfileRegistry       │
   │  • sessions, messages, costs  │             │  • SkillRegistry         │
   │  • MCP tools & permissions    │             │  • SkillSync & Config    │
   └───────────────────────────────┘             └──────────────────────────┘
```

---

# 4. REVISED AGENT MODEL & PROJECTION SPECIFICATION

### 4.1 De-coupling Profile Definitions from Runtime State
Mission Control strictly distinguishes between what Sagara defines and what Hermes executes:

```
┌──────────────────────────────┐       ┌──────────────────────────────┐
│      ProfileDefinition       │       │     RuntimeProfileState      │
│  (Authority: Sagara Project) │       │ (Authority: Hermes Runtime)  │
│                              │       │                              │
│ • id                         │       │ • profile_name               │
│ • name                       │       │ • active_sessions            │
│ • role                       │   +   │ • latest_session             │
│ • description                │       │ • last_activity_timestamp    │
│ • enabled                    │       │ • current_model              │
│ • memory_namespace           │       │ • token_usage & cost_usd     │
│ • allowed_skills             │       │ • active_delegations         │
│ • specialist_policy          │       │ • gateway_state & heartbeat  │
│ • configuration_health       │       │ • runtime_confidence         │
└──────────────┬───────────────┘       └──────────────┬───────────────┘
               │                                      │
               └───────────────────┬──────────────────┘
                                   │ Joined with Skill Capability Health
                                   ▼
               ┌──────────────────────────────────────┐
               │           AgentProjection            │
               │   (Normalized UI Read Model)         │
               └──────────────────────────────────────┘
```

### 4.2 AgentProjection Schema
```json
{
  "id": "developer",
  "definition": {
    "name": "Sagara Developer",
    "role": "software-engineering",
    "description": "Full-stack web and systems engineering agent",
    "enabled": true,
    "configuration_health": "HEALTHY"
  },
  "capabilities": {
    "health": "HEALTHY",
    "skills": [
      {
        "id": "frontend-design",
        "name": "frontend-design",
        "category": "engineering",
        "status": "HEALTHY"
      },
      {
        "id": "ui-ux-pro-max",
        "name": "ui-ux-pro-max",
        "category": "engineering",
        "status": "HEALTHY"
      }
    ]
  },
  "runtime": {
    "state": "IDLE",
    "confidence": "CONFIRMED",
    "session_count": 4,
    "active_delegations": 0,
    "current_model": "claude-sonnet-5",
    "today_tokens": 48200,
    "today_cost_usd": 0.42,
    "last_seen_at": "2026-09-09T11:45:12Z"
  }
}
```

### 4.3 Profile Content Is NOT a Development Blocker
* **Dynamic Loading:** Mission Control never hardcodes profile IDs in frontend or backend code.
* **Resilience Policy:** If a profile definition is missing fields or incomplete, the UI displays `CONFIGURATION_INCOMPLETE` instead of crashing or inventing metadata.
* **Hot-Add Support:** New profiles added to `ProfileRegistry` appear dynamically in Mission Control without server recompilation or code edits.

---

# 5. REVISED SKILLS ARCHITECTURE & SUBSYSTEM INTEGRATION

### 5.1 No Filesystem Scraping — Contract-Driven Skill Catalog
Filesystem-wide `SKILL.md` counting is prohibited because redundant copies exist across scratch directories and cache roots. Mission Control integrates with the existing Sagara Skill subsystem:
* **Contract Interface:** `SkillRegistry` (`load`, `get`, `exists`, `all`, `ids`, `health`).
* **Source of Truth:** `config/skills.yaml`, `deploy/hermes-skills.json`, and `deploy/hermes-runtime-lock.json`.
* **Synchronization Lifecycle:** Observed through `core.runtime.skill_sync.SkillSync`.

### 5.2 Effective Skill States
```
  [REGISTERED] ──► Defined in config/skills.yaml
       │
       ▼
  [INSTALLED]  ──► Synced to target runtime directory
       │
       ├──────────────────────────────┐
       ▼                              ▼
  [HEALTHY]                      [DEGRADED / MISSING]
  Verified and loadable          Corrupt frontmatter or file unreadable
       │
       ▼ (During Task Dispatch)
  [REQUESTED]  ──► Operator requested capability for task
       │
       ▼ (During Execution)
  [OBSERVED_ACTIVE] ──► CONFIRMED runtime evidence of skill invocation exists
       │
       ├──────────────────────────────┐
       ▼                              ▼
  [COMPLETED]                    [FAILED]
```

#### Observability Anti-Fabrication Rules:
1. **Installed does not mean active.**
2. **Requested does not mean executed.**
3. **Worker process existence does not prove that a specific skill is loaded.**
4. If no explicit runtime evidence exists, display `EXECUTION_UNKNOWN` or `Requested Capability`.

---

# 6. REVISED IMPLEMENTATION PHASES & MILESTONES

```
PHASE 0A: Hermes Runtime Truth       PHASE 0B: Sagara Project Truth
(state.db, gateway, MCP, heartbeat)  (ProfileRegistry, SkillRegistry contracts)
         │                                    │
         ├────────────────────────────────────┘
         │
         ├───────────────────► PHASE 0C: Runtime Integration Spikes (Async/Spawns)
         │                     PHASE 0D: Legacy Path Drift Audit (~/.hermes/profiles)
         ▼
PHASE 1: Mission Control Foundation (FastAPI `mission_control/` + React 19 Shell)
         │
         ▼
PHASE 2: Registry + Runtime Read Adapters (Profile, Skill, Hermes Runtime, Projection)
         │
         ▼
====================================================================================
MILESTONE M1: READ-ONLY MISSION CONTROL (Zero Mutation Release Gate)
• Command Center V0 (Pulse, Profiles, Sessions, Errors, Activity)
• Agent Directory V0 (Projections, Health, Telemetry, Capabilities)
• Proven Read-Only Observation Without Any Production State Modification
====================================================================================
         │
         ▼
PHASE 3: Command Center Full (Attention Queue, Cross-Filtering, Recharts)
         │
         ▼
PHASE 4: Task Engine & Kanban (Sagara Task CRUD, Dispatch Spawner, Skills Intent)
         │
         ▼
PHASE 5: Approval Center Integration (Pessimistic Human-in-Loop MCP Bridge)
         │
         ▼
====================================================================================
CRITICAL VERTICAL SLICE RELEASE GATE (Single Task Dispatch -> Approval -> Complete)
====================================================================================
         │
         ▼
PHASE 6: Realtime Engine (WebSocket Hub, Sequence Envelopes, Resync)
         │
         ▼
PHASE 7: Agent Experience (Capabilities Tab, Subagent Trees, Stdout Streams)
         │
         ▼
PHASE 8: Virtual Office V1 (2.5D Isometric SVG bound to AgentProjection)
         │
         ▼
PHASE 9: Governance, Artifacts, Audit & Skills Registry Page
         │
         ▼
PHASE 10: Production Hardening, Failure Injection & systemd Deployment
```

---

# 7. PHASE SPECIFICATIONS & ACCEPTANCE CRITERIA

### Phase 0 — Runtime & Project Contract Baseline
* **Phase 0A (Hermes Runtime Truth):** Validate `~/.hermes/state.db` schema, `hermes-gateway.service` PID multiplexing, and WAL concurrent reads. *(Status: Substantially Verified)*
* **Phase 0B (Sagara Project Truth):** Validate `core/registry/profile.py`, `core/registry/skill.py`, `config/skills.yaml`, and `deploy/hermes-skills.json`. *(Status: Verified for Read-Only)*
* **Phase 0C (Runtime Integration Spikes):** Experimentally test worker process spawning, `--skills` flag loading, permission response latency, and task correlation. *(Blocks Mutation, does not block M1)*
* **Phase 0D (Legacy Path Drift Audit):** Detect and record obsolete references (e.g. `~/.hermes/profiles/...`) as migration debt.

### Phase 1 — Foundation (Backend Package & Frontend Shell)
* **Backend:** Scaffold `mission_control/` package (`app.py`, `api/`, `schemas/`, `services/`, `tests/`), SQLite database for Sagara tasks/audit, and JWT session cookie auth.
* **Frontend:** Scaffold Vite + React 19 + Tailwind v4 + React Router + TanStack Query. Routes: `/`, `/agents`.
* **Exit Criteria:** Authenticated user can load the empty dashboard shell in $< 150$ms.

### Phase 2 — Sagara Registry + Hermes Runtime Read Integration
* **Backend Work:**
  * Implement `ProfileCatalogAdapter` (reads `ProfileRegistry`).
  * Implement `SkillCatalogAdapter` (reads `SkillRegistry`).
  * Implement `HermesRuntimeAdapter` (read-only queries on `~/.hermes/state.db` tables: `sessions`, `messages`, `session_model_usage`, `gateway_heartbeats`, `gateway_routing`, `async_delegations`).
  * Implement `AgentProjectionService` (merges definitions, skills, and telemetry into `AgentProjection`).
* **Frontend Work:** Build read-only tables and detail viewers for Profiles, Sessions, Channels, and Skill capabilities.
* **Exit Criteria:** `GET /api/v1/agents` produces complete `AgentProjection` objects dynamically without hardcoding profile names.

---

# 8. MILESTONE M1: READ-ONLY MISSION CONTROL SPECIFICATION

Milestone M1 proves that Mission Control can observe the real Sagara/Hermes system without modifying production execution.

### M1 Features & Scope:
1. **Command Center V0:**
   * Gateway health indicator (`hermes-gateway.service` status).
   * Registered profiles count & enabled profiles count.
   * Active / recent session list with token consumption.
   * Runtime error ticker.
   * Skill health status summary.
2. **Agent Directory V0:**
   * Dynamic Agent Cards rendered from `AgentProjection`.
   * Profile description, role, and configuration health.
   * Real-time session count, current model, and cost today.
   * Skill capabilities list with status badges (`HEALTHY`, `DEGRADED`).
   * Active delegation counters.

### M1 Exit Criteria (10 Mandatory Gates):
1. **No Profile IDs Hardcoded:** Zero hardcoded profile lists in frontend or backend code.
2. **Profile Data via ProfileRegistry:** Profile definitions originate exclusively from Sagara's registry.
3. **Skill Data via SkillRegistry:** Skill inventory originates exclusively from Sagara's skill contracts.
4. **Hermes Telemetry via Read-Only DB:** All telemetry queries use `?mode=ro` SQLite connections.
5. **Zero Service Disruption:** `hermes-gateway.service` is never stopped, restarted, or interrupted.
6. **Dynamic Profile Addition:** Adding a profile to Sagara reflects in Mission Control on refresh.
7. **Graceful Degradation:** Incomplete profile definitions render with `CONFIGURATION_INCOMPLETE` without crashing.
8. **No Writes to Hermes DB:** Mission Control writes zero bytes to `~/.hermes/state.db`.
9. **No Direct Skill Management:** Mission Control does not install, delete, or sync skills directly.
10. **Single Source for Office:** Virtual Office pipeline is bound directly to `AgentProjectionService`.

---

# 9. INITIAL READ-ONLY REST API CONTRACT

All endpoints in Milestone M1 are strictly read-only (`GET`):

| Endpoint | Auth Required | Description / Source |
|---|---|---|
| `GET /api/v1/profiles` | `profile:view` | Lists all profiles from Sagara `ProfileRegistry`. |
| `GET /api/v1/profiles/{id}` | `profile:view` | Returns single profile definition and configuration health. |
| `GET /api/v1/skills` | `skill:view` | Returns managed skills from Sagara `SkillRegistry`. |
| `GET /api/v1/skills/{id}` | `skill:view` | Detail of a managed skill, frontmatter metadata, and health. |
| `GET /api/v1/profiles/{id}/skills` | `skill:view` | Allowed and bound skills for a specific profile. |
| `GET /api/v1/agents` | `agent:view` | Returns list of normalized `AgentProjection` objects. |
| `GET /api/v1/agents/{id}` | `agent:view` | Returns single unified `AgentProjection`. |
| `GET /api/v1/runtime/health` | `health:view` | Host telemetry, gateway heartbeat, and SQLite database health. |
| `GET /api/v1/mission-control/snapshot`| Any authenticated | Aggregated snapshot for Command Center V0 rendering. |

---

# 10. VIRTUAL OFFICE ARCHITECTURE UPDATE

Virtual Office does not perform independent discovery. It is an operational presentation layer bound to the same read model:

```
           AgentProjectionService
                     │
                     ▼
           OfficeProjectionAdapter
   (Adds spatial coordinates, desk IDs, zones)
                     │
                     ▼
             2.5D SVG/Canvas
```

* **Permitted Office State:** Pure visual properties (`x`, `y`, `zone_id`, `desk_id`, `avatar_style`, `animation_pref`).
* **Forbidden Office State:** The office **never** independently determines whether an agent is active, whether a skill is loaded, or whether an approval is pending. All operational truths are inherited from `AgentProjection`.

---

# 11. PROFILE FINALIZATION POLICY

* Profile definitions are currently evolving in `~/sagara-agent`.
* Changes to profile names, prompt roles, bound skills, descriptions, or enabled flags are **configuration changes**, not architectural changes.
* Mission Control requires **zero source-code modifications** when profile definitions are updated.
* Only changes to the Python API interface of `ProfileRegistry` itself warrant an adapter review.

---

# 12. MASTER EXECUTION PLAN & ROADMAP (REVISED)

| Workstream ID | Phase | Component / Domain | Pri | Dependency | Deliverable Summary | Verification & Release Gate |
|---|---|---|---|---|---|---|
| **SAG-001** | Phase 0A | Hermes Runtime Truth | P0 | None | Audit `~/.hermes/state.db`, gateway heartbeat, and MCP | Schema verified; read concurrency tested |
| **SAG-002** | Phase 0C | Integration Spikes | P0 | SAG-001 | Spikes for dispatch, skill preload, and delegation tracking | Spike results documented (blocks Phase 4) |
| **SAG-003** | Phase 1 | Backend Core | P0 | SAG-001 | FastAPI package `mission_control/` with SQLite WAL database | Project boots cleanly; ORM migrations ready |
| **SAG-004** | Phase 1 | Auth & RBAC | P0 | SAG-003 | JWT / Session Cookie authentication & role permission middleware | Auth unit tests pass (100% route gating) |
| **SAG-005** | Phase 1 | Frontend Shell | P0 | SAG-004 | Vite + React 19 + Tailwind v4 base layout, header, and router | Client loads in $< 150$ms with active auth state |
| **SAG-025** | Phase 0B | Sagara Skill Contract| P0 | None | Audit `SkillRegistry`, `config/skills.yaml`, `SkillSync` | Contract baseline established; no FS scraping |
| **SAG-026** | Phase 2 | Skill Catalog Adapter| P0 | SAG-025 | Implement read-only adapter over Sagara `SkillRegistry` | Inventory matches Sagara registry 100% |
| **SAG-031** | Phase 2 | Profile Catalog Adptr| P0 | SAG-003 | Implement read-only adapter over Sagara `ProfileRegistry` | Profiles load dynamically without hardcoding |
| **SAG-032** | Phase 2 | Hermes Read Adapter | P0 | SAG-001 | Read-only adapter for `state.db` telemetry & delegations | Session and usage queries execute in $< 10$ms |
| **SAG-033** | Phase 2 | Agent Projection Svc | P0 | SAG-026,031,032| Merge profile, skill health, and telemetry into `AgentProjection` | Command Center & Agent Directory share 1 model |
| **SAG-034** | Milestone M1| Read-Only Release Gate | P0 | SAG-033 | Deliver Command Center V0 and Agent Directory V0 | All 10 M1 Exit Criteria verified and signed off |
| **SAG-035** | Phase 0D | Legacy Path Drift | P1 | None | Audit and log references to `~/.hermes/profiles/...` | Debt logged; Mission Control isolated from legacy |
| **SAG-008** | Phase 3 | Command Center API | P0 | SAG-034 | Snapshot aggregation endpoint for Pulse & Attention Queue | Snapshot payload returns in $< 100$ms |
| **SAG-009** | Phase 3 | Command Center UI | P0 | SAG-008 | Pulse cards, Attention Queue, and interactive cross-filter charts | Passes acceptance tests `AC-CMD-001` to `003` |
| **SAG-010** | Phase 4 | Task Engine API | P0 | SAG-002,034 | Task CRUD, state machine, and background CLI spawner | Task state machine passes all permutation tests |
| **SAG-011** | Phase 4 | Kanban Board UI | P0 | SAG-010 | 4-column drag-and-drop board with safe assignment semantics | Passes acceptance tests `AC-TASK-001` to `005` |
| **SAG-027** | Phase 4 | Task Skill Intent | P1 | SAG-010,026 | Add `requested_skills[]` and capability validation to Task CRUD | Skill intent persists across task lifecycle |
| **SAG-012** | Phase 5 | Approval Adapter | P0 | SAG-010 | Hermes MCP bridge for `permissions_list_open` and `respond` | Permission roundtrip executes in $< 200$ms |
| **SAG-013** | Phase 5 | Approval Center UI | P0 | SAG-012 | Pessimistic approval cards with diff viewer and double-click lock | Passes acceptance tests `AC-APR-001` to `005` |
| **SAG-014** | Gate | Vertical Slice Gate | P0 | SAG-011,013 | End-to-end proof-of-concept workflow execution | Single task dispatches, approves, and finishes |
| **SAG-015** | Phase 6 | WebSocket Hub | P0 | SAG-008 | WebSocket server with monotonic sequence generation and heartbeats | Handles 100 concurrent connections gracefully |
| **SAG-016** | Phase 6 | Client Realtime | P0 | SAG-015 | React WebSocket provider, gap detector, and silent resync | Disconnect test confirms zero lost task updates |
| **SAG-017** | Phase 7 | Agent Directory Full | P0 | SAG-034 | Full directory with stdout streams and subagent trees | Passes acceptance tests `AC-AGT-001` to `004` |
| **SAG-028** | Phase 7 | Capabilities Tab | P1 | SAG-017,026 | Expose Capabilities Tab inside Agent Detail Drawer | Bound skills list matches profile config exactly |
| **SAG-029** | Phase 7 | Skill Telemetry | P1 | SAG-018,026 | Expose skill execution telemetry only if verified by runtime | No false "active skill" states produced |
| **SAG-019** | Phase 8 | Virtual Office V1 | P1 | SAG-033 | 2.5D isometric SVG canvas bound to `AgentProjection` | Office visual state mirrors dashboard 1:1 |
| **SAG-020** | Phase 9 | Artifact Vault | P1 | SAG-010 | Deterministic file storage, SHA256 hashing, and download viewer | Deliverable files downloadable with valid hash |
| **SAG-021** | Phase 9 | Cost & Governance | P1 | SAG-032 | Daily token aggregation charts and soft/hard budget gatekeeper | Budget threshold violation triggers warning alert |
| **SAG-022** | Phase 9 | Audit System | P0 | SAG-004 | Append-only immutable SQLite audit logger for mutating actions | Audit records verifiable with actor, timestamp |
| **SAG-030** | Phase 9 | Skills Registry UI | P1 | SAG-026 | Create searchable `/skills` Registry page with category filters | Operators can inspect all skills and profile bindings |
| **SAG-023** | Phase 10 | Failure Hardening | P0 | All | Simulated gateway crash, network drop, and DB lock tests | System degrades gracefully without blank screens |
| **SAG-024** | Phase 10 | Production Deploy | P0 | SAG-023 | Systemd service files, environment templates, and docs | Full stack boots cleanly on host server |

---

# 13. CURRENT RELEASE GATES STATUS SUMMARY

```
┌────────────────────────────────────────┬──────────────────┬────────────────────────────────────────────────────────┐
│ Release Gate                           │ Current Status   │ Operational Directive                                  │
├────────────────────────────────────────┼──────────────────┼────────────────────────────────────────────────────────┤
│ **1. Runtime Truth Baseline**          │ PARTIAL PASS     │ Hermes runtime, gateway, state DB verified.            │
│                                        │                  │ Spikes for dispatch & async delegation ongoing.        │
├────────────────────────────────────────┼──────────────────┼────────────────────────────────────────────────────────┤
│ **2. Sagara Project Contract Baseline**│ PASS             │ `ProfileRegistry`, `SkillRegistry`, `SkillSync`        │
│                                        │                  │ verified. Ready for Read-Only integration.             │
├────────────────────────────────────────┼──────────────────┼────────────────────────────────────────────────────────┤
│ **3. Profile Content Independence**    │ PASS             │ Dynamic loading locked. Profile changes will not       │
│                                        │                  │ block Phase 1 or Phase 2 development.                  │
├────────────────────────────────────────┼──────────────────┼────────────────────────────────────────────────────────┤
│ **4. Read-Only Milestone M1**          │ PENDING BUILD    │ Target milestone before attempting any task dispatch.  │
├────────────────────────────────────────┼──────────────────┼────────────────────────────────────────────────────────┤
│ **5. Mutation & Execution Features**   │ BLOCKED BY SPIKE │ Task dispatch, approvals, and gateway restart remain   │
│                                        │                  │ gated behind SAG-002 and SAG-014.                      │
└────────────────────────────────────────┴──────────────────┴────────────────────────────────────────────────────────┘
```

---

# FINAL V1.2 PRINCIPLE

> **Mission Control must not recreate Sagara.**  
> **Mission Control must expose Sagara operationally.**  
> **Sagara defines the organization and business policy.**  
> **Hermes executes the work.**  
> **Mission Control joins both into a safe human operational view.**
