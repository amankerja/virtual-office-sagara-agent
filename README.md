# Virtual Office Sagara Agent (Sagara Mission Control)

Interactive Agent Operations Dashboard & 3D Virtual Office for Autonomous AI Agent Fleets.

[![Tests](https://img.shields.io/badge/backend%20tests-174%20passed-success)](https://github.com/amankerja/virtual-office-sagara-agent)
[![Frontend Tests](https://img.shields.io/badge/frontend%20tests-all%20passed-success)](https://github.com/amankerja/virtual-office-sagara-agent)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## 🌟 Overview

**Virtual Office Sagara Agent** is an enterprise-grade Mission Control and interactive 2.5D/3D Virtual Office built for orchestrating, observing, and governing autonomous AI agents.

It integrates real-time telemetry, human-in-the-loop approvals, action safety guarantees, and deterministic configuration seeding into an industrial, high-density interface.

### Key Capabilities

- 🏢 **Interactive 3D Virtual Office**: Isometric Three.js / React Three Fiber office floor with dynamic agent status avatars, workstation zones, collision boundaries, and interactive selection.
- 🎯 **Command Center**: High-level telemetry, agent readiness metrics, active task queue, and live operational stats.
- 🛡️ **Action Safety Gate & Two-Step Verification**: Fail-closed execution gate, hard idempotency keys, dual-signature approval policies, and an emergency hardware kill-switch.
- 🤖 **Canonical Sagara Profiles & SOUL Governance**: Declarative seed-driven architecture enforcing autonomy boundaries, tool constraints, and zero hardcoded credentials.
- ⚡ **Realtime Event Streaming**: WebSocket delta streaming, state replay, and backpressure sampling.
- 📋 **Human Approval Workflow & Task Queue**: Comprehensive audit trails, delegation tracking, and evidence validation.

---

## 🏗️ Architecture

```text
virtual-office-sagara-agent/
├── frontend/                     # React 19 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── features/
│   │   │   ├── office/           # 3D Virtual Office (Canvas, Furniture, Avatars)
│   │   │   ├── command-center/   # Executive summary & telemetry
│   │   │   ├── action-safety/    # Risk evaluation & 2-step confirmations
│   │   │   ├── agent-config/     # Dynamic profile & skill matrix
│   │   │   ├── approvals/        # Approval queue & inspection drawer
│   │   │   ├── runtime/          # Sessions, delegations, log streams
│   │   │   └── skills/           # Skill registry & health distribution
│   │   └── ...
│   └── tests/                    # Vitest / Node test runner test suite
│
├── backend/                      # FastAPI + Python 3.13 + Pydantic v2
│   ├── app/
│   │   ├── api/v1/               # REST API endpoints & WebSockets
│   │   ├── adapters/             # Hermes runtime adapters & DB connectors
│   │   ├── domain/               # Domain state & principal safety models
│   │   ├── realtime/             # WebSocket manager, samplers & deltas
│   │   ├── seeder/               # Seed validation, preview & materializer
│   │   └── services/             # Safety gates, audit trails, execution
│   └── tests/                    # 170+ Unit & integration tests
│
├── config/
│   └── seeds/                    # Canonical seeds (profiles, skills, routes)
├── profiles/
│   └── templates/soul/           # 13-section SOUL governance templates
├── scripts/                      # Seed validation & preview utilities
└── docs/                         # Architecture specifications & PRDs
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** >= 20.x
- **Python** >= 3.11 (3.13 recommended)
- **Git**

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Access the dashboard at `http://localhost:5173`.

Run frontend test suites:
```bash
npm test
```

### 3. Backend Setup
```bash
cd backend
python -m venv .venv

# On Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

pip install -e .
uvicorn app.main:app --reload --port 8000
```
Backend API docs available at `http://localhost:8000/docs`.

Run backend test suites:
```bash
pytest
```

---

## 🔒 Security & Safety Guarantees

1. **Fail-Closed Execution Gate**: Dispatch executor strictly rejects execution requests unless explicit authorization, valid nonces, and uncompromised checksums are provided.
2. **Production Kill-Switch**: Global circuit breaker immediately halts all dispatched agent operations.
3. **Audit Verification**: SHA-256 hash chains on action intents and approval logs ensure tamper-evident records.
4. **Zero Hardcoded Secrets**: Automated guards prohibit credentials in seed templates and configurations.

---

## 📄 Documentation

- [Action Safety Model](docs/ACTION_SAFETY_MODEL.md)
- [Profile Architecture V1](docs/PROFILE_ARCHITECTURE_V1.md)
- [Realtime Protocol V1](docs/REALTIME_PROTOCOL_V1.md)
- [Execution Safety Runbook](docs/EXECUTION_SAFETY_RUNBOOK.md)
- [Hardcode Configuration Audit](docs/HARDCODE_CONFIGURATION_AUDIT.md)

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
