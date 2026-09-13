# Sagara Mission Control: Live VPS Runtime Integration & Deployment Report

## 1. Executive Summary

This milestone establishes the authoritative live runtime integration of Sagara Mission Control on the production VPS host (`VM-17-49-ubuntu` / `43.156.103.236`).

The Mission Control dashboard UI has been connected directly to native **Sagara** and **Hermes** runtimes with 100% plug-and-play capability:
- **Zero Fabricated Data**: All demo telemetry, hardcoded fallbacks, and synthetic assumptions have been removed. Telemetry displays live host metrics or authoritative `—` / `UNKNOWN` representations.
- **Laptop Independence**: The production application and all backend/supervisor processes run exclusively on the VPS under systemd user services. The development laptop is 100% detached from runtime operations.
- **Zero-Disruption Deployment**: Central `hermes-gateway.service` and `9router.service` remained running throughout the deployment with zero restarts (`0` restart count induced).
- **Authoritative Inventory**: 8 canonical Sagara profiles and 77 native skills are discovered dynamically through native `ProfileRegistry.load()` and `SkillRegistry.load()`.
- **Durable Safety & Lock Baseline**: Mission Control remains locked in compliance with `PRODUCTION_EXECUTION_POLICY_V3` (`13ef245630dc448208a408db190924119df9bcf1f602f71e0814b62226fbe95e`).

---

## 2. Production Environment & Process Inventory

| Service / Component | Status | PID | Systemd Unit | Notes |
|---|---|---|---|---|
| **Mission Control API / UI** | `active (running)` | 521955 | `sagara-mission-control.service` | Bound to `127.0.0.1:8000`, same-origin React dist |
| **Hermes Central Gateway** | `active (running)` | 496660 | `hermes-gateway.service` | Uninterrupted runtime, port 3000 |
| **WhatsApp Bridge** | `active (running)` | 496723 | Sub-process of `hermes-gateway` | Operational bridge |
| **9Router Inference Gateway** | `active (running)` | 437469 | `9router.service` | Port 20128, 156 AI models registered |

### Gateway Deployment Invariants
- `hermes-gateway restart count caused by this deployment`: **0**
- `9router restart count caused by this deployment`: **0**
- `central gateway count`: **1**
- `standalone profile gateways`: **0**

---

## 3. Authoritative Telemetry & Metric Cross-Check

| Metric Dimension | Live Host Reality | Mission Control API (/api/v1/runtime) | Match Validation |
|---|---|---|---|
| **Hostname** | `VM-17-49-ubuntu` | `VM-17-49-ubuntu` | EXACT |
| **Uptime** | 96,604 seconds (~26h 50m) | 96,604 seconds (`26h 50m`) | EXACT |
| **CPU Usage** | Dynamic (10.1% - 58.5%) | 10.1% (cached 10s) | EXACT |
| **Load Average (1m / 5m / 15m)** | 0.77 / 0.40 / 0.28 | 0.77 / 0.40 / 0.28 | EXACT |
| **RAM Total / Used** | 1,967 MB / 1,249 MB | 1,967 MB / 1,249 MB (63.5%) | EXACT |
| **Swap Total / Used** | 1,987 MB / 722 MB | 1,987 MB / 722 MB | EXACT |
| **Disk Total / Free / Used** | 39.3 GB / 19.3 GB / 20.0 GB | 39.3 GB / 19.3 GB / 20.0 GB (50.9%) | EXACT |

---

## 4. Plug-and-Play Inventory Verification

### 4.1. Canonical Profiles Discovery
Dynamic invocation of `core.registry.profile.ProfileRegistry.load("/home/ubuntu/sagara-agent")`:
1. `business`
2. `cs`
3. `it-coding`
4. `it-support` (channel dispatch `BLOCKED_BY_POLICY`, operator actions `LIMITED`)
5. `lead`
6. `marketing`
7. `personal`
8. `sagara-lab` (operator actions `LIMITED`)

- **Profile count**: 8 canonical profiles.
- **Private profile isolation**: `profiles/private_profile.yaml` is strictly excluded from operational agents and metadata.

### 4.2. Native Skill Inventory
- Total skills loaded from native registry: **77**
- Preserved lifecycle states: `declared`, `installed`, `enabled`, `healthy`

### 4.3. Session Accounting & Lineage
- Central SQLite Store (`/home/ubuntu/.hermes/state.db`): **129 sessions**
- Profile-local SQLite Stores (`/home/ubuntu/.hermes/profiles/*/state.db`): **20 sessions**
- Distinct Deduplicated Sessions: **146 sessions** (3 overlapping cross-profile sessions correctly deduplicated; naïve sum of 149 is not used).

---

## 5. Release & Source Version Alignment

| Component | Identifier | Status |
|---|---|---|
| **Mission Control Release** | `1.0.0` (V1 Production) | LIVE |
| **Mission Control Commit** | `755d53d086049e8192afc4b8f685f46bc34a213a` | DEPLOYED |
| **Deployed Sagara Commit** | `78cb52c624807fdf7c41d341f2b48c65ffebcfa0` | VERIFIED |
| **Historical Integration Freeze Baseline** | `babbd61618f6eb3db99109ba24e0d49b2c9b97d7` | MATCHED |
| **Hermes Runtime Version** | `0.20.6` | LIVE |
| **Runtime Contract** | `SAGARA_HERMES_RUNTIME_CONTRACT_V1` | COMPLIANT |
| **Active Execution Policy** | `PRODUCTION_EXECUTION_POLICY_V3` | LOCKED |
| **Policy Deterministic Hash** | `13ef245630dc448208a408db190924119df9bcf1f602f71e0814b62226fbe95e` | VERIFIED |

---

## 6. Execution Safety & Production Gate Verification

- **Production Execution Status**: `LOCKED` (`MISSION_CONTROL_EXECUTION_ENABLED=false`)
- **Canary Gate**: `LOCKED` (`MISSION_CONTROL_LIVE_CANARY_ENABLED=false`)
- **Active Execution Windows**: `0`
- **New Agent Workload Generated**:
  - New Hermes submissions: `0`
  - New Hermes sessions: `0`
  - New production tool calls: `0`
  - External channel messages: `0`

---

## 7. Test Suites & Verification Results

### Backend Regression (executed on Linux VPS)
- **Status**: PASS
- **Total Tests**: **333 passed, 0 failed**
- **Execution Time**: 13.32s

### Frontend Verification
- **Status**: PASS
- **Total Tests**: **35 passed, 0 failed** (Office 3D: 5, Execution safety: 21, Truthfulness invariants: 9)
- **Build Output**: `dist/` production assets compiled with Vite (0 errors)
- **Lint Invariants**: 0 errors

---

## 8. Network Exposure & Access Model

- **Binding Address**: `127.0.0.1:8000` (Private loopback only)
- **Public Domain**: NOT ENABLED (no public ingress, no exposed port)
- **Operator Access**: Secure SSH Tunnel:
  ```bash
  ssh -N -L 8000:127.0.0.1:8000 sagara
  ```
  Dashboard URL: `http://localhost:8000`
