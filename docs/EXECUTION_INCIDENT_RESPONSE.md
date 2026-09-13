# Sagara Mission Control — Execution Incident Response Runbook

**Document ID:** `SAGARA-RUNBOOK-INCIDENT-V1`  
**Standard Emergency Procedure:** `IMMEDIATE_FAIL_CLOSED_LOCK`  
**Authority:** Sagara Mission Control Safety Operations  

---

## 1. Primary Rule: Fail Closed First

Whenever runtime ambiguity, anomalous tool activity, duplicate execution, or cryptographic integrity failure occurs, the primary action is:

```text
LOCK FIRST → INVESTIGATE SECOND → RECONCILE SAFELY
```

Locking does **not** require Hermes runtime availability. The persistent kill switch in Mission Control SQLite database executes independently of all external daemon processes.

---

## 2. Incident Scenarios & Action Runbooks

### Scenario A: `OUTCOME_UNKNOWN`
- **Definition:** The executor returned without confirming whether Hermes accepted, processed, or aborted the task (e.g. process terminated prematurely, network timeout during execution receipt generation).
- **Automated Response:**
  - Active execution window is immediately closed.
  - Persistent kill switch is engaged (`status = LOCKED`).
  - **Zero auto-retry** is permitted under any circumstances.
- **Operator Action:**
  1. Inspect the host `/home/ubuntu/.hermes/profiles/<profile_id>/state.db`.
  2. Check if a new session record was created matching the task correlation ID.
  3. If execution did occur, record manual reconciliation in Mission Control.
  4. If execution did not occur, investigate process termination root cause before unlocking.

---

### Scenario B: Unexpected Tool / Side-Effect Invocation in Safe Mode
- **Definition:** An execution dispatched under `SAFE_NO_TOOLS` policy attempted or performed a tool call, MCP extension call, or file mutation.
- **Automated Response:**
  - Automatic emergency lock engaged.
  - Audit event logged: `execution.safe_mode_violation`.
- **Operator Action:**
  1. Verify the Hermes command argv used: ensure `--safe-mode` was passed.
  2. Inspect Hermes log output for model prompt-injection attempts.
  3. File a defect report against runtime prompt isolation.

---

### Scenario C: Unexpected Outbound Communication
- **Definition:** Outbound network packet or messaging event detected from an agent process (e.g. Discord, Telegram, HTTP API).
- **Automated Response:**
  - Hard kill switch engaged.
  - All subsequent task dispatches blocked across all profiles.
- **Operator Action:**
  1. Quarantine the affected agent profile directory.
  2. Check profile skills: ensure unapproved posting skills are unlinked.
  3. Rotate any sensitive tokens if leakage is suspected.

---

### Scenario D: Duplicate Execution Detection
- **Definition:** A second submission attempt occurs for the same `ExecutionAuthorization` or `idempotency_key`.
- **Automated Response:**
  - Single-use authorization check rejects second attempt at SQLite transaction boundary (`CONSUMED` state).
  - Attempt logged as `EXECUTION_ATTEMPT_DUPLICATE_BLOCKED`.
- **Operator Action:**
  1. Check client logs to determine if UI or network retry caused the duplicate.
  2. Verify that persistent idempotency cache returned the original receipt without invoking Hermes.

---

### Scenario E: Audit Chain Integrity Failure
- **Definition:** `verify_audit_chain()` returns `valid = false` due to broken SHA-256 hash chaining or record tampering.
- **Automated Response:**
  - All mutating operations (intent creation, approvals, unlock requests, dispatch) fail closed immediately with `500 AUDIT_INTEGRITY_FAILURE`.
  - Read-only observability remains operational.
- **Operator Action:**
  1. Run diagnostic audit inspection:
     ```bash
     GET /api/v1/audit/verify
     ```
  2. Identify the corrupted sequence number and compare with WAL backup.
  3. Do not unlock execution until audit ledger integrity is restored.

---

### Scenario F: Profile Targetability Loss
- **Definition:** Hermes profile directory under `/home/ubuntu/.hermes/profiles/<profile_id>/` is missing or unreadable.
- **Automated Response:**
  - `FinalExecutionPreflight` check 11 marks targetability `NOT_TARGETABLE`.
  - Dispatch is blocked with `403 Preflight Failed`.
- **Operator Action:**
  1. Verify filesystem permissions on remote host.
  2. Confirm profile directory existence:
     ```bash
     ls -la ~/.hermes/profiles/
     ```

---

### Scenario G: Gateway Health Degradation
- **Definition:** `systemctl is-active hermes-gateway` reports non-active, or gateway HTTP port is unresponsive.
- **Invariant:**
  - **NEVER** launch a secondary gateway automatically.
  - **NEVER** restart `hermes-gateway` as an automated recovery mechanism.
- **Operator Action:**
  1. Inspect gateway journal logs:
     ```bash
     journalctl -u hermes-gateway -n 100 --no-pager
     ```
  2. Manually diagnose system resources (memory, disk, file descriptors).
  3. Restart only under direct operator supervision if safe.

---

### Scenario H: Tool Policy Drift, Implementation Mismatch, or Scope Escape (Prompt 14.9A)
- **Definition:** A tool request exhibits policy hash mismatch (`TOOL_POLICY_STALE`), handler drift (`TOOL_IMPLEMENTATION_DRIFT`), path traversal attempt, symlink escape, or sensitive file access attempt (`.env`, keys).
- **Automated Response:**
  - Execution broker immediately denies tool invocation with corresponding canonical denial code.
  - Audit event logged in `tool_execution_audits` with status `DENIED`.
  - Immediate execution lock triggered if mutation or escape was attempted during an authorized window.
- **Operator Action:**
  1. Inspect `tool_execution_audits` for arguments hash and denial code.
  2. Re-verify implementation fingerprint against canonical policy definition.
  3. Do not open an execution window until the policy anomaly is resolved.

---

### Scenario I: Resource Registry Drift, Mutation, or Revocation (Prompt 14.9A.7)
- **Definition:** A document inspection request targets an unregistered resource (`UNKNOWN_RESOURCE`), a deactivated resource (`RESOURCE_REVOKED`), a file whose content changed after intent approval (`DOCUMENT_RESOURCE_CHANGED`), or multiple tools in a single execution (`TOOL_INVOCATION_BUDGET_EXCEEDED`).
- **Automated Response:**
  - `FinalExecutionPreflight` fails closed immediately with corresponding blocking reason.
  - Task dispatch is rejected with `403 Preflight Failed` before any broker invocation.
  - No tool execution occurs; no Hermes session is created.
- **Operator Action:**
  1. Verify the logical resource registration in `ReadOnlyResourceRegistry`:
     ```sql
     SELECT resource_id, enabled, current_hash FROM read_only_resources WHERE resource_id = ?;
     ```
  2. If file content changed legitimately, generate a new ActionIntent with updated source hash and seek re-approval.
  3. If unauthorized modification or tampering occurred on the target document, preserve filesystem logs, quarantine the file, and audit previous inspection receipts.
