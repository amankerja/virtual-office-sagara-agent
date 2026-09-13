# Sagara Mission Control: Plug-and-Play Native Runtime Discovery

## 1. Overview & Architectural Principle

Sagara Mission Control is designed as an authoritative, lightweight, and plug-and-play (PnP) operational control plane over native **Sagara** and **Hermes**. 

Mission Control does not maintain a parallel or competing data model for profiles, skills, channels, or router rules. Native Sagara and Hermes remain the single source of operational truth. When runtime inventory changes in native Sagara or Hermes, Mission Control discovers, normalizes, and projects those changes without requiring code edits or redeployments.

```text
NATIVE SAGARA (/home/ubuntu/sagara-agent)
   ├── core/registry/profile.py  -> ProfileRegistry.load()
   ├── core/registry/skill.py    -> SkillRegistry.load()
   ├── core/registry/channel.py  -> ChannelRegistry.load()
   ├── core/routing/profile.py   -> ProfileRouter.load()
   └── jobs.sqlite3              -> sagara_jobs durable records
         │
         ▼
HERMES RUNTIME (/home/ubuntu/.hermes)
   ├── hermes-gateway.service    -> systemd process & port 3000
   ├── config.yaml               -> model & provider configuration
   ├── gateway_state.json        -> platform health (Discord, Telegram, WhatsApp)
   ├── state.db (URI mode=ro)    -> central session store
   └── profiles/*/state.db (ro)  -> profile-local session stores
         │
         ▼
MISSION CONTROL ADAPTERS & DISCOVERY LAYER
   ├── SourceDiscoveryAdapter    -> Sagara Git HEAD, freeze comparison, schema parity
   ├── VpsTelemetryAdapter       -> Safe /proc and statvfs host metrics (10s cache)
   ├── ServiceHealthAdapter      -> systemctl --user status & metrics (10s cache)
   ├── NineRouterHealthAdapter   -> Safe inference endpoint health probe (10s cache)
   ├── SagaraJobRepository       -> Native job projection with hermes_session_id
   └── HermesSessionAdapter      -> Non-overlapping session accounting & deduplication
         │
         ▼
MISSION CONTROL API & WEBSOCKET LAYER (127.0.0.1:8000)
         │
         ▼
MISSION CONTROL REACT WEB UI (Same-Origin)
```

---

## 2. Required Source Configuration

All discovery paths and operational parameters are configured via environment variables (or `.env` in the backend root).

| Configuration Key | Canonical Production Path | Description |
|---|---|---|
| `SAGARA_PROJECT_ROOT` | `/home/ubuntu/sagara-agent` | Root filesystem path to the native Sagara agent repository. |
| `HERMES_HOME_DIR` | `/home/ubuntu/.hermes` | Hermes runtime directory containing configs, logs, and gateway state. |
| `HERMES_STATE_DB_PATH` | `/home/ubuntu/.hermes/state.db` | Primary central SQLite database for Hermes sessions. |
| `HERMES_BINARY` | `/home/ubuntu/.local/bin/hermes` | Executable binary path for Hermes CLI invocations. |
| `PROFILE_SOURCE` | `sagara` | Profile source provider (`sagara` for native registry, `mock` for dev). |
| `SKILL_SOURCE` | `sagara` | Skill source provider (`sagara` for native registry, `mock` for dev). |
| `RUNTIME_SOURCE` | `hermes` | Runtime telemetry source provider (`hermes` for live, `mock` for dev). |
| `FRONTEND_DIST_PATH` | `/home/ubuntu/sagara-mission-control/frontend/dist` | Directory containing the compiled production Vite bundle. |
| `MISSION_CONTROL_DATABASE_URL` | `sqlite:////home/ubuntu/sagara-mission-control/backend/data/mission-control.db` | Internal operational ledger and action safety SQLite store. |

---

## 3. Sagara Discovery

Native Sagara discovery occurs automatically through Python adapters referencing the configured `SAGARA_PROJECT_ROOT`:

1. **Profile Registry Discovery (`core.registry.profile.ProfileRegistry`)**:
   - Invokes `ProfileRegistry.load(sagara_root)`.
   - Iterates validated `profiles/<profile_id>/profile.yaml` definitions.
   - Detects canonical identities (`business`, `cs`, `it-coding`, `it-support`, `lead`, `marketing`, `personal`, `sagara-lab`).
   - Profile counts and IDs are never hardcoded in the frontend or database.
2. **Skill Registry Discovery (`core.registry.skill.SkillRegistry`)**:
   - Invokes `SkillRegistry.load(sagara_root)`.
   - Distinguishes declared vs installed vs healthy capabilities across profiles.
3. **Channel / Context Discovery (`core.registry.channel.ChannelRegistry`)**:
   - Reflects configured channel definitions and router bindings.
   - Enforces the architectural separation: `Profile = Role`, `Skill = Ability`, `Channel = Context`.
