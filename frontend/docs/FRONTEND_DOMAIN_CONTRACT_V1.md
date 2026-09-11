# SAGARA MISSION CONTROL — FRONTEND DOMAIN CONTRACT V1

**Contract Version**: `SAGARA_MISSION_CONTROL_API_CONTRACT_V1`  
**Status**: `FROZEN FOR BACKEND IMPLEMENTATION`  
**Scope**: Frontend Type System (`src/types/`), Data Transfer Objects (`src/api/dto/`), Mappers (`src/api/mappers/`), and UI-only Projections.

---

## 1. Architecture: The Three Type Tiers

To maintain complete decoupling between backend implementation and presentation components, Mission Control establishes three distinct type tiers:

```text
┌────────────────────────────────────────────────────────┐
│ 1. API DTO Tier (src/api/dto/)                         │
│    - snake_case JSON schemas matching backend payloads │
│    - Nullable fields representing unknown metrics      │
│    - Strict API wire contracts                         │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼ (src/api/mappers/)
┌────────────────────────────────────────────────────────┐
│ 2. Canonical Domain Tier (src/types/)                  │
│    - camelCase TypeScript models                       │
│    - UNKNOWN != ZERO preserved                         │
│    - Normalized enums with forward-compatibility       │
│    - Clean separation of concerns                      │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ 3. Presentation / UI-Only Projections                  │
│    - Virtual office coordinates & path layouts         │
│    - Drawer selection & navigation state               │
│    - Visual filters, active tabs, theme preferences    │
└────────────────────────────────────────────────────────┘
```

Presentation components MUST ONLY consume Domain models and UI-only projections. They MUST NEVER import or directly reference `*Dto` objects.

---

## 2. Domain Projections vs. UI-Only Projections

### Tier 2: Canonical Domain Projections
These models represent verified operational state derived from Sagara & Hermes via the API:

| Domain Interface | Responsibility | API DTO Source |
| :--- | :--- | :--- |
| `ProfileDefinition` | Canonical agent configuration manifest | `ProfileDto` |
| `AgentProjection` | Agent runtime status, health, capabilities | `AgentDto` |
| `SkillProjection` | Multi-dimensional skill status (4 dimensions) | `SkillDto` |
| `TaskProjection` | Mission task lifecycle and progress | `TaskDto` |
| `ApprovalProjection` | Human-in-the-loop authorization gate | `ApprovalDto` |
| `SessionProjection` | Execution context and message stream | `SessionDto` |
| `DelegationProjection`| Async subtask worker pipeline | `DelegationDto` |
| `ActivityProjection` | System telemetry activity event | `ActivityDto` |
| `AuditRecord` | Immutable compliance ledger entry | `AuditRecordDto` |
| `GovernanceSnapshot` | Budget limits, token attribution, alerts | `GovernanceSnapshotDto`|
| `ArtifactProjection` | Task output files, diagrams, assets | `ArtifactDto` |
| `MissionControlSnapshot`| Command Center overview & attention feed | `MissionControlSnapshotDto`|

### Tier 3: UI-Only Projections
These interfaces exist solely within the React view layer and MUST NOT be sent to or required from backend endpoints:

| UI-Only Type | Location | Purpose |
| :--- | :--- | :--- |
| `OfficeZone` | `src/types/office.ts` | 2.5D Isometric zone definition (War Room, Ops, etc.) |
| `OfficeDeskPlacement`| `src/types/office.ts` | Pixel/isometric tile placement for agent desks |
| `OfficeWorkerPosition`| `src/types/office.ts`| Pathfinding interpolation coordinates (x, y, heading) |
| `AgentViewMode` | `src/features/agents/` | Grid vs List view toggle |
| `SidebarState` | `src/components/layout/`| Collapsed/expanded navigation state |
| `ThemePreference` | `src/app/theme-provider`| `'dark' \| 'light' \| 'system'` |
| `DrawerState` | `src/stores/` | URL query-linked detail panel selection |
| `KanbanColumnId` | `src/features/tasks/` | Presentation grouping for task board |

---

## 3. Normalized Common Enums

### 3.1. Confidence (`RuntimeConfidence`)
```ts
export type RuntimeConfidence =
  | 'CONFIRMED'  // Verified by direct runtime telemetry (socket/pid)
  | 'INFERRED'   // Derived from downstream events or heuristics
  | 'UNKNOWN'    // Insufficient evidence available
  | 'STALE';     // Telemetry timestamp exceeded heartbeat threshold
```

### 3.2. Generic Health (`GenericHealth`)
```ts
export type GenericHealth =
  | 'HEALTHY'
  | 'DEGRADED'
  | 'ERROR'
  | 'OFFLINE'
  | 'UNKNOWN'
  | 'NOT_CONNECTED';
```

### 3.3. Agent Operational States (`AgentState`)
```ts
export type AgentState =
  | 'ACTIVE'                  // Currently processing or executing a session
  | 'IDLE'                    // Ready for assignment, no active sessions
  | 'RECENTLY_ACTIVE'         // Inactive for < 5m, hot in memory
  | 'AWAITING_APPROVAL'       // Blocked on pending human approval gate
  | 'DEGRADED'                // Operational but one or more critical skills failing
  | 'ERROR'                   // Fatal runtime crash or unrecoverable error
  | 'OFFLINE'                 // Daemon uncontactable or profile disabled
  | 'UNKNOWN'                 // Status unconfirmed by gateway
  | 'CONFIGURATION_INCOMPLETE';// Missing mandatory credentials or dependencies
```

### 3.4. Four Independent Skill Dimensions
The contract strictly forbids collapsing these four independent aspects into a single status enum:
1. **Registration**: `'REGISTERED' | 'UNREGISTERED'`
2. **Installation**: `'INSTALLED' | 'MISSING' | 'UNKNOWN'`
3. **Health**: `'HEALTHY' | 'DEGRADED' | 'MISSING' | 'UNKNOWN'`
4. **Execution Evidence**: `'NOT_OBSERVED' | 'REQUESTED' | 'EXECUTION_UNKNOWN' | 'OBSERVED_ACTIVE' | 'COMPLETED' | 'FAILED'`

### 3.5. Task States (`TaskState`)
```ts
export type TaskState =
  | 'DRAFT'
  | 'READY'
  | 'QUEUED'
  | 'DISPATCHING'
  | 'RUNNING'
  | 'AWAITING_APPROVAL'
  | 'BLOCKED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';
```
*(Note: Kanban columns like "TODO" and "IN_PROGRESS" are purely presentation groupings and are NOT canonical task states).*

### 3.6. Approval States & Risk
* **States**: `'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'CANCELLED' | 'FAILED'`
* **Risk Levels**: `'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'`

---

## 4. Mapper Guarantees & Forward Compatibility

1. **Unknown Enum Fallback**:
   * If a future backend release introduces an unexpected enum value, mappers fallback to `'UNKNOWN'` (or domain equivalent) via `mapUnknownEnum()`, preventing UI crashes.
2. **Preservation of Null vs Zero**:
   * The mapper helper `preserveNumber()` guarantees that `null` or `undefined` (indicating missing telemetry) is NEVER coerced to `0`. Numeric `0` is strictly preserved only when confirmed by the runtime.
3. **Pessimistic Mutations**:
   * Mutations in approval decisions and task dispatches trigger pessimistic UI states with loading spinners and rollback guards, avoiding optimistic phantom state drift.
