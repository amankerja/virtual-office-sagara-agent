# SAGARA MISSION CONTROL — API CONTRACT V1

**Contract Version**: `SAGARA_MISSION_CONTROL_API_CONTRACT_V1`  
**Status**: `FROZEN FOR BACKEND IMPLEMENTATION`  
**Target Backend**: FastAPI (Python 3.12+)  
**Protocol**: REST / JSON / HTTP 1.1 + HTTP/2  

---

## 1. Ownership Model & Boundaries

Mission Control strictly separates configuration, runtime orchestration, business governance, and presentation:

```text
Sagara Project
    │
    ├─ ProfileRegistry (Canonical YAML profiles & skills)
    ├─ SkillRegistry (Capabilities & discovery manifests)
    ├─ ProfileRouter (Autonomous agent prompt assembly)
    └─ Business Policy (Governance limits, approval thresholds)
            │
            ▼
    Mission Control Backend (FastAPI Adapter Layer)
            │
            ├─ Sagara Registry Adapters (Read-only manifests)
            ├─ Hermes Runtime Adapters (State DB & socket telemetry)
            ├─ Mission Control Task Store (Tasks, progress, timelines)
            ├─ Approvals Engine (Pessimistic gate decisions)
            ├─ Audit Ledger (Immutable append-only trail)
            └─ Artifact Store (Media & output descriptors)
            │
            ▼
    Frontend API (/api/v1/*)
            │
            ▼
    Frontend Presentation (Vite + React 19 + TanStack Query)
```

### Hard Architectural Boundaries
1. **Frontend Ignorance**: The frontend MUST NOT know SQLite table schemas, file paths to profile YAMLs, Hermes internal filesystem layouts, systemd process hierarchy, or SQLite query syntax. All backend representations must pass through normalized DTO adapters.
2. **Immutable Audit**: The audit log is append-only and strictly read-only from the Mission Control UI (`DELETE` and `PATCH` are prohibited).
3. **No Direct VPS/Hermes Access**: The browser client talks only to the Mission Control Backend at `/api/v1/*`.

---

## 2. Naming Conventions

* **Backend JSON Payloads**: Strict `snake_case` (e.g. `last_activity_at`, `assigned_agent_id`, `memory_namespace`).
* **HTTP Query Parameters**: Strict `snake_case` (e.g. `?agent_id=`, `?task_id=`, `?correlation_id=`, `?next_cursor=`).
* **HTTP Headers**: Canonical hyphenated casing (e.g. `Idempotency-Key`, `If-Match`, `ETag`, `X-Correlation-ID`).
* **Frontend Domain Types**: Canonical TypeScript `camelCase` (e.g. `lastActivityAt`, `assignedAgentId`, `memoryNamespace`).
* **Enums**: Strict uppercase screaming snake case (e.g. `CONFIRMED`, `AWAITING_APPROVAL`, `EXECUTION_UNKNOWN`).

---

## 3. Timestamps & Time Representation

* **Time Standard**: All timestamps emitted by the backend MUST be formatted as **ISO 8601 UTC** with the `Z` suffix.
  * Example: `2026-09-09T05:23:41Z`
* **Localization**: The backend MUST NEVER format timestamps with local server timezones or localized human strings (e.g. `"2 hours ago"`). Formatting and localization are strictly presentation concerns handled in the frontend.

---

## 4. Null vs. Unknown Semantics (`UNKNOWN ≠ ZERO`)

A critical invariant across all telemetry and governance metrics:
```text
UNKNOWN ≠ ZERO
```

* If a metric has not been observed, is uncalculated, or is not yet supported by runtime evidence:
  * In JSON: return `null` or omit the optional key.
  * In Frontend Domain: mapped to `undefined` (or `null`).
* The backend MUST NEVER return `0` as a default substitute for unknown telemetry.
* A numeric `0` strictly means: **verified, confirmed zero** (e.g. 0 tokens consumed, 0 errors encountered).

---

## 5. Identifiers Policy

* All identifiers (`id`, `profile_id`, `task_id`, `session_id`, `approval_id`, `delegation_id`, `skill_id`, `audit_id`, `artifact_id`) are **opaque strings**.
* The frontend MUST NEVER parse business meaning or semantics from ID strings (e.g. splitting prefixes `tsk-` or assuming integer sorting).
* Identifiers are URL-safe strings.

---

## 6. Pagination Contract

For collections that grow indefinitely (activity, audit, sessions, delegations, tasks), cursor-based pagination is the standard:

