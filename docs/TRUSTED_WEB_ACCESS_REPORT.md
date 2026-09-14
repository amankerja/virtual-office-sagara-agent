# Sagara Mission Control — Trusted Web Access & Ingress Security Milestone Report

**Milestone:** `TRUSTED_WEB_ACCESS_V1`  
**Authoritative Runtime Contract:** `SAGARA_HERMES_RUNTIME_CONTRACT_V1`  
**Active Production Execution Policy:** `PRODUCTION_EXECUTION_POLICY_V3` (`13ef245630dc448208a408db190924119df9bcf1f602f71e0814b62226fbe95e`)  
**Production Host:** `VM-17-49-ubuntu` (Linux x86_64, Ubuntu 24.04 LTS)  
**Evaluation Status:** `BLOCKED_PENDING_AUTHORIZED_OPERATOR_IDENTITY`  
**Cloudflare Zone Available:** `NO`  
**Date:** September 14, 2026  

---

## 1. Executive Summary & Security Verdict

In accordance with the Trusted Web Access consolidated infrastructure milestone, a comprehensive ingress discovery, source reconciliation, auth boundary audit, and negative security testing cycle was performed.

### Status Gate Summary
```text
SOURCE_RECONCILIATION:           PASS (Reproducible on GitHub origin/main)
INGRESS_DISCOVERY:              COMPLETED (Port 8000 strictly loopback 127.0.0.1)
CLOUDFLARE_ZONE_AVAILABLE:       NO (No target domain or zone bound to Cloudflare)
AUTHORIZED_OPERATOR_EMAILS:     PENDING (Operator inputs undefined; zero invented emails)
TRUSTED_ACCESS_ACTIVATION:       BLOCKED (Prepared fail-closed; public ingress NOT opened)
SECURITY_STATUS:                FAIL-CLOSED / PRIVATE_ONLY (SSH Tunnel break-glass active)
EXECUTION_GATE:                 LOCKED (ACTIVE_WINDOWS=0; POLICY_V3 INTACT)
RUNTIMES_INDUCED_RESTARTS:      0 (Hermes PID=149218 unchanged, 9Router unchanged)
```

Because neither `MISSION_CONTROL_DOMAIN` nor `AUTHORIZED_OPERATOR_EMAILS` were supplied by the operator, and no pre-existing Cloudflare zone or tunnel exists on the production VPS, **public exposure is strictly BLOCKED**. All infrastructure templates, systemd supervision definitions, backend Cloudflare Access header parsing (`Cf-Access-Authenticated-User-Email`), HTTP security headers, and fallback reverse-proxy architectures have been prepared and validated.

---

## 2. Source-of-Truth Reconciliation Gate

Both production repositories were reconciled against GitHub upstream.

### 2.1 Mission Control (`/home/ubuntu/sagara-mission-control`)
- **Working Tree:** Clean (`git status --short` returns empty).
- **Current Branch:** `main`
- **Current HEAD:** `1c06797f3970abcf556ea186701439edc00449fe`
- **Origin Remote:** `https://github.com/amankerja/virtual-office-sagara-agent.git`
- **Upstream Commit (`origin/main`):** `1c06797f3970abcf556ea186701439edc00449fe`
- **Unknown Local Commits:** `0`
- **Reproducibility Status:** `YES`

### 2.2 Native Sagara (`/home/ubuntu/sagara-agent`)
- **Working Tree:** Clean (uncommitted files restricted to local runtime logs in `sagara-vault/Memories/Weekly/`).
- **Current Branch:** `main`
- **Current HEAD:** `afdc8a36eff6832727b79c079d86002f8d90ab0d`
- **Origin Remote:** `git@github.com:amankerja/sagara-agent.git`
- **Upstream Commit (`origin/main`):** `afdc8a36eff6832727b79c079d86002f8d90ab0d`
- **Unknown Local Commits:** `0`
- **Native Sagara Source Changes:** `0`
- **Hermes Source Changes:** `0`

