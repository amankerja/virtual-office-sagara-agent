# Sagara Mission Control — Production Operator Runbook

**Release:** `MISSION_CONTROL_RELEASE_V1`  
**Authoritative Runtime Contract:** `SAGARA_HERMES_RUNTIME_CONTRACT_V1`  
**Active Production Policy:** `PRODUCTION_EXECUTION_POLICY_V3` (`13ef245630dc448208a408db190924119df9bcf1f602f71e0814b62226fbe95e`)  
**Deployment Date:** September 2026  
**Host Target:** `VM-17-49-ubuntu` (Linux x86_64, Ubuntu 24.04 LTS)

---

## 1. System Architecture & Topology

Sagara Mission Control provides a unified control plane and observability dashboard for native Sagara agent profiles and the central Hermes runtime gateway.

```text
Browser Client (Operator)
       │
       ▼ [Encrypted SSH Local Port Forward: 8000 -> 127.0.0.1:8000]
Trusted Ingress Boundary (Private Loopback Listener)
       │
       ▼
sagara-mission-control (FastAPI + Uvicorn @ 127.0.0.1:8000)
       ├── Static SPA Frontend (Pre-built Vite dist: /, /tasks, /approvals, etc.)
       └── Authoritative REST API (/api/v1/*, /health, /ready)
              │
              ├── Sagara Adapter ──► /home/ubuntu/sagara-agent (Read-only source)
              │                       ├── profiles/*/profile.yaml (8 canonical profiles)
              │                       └── config/skills.yaml (76 skills)
              │
              ├── Hermes Adapter ──► /home/ubuntu/.hermes
              │                       ├── state.db (Read-only query: PRAGMA query_only=ON)
              │                       └── hermes-gateway.service (PID monitoring)
              │
              └── Control Plane ──► /home/ubuntu/sagara-mission-control/backend/data/mission-control.db
                                      ├── execution_policies (V3 active)
                                      ├── execution_locks (Fail-closed locked)
                                      ├── tool_security_policies (V1 active)
                                      └── audit_ledger (Cryptographic hash chain)
```

### Key Architectural Invariants
1. **Single Origin:** Both the SPA frontend assets and the backend API are served on the same origin (`http://127.0.0.1:8000`), eliminating CORS configuration risks and credential leaks.
2. **Zero Runtime Coupling from Frontend:** The frontend bundle contains zero direct paths to `state.db`, `.hermes`, `.sagara`, systemctl commands, or private credentials. All access traverses backend normalized adapters.
3. **External Runtime Independence:** Mission Control database maintains strictly control plane state (policies, receipts, locks, audit records). It never copies or mutates Hermes `state.db` or native Sagara event logs.
4. **Read-Only SQLite Operations:** All reads from external runtime databases (`state.db`) execute under `mode=ro` and `PRAGMA query_only=ON`.

---

## 2. Release Identity Manifest

| Component | Identifier / Version | Verification Artifact |
|---|---|---|
| **Release Identity** | `MISSION_CONTROL_RELEASE_V1` | Release Manifest |
| **Mission Control Commit** | `755d53d086049e8192afc4b8f685f46bc34a213a` | Git HEAD on VPS |
| **Mission Control Backend** | `0.1.0` (FastAPI / Python 3.12) | `backend/pyproject.toml` |
| **Mission Control Frontend** | `1.0.0` (React 19 / TypeScript 5.9 / Vite) | `frontend/dist` |
| **Runtime Contract** | `SAGARA_HERMES_RUNTIME_CONTRACT_V1` | `docs/SAGARA_HERMES_RUNTIME_CONTRACT_V1.md` |
| **Active Execution Policy** | `PRODUCTION_EXECUTION_POLICY_V3` | SHA-256: `13ef245630dc448208a408db190924119df9bcf1f602f71e0814b62226fbe95e` |
| **Tool Security Policy** | `TOOL_SECURITY_POLICY_V1` | SHA-256: `9bdd1d54102280e49f1d23a13be404c44bb0f22e2c3f100b8d6aed61e3ec033d` |
| **Native Sagara Deployed Commit** | `78cb52c624807fdf7c41d341f2b48c65ffebcfa0` | `/home/ubuntu/sagara-agent` |
| **Sagara Integration Freeze Baseline** | `babbd61618f6eb3db99109ba24e0d49b2c9b97d7` | Historical Freeze Artifact |
| **Hermes Gateway Version** | `0.20.6` (`a9c783f21995723c812dcb2f8ae58bc6a4323e2f`) | `/home/ubuntu/.hermes/hermes-agent` |
| **Service Supervisor** | Systemd User Unit (`sagara-mission-control.service`) | `/home/ubuntu/.config/systemd/user/sagara-mission-control.service` |