```json
{
  "items": [...],
  "page_info": {
    "next_cursor": "eyJpZCI6ICJhdWRpdC05OSJ9",
    "has_more": true,
    "total_count": 1420
  }
}
```

* `next_cursor`: Opaque token representing the position of the next batch. When `has_more` is `false`, `next_cursor` is `null` or omitted.
* Tiny static configuration catalogs (such as `/api/v1/profiles`) return direct JSON arrays and do not require cursor pagination.

---

## 7. Canonical Error Envelope

Every HTTP error response (4xx and 5xx) must return the canonical error envelope:

```json
{
  "error": {
    "code": "APPROVAL_ALREADY_RESOLVED",
    "message": "This approval gate has already been resolved by another operator.",
    "correlation_id": "corr-20260909-001a",
    "details": {
      "previous_decision": "APPROVED",
      "decided_at": "2026-09-09T05:21:00Z"
    }
  }
}
```

* **No Leaking Stacks**: The backend MUST NEVER expose Python tracebacks, raw SQL error messages, or internal server paths in `message` or `details`.
* `correlation_id`: Used to trace requests across activity streams, audit records, and server logs.

---

## 8. Concurrency & Optimistic Locking

To prevent race conditions and dirty overwrites:
1. **ETag & If-Match**:
   * Sensitive resources (`Task`, `Approval`) return an `ETag` HTTP header on read (e.g. `ETag: "v3"`).
   * Mutation requests (`PATCH /api/v1/tasks/{id}`, `POST /api/v1/approvals/{id}/approve`) must send `If-Match: "v3"`.
   * If the resource has been modified concurrently, the server must respond with `409 Conflict` and error code `CONCURRENCY_CONFLICT`.
2. **Deterministic Version Codes**:
   * Approval Race Error Codes:
     * `APPROVAL_ALREADY_RESOLVED`
     * `APPROVAL_EXPIRED`
     * `APPROVAL_CANCELLED`
     * `APPROVAL_CONFLICT`
   * Task Dispatch Race Error Codes:
     * `TASK_NOT_READY`
     * `TASK_ALREADY_DISPATCHED`
     * `TASK_AGENT_UNAVAILABLE`
     * `TASK_CAPABILITY_MISMATCH`
     * `TASK_CONFLICT`

---

## 9. Idempotency Requirement

For side-effecting mutations (task creation, task dispatch, approval authorization):
* Clients provide the `Idempotency-Key: <UUIDv4>` HTTP header.
* If a duplicate request with the identical key is received within a 24-hour deduplication window:
  * The server MUST return the cached previous response without re-executing the operation or creating duplicate tasks/approvals.

---

## 10. Direct Typed Resource Envelope

In accordance with Section 20, successful read responses MUST NOT be wrapped in redundant `{ "success": true, "data": ... }` envelopes.
* Singular resources return the resource object directly: `GET /api/v1/agents/agent-alpha` -> `{ "id": "agent-alpha", ... }`.
* Lists return the resource array or cursor PageResult directly.

---

## 11. Sensitive Data Redaction Contract

* When sensitive credentials, keys, or private variables are scrubbed by the backend:
  * The backend returns structured redaction: `{ "redacted": true, "field_name": "API_KEY" }` or explicit marker.
  * The frontend MUST NOT infer redaction by searching strings for `*****` or `••••••••`.

---

## 12. Capability Flags

The backend emits runtime feature capabilities at `/api/v1/mission-control/snapshot`:
```json
{
  "capabilities": {
    "task_dispatch": true,
    "approvals": true,
    "realtime": false,
    "artifact_downloads": true,
    "profile_management": false,
    "skill_management": false
  }
}
```
The frontend uses these flags to disable actions that the active backend cannot support.

---

## 13. Contract Freeze & Change Governance

### Freeze Declaration
This contract is hereby frozen as **`SAGARA_MISSION_CONTROL_API_CONTRACT_V1`**. No frontend feature or refactoring may alter these canonical contracts arbitrarily.

### Modification Protocol
Any proposed future modification to this contract must produce an RFC documenting:
1. **Contract Change**: Exact diff of DTO or domain structure.
2. **Reason**: Operational or architectural necessity.
3. **Backward Compatibility**: Impact on existing clients and mock providers.
4. **Frontend Impact**: Required component or hook changes.
5. **Backend Impact**: FastAPI schema and adapter migrations.
6. **Migration Path**: Deprecation timeline and migration steps.