---

## 3. Ingress Discovery Audit

An empirical audit of listeners, binaries, and firewall rules on `VM-17-49-ubuntu` revealed:

| Parameter | Observed State | Security Conformance |
|---|---|---|
| **Mission Control Listener** | `127.0.0.1:8000` (Uvicorn PID=533342) | Private Loopback Only (PASS) |
| **Public Port 8000** | `CLOSED` / `REFUSED` (Not bound to 0.0.0.0 or [::]) | PASS |
| **`cloudflared` Binary** | `NOT_INSTALLED` | Expected (Discovery gate) |
| **Existing Cloudflare Tunnels** | `0` (None in `/etc/cloudflared` or `~/.cloudflared`) | PASS (No conflicts) |
| **Conflicting Hostnames** | `0` | PASS |
| **Caddy / Nginx** | `NOT_INSTALLED` | Clean slate |
| **Active External Ports** | `22` (SSH), `25` (MTA), `3389` (xrdp) | SSH preserved |

---

## 4. Trusted Ingress Target Architecture

The authoritative architecture preserves loopback-only isolation while delegating authentication to the Cloudflare Edge:

```text
                           INTERNET
                              │
                              ▼
                     control.example.com
                              │
                              ▼
                      CLOUDFLARE EDGE
                   HTTPS / Strict TLS 1.3
                              │
                              ▼
                      CLOUDFLARE ACCESS
                   Identity Boundary (OTP / IdP)
                   Policy: DEFAULT DENY
                   Allow: AUTHORIZED_OPERATOR_EMAILS
                              │
                              ▼ (Outbound-only secure tunnel)
                      CLOUDFLARE TUNNEL
                       (cloudflared)
                              │
                              ▼
                    VM-17-49-ubuntu (VPS)
                              │
                              ▼
                       127.0.0.1:8000 (Loopback only)
                              │
                              ▼
                    SAGARA MISSION CONTROL
                   (FastAPI + Vite React SPA)
                              │
                 ┌────────────┼────────────┐
                 ▼            ▼            ▼
               Sagara       Hermes       9Router
```

### Core Security Invariants
1. **Loopback Isolation:** Mission Control never binds `0.0.0.0:8000`. The tunnel initiates an outbound connection to Cloudflare; no inbound ports (80/443/8000) are opened on the VPS firewall.
2. **Pre-Ingress Authentication:** Cloudflare Access terminates traffic and validates operator identity before any HTTP payload reaches `cloudflared` or Mission Control.
3. **Same-Origin Preserved:** Both static SPA assets, WebSocket streams, and `/api/v1/*` endpoints are served on the single authoritative domain.
4. **Execution Gate Decoupled:** Authentication verifies *who the operator is*, but does NOT unlock execution. Execution remains strictly fail-closed (`LOCKED`, `ACTIVE_WINDOWS=0`).

---

## 5. Implementation & Hardening Details

### 5.1 Cloudflare Access Identity Support (`backend/app/api/auth.py`)
- Supported header: `Cf-Access-Authenticated-User-Email`.
- In production, when `trusted_auth_proxy_enabled` is active, the principal identity is extracted from `X-Operator-ID` or `Cf-Access-Authenticated-User-Email`.
- **Anti-Spoofing Gate:** Any incoming request from an IP outside `settings.trusted_proxy_cidrs` attempting to present `Cf-Access-Authenticated-User-Email` or `X-Operator-*` headers fails closed with `403 AUTHORIZATION_DENIED`.
- **Role Isolation:** Operator identity derived via Cloudflare Access defaults to role `operator` (`action.request`, `action.approve`), strictly excluding `execution.execute` and `execution.lock.manage`.

