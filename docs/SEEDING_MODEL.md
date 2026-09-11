# Sagara Seeding Model & Bootstrap Architecture
**Document ID:** ARCH-SEED-V1
**Version:** 1.0.0
**Status:** ACTIVE SPECIFICATION
**Date:** 2026-09-11

---

## 1. Primary Principle: Seed is NOT Source of Truth

```text
Canonical Seed Specification (config/seeds/)
        ↓
Validation Pipeline (scripts/seed_validate.py)
        ↓
Generated / Materialized Canonical Config (staging)
        ↓
ProfileRegistry  +  SkillRegistry  +  Routing Config  +  Model Policy
        ↓
Mission Control Dashboard (/agent-config)
        ↓
Hermes Provisioning (Prompt 14.2)
        ↓
Controlled Execution (Prompt 14.5 Canary)
```

- **The Seed** is reproducible bootstrap/reference configuration input.
- **Canonical Runtime Configuration** is the materialized configuration loaded by existing `core.registry.profile.ProfileRegistry` and `core.registry.skill.SkillRegistry`.
- Mission Control must **never** read seed files at runtime in place of canonical registries.
- **No Second Registry:** Seeder does NOT introduce `SeedProfileRegistry` or `MissionControlProfileRegistry`.

---

## 2. Seed Directory Topology

```text
config/
└── seeds/
    ├── seed-manifest.yaml       # Root manifest linking all seed components
    ├── profiles.seed.yaml       # Canonical 8-agent profile definitions
    ├── profile-skills.seed.yaml # Skill assignments and allowed role domains
    ├── model-policy.seed.yaml   # Abstract model tiers and fallbacks
    ├── channel-routes.seed.yaml # Discord & Telegram context ingress routing
    ├── workspace-policy.seed.yaml # Workspace permissions & sensitive read-only locks
    ├── schedule-policy.seed.yaml  # Allowed schedule types per profile (no live crons)
    └── presentation.seed.yaml   # UI-only icons, accents, and 3D office zones
```

And companion SOUL templates:
```text
profiles/
└── templates/
    └── soul/
        ├── lead.md
        ├── personal.md
        ├── business.md
        ├── marketing.md
        ├── cs.md
        ├── it-support.md
        ├── it-coding.md
        └── sagara-lab.md
```

---

## 3. The 9-Stage Validation Pipeline

Executing `python scripts/seed_validate.py` performs rigorous sequential verification:
1. **Parse & Structure:** Ingests `seed-manifest.yaml` and all referenced component YAML files.
2. **Schema Validation:** Verifies structural types against Pydantic models.
3. **Profile Integrity:** Validates unique IDs, kebab-case slugs, non-empty roles, and memory namespaces.
4. **Skill Registry Cross-Reference:** Resolves all assigned skill IDs against `SkillRegistry`:
   - `RESOLVED`: Confirmed registered skill.
   - `UNRESOLVED`: Skill missing from catalog.
   - `DUPLICATE`: Assigned multiple times to same profile.
   - `DOMAIN_WARNING`: Category mismatch with profile domain taxonomy.
5. **Model Policy Checks:** Validates recognized model tiers and fallbacks.
6. **Channel Route Checks:** Ensures every route targets an existing profile; prevents conflicting route ownership.
7. **Workspace Governance:** Verifies permission modes (`READ_ONLY`, `READ_WRITE`, `APPROVAL_REQUIRED`, `NO_ACCESS`), default deny, and sensitive read-only guarantees.
8. **SOUL Template Auditing:** Confirms all 8 templates exist, contain the 13 mandatory sections, contain zero credentials, and avoid raw skill dumps.
9. **Semantic Hash Generation:** Computes SHA-256 over normalized, sorted JSON representation.

---

## 4. Determinism & Idempotency Guarantees

1. **Deterministic Output:** Profiles, skills, and routes are sorted lexicographically by identifier. File generation does not depend on filesystem traversal order.
2. **Idempotent Previews:** Running `python scripts/seed_preview.py` multiple times produces identical diff results without creating transient artifacts.
3. **Idempotent Materialization:** Materializing repeatedly into the target staging directory yields identical file contents and the exact same semantic hash.
4. **Semantic Hash:** Normalized SHA-256 hash calculated over content only, independent of generated timestamps.

---

## 5. Tooling Reference

| Command | Purpose | Production Mutation? |
|---|---|---|
| `python scripts/seed_validate.py` | Validates schemas, cross-references, and SOUL templates | NO (Read-only) |
| `python scripts/seed_preview.py` | Compares seeds against active canonical ProfileRegistry | NO (Read-only) |
| `python scripts/seed_diff.py` | Outputs markdown diff matrix: Current vs Recommended vs Result | NO (Read-only) |
| `python scripts/seed_materialize.py --output <dir>` | Materializes canonical layout into specified STAGING directory | NO (Staging only) |

---

## 6. Zero Production Mutation Safeguards

- No `seed_apply.py` script exists that targets production automatically.
- Seeder preview and diff tools operate in 100% read-only mode.
- Materialization writes exclusively to the specified staging folder (`--output`), which defaults to a safe operating system temporary directory (`tempfile.gettempdir()`).
- Live production files (`profiles/*/profile.yaml`, `config/skills.yaml`, `~/.hermes/profiles/*`) are never overwritten by the seeder.
