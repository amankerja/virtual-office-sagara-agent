# Sagara Mission Control: Action Safety Model

**Document Version:** 1.0.0  
**Phase Status:** PROMPT 13 — PRODUCTION APPROVAL INTEGRATION & ACTION SAFETY GATE  
**Boundary Rule:** APPROVAL ≠ EXECUTION. Production Hermes execution is DISABLED.

---

## 1. Threat Model & Security Scope

Mission Control serves as the authoritative control plane for Sagara autonomous agent fleets and Hermes runtime environments. Because malicious, corrupted, or accidental mutations could lead to external tool executions, data corruption, or secret compromise, Prompt 13 introduces a strict defense-in-depth safety gate.

### Threat Vectors Addressed:
1. **Frontend Spoofing & Tampering:** Client cannot arbitrarily designate approvers, modify action parameters after approval, or forge execution permissions.
2. **Replay & Concurrency Races:** Replay of past valid mutations, duplicate clicks, network retries, and race conditions between concurrent operators are blocked via persistent idempotency keys and cryptographic nonces.
3. **Volatile / Unproven Runtime:** Unresolved Hermes sessions or unverified capabilities cannot authorize target profiles.
4. **Time-of-Check to Time-of-Use (TOCTOU):** Volatile runtime states and external environments cannot be frozen by an approval; preflight records point-in-time evidence and Prompt 14 must revalidate immediately prior to dispatch.
5. **Silent Audit Ledger Alteration:** Append-only hash chaining renders any post-facto database tampering mathematically evident.

---

## 2. Operator Identity & Authorization

- **`OperatorPrincipal`:** Represents the authenticated actor requesting or deciding an action (`id`, `roles`, `permissions`, `authentication_strength`, `source`).
- **Development vs. Production Isolation:**
  - In `environment=development`, a developer principal provider operates for ease of local testing.
  - In `environment=production`, the development provider is **strictly disabled**. Requests without an approved authentication provider fail closed (`403 / AUTHORIZATION_UNAVAILABLE`).
- **Role-Based Boundaries:**
  - `viewer`: Read-only observability. Mutation rejected (`403 / AUTHORIZATION_DENIED`).
  - `operator`: Authorized to create ActionIntents within permitted action types.
  - `approver`: Authorized to decide approval gates.
  - `admin`: Elevated administrative privileges, but **not God Mode**. Admins cannot bypass unknown actions, invalid HMAC signatures, stale revisions, expired intents, audit ledger failures, or the execution lock.
- **Strict Self-Approval Policy:**
  - For `HIGH` and `CRITICAL` risk tiers, the requesting operator **cannot** be the sole approver. Self-approval attempts return `403 / APPROVAL_SELF_APPROVAL_FORBIDDEN`.

---

## 3. Canonical ActionIntent