---

## 3. Operator Access & Boundary Control

### 3.1 Access Architectures: Trusted Web & Break-Glass

Mission Control supports two complementary operator access paths:

```text
Path A (Normal Operations — Trusted Web Access):
Operator Client (Browser)
       │
       ▼ [Public HTTPS / Strict TLS 1.3]
Cloudflare Edge + Cloudflare Access (Identity Boundary: OTP / IdP)
       │
       ▼ [Encrypted Outbound Tunnel: cloudflared]
127.0.0.1:8000 (Private Loopback Listener on VM-17-49-ubuntu)

Path B (Break-Glass Maintenance — SSH Port Forwarding):
Operator Workstation
       │
       ▼ [Encrypted SSH Tunnel: -L 8000:127.0.0.1:8000]
127.0.0.1:8000 (Private Loopback Listener on VM-17-49-ubuntu)
```

### 3.2 Ingress Security Invariants
1. **Loopback Origin Isolation:** Mission Control uvicorn process binds strictly to `127.0.0.1:8000`. Port 8000 is never exposed on `0.0.0.0` or `[::]`.
2. **Zero Inbound Port Openings:** Cloudflare Tunnel operates entirely via outbound TLS connections from the VPS. No public inbound ports (80, 443, 8000) are opened on the VPS firewall.
3. **Edge-Terminated Identity:** Cloudflare Access enforces `DEFAULT DENY`. Only identities explicitly present in `AUTHORIZED_OPERATOR_EMAILS` receive session tokens.
4. **Header Anti-Spoofing:** Backend rejects incoming identity headers (`X-Operator-*`, `Cf-Access-Authenticated-User-Email`) unless the connecting client IP matches `MISSION_CONTROL_TRUSTED_PROXY_CIDRS`. Direct external header injection fails closed with `403 AUTHORIZATION_DENIED`.
5. **Execution Gate Decoupled:** Successful login verifies *operator identity* but does NOT unlock execution. Execution remains strictly `LOCKED` with `ACTIVE_WINDOWS=0`.

### 3.3 Normal Access Procedure (Trusted Web)
1. Open authorized domain in browser: `https://${MISSION_CONTROL_DOMAIN}`
2. Complete Cloudflare Access identity verification (One-Time PIN sent to authorized email, or SSO IdP login).
3. The Mission Control dashboard loads over same-origin HTTPS with active realtime telemetry.

### 3.4 Break-Glass Procedure (Local SSH Tunnel)
If Cloudflare is experiencing an outage, DNS is degraded, or Access policies lock out an operator:
```bash
# 1. Establish encrypted local port forward
ssh -N -L 8000:127.0.0.1:8000 sagara

# 2. Open local browser
http://127.0.0.1:8000/
```
*Note:* The break-glass SSH tunnel is intentionally independent of Cloudflare and requires SSH key authentication.

### 3.5 Managing Operators (Add / Revoke)
Operator identity management is entirely externalized to the Cloudflare Access layer. **Zero Mission Control source code or database edits are required.**
- **Adding an Operator:** In Cloudflare Zero Trust Dashboard → Access → Applications → `Sagara Mission Control` → Policies → Edit `Operator Allowlist` → Add the new operator email address.
- **Revoking an Operator:** Remove the operator email address from the Allowlist policy. Active sessions are revoked at token expiration or can be terminated immediately via Cloudflare Zero Trust User Sessions.

### 3.6 Inspecting Ingress & Tunnel Health
```bash
# Check cloudflared systemd service status
sudo systemctl status cloudflared-mission-control.service

# View recent tunnel logs
sudo journalctl -u cloudflared-mission-control.service -n 50 --no-pager

# Verify Mission Control local listener is responding
curl -s http://127.0.0.1:8000/health
```

### 3.7 Ingress Failure Independence
`cloudflared` operates as an isolated ingress daemon. If `cloudflared` crashes, restarts, or loses internet connectivity:
- `sagara-mission-control.service` remains running.
- `hermes-gateway.service` (PID=149218) and `9router.service` continue running without interruption.
- The operator can immediately fall back to the Break-Glass SSH tunnel without restarting any services.

---

## 4. Lifecycle & Service Management

The backend and frontend are supervised by systemd under the user session on `VM-17-49-ubuntu`.

### Service Control Commands

