# Sagara Mission Control API Contract V1.1 (PROPOSAL)

**Status:** PROPOSED — NOT FROZEN  
**Baseline Compatibility:** Full backward compatibility with `SAGARA_MISSION_CONTROL_API_CONTRACT_V1` (Frozen V1.0.0 remains intact and unmodified).

---

## 1. Overview

API Contract V1.1 defines the formal control-plane safety boundary and the narrow execution boundary for controlled Hermes task dispatch. It enables clients to submit action intents, request preflight safety checks, manage approval workflows, verify the tamper-evident audit ledger, issue single-use execution authorizations, execute approved intents through canonical Hermes interfaces, and reconcile execution outcomes.

**Scope Invariant:** The execution boundary is strictly limited to `TASK_DISPATCH`. All other action types (`TASK_CANCEL`, `PROFILE_CHANGE_APPLY`, `SKILL_ASSIGNMENT_CHANGE`, `SCHEDULE_*`) remain `EXECUTION_NOT_IMPLEMENTED`.

---

## 2. Proposed Endpoints

### 2.1 Action Intents (`/api/v1/action-intents`)

#### `POST /api/v1/action-intents`
- **Description:** Submit a new operator intent for preflight and authorization.
- **Headers:** `Idempotency-Key` (Optional), `X-Correlation-ID` (Optional).
- **Request Body:**
  ```json
  {
    "action_type": "TASK_DISPATCH",
    "target_type": "PROFILE",
    "target_id": "sagara-scout",
    "payload": {
      "task_id": "task-001",
      "target_profile_id": "sagara-scout",
      "prompt": "Inspect pending queue items."
    },
    "resource_revision": 1,
    "reason": "Dispatching scheduled routine"
  }
  ```
- **Response (201 Created):** `ActionIntentDto` with HMAC signature, nonce, payload hash, and initial preflight results.
- **Errors:**
  - `400 ACTION_NOT_ALLOWED`: Action type not on strict allow-list.
  - `403 AUTHORIZATION_DENIED`: Principal lacks operator role.
  - `409 IDEMPOTENCY_CONFLICT`: Idempotency key reused with mismatched payload.

#### `GET /api/v1/action-intents`
- **Description:** List and filter action intents.
- **Query Parameters:** `status`, `risk`, `action_type`, `target_id`, `limit`.
- **Response (200 OK):** `list[ActionIntentDto]`.

#### `GET /api/v1/action-intents/{id}`
- **Description:** Retrieve single action intent by ID.
- **Response (200 OK):** `ActionIntentDto` with `ETag: "v{revision}"`.
- **Errors:**
  - `400 ACTION_INTENT_TAMPERED`: Payload hash or HMAC signature failed integrity verification.
  - `404 RESOURCE_NOT_FOUND`: Intent ID not found.

#### `POST /api/v1/action-intents/{id}/preflight`
- **Description:** Re-evaluate point-in-time runtime preconditions, target profile validity, and capability requirements.
- **Query Parameters:** `dry_run: bool` (default `false`).
- **Response (200 OK):** `PreflightResultDto` (`result`: `PASS` | `BLOCKED` | `REQUIRES_APPROVAL`).

#### `POST /api/v1/action-intents/{id}/request-approval`
- **Description:** Submit intent to human approval queue.
- **Response (200 OK):** Updated `ActionIntentDto` with status `PENDING_APPROVAL`.

#### `POST /api/v1/action-intents/{id}/approve`
- **Description:** Grant operator approval to an action intent. Binds exact `intent_id`, `payload_hash`, and `revision`.
- **Headers:** `If-Match` (concurrency revision check), `Idempotency-Key`.
- **Request Body:**
  ```json
  {
    "reason": "Approved after reviewing payload",
    "confirmation_phrase": "APPROVE TASK DISPATCH"
  }
  ```
- **Response (200 OK):** Updated `ActionIntentDto` with status `READY_TO_EXECUTE` and single-use `execution_authorization_id`.
- **Errors:**
  - `400 APPROVAL_CONFIRMATION_REQUIRED`: Missing or mismatched confirmation phrase for HIGH/CRITICAL action.
  - `403 APPROVAL_SELF_APPROVAL_FORBIDDEN`: Requester attempted to approve own HIGH/CRITICAL action.
  - `409 APPROVAL_ALREADY_RESOLVED`: Intent has already been decided.
  - `409 ACTION_INTENT_EXPIRED`: Intent has expired.
  - `409 RESOURCE_CONFLICT`: ETag / revision mismatch.