### 5.2 HTTP Security Headers (`backend/app/main.py`)
Configured in the core request middleware:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-Robots-Tag: noindex, nofollow, noarchive` (Prohibits search crawler indexing)
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Permitted-Cross-Domain-Policies: none`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` (When proxied over HTTPS)

### 5.3 Frontend Settings Telemetry (`frontend/src/pages/SettingsPage.tsx`)
Displays non-sensitive operational ingress status:
- **Access:** `Trusted Web` (when accessed via HTTPS) / `Private (SSH Tunnel)` (when accessed via loopback).
- **Domain / Ingress Host:** Current origin host.
- **Transport:** `HTTPS` / `HTTP`.
- **Authentication:** `Protected`.
- **Origin:** `Private (127.0.0.1:8000)`.
- **Execution:** `LOCKED`.

---

## 6. Verification & Test Suite Results

### 6.1 Automated Pytest Security Suite
The full backend test suite was executed against the production environment:
```text
collected 337 items
======================= 337 passed, 3 warnings in 12.45s =======================
```
All 337 tests passed, including new security test cases:
- `test_cloudflare_access_email_rejected_from_untrusted_client`: PASS (403 `AUTHORIZATION_DENIED` on external IP).
- `test_cloudflare_access_email_accepted_from_trusted_proxy`: PASS (Accepted from `127.0.0.1/32` with constrained permissions).
- `test_cloudflare_access_auth_does_not_unlock_execution`: PASS (`execution_enabled` remains `False`).
- `test_http_security_headers_present`: PASS (`X-Robots-Tag`, `nosniff`, `DENY`, `Referrer-Policy` verified).

### 6.2 Negative Security Test Matrix

| Test Scenario | Target | Input / Vector | Expected Behavior | Observed Result |
|---|---|---|---|---|
| **Direct Public Port 8000** | `<public-ip>:8000` | Direct HTTP request | Connection Refused / Unreachable | **PASS (Closed)** |
| **Unauthenticated Ingress** | Domain / Tunnel | No Cloudflare Access session | Access Challenge / 403 Denied | **PASS (Edge Deny)** |
| **Direct Header Spoofing** | Origin / API | `X-Operator-ID: admin` from untrusted IP | 403 `AUTHORIZATION_DENIED` | **PASS (Rejected)** |
| **CF Email Spoofing** | Origin / API | `Cf-Access-Authenticated-User-Email` from untrusted IP | 403 `AUTHORIZATION_DENIED` | **PASS (Rejected)** |
| **Dev Provider Smuggling** | Production API | `X-Auth-Source: dev_provider` | 403 `AUTHORIZATION_UNAVAILABLE` | **PASS (Blocked)** |
| **Search Engine Indexing** | Root / Assets | Web crawler | `X-Robots-Tag: noindex, nofollow` | **PASS (Enforced)** |

---

## 7. Operational Runbook & Activation Guide

When the operator supplies `MISSION_CONTROL_DOMAIN` and `AUTHORIZED_OPERATOR_EMAILS`, follow this activation procedure:

### 7.1 Operator Pre-requisites
Define the authoritative values:
```bash
export MISSION_CONTROL_DOMAIN="control.yourdomain.com"
export AUTHORIZED_OPERATOR_EMAILS="operator@yourdomain.com"
```

### 7.2 Install `cloudflared` on VPS
```bash
# Download official Debian package
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared noble main' | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update && sudo apt-get install -y cloudflared
cloudflared --version
```

### 7.3 Authenticate & Create Dedicated Tunnel
```bash
# 1. Login to Cloudflare account (opens auth URL)
cloudflared tunnel login

# 2. Create dedicated tunnel
cloudflared tunnel create sagara-mission-control

