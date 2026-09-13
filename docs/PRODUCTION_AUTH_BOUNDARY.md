# SAGARA MISSION CONTROL — PRODUCTION AUTHENTICATION BOUNDARY

## 1. Architecture & Network Flow

Sagara Mission Control enforces a strict server-side trusted ingress authentication boundary for all mutating and execution-facing control plane operations.

```text
[ Browser / Public Client ]
           │
           │  (TLS / Public Internet)
           ▼
[ Trusted Reverse Proxy / Ingress Gateway ]
     ├─ Authenticates operator (SSO / OIDC / MFA)
     ├─ Strips incoming client-supplied identity headers
     ├─ Injects authoritative headers:
     │    X-Operator-ID: <authoritative-user-id>
     │    X-Operator-Roles: <authoritative-roles>
     │    X-Operator-Name: <display-name>
     │    X-Auth-Source: trusted_proxy
     ▼
[ Sagara Mission Control Backend (127.0.0.1:8000) ]
     ├─ Validates request.client.host against TRUSTED_PROXY_CIDRS
     ├─ Rejects open-world wildcards (0.0.0.0/0, ::/0)
     ├─ Derives OperatorPrincipal & granular permissions server-side
     └─ Enforces fail-closed semantics on any untrusted origin (403)
```

---

## 2. Ingress & Identity Header Specification

| Header Name | Injected By | Description | Fail-Closed Rule |
| :--- | :--- | :--- | :--- |
| `X-Operator-ID` | Trusted Ingress Proxy | Unique canonical identifier of authenticated operator | Required in production; missing -> 403 |
| `X-Operator-Roles` | Trusted Ingress Proxy | Comma-delimited list of operator roles (e.g. `admin`, `operator`, `executor`) | Defaults to `operator` if unspecified |
| `X-Operator-Name` | Trusted Ingress Proxy | Human-readable display name for audit trails | Defaults to `X-Operator-ID` |
| `X-Auth-Source` | Trusted Ingress Proxy | Set to `trusted_proxy` by ingress gateway | `dev_provider` strictly rejected in prod |

---

## 3. Server-Derived Principal & Permission Model

Identity is never accepted from frontend JSON payload bodies (`requested_by`, `approved_by`, `executed_by`). The backend derives `OperatorPrincipal` exclusively through `get_current_principal`:

```python
class OperatorPrincipal(BaseModel):
    id: str
    display_name: Optional[str] = None
    roles: list[str] = ["viewer"]
    permissions: list[str] = []
    authentication_strength: str = "trusted_proxy"
    source: str = "trusted_proxy"
```

### Canonical Permissions
- `action.request`: Submit draft action intents.
- `action.approve`: Review and approve/reject eligible action intents.
- `execution.prepare`: Prepare dispatch intents and preflight evaluations.
- `execution.execute`: Submit task execution dispatches to runtime executor.
- `execution.lock.manage`: Engage or release the execution kill switch.
- `audit.verify`: Verify cryptographic hash chain integrity of the audit ledger.

### Role Separation Rules
- **Rule #24**: Administrator is NOT a bypass. Even admins cannot bypass HMAC signatures, approval bindings, kill switch, or targetability.
- **Rule #25**: Having `action.approve` does NOT imply `execution.execute`. Plain operators or approvers cannot execute.
- **Rule #26**: Requester, Approver, and Executor are distinct responsibilities.
- **Rule #27**: HIGH/CRITICAL risk intents forbid self-approval (requester cannot be sole approver).

---

## 4. Header Spoofing & Trust Boundary Defenses

1. **Direct Untrusted Origin Rejection**:
   If a client connects to the backend from an IP outside `MISSION_CONTROL_TRUSTED_PROXY_CIDRS`:
   - Any client-provided `X-Operator-*` headers are rejected with `403 AUTHORIZATION_DENIED`.
2. **Reverse Proxy Header Stripping**:
   The ingress proxy configuration must sanitize/overwrite all incoming identity headers prior to injection.
3. **No Localhost Auto-Admin (Rule #16)**:
   Network location `127.0.0.1` does not grant operator rights. Authentication identity must be verified.
4. **No Dev Provider in Production (Rule #21-22)**:
   Any request asserting `X-Auth-Source: dev_provider` or `id: dev-*` in `ENVIRONMENT=production` fails closed with `403 AUTHORIZATION_UNAVAILABLE`.
5. **No Client-Controlled Forwarded IPs (Rule #15)**:
   Verification tests direct `request.client.host`, ignoring client-controlled `X-Forwarded-For`.

---

## 5. Configuration & CIDR Validation Rules

- `MISSION_CONTROL_TRUSTED_AUTH_PROXY_ENABLED`: Boolean gate enabling proxy authentication.
- `MISSION_CONTROL_TRUSTED_PROXY_CIDRS`: List of CIDR subnets allowed to assert identity headers (e.g. `["10.0.0.0/8", "127.0.0.1/32"]`).
- **Rule #32**: Open-world CIDRs `0.0.0.0/0` and `::/0` are strictly rejected with `OPEN_WORLD_CIDR_REJECTED`.
- Malformed CIDR strings raise `INVALID_CIDR_FORMAT` and cause backend startup/auth evaluation to fail closed.

---

## 6. Diagnostic Health States

Exposed via `GET /api/v1/auth/health`:
- `AUTH_CONFIGURED`: Trusted proxy enabled with valid non-open CIDRs in production, or development mode active.
- `AUTH_UNAVAILABLE`: Production mode active without proxy enabled or missing trusted proxy CIDRs.
- `AUTH_MISCONFIGURED`: Configuration error, invalid CIDR format, or open-world wildcard detected.