#### `POST /api/v1/action-intents/{id}/execute`
- **Description:** Execute an approved action intent through the controlled Hermes dispatch coordinator. Runs Final Execution Preflight, claims single-use execution authorization, enforces persistent kill switch, submits to Hermes, and records direct execution receipt.
- **Headers:**
  - `Idempotency-Key: <unique-key>` (Required for at-most-once execution)
  - `If-Match: <revision>` (Optional concurrency check)
- **Request Body:** Empty `{}` (Frontend cannot override target, profile, or prompt; all data is derived from the immutable approved ActionIntent).
- **Response (200 OK):**
  ```json
  {
    "status": "ACKNOWLEDGED",
    "receipt_id": "rcpt-550e8400-e29b-41d4-a716-446655440000",
    "attempt_id": "att-550e8400-e29b-41d4-a716-446655440001",
    "hermes_session_id": "sess-prod-scout-001",
    "receipt_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "submitted_at": "2026-09-11T12:00:00Z",
    "acknowledged_at": "2026-09-11T12:00:02Z",
    "receipt": {
      "receipt_id": "rcpt-550e8400-e29b-41d4-a716-446655440000",
      "attempt_id": "att-550e8400-e29b-41d4-a716-446655440001",
      "intent_id": "int-550e8400-e29b-41d4-a716-446655440002",
      "task_id": "task-001",
      "profile_id": "sagara-scout",
      "hermes_session_id": "sess-prod-scout-001",
      "submitted_at": "2026-09-11T12:00:00Z",
      "acknowledged_at": "2026-09-11T12:00:02Z",
      "executor_type": "HERMES_TASK_DISPATCH",
      "executor_version": "0.20.6",
      "correlation_id": "corr-001",
      "result": "ACKNOWLEDGED",
      "receipt_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "created_at": "2026-09-11T12:00:02Z"
    }
  }
  ```
- **Ambiguous Outcome Response (200 OK / 408 Timeout):**
  ```json
  {
    "status": "OUTCOME_UNKNOWN",
    "attempt_id": "att-550e8400-e29b-41d4-a716-446655440001",
    "error_code": "HERMES_TIMEOUT_SUBMITTED",
    "detail": "Hermes execution timed out after 120s. Outcome unknown. Do NOT retry automatically. Operator reconciliation required."
  }
  ```
- **Errors:**
  - `400 FINAL_PREFLIGHT_FAILED`: Intent expired, signature invalid, audit broken, or target profile not targetable.
  - `403 ACTION_EXECUTION_DISABLED`: Kill switch locked or environment execution disabled.
  - `403 AUTHORIZATION_DENIED`: Untrusted identity source or insufficient role.
  - `409 EXECUTION_AUTHORIZATION_ALREADY_USED`: Single-use authorization already claimed or consumed.
  - `409 RESOURCE_CONFLICT`: Task revision changed since approval.

#### `POST /api/v1/action-intents/{id}/reject`
- **Description:** Reject an action intent.
- **Request Body:** `{"reason": "Rejected by security lead"}`.
- **Response (200 OK):** Updated `ActionIntentDto` with status `REJECTED`.

#### `POST /api/v1/action-intents/{id}/cancel`
- **Description:** Cancel an action intent prior to execution.
- **Response (200 OK):** Updated `ActionIntentDto` with status `CANCELLED`.

---

### 2.2 Action Safety Status (`/api/v1/action-safety`)

#### `GET /api/v1/action-safety/status`
- **Description:** Inspect control-plane safety postures, signing availability, persistent storage health, execution kill switch, and execution readiness.
- **Response (200 OK):**
  ```json
  {
    "execution_mode": "DISABLED",
    "action_signing": "CONFIGURED",
    "persistent_idempotency": "HEALTHY",
    "audit_chain": "VALID",
    "approval_policy": "LOADED",
    "executor": "HERMES_TASK_DISPATCH",
    "control_db": "CONNECTED",
    "schema_version": 2,
    "active_intents_count": 3,
    "pending_approvals_count": 1,
    "kill_switch_status": "LOCKED",
    "execution_feature_enabled": false,
    "trusted_auth_configured": true,
    "hermes_interface_available": true,
    "direct_session_receipt_supported": true,
    "execution_ready": false
  }
  ```

#### `POST /api/v1/action-safety/audit/verify`
- **Description:** Execute cryptographic verification of the append-only audit hash chain from genesis to tip.
- **Response (200 OK):**
  ```json
  {
    "valid": true,
    "status": "VALID",
    "detail": "Audit chain intact across 42 records from genesis block.",
    "records_checked": 42
  }
  ```