```bash
# Check service status
systemctl --user status sagara-mission-control.service --no-pager

# View live streaming logs
journalctl --user -u sagara-mission-control.service -f

# View recent 100 log lines with correlation IDs
journalctl --user -u sagara-mission-control.service -n 100 --no-pager

# Restart service cleanly
systemctl --user restart sagara-mission-control.service

# Stop service gracefully
systemctl --user stop sagara-mission-control.service

# Start service
systemctl --user start sagara-mission-control.service

# Verify active status
systemctl --user is-active sagara-mission-control.service
```

### Systemd Unit Configuration
Unit path: `/home/ubuntu/.config/systemd/user/sagara-mission-control.service`
```ini
[Unit]
Description=Sagara Mission Control - Unified Agent Operations Dashboard
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/ubuntu/sagara-mission-control/backend
EnvironmentFile=/home/ubuntu/sagara-mission-control/backend/.env
ExecStart=/home/ubuntu/sagara-mission-control/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000
Restart=on-failure
RestartSec=5s
LimitNOFILE=65536

[Install]
WantedBy=default.target
```

---

## 5. Health & Readiness Verification

### 1. Basic Health Endpoint
Verifies API server is responsive:
```bash
curl -s http://127.0.0.1:8000/health
# Response: {"status":"ok"}
```

### 2. Adapter Readiness Endpoint
Verifies external source connectivity:
```bash
curl -s http://127.0.0.1:8000/ready
# Expected:
# {
#   "status": "ready",
#   "sources": {
#     "profile": "sagara",
#     "skill": "sagara",
#     "runtime": "hermes"
#   }
# }
```

### 3. Execution Readiness & Safety Audit
Full multi-dimensional safety gate verification:
```bash
curl -s http://127.0.0.1:8000/api/v1/execution-readiness
```
**Expected Production Baseline:**
- `infrastructure_ready`: `true`
- `execution_armed`: `false`
- `reason_code`: `EXECUTION_LOCKED`
- `components.auth_boundary`: `READY`
- `components.profile_targetability`: `READY` (8/8 canonical profiles)
- `components.gateway_health`: `READY`
- `components.kill_switch`: `BLOCKED` (Safety lock active)
- `components.canary_gate`: `BLOCKED`

---

## 6. Execution Safety Semantics: Locked vs. Eligible

Mission Control strictly decouples **Eligibility** from **Armed Execution**:

```text
┌────────────────────────────────────────────────────────┐
│ INFRASTRUCTURE READY: YES                              │
│   • 8/8 Canonical Profiles targetable                  │
│   • Central Hermes Gateway PID active & connected      │
│   • 76 Canonical Skills indexed                        │
│   • Tool Broker bound to 2 read-only tools             │
└────────────────────────────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ POLICY ELIGIBILITY (Policy V3)                         │
│   • sagara-lab : LIMITED (SAFE_NO_TOOLS, SAFE_READ_ONLY)
│   • it-support : LIMITED (SAFE_NO_TOOLS, SAFE_READ_ONLY)
│   • lead, personal, business, marketing, cs, it-coding :
│                  DISABLED                              │
│   • ops-it-support channel dispatch: BLOCKED_BY_POLICY │
└────────────────────────────────────────────────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│ EXECUTION ARMED: NO (LOCKED)                           │
│   • MISSION_CONTROL_EXECUTION_ENABLED=false            │
│   • MISSION_CONTROL_LIVE_CANARY_ENABLED=false          │
│   • Persistent Database Kill Switch: LOCKED            │
│   • Active Execution Windows: 0                        │
└────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> A profile being `LIMITED` denotes **policy eligibility** under strict constraints. It does **NOT** authorize execution while the system is `LOCKED`. Direct submissions or channel dispatches are rejected fail-closed.

---

## 7. Event Store Maintenance & Performance Protection

### Bounded Query Protection
Historical Sagara operations accumulated ~694,000 duplicate events in the legacy database before the Prompt 15.0 freeze.
- Mission Control endpoints (`/api/v1/runtime/events`, `/api/v1/activity`) enforce **mandatory pagination** (`limit` + `offset`).
- The backend never loads unbounded historical event sequences into memory.

### Event Store Maintenance Procedure
`EVENT_STORE_MAINTENANCE_REQUIRED: YES`

When scheduled maintenance window is authorized:
1. Stop background sync cron.
2. Back up `events.db`:
   ```bash
   cp /home/ubuntu/.sagara/events.db /home/ubuntu/.sagara/events.db.bak.$(date +%F)
   ```
3. Run bounded compaction script:
   ```bash
   python3 -m scripts.compact_event_store --keep-days 30 --vacuum
   ```
4. Restart service and verify hash integrity.

---

## 8. Backup & Disaster Recovery

### Mission Control State to Backup
Only Mission Control-owned files require backup for dashboard recovery:
1. **Control Plane Database:** `/home/ubuntu/sagara-mission-control/backend/data/mission-control.db`
2. **Environment Configuration:** `/home/ubuntu/sagara-mission-control/backend/.env`
3. **Systemd Service Unit:** `/home/ubuntu/.config/systemd/user/sagara-mission-control.service`

### Automated Backup Command
```bash
mkdir -p /home/ubuntu/backups/mission-control
sqlite3 /home/ubuntu/sagara-mission-control/backend/data/mission-control.db \
  ".backup '/home/ubuntu/backups/mission-control/mission-control-backup-$(date +%Y%m%d_%H%M%S).db'"
