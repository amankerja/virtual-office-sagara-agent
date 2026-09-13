# SAGARA AI — HERMES CANONICAL PROFILE PROVISIONING GUIDE

```text
================================================================================
SAGARA_HERMES_PROFILE_PROVISIONING
STATUS: PROVISIONED & TARGETABLE (8 / 8 CANONICAL)
VERIFICATION MODE: READ-ONLY OBSERVATION & ATOMIC PROVISIONING
EXECUTION: LOCKED (MISSION_CONTROL_EXECUTION_ENABLED=false)
KILL SWITCH: LOCKED
================================================================================
```

## 1. Overview & Architecture Summary

This document specifies the materialization of Sagara's frozen 8-profile architecture (`SAGARA_PROFILE_ARCHITECTURE_V1`) into Hermes Agent v0.20.6 on production host `VM-17-49-ubuntu`.

Provisioning establishes exact targetability for all 8 canonical profiles without dispatching live tasks, without creating live Hermes sessions, without mutating `state.db` rows, and without disrupting the running central `hermes-gateway.service`.

---

## 2. Directory Structure & Layout

In Hermes v0.20.6:
- The `default` profile resides directly in the root Hermes home directory (`/home/ubuntu/.hermes`).
- Named profiles reside in dedicated subdirectories under `/home/ubuntu/.hermes/profiles/<name>/`.

```text
/home/ubuntu/.hermes/
├── config.yaml           # Central root gateway & default profile configuration
├── .env                  # Root secrets (Discord bot, Telegram bot, 9router API key)
├── SOUL.md               # Default system prompt
├── state.db              # Central Hermes SQLite database
└── profiles/             # Named profile directory root
    ├── business/
    │   ├── config.yaml   # Profile runtime config (custom:9router -> gratisan_and_googlepro)
    │   ├── profile.yaml  # Hermes profile description metadata
    │   ├── SOUL.md       # Canonical Sagara business agent SOUL
    │   ├── .env          # Profile-scoped credentials (mode 0600; zero copied tokens)
    │   └── skills -> /home/ubuntu/sagara-agent/profiles/business/skills
    ├── career/           # Legacy profile (Preserved, unmanaged, report-only)
    ├── cs/
    ├── it-coding/
    ├── it-support/
    ├── lead/
    ├── marketing/
    ├── personal/
    └── sagara-lab/
```

---

## 3. Configuration & Model Inheritance Behavior

Hermes profile directory resolution rules:
1. **Pre-parse CLI Override:** When `--profile <name>` or `-p <name>` is passed to the Hermes binary, `hermes_cli/main.py:_apply_profile_override()` resolves the profile via `hermes_cli/profiles.py:resolve_profile_env(name)` and sets `HERMES_HOME = /home/ubuntu/.hermes/profiles/<name>`.
2. **Profile Isolation (No Model Inheritance Fallback):** Hermes treats named profiles as independent islands. If a profile directory lacks a `model:` block in its `config.yaml`, Hermes fails with `No LLM provider configured`. Therefore, each profile's `config.yaml` explicitly declares the production model and provider definition without embedding secret keys:
   ```yaml
   _config_version: 39
   agent: {}
   model:
     default: gratisan_and_googlepro
     provider: custom:9router
   providers:
     9router:
       api: http://localhost:20128/v1
       default_model: gratisan_and_googlepro
       discover_models: true
       key_env: NINEROUTER_API_KEY
       name: 9Router
       transport: chat_completions
   plugins:
     enabled: []
   ```
3. **Zero Embedded Secrets:** The configuration references `key_env: NINEROUTER_API_KEY` rather than copying plaintext tokens.

---

## 4. SOUL Loading & Identity Isolation

- **Prompt Builder Resolution:** At runtime, `agent/prompt_builder.py` resolves `soul_path = _home / "SOUL.md"` where `_home` is `HERMES_HOME`.
- **Hash Parity:** Each canonical profile's `SOUL.md` matches the exact SHA-256 fingerprint of the frozen Sagara SOUL template in `profiles/templates/soul/<name>.md`.
- **Cross-Profile Isolation:** All 8 SOUL fingerprints are mutually distinct. No profile loads another profile's identity template.

---

## 5. Skill Model & Authority Separation

- **Authority Invariant:** Sagara remains the sole business and policy authority (`SkillRegistry`, 73 registered skills, 19 domains, 47 canonical allowed assignments). Hermes profile directories do NOT duplicate or replace `SkillRegistry`.
- **Skill Discovery:** Hermes profile `skills/` directories are symlinked to `/home/ubuntu/sagara-agent/profiles/<name>/skills/`.
- **Runtime Discovery:** Hermes prompt builder uses `os.walk(followlinks=True)` to discover and index active skills without flattening or altering Sagara's directory structure.
- **SkillSync Status:** Deferred per Rule #41. Profile directory targetability is established without triggering live sync routines.

---

## 6. Targetability Verification (Non-Executing)

Profile targetability is verified strictly without query execution:
1. `hermes_cli.profiles.profile_exists(name) == True`
2. `hermes_cli.profiles.resolve_profile_env(name) == "/home/ubuntu/.hermes/profiles/<name>"`
3. `hermes_cli.profiles._read_config_model(prof_dir) == ('gratisan_and_googlepro', 'custom:9router')`
4. `(prof_dir / "SOUL.md").is_file() == True` with exact hash match.
5. `HermesTaskDispatchExecutor._resolve_profile_home(name)` returns the target path.

---

## 7. Safety, Rollback & Drift Detection

- **Backup Boundary:** Prior to updating any existing file, timestamped backups (`SOUL.md.bak-<timestamp>`, `config.yaml.bak-<timestamp>`) are generated in place.
- **Rollback Procedure:** If rollback of any profile is required, restore from the timestamped backup:
  ```bash
  mv ~/.hermes/profiles/<pid>/SOUL.md.bak-<timestamp> ~/.hermes/profiles/<pid>/SOUL.md
  mv ~/.hermes/profiles/<pid>/config.yaml.bak-<timestamp> ~/.hermes/profiles/<pid>/config.yaml
  ```
- **Idempotency:** A second run of the provisioning planner reports:
  ```text
  WOULD_CREATE: 0
  WOULD_UPDATE: 0
  CONFLICT: 0
  ```
- **Gateway Preserved:** `systemctl --user show hermes-gateway.service` verified with identical MainPID and 0 restarts.