---

### 2.3 Configuration ChangeSets (`/api/v1/changesets`)

#### `POST /api/v1/changesets/configuration`
- **Description:** Stage agent configuration drafts into persistent Mission Control storage and generate an `ActionIntent` (`PROFILE_CHANGE_APPLY`).
- **Response (201 Created):** Staged changeset details and generated action intent.

---

### 2.4 Operator Identity & Authentication (`/api/v1/auth`)

#### `GET /api/v1/auth/me`
- **Description:** Retrieve the authenticated operator principal derived strictly server-side from the trusted proxy or secure ingress boundary. Clients cannot forge identity or role headers directly.
- **Response (200 OK):**
  ```json
  {
    "id": "operator-01",
    "display_name": "Lead Operator",
    "roles": ["admin"],
    "permissions": [
      "action.request",
      "action.approve",
      "execution.prepare",
      "execution.execute",
      "execution.lock.manage",
      "audit.verify"
    ],
    "source": "trusted_proxy",
    "authentication_strength": "sso_mfa"
  }
  ```
- **Errors:**
  - `401 AUTHORIZATION_UNAVAILABLE`: Untrusted identity source or unauthenticated ingress.
  - `403 AUTHORIZATION_DENIED`: Untrusted direct client header spoofing detected.

#### `GET /api/v1/auth/health`
- **Description:** Report status of the authentication boundary, CIDR configuration health, and spoof defense without exposing sensitive credentials or upstream IPs.
- **Response (200 OK):**
  ```json
  {
    "status": "AUTH_CONFIGURED",
    "auth_mode": "trusted_proxy",
    "trusted_cidrs_configured": 1,
    "direct_client_spoof_defense": "ENABLED",
    "detail": "Trusted proxy principal provider active with validated CIDRs."
  }
  ```

---

### 2.5 Execution Readiness (`/api/v1/execution-readiness`)

#### `GET /api/v1/execution-readiness`
- **Description:** Evaluate all 11 technical, architectural, and security prerequisites for execution readiness. Distinguishes infrastructure readiness (`live_canary_ready`) from armed runtime state (`execution_ready`).
- **Response (200 OK):**
  ```json
  {
    "execution_ready": false,
    "live_canary_ready": true,
    "canary_gate_active": false,
    "components": {
      "auth_boundary": "READY",
      "operator_authorization": "READY",
      "action_signing": "READY",
      "control_database": "READY",
      "audit_integrity": "READY",
      "profile_targetability": "READY",
      "hermes_executor": "READY",
      "direct_session_receipt": "READY",
      "execution_env": "BLOCKED",
      "kill_switch": "BLOCKED",
      "canary_gate": "BLOCKED"
    },
    "blockers": [
      "execution_env is DISABLED",
      "kill_switch is LOCKED",
      "canary_gate is DISABLED"
    ],
    "timestamp": "2026-09-11T12:00:00Z"
  }
  ```

---

### 2.6 Execution Lock & Canary Window (`/api/v1/execution-lock`)

#### `GET /api/v1/execution-lock`
- **Description:** Inspect the persistent kill-switch status, environment execution flag, and any active bounded execution window.
- **Response (200 OK):**
  ```json
  {
    "status": "LOCKED",
    "persistent_lock": "LOCKED",
    "execution_feature_enabled": false,
    "active_window": null,
    "detail": "Production execution is locked. Persistent kill switch is engaged."
  }
  ```

#### `POST /api/v1/execution-lock/request-unlock`
- **Description:** Initiate an unlock request. Returns the server-mandated typed confirmation phrase (`UNLOCK TASK EXECUTION`) and parameter bounds.
- **Request Body:**
  ```json
  {
    "reason": "Preparing for single canary dispatch",
    "requested_duration_seconds": 900
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "UNLOCK_REQUESTED",
    "required_confirmation_phrase": "UNLOCK TASK EXECUTION",
    "reason": "Preparing for single canary dispatch",
    "ttl_seconds": 900,
    "max_executions": 1
  }
  ```
- **Errors:**
  - `403 AUTHORIZATION_DENIED`: Principal lacks `execution.lock.manage` permission.