All proposed mutations are represented as an immutable `ActionIntent`:
- `id`: Opaque identifier (`act-int-...`).
- `action_type`: Strictly allow-listed type (`TASK_DISPATCH`, `TASK_CANCEL`, `PROFILE_CHANGE_APPLY`, `SKILL_ASSIGNMENT_CHANGE`, `SCHEDULE_CREATE`, `SCHEDULE_UPDATE`, `SCHEDULE_PAUSE`, `SCHEDULE_CANCEL`, `SAFETY_GATE_SELF_TEST`).
- `target_type`: (`PROFILE`, `TASK`, `SCHEDULE`, `SYSTEM`).
- `target_id`: Specific entity ID.
- `payload`: Canonicalized JSON dictionary.
- `payload_hash`: SHA-256 fingerprint over normalized keys and compact JSON separators.
- `risk`: Risk classification (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
- `status`: Deterministic lifecycle status (`DRAFT` → `PREFLIGHTING` → `PREFLIGHT_FAILED` / `READY_FOR_APPROVAL` → `PENDING_APPROVAL` → `APPROVED` / `REJECTED` / `CANCELLED` / `EXPIRED` → `READY_TO_EXECUTE` → `EXECUTION_DISABLED`).
- `nonce`: Cryptographically secure random token (`secrets.token_hex(16)`).
- `signature`: Server-side HMAC-SHA256 signature binding the intent fields to a server secret.
- `expires_at`: Strict UTC deadline.
- `preflight_revision` & `resource_revision`: Concurrency counters.
- `execution_authorization_id`: Future single-use authorization token.

---

## 4. Server-Side Signing & Integrity

- **Signing Algorithm:** `HMAC-SHA256` computed over `intent_id:action_type:target_type:target_id:payload_hash:operator_id:created_at:expires_at:nonce`.
- **Key Storage:** `MISSION_CONTROL_ACTION_SIGNING_KEY`.
- **Fail-Closed Key Requirement:** In production mode, if no signing key is configured in the environment, all action creation routes immediately fail closed with `503 / ACTION_GATE_UNAVAILABLE`. No dynamic or ephemeral keys are generated in production.
- **Payload Immutability:** Once an intent is generated and approved, any tampering with the payload in storage or transit causes signature and hash verification failure (`ACTION_INTENT_TAMPERED`).

---

## 5. Preflight Service & Policy Engines

- **Read-Only Guarantee:** Preflight performs non-destructive read operations against Sagara catalog, Hermes runtime, and Mission Control storage. It creates no external side effects.
- **Fail-Closed Runtime Resolution:**
  - Live runtime limitation: 69 Hermes sessions unresolved, 0 profile-mapped sessions.
  - Session existence does not prove profile ownership.
  - If target runtime state is `UNKNOWN`, execution-sensitive operations (e.g. `TASK_DISPATCH`) are marked `PREFLIGHT_BLOCKED`.
- **Capability Verification:**
  - Enforces `registered ≠ installed`, `installed ≠ healthy`, `requested ≠ executed`.
  - Required skills that are missing, failing, or in `UNKNOWN` health block preflight.
- **Action Plan:** Preflight outputs a structured, typed `ActionPlan`. Generic shell commands, bash strings, or arbitrary SQL statements are strictly forbidden.

---

## 6. Persistent Idempotency

- Backed by Mission Control SQLite `idempotency_records` table (`WAL` mode).
- Scoped by `(idempotency_key, scope, principal_id)`.
- Replays of identical requests return the original logical response.
- Re-use of the same key with altered payload returns `409 / IDEMPOTENCY_CONFLICT`.
- Survives full process restarts and cold boot recoveries.

---

## 7. Tamper-Evident Audit Ledger

- Append-only application ledger stored in `audit_ledger`.
- Sequence tracking begins with deterministic genesis block (`sequence=0`, `previous_hash="0000000000000000000000000000000000000000000000000000000000000000"`).
- Cryptographic hash chaining:
  ```text
  record_hash = SHA256(sequence | event_id | timestamp | actor_id | action | resource_id | outcome | reason | intent_id | payload_hash | previous_hash)
  ```
- Local and API verifier `verify_audit_chain()` walks the chain from genesis to tip.
- If audit tampering is detected, all safety-critical write mutations fail closed (`500 / AUDIT_INTEGRITY_FAILURE`).

---

## 8. Hard Execution Boundary

- `ExecutionGate`: Hard-coded to `enabled = False` in Prompt 13.
- `DisabledActionExecutor`: Raises `403 / ACTION_EXECUTION_DISABLED` on any execution attempt.
- An `APPROVED` ActionIntent transitions to `READY_TO_EXECUTE` with the user interface displaying:
  ```text
  Approved and ready.
  Production execution is disabled until Controlled Dispatch is enabled.
  ```
- No public execution route (`POST /action-intents/{id}/execute`) is exposed.

---

## 9. Future Prompt 14 Responsibilities

Prompt 14 will own Controlled Hermes Dispatch:
1. Final execution preflight immediately before launch (TOCTOU remediation).
2. Consumption of single-use `execution_authorization_id`.
3. Persistent execution idempotency.
4. Exact profile session binding.
5. Receipt generation and compensation rollback semantics.