4. **Git Commit & Freeze Tracking**:
   - Dynamically inspects Sagara HEAD commit via `git rev-parse HEAD`.
   - Compares deployed commit against historical freeze baseline (`babbd61618f6eb3db99109ba24e0d49b2c9b97d7`).
   - Verifies that post-freeze modifications remain purely additive and do not break `SAGARA_HERMES_RUNTIME_CONTRACT_V1`.

---

## 4. Hermes Discovery

Hermes discovery connects to active runtime state files without interfering with execution:

1. **Central Gateway & Bridge Status**:
   - Queries `systemctl --user show hermes-gateway.service` for active state, main PID, and restart count.
   - Parses `~/.hermes/gateway_state.json` for platform statuses (`telegram`, `discord`, `whatsapp`).
2. **Read-Only SQLite Session Accounting**:
   - Reads `~/.hermes/state.db` using `file:...mode=ro` with `PRAGMA query_only=ON`.
   - Never issues writes, locks, WAL checkpoints, or VACUUM operations.
   - Discovers all profile-specific SQLite databases in `~/.hermes/profiles/*/state.db`.
   - Calculates distinct deduplicated session counts across central and profile stores, preventing double-counting.
3. **9Router Inference Health Probe**:
   - Periodically probes `http://127.0.0.1:20128/v1/models` using safe HTTP client with short timeout (2.0s).
   - Reports reachability, active process PID, and model inventory count without logging credentials or API keys.

---

## 5. Refresh & Cache Behavior

To prevent resource exhaustion while maintaining sub-second UI responsiveness, discovery layers utilize bounded in-memory caching:

| Telemetry Dimension | Cache TTL | Invalidation Trigger |
|---|---|---|
| VPS Resource Telemetry (CPU, RAM, Disk, Load) | 10 seconds | Automatic expiry; manual refresh on Command Center |
| Systemd Service Health (`systemctl --user`) | 10 seconds | Automatic expiry; service state transitions |
| 9Router Reachability Probe | 10 seconds | Automatic expiry; connection failures |
| Profile & Skill Inventories | 30 seconds | Manual refresh / Sagara file watcher |
| Sagara Git Commit & Release Metadata | 60 seconds | Process start / deploy hook |

---

## 6. Failure & Degraded States

Mission Control enforces strict truthfulness invariants:
- **`UNKNOWN ≠ ZERO`**: A missing metric (e.g. absent PID or unobserved token count) renders as `—` or `UNKNOWN`, never `0` or `$0.00`.
- **`UNKNOWN ≠ HEALTHY`**: If a service cannot be contacted or reachability is unverified, its badge renders as `UNKNOWN` or `UNAVAILABLE`, never green `Healthy`.
- **Fail-Closed Production Mock Fallback**: In production (`PROFILE_SOURCE=sagara`, `RUNTIME_SOURCE=hermes`), any source failure surfaces as `DEGRADED` or `UNAVAILABLE`. It never falls back to development fixtures.

---

## 7. Privacy Boundaries & Isolation

1. **`private_profile.yaml` Exclusion**:
   - `profiles/private_profile.yaml` contains personal vault data, credentials, and sensitive configuration.
   - The profile adapter explicitly rejects any profile named `private_profile` or loaded from `private_profile.yaml`.
   - Private profile data is never exposed via `/api/v1/agents` or dashboard UI.
2. **Sanitization of Logs & Prompts**:
   - Internal paths, environment secrets, authentication tokens, and full phone numbers are sanitized before serialization into DTOs.
3. **Local Private Exposure**:
   - Mission Control binds strictly to `127.0.0.1:8000`. No public internet ingress is permitted without trusted authentication reverse proxies.

---

## 8. Migration to Another VPS

To migrate Sagara Mission Control to a new VPS host:

1. **Install Prerequisites**:
   - Python 3.11+ with `venv`.
   - Node.js 18+ (for frontend building if building on host).
   - Systemd user services support (`loginctl enable-linger ubuntu`).
2. **Clone / Deploy Repositories**:
   ```bash
   git clone https://github.com/amankerja/sagara-agent.git /home/ubuntu/sagara-agent
   git clone https://github.com/amankerja/virtual-office-sagara-agent.git /home/ubuntu/sagara-mission-control
   ```
3. **Configure Environment (`backend/.env`)**:
   - Set `SAGARA_PROJECT_ROOT`, `HERMES_HOME_DIR`, `HERMES_STATE_DB_PATH`, `HERMES_BINARY`.
4. **Deploy Systemd Service**:
   - Install `sagara-mission-control.service` to `~/.config/systemd/user/`.
   - Run `systemctl --user daemon-reload && systemctl --user enable --now sagara-mission-control.service`.
5. **Verify Discovery**:
   - Curl `/api/v1/runtime/sources` to confirm native Sagara and Hermes are discovered and reported as `HEALTHY`.