#### `POST /api/v1/execution-lock/unlock`
- **Description:** Transition execution lock to `UNLOCKED` and open a time-limited, budget-capped `ExecutionWindow` (budget: `max_executions=1`, TTL: 10–15m). Requires typed confirmation phrase and uncompromised audit ledger.
- **Request Body:**
  ```json
  {
    "reason": "Authorized canary execution window",
    "confirmation_phrase": "UNLOCK TASK EXECUTION",
    "duration_seconds": 900,
    "max_executions": 1
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "UNLOCKED",
    "detail": "Execution window opened successfully.",
    "window": {
      "id": "win-550e8400-e29b-41d4-a716-446655440003",
      "opened_by": "operator-01",
      "opened_at": "2026-09-11T12:00:00Z",
      "expires_at": "2026-09-11T12:15:00Z",
      "max_executions": 1,
      "executions_consumed": 0,
      "reason": "Authorized canary execution window",
      "state": "OPEN"
    }
  }
  ```
- **Errors:**
  - `400 CONFIRMATION_MISMATCH`: Typed confirmation phrase mismatch.
  - `400 AUDIT_INTEGRITY_COMPROMISED`: Append-only audit chain verification failed.
  - `403 AUTHORIZATION_DENIED`: Principal lacks `execution.lock.manage` permission.

#### `POST /api/v1/execution-lock/lock`
- **Description:** Immediately engage the persistent kill switch, mark all active windows as `CLOSED`, and broadcast emergency lock to connected operators via WebSocket.
- **Request Body:**
  ```json
  {
    "reason": "Emergency execution kill switch engaged"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "status": "LOCKED",
    "detail": "Execution lock engaged and active windows closed."
  }
  ```

---

### 2.6 Production Execution Policy (`/api/v1/execution-policy`)

#### `GET /api/v1/execution-policy`
- **Description:** Retrieve current authoritative production execution policy read model (Prompt 14.6 Section 86).
- **Response (200 OK):** `ProductionExecutionPolicy`
  ```json
  {
    "version": "PRODUCTION_EXECUTION_POLICY_V1",
    "policy_hash": "bda47521c7881dc0a46fc62c9984fa307e297013fe40abf79083d8d87e4b319a",
    "global_execution_enabled": false,
    "max_global_concurrency": 1,
    "global_tool_policy": "DENY",
    "allowed_action_types": ["TASK_DISPATCH"],
    "profiles": {
      "sagara-lab": {
        "profile_id": "sagara-lab",
        "status": "LIMITED",
        "allowed_action_types": ["TASK_DISPATCH"],
        "allowed_task_classes": ["REASONING_ONLY", "DRAFT_GENERATION"],
        "allowed_execution_modes": ["SAFE_NO_TOOLS"],
        "allowed_risk_tiers": ["HIGH", "MEDIUM"],
        "require_independent_approval": true,
        "require_safe_mode": true,
        "max_concurrency": 1,
        "max_executions_per_hour": 3,
        "timeout_seconds": 120.0,
        "external_side_effects_allowed": false,
        "disabled_reason": null
      },
      "lead": {
        "profile_id": "lead",
        "status": "DISABLED",
        "disabled_reason": "Lead coordinates and delegates. Root execution bypass forbidden."
      }
    },
    "created_at": "2026-09-11T12:00:00Z",
    "description": "Canonical Production Execution Policy V1 — Conservative Limited Rollout"
  }
  ```

#### `GET /api/v1/execution-policy/changesets`
- **Description:** List all execution policy changesets (DRAFT, APPROVED, APPLIED, REJECTED).
- **Response (200 OK):** `list[ChangeSetResponseDto]`

#### `POST /api/v1/execution-policy/changesets`
- **Description:** Draft an execution policy changeset with computed semantic diff against active policy.
- **Request Body:**
  ```json
  {
    "title": "Enable sagara-lab read-only inspection",
    "description": "Permit SAFE_READ_ONLY mode for architecture reviews",
    "proposed_policy": { ... }
  }
  ```
- **Response (200 OK):** `ChangeSetResponseDto` with computed diff.

#### `POST /api/v1/execution-policy/changesets/{id}/apply`
- **Description:** Atomically install and activate an approved policy changeset. Requires administrator permissions. Records tamper-evident audit ledger event. Does not arm execution.
- **Response (200 OK):**
  ```json
  {
    "status": "APPLIED",
    "changeset_id": "pcs-123456",
    "policy_id": "pol-789abc",
    "policy_version": "PRODUCTION_EXECUTION_POLICY_V2",
    "policy_hash": "...",
    "applied_by": "operator-admin",
    "applied_at": "2026-09-12T12:00:00Z"
  }
  ```

---

### 2.7 Tool Security Policy (`/api/v1/tool-security-policy`) (Prompt 14.9A Section 97-98)