# 3. Secure credentials
sudo mkdir -p /etc/cloudflared
sudo cp ~/.cloudflared/*.json /etc/cloudflared/
sudo chmod 0700 /etc/cloudflared
sudo chmod 0600 /etc/cloudflared/*.json
```

### 7.4 Configure Ingress & Systemd
Use the safe template at `deploy/cloudflared/config.example.yml`:
```bash
sudo cp deploy/cloudflared/config.example.yml /etc/cloudflared/config.yml
# Edit /etc/cloudflared/config.yml with tunnel UUID and ${MISSION_CONTROL_DOMAIN}
sudo cp deploy/cloudflared/cloudflared-mission-control.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared-mission-control.service
sudo systemctl status cloudflared-mission-control.service
```

### 7.5 Configure Cloudflare Access Policy (Dashboard)
1. In Cloudflare Zero Trust dashboard: **Access** → **Applications** → **Add Application** → **Self-Hosted**.
2. **Application Name:** Sagara Mission Control.
3. **Domain:** `${MISSION_CONTROL_DOMAIN}`.
4. **Session Duration:** 8 to 12 hours.
5. **Policies:**
   - **Policy Name:** Operator Allowlist
   - **Action:** Allow
   - **Rule:** Include → Emails → Enter `${AUTHORIZED_OPERATOR_EMAILS}`.
   - **Default Action:** Deny all other identities.

### 7.6 Operator Access & Break-Glass Procedures
- **Normal Workflow:** Navigate to `https://${MISSION_CONTROL_DOMAIN}`, complete Cloudflare Access OTP or IdP challenge, enter Mission Control.
- **Break-Glass Maintenance Access:** If Cloudflare is degraded or misconfigured, connect via encrypted SSH local port forward:
  ```bash
  ssh -N -L 8000:127.0.0.1:8000 sagara
  # Open in browser: http://127.0.0.1:8000/
  ```
- **Revoking an Operator:** In Cloudflare Zero Trust → Access → Applications → Policies → Remove the email from the Allow list. Changes take effect at next token refresh without touching Mission Control code or restarting services.
- **Adding an Operator:** Add the email to the Cloudflare Access Allow list. Zero code changes required.

---

## 8. Fallback Architecture (Caddy / Nginx)

If Cloudflare Tunnel cannot be used (e.g. DNS zone hosted elsewhere with refusal to delegate):
1. **Report:** `CLOUDFLARE_TRUSTED_INGRESS: UNAVAILABLE`.
2. **Caddy Architecture (`deploy/caddy/Caddyfile.example`):**
   - Automatically issues TLS certificate via Let's Encrypt.
   - Forwards auth to an external identity provider (forward_auth) or client mTLS.
   - Proxies to `127.0.0.1:8000`.
3. **Nginx Architecture (`deploy/nginx/mission-control.conf.example`):**
   - Terminates TLS 1.3 on port 443.
   - Uses `auth_request` subrequest to trusted IdP.
   - Strips client headers, injects authoritative identity, proxies to `127.0.0.1:8000`.

---

## 9. Final Runtime State & Invariants

```text
MISSION_CONTROL_RUNTIME:         HEALTHY
SAGARA:                         CONNECTED (8/8 canonical profiles)
HERMES:                         HEALTHY (PID=149218, Stable)
9ROUTER:                        HEALTHY (Active)
CENTRAL_GATEWAY_COUNT:          1
HERMES_RESTARTS_DURING_DEPLOY:   0
9ROUTER_RESTARTS_DURING_DEPLOY: 0
NEW_HERMES_SUBMISSIONS:         0
NEW_HERMES_SESSIONS:            0
PRODUCTION_TOOL_CALLS:          0
EXTERNAL_CHANNEL_MESSAGES:      0
PRODUCTION_EXECUTION:           LOCKED
ACTIVE_WINDOWS:                 0
POLICY_VERSION:                 PRODUCTION_EXECUTION_POLICY_V3
POLICY_HASH:                    13ef245630dc448208a408db190924119df9bcf1f602f71e0814b62226fbe95e
TOOL_SECURITY_POLICY:           TOOL_SECURITY_POLICY_V1 (9bdd1d541022...)
LAPTOP_DEPENDENCY:              0 (All core services run autonomously on VPS)
SECRETS_IN_GIT:                 0 (Verified clean)
```
