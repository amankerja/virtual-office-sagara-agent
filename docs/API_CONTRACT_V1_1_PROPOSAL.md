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
