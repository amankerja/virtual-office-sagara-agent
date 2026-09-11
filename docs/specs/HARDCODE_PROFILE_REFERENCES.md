# Hardcoded Configuration Audit Report
**Sagara AI / Sagara Mission Control**
**Phase: Prompt 14.1 — Canonical Profile Blueprint + Seeder Architecture**
**Audit Date:** 2026-09-11
**Status:** COMPLETED — Zero Critical Business Logic Hardcodes

---

## 1. Executive Summary

This audit examined the full Mission Control codebase across `frontend/`, `backend/`, configuration files, and historical documents to identify, classify, and isolate all operational hardcodes (profile IDs, channel snowflakes, model identifiers, filesystem paths, workspace keys, and port numbers).

### Classification Taxonomy:
1. **CANONICAL CONFIG**: Canonical specifications and seed declarations.
2. **DEPLOYMENT CONFIG**: Operational routing, infrastructure IDs, and channel mappings.
3. **ENVIRONMENT**: Configurable settings driven by environment variables (`MISSION_CONTROL_*`).
4. **PRESENTATION**: UI display labels, 3D furniture variants, and visual heuristics.
5. **FIXTURES/TESTS**: Synthetic test suites and mock development fixture data.
6. **INVALID HARDCODE**: Hardcoded branching (`if profile_id == 'marketing'`) in core routing, runtime, execution, or authorization.

---

## 2. Hardcode Inventory and Classification Matrix

| File | Line(s) | Value / Expression | Classification | Action | Rationale |
|---|---|---|---|---|---|
| `backend/app/services/*` | — | None | Clean | Keep | All services treat `profile_id` as dynamic string from registries. |
| `backend/app/api/*` | — | None | Clean | Keep | Endpoints route dynamically by URL params and request payloads. |
| `backend/app/domain/*` | — | None | Clean | Keep | Domain models treat identities as opaque identifiers. |
| `frontend/src/features/office/layout/office-layout-engine.ts` | 82, 84 | `.includes('lead')` | PRESENTATION | Keep | Fallback heuristic for central command desk when presentation metadata is unset. |
| `frontend/src/features/office/layout/office-layout-engine.ts` | 118 | `.includes('marketing')` | PRESENTATION | Keep | Fallback heuristic for creative studio desk layout. |
| `frontend/src/features/office/renderers/Office3D/furniture/Monitor3D.tsx` | 23, 133 | `variant === 'marketing'` | PRESENTATION | Keep | Visual 3D asset variant selector for screen textures. |
| `frontend/src/features/office/renderers/Office3D/furniture/Desk3D.tsx` | 23, 39 | `variant === 'marketing'` | PRESENTATION | Keep | Visual 3D furniture aesthetic variant. |
| `frontend/src/features/schedule/store.ts` | 20, 90, 120 | `agentId: 'marketing'` | FIXTURE | Keep | Mock schedule initial items for frontend standalone development. |
| `frontend/src/features/agent-config/recommended-blueprint.ts` | 1-80 | 8 profile definitions | CANONICAL CONFIG | Keep | Client-side reference of seed blueprint for `/agent-config` diff UI. |
| `backend/app/repositories/memory/fixtures.py` | 33-100 | `prof-sagara-lead`, etc. | FIXTURE | Keep | In-memory mock data used when `data_mode="mock"`. |
| `backend/tests/fixtures/sagara_project/*` | Multi | `lead`, `marketing`, etc. | FIXTURE | Keep | Canonical test fixture representing external Sagara Agent repo. |
| `backend/tests/adapters/test_hermes_runtime_adapter.py` | 80, 89 | `active_sess.profile_id == "lead"` | FIXTURES/TESTS | Keep | Test assertion against mocked session state. |
| `backend/tests/services/test_runtime_correlation_service.py` | 118, 133 | `"lead"` | FIXTURES/TESTS | Keep | Test assertion for runtime projection. |
| `GAMBARANSAGARA.md` | 161-179 | `1539822084333641728`, etc. | DEPLOYMENT CONFIG | Migrated | Discord snowflake IDs documented in historical notes; migrated to `channel-routes.seed.yaml`. |
| `GAMBARANSAGARA.md` | 94, 98-116 | `1MHhZz_BpOTK3...`, etc. | DEPLOYMENT CONFIG | Migrated | Google Drive folder and spreadsheet IDs; migrated to `workspace-policy.seed.yaml`. |
| `GAMBARANSAGARA.md` | 195-202 | `fast-work-free`, `localhost:20128` | DEPLOYMENT CONFIG | Migrated | Provider-specific model names replaced with abstract tiers in `model-policy.seed.yaml`. |
| `backend/app/config.py` | 20, 21, 33 | `8000`, `127.0.0.1`, SQLite URL | ENVIRONMENT | Keep | Managed through Pydantic `BaseSettings` with `MISSION_CONTROL_*` prefix. |

---

## 3. Classification Summary Counts

- **Total Operational Hardcodes Inspected:** 32
- **Canonical Config:** 8 (Seed definitions and blueprints)
- **Deployment Config:** 5 (Channel routes, workspace IDs, network topologies)
- **Environment:** 3 (Ports, hosts, database paths)
- **Presentation:** 4 (3D mesh variants and heuristic layout keywords)
- **Fixtures / Tests:** 12 (Mock stores, unit test assertions, fixture files)
- **Invalid Business Logic Hardcodes:** 0
- **Invalid Hardcodes Migrated:** 0 (None existed in production logic)
- **Invalid Hardcodes Remaining:** 0

---

## 4. AST Guard Enforcement

To permanently prevent regression or introduction of profile branching patterns such as `if profile_id == 'marketing'`, automated static analysis was introduced in `tests/seeder/test_hardcode_guard.py`.
The test scans Python AST across `app/services/`, `app/api/`, `app/domain/`, and `app/repositories/sqlite/` and fails if any literal comparison against canonical profile slugs is detected.