cp /home/ubuntu/sagara-mission-control/backend/.env \
  /home/ubuntu/backups/mission-control/env-backup-$(date +%Y%m%d_%H%M%S)
```

---

## 9. Rollback Procedure

If a regression or deployment fault occurs, follow this bounded rollback sequence:

### Step 1: Restore Previous Mission Control Code
```bash
cd /home/ubuntu/sagara-mission-control
git checkout <PREVIOUS_KNOWN_GOOD_TAG_OR_COMMIT>
```

### Step 2: Restore Frontend Dist Assets
```bash
# If dist was replaced:
cp -r /home/ubuntu/sagara-mission-control/frontend/dist.bak /home/ubuntu/sagara-mission-control/frontend/dist
```

### Step 3: Restore Database Snapshot (if schema changed)
```bash
cp /home/ubuntu/backups/mission-control/mission-control-backup-<TIMESTAMP>.db \
   /home/ubuntu/sagara-mission-control/backend/data/mission-control.db
```

### Step 4: Restart Service & Verify
```bash
systemctl --user restart sagara-mission-control.service
systemctl --user status sagara-mission-control.service
curl -s http://127.0.0.1:8000/health
```

> [!CAUTION]
> Rollback of Mission Control must **NEVER** downgrade or restart Hermes Gateway (`hermes-gateway.service`), 9Router (`9router.service`), or native Sagara. Those components operate independently under the frozen runtime contract.

---

## 10. Incident Response Runbook

### Incident: Emergency System Lockout
If any unexpected execution attempt occurs:
```bash
# Lock the global execution switch via API:
curl -X POST http://127.0.0.1:8000/api/v1/execution-lock/lock \
  -H "Content-Type: application/json" \
  -d '{"reason": "OPERATOR_EMERGENCY_LOCKDOWN"}'

# Or immediately stop the service:
systemctl --user stop sagara-mission-control.service
```

### Incident: Hermes Gateway Temporarily Unavailable
If Hermes gateway restarts or disconnects:
- Mission Control enters `DEGRADED` status gracefully.
- UI displays `UNKNOWN` or `STALE` metrics rather than crashing.
- No auto-repair is performed; operators inspect gateway logs:
  ```bash
  journalctl --user -u hermes-gateway.service -n 50 --no-pager
  ```

---

## 11. Technical Reference Links

- [Runtime Contract V1](file:///d:/SAGARA%20AI/MAIN%20DASHBOARD/sagara-mission-control/docs/SAGARA_HERMES_RUNTIME_CONTRACT_V1.md)
- [Production Execution Policy V1](file:///d:/SAGARA%20AI/MAIN%20DASHBOARD/sagara-mission-control/docs/PRODUCTION_EXECUTION_POLICY_V1.md)
- [Production Execution Policy V2](file:///d:/SAGARA%20AI/MAIN%20DASHBOARD/sagara-mission-control/docs/PRODUCTION_EXECUTION_POLICY_V2.md)
- [Tool Security Policy V1](file:///d:/SAGARA%20AI/MAIN%20DASHBOARD/sagara-mission-control/docs/TOOL_SECURITY_POLICY_V1.md)
- [Second Limited Profile Readiness](file:///d:/SAGARA%20AI/MAIN%20DASHBOARD/sagara-mission-control/docs/SECOND_LIMITED_PROFILE_READINESS.md)
- [IT-Support Limited Rollout Report](file:///d:/SAGARA%20AI/MAIN%20DASHBOARD/sagara-mission-control/docs/IT_SUPPORT_LIMITED_ROLLOUT_REPORT.md)
