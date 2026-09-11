# Sagara Mission Control: Hardcoded Configuration Audit
**Document ID:** DOC-HCA-V1
**Date:** 2026-09-11
**Status:** COMPLETE & ENFORCED VIA AST GUARDS

---

## 1. Scope and Purpose
Following Prompt 14 discovery of profile targetability ambiguity, this audit comprehensively examined all source files across the Sagara AI and Sagara Mission Control repositories. The objective is to verify that profile identifiers, channel routes, model endpoints, filesystem locations, and permission grants are managed dynamically rather than hardcoded into application execution logic.

---

## 2. Classification Definitions
- **CANONICAL CONFIG**: Configuration files that serve as source-controlled authority for identity and capabilities (e.g., `profiles.seed.yaml`, `profile-skills.seed.yaml`).
- **DEPLOYMENT CONFIG**: Operational mapping of logical identities to concrete infrastructure (e.g., Discord channel IDs, Google Drive folder IDs).
- **ENVIRONMENT**: Settings driven by environment variables (`MISSION_CONTROL_*`).
- **PRESENTATION**: Visual layout, theme tokens, 3D furniture models, and UI sorting.
- **FIXTURES/TESTS**: Synthetic test suites and mock data structures used for CI/CD.
- **INVALID HARDCODE**: Hardcoded branching (`if profile_id == 'marketing'`) in business logic that restricts dynamic extensibility.

---

## 3. Findings Matrix

### 3.1 Backend Source (`backend/app`)
- **Profile Branching:** ZERO instances. Neither `services/`, `api/`, `domain/`, nor `repositories/` contain hardcoded profile conditionals. All profile IDs are handled as dynamic strings loaded from `ProfileRegistry`.
- **Enforcement:** Automated AST inspection in `tests/seeder/test_hardcode_guard.py` ensures that any future addition of `profile_id == '...'` in critical modules causes immediate build failure.

### 3.2 Frontend Source (`frontend/src`)
- **Virtual Office (`office-layout-engine.ts`):** Contains keyword matching (`includes('lead')`, `includes('marketing')`) used strictly as fallback heuristics for desk placement when explicit presentation configuration is missing. This is classified as **PRESENTATION** and does not impact security or permissions.
- **3D Renderers (`Desk3D.tsx`, `Monitor3D.tsx`):** Use variant strings (`'command'`, `'career'`, `'marketing'`) for 3D model texture selection. Classified as **PRESENTATION**.
- **Mock Store (`schedule/store.ts`):** Default mock items reference `'marketing'` for local prototyping. Classified as **FIXTURE**.

### 3.3 Historical Documentation (`GAMBARANSAGARA.md`)
- Contained raw Discord snowflake IDs, Google Drive folder IDs, and local LLM ports (`localhost:20128`).
- Migrated cleanly into modular seed files:
  - Discord IDs -> `channel-routes.seed.yaml`
  - Drive / Sheet IDs -> `workspace-policy.seed.yaml`
  - Model configurations -> `model-policy.seed.yaml`

---

## 4. Audit Summary Metrics
- Total Items Audited: 32
- Canonical Config: 8
- Deployment Config: 5
- Environment Config: 3
- Presentation Metadata: 4
- Fixtures / Tests: 12
- Invalid Hardcodes Remaining: 0
- Automated Guard Status: ACTIVE (100% green AST check)