#### `GET /api/v1/tool-security-policy`
- **Description:** Retrieve current installed Tool Security Policy, default action (DENY), capability definitions, and cryptographic policy hash.
- **Response (200 OK):** `ToolSecurityPolicy`
  ```json
  {
    "version": "TOOL_SECURITY_POLICY_V1",
    "policy_hash": "9bdd1d54102280e49f1d23a13be404c44bb0f22e2c3f100b8d6aed61e3ec033d",
    "status": "INSTALLED_BUT_NOT_ENABLED",
    "default_action": "DENY",
    "network_enabled": false,
    "shell_enabled": false,
    "mcp_enabled": false,
    "mutation_enabled": false,
    "approved_capabilities": {
      "runtime_status": { ... },
      "document_inspection": { ... }
    },
    "denied_categories": [
      "GENERIC_SHELL",
      "NETWORK_COMMUNICATION",
      "MODEL_CONTEXT_PROTOCOL",
      "LOCAL_MUTATION",
      "INFRASTRUCTURE_MUTATION",
      "DATABASE_MUTATION",
      "CROSS_PROFILE_MEMORY"
    ]
  }
  ```

#### `GET /api/v1/tool-security-policy/capabilities`
- **Description:** List metadata and read-only verification status for candidate tool capabilities.
- **Response (200 OK):** `list[ToolCapabilityMetadataDto]`
  ```json
  [
    {
      "tool_id": "runtime_status",
      "risk_class": "READ_ONLY",
      "read_only_verified": true,
      "scope_type": "SYSTEMD_SERVICE",
      "status": "APPROVED_FOR_FUTURE_READ_ONLY_CANARY"
    },
    {
      "tool_id": "document_inspection",
      "risk_class": "READ_ONLY",
      "read_only_verified": true,
      "scope_type": "FILESYSTEM_PATH",
      "status": "APPROVED_FOR_FUTURE_READ_ONLY_CANARY"
    }
  ]
  ```

---

### 2.8 Read-Only Resource Registry (`/api/v1/execution-policy/resources`) (Prompt 14.9A.7)

#### `GET /api/v1/execution-policy/resources`
- **Description:** List registered logical resources with safe logical metadata. Internal absolute filesystem paths are strictly withheld from model and frontend callers.
- **Response (200 OK):** `list[ReadOnlyResourceSafeDto]`
  ```json
  [
    {
      "resource_id": "DOC-CANARY-001",
      "display_name": "Document Inspection Canary 001",
      "resource_type": "DOCUMENT",
      "classification": "RESTRICTED_READ_ONLY",
      "max_bytes": 32768,
      "max_lines": 500,
      "enabled": true,
      "allow_redaction": true,
      "owner_policy": "PRODUCTION_EXECUTION_POLICY_V2"
    },
    {
      "resource_id": "hermes-gateway.service",
      "display_name": "Hermes Gateway Service Runtime Unit",
      "resource_type": "SYSTEMD_SERVICE",
      "classification": "SYSTEM_STATUS_READ_ONLY",
      "max_bytes": 8192,
      "max_lines": 100,
      "enabled": true,
      "allow_redaction": false,
      "owner_policy": "PRODUCTION_EXECUTION_POLICY_V2"
    }
  ]
  ```

#### `POST /api/v1/execution-policy/resources/toggle`
- **Description:** Emergency enable or deactivate a registered logical resource. Deactivation immediately causes future preflight checks targeting that resource to fail closed (`RESOURCE_REVOKED`).
- **Request Body:**
  ```json
  {
    "resource_id": "DOC-CANARY-001",
    "enabled": false,
    "reason": "Deactivated for document update"
  }
  ```
- **Response (200 OK):** Updated resource metadata and audit confirmation.

---

### 2.9 Policy Rollback & Revocation Controls (`/api/v1/execution-policy`) (Prompt 14.9A.7)

#### `POST /api/v1/execution-policy/rollback`
- **Description:** Atomically revert active production policy to `PRODUCTION_EXECUTION_POLICY_V1` (`bda47521c788...`), immediately revoking all `SAFE_READ_ONLY` eligibility. Historical V2 execution receipts and audit records remain intact.
- **Request Body:**
  ```json
  {
    "reason": "Operator-initiated rollback to V1"
  }
  ```
- **Response (200 OK):** Reverted policy metadata and audit confirmation.

#### `POST /api/v1/execution-policy/revoke-tool`
- **Description:** Immediately revoke a single tool capability from active production policy without gateway restart.
- **Request Body:**
  ```json
  {
    "tool_id": "runtime_status",
    "reason": "Anomalous metric observed"
  }
  ```
- **Response (200 OK):** Updated policy metadata with remaining authorized tools.


