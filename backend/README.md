# Sagara Mission Control Backend Foundation (V1)

FastAPI-powered backend foundation for **Sagara Mission Control**, implementing the frozen API contract:
```text
SAGARA_MISSION_CONTROL_API_CONTRACT_V1
STATUS: FROZEN FOR BACKEND IMPLEMENTATION
```

---

## 1. Architecture & Seams

```text
                        FastAPI Routes (/api/v1/*)
                                    ↓
            Service Layer (Validation, Concurrency, Audit Generation)
                                    ↓
                       Read Model Integration Layer
            ┌───────────────────────┼───────────────────────┐
            ↓                       ↓                       ↓
Real / Mock Profile Adapter  Real / Mock Skill Adapter  Mock Runtime Adapter
            ↓                       ↓                       ↓
     ProfileRegistry          SkillRegistry           RuntimeReader
            └───────────────────────┼───────────────────────┘
                                    ↓
                          AgentProjectionService
                                    ↓
                                 Frontend
```

- **Strict Separation**: Routes never directly touch files or external processes. All reads/mutations flow through typed adapter protocols.
- **Three-Layer Alignment**: Emits canonical `snake_case` DTOs, UTC ISO 8601 timestamps, opaque string IDs, and respects `UNKNOWN ≠ ZERO` semantics.
- **Local Isolation**: Designed exclusively for local prototyping and contract verification. No VPS, SSH, or production credentials are involved.

---

## 2. Sagara Read-Only Source Integration (Prompt 09)

The backend supports a **Hybrid Mode** where agent profiles and skills are loaded from a real Sagara project tree while runtime telemetry remains mock.

### Domain Source Control Configuration
Configure the data sources in `backend/.env` or via environment variables:

```env
# Profile source mode: 'mock' (default) or 'sagara'
MISSION_CONTROL_PROFILE_SOURCE=sagara

# Skill source mode: 'mock' (default) or 'sagara'
MISSION_CONTROL_SKILL_SOURCE=sagara

# Runtime source mode: strictly 'mock' (Hermes runtime integration arrives in Prompt 10)
MISSION_CONTROL_RUNTIME_SOURCE=mock

# Canonical Sagara project root (Absolute path, treated strictly read-only)
MISSION_CONTROL_SAGARA_PROJECT_ROOT=/path/to/sagara-agent
```

### Hybrid Projection Semantics
1. **Real Profile Definitions**: Ingested directly from Sagara's canonical `ProfileRegistry` (`core/registry/profile.py`).
2. **Effective Skill Catalog**: Ingested directly from Sagara's canonical `SkillRegistry` (`core/registry/skill.py` / `config/skills.yaml`).
   - Strictly prohibits recursive filesystem scanning for `SKILL.md`.
   - Four frozen dimensions preserved: `registration=REGISTERED`, `installation=UNKNOWN`, `health=UNKNOWN`, `execution=NOT_OBSERVED`.
3. **Mock Runtime Seam**: Runtime evidence remains unlinked. Real profiles without matching runtime identity safely resolve to `state=UNKNOWN` with `confidence=UNKNOWN` (never falsely claiming `ACTIVE` or `IDLE`).
4. **Source Failure Safety**: If the configured Sagara project root is invalid or missing, the backend returns HTTP 503 `SAGARA_SOURCE_UNAVAILABLE` without leaking full local filesystem paths in API error responses.

---

## 3. Setup & Virtual Environment

### Prerequisites
- Python 3.11+ (Python 3.13 tested)

### 1. Create Virtual Environment
```bash
python -m venv .venv
```

### 2. Activate Virtual Environment
**Windows (PowerShell):**
```powershell
.\.venv\Scripts\Activate.ps1
```

**Linux / macOS:**
```bash
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -e ".[dev]"
```
Or directly:
```bash
pip install fastapi uvicorn pydantic pydantic-settings pytest pytest-asyncio httpx pyyaml
```

---

## 4. Running the Server

### Local Development Server
```bash
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Once running:
- **API Root**: `http://127.0.0.1:8000/api/v1`
- **Health Check**: `http://127.0.0.1:8000/health`
- **Readiness Check**: `http://127.0.0.1:8000/ready`
- **Interactive Swagger Docs**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`
- **OpenAPI JSON**: `http://127.0.0.1:8000/openapi.json`

---

## 5. Running Backend Tests

All contract, API, adapter, and semantic tests are executed with `pytest`:
```bash
python -m pytest -v
```

### Test Categories
- **Contract Conformance**: `tests/contract/test_openapi_conformance.py` validates that generated routes, HTTP methods, `Idempotency-Key`, and `If-Match` headers match the frozen OpenAPI spec.
- **Sagara Adapters**: `tests/adapters/test_sagara_adapters.py` validates canonical registry imports, opaque IDs, deterministic ordering, no raw `SKILL.md` scan, and safe source failure.
- **Hybrid Projections**: `tests/services/test_hybrid_agent_projection.py` validates hybrid agent generation, unknown runtime state, capability summaries, and null vs. zero semantics.
- **API Route Verifications**: `tests/api/` covers Health, Profiles, Agents, Skills, Runtime, Sessions, Delegations, Tasks, Approvals, Activity, Audit, Governance, Artifacts, and Sagara source modes.
- **Semantics & Concurrency**: `tests/services/test_semantics_and_concurrency.py` tests `UNKNOWN ≠ ZERO`, UTC ISO 8601 timestamps, optimistic revision locking (409 Conflict), and idempotency replays vs. conflicts.

---

## 6. Frontend Connection (API Mode)

To connect the React frontend to the local FastAPI backend:

1. Start the FastAPI backend on `http://127.0.0.1:8000`.
2. In `frontend/.env.local`:
   ```env
   VITE_DATA_MODE=api
   VITE_MISSION_CONTROL_API_URL=http://127.0.0.1:8000
   ```
3. Run the frontend:
   ```bash
   npm run dev
   ```
4. If the backend is unreachable or shut down, the frontend displays a clear **"Mission Control API is not connected."** banner without silently falling back to mock data.

---

## 7. Hard Safety Boundary

- **NO VPS Access**: The backend does not connect to or SSH into remote servers.
- **NO Hermes Access**: The backend does not read production `state.db` or connect to unix domain sockets.
- **NO Production Secrets**: Operates entirely with local fixtures or read-only Sagara project trees.
- **NO File Modifications**: Real Sagara project files are treated strictly read-only (no writes, no YAML mutations, no skill installs or syncs).
- **Deterministic Mock Mutations**: Tasks and approvals mutate local in-memory records and generate associated activity events and audit log entries with shared correlation IDs.
