# Sagara Mission Control — Hermes Execution Model

**Document ID:** SAGARA-HERMES-EXECUTION-MODEL-V1  
**Status:** Canonical Reference Architecture  
**Scope:** Controlled Hermes Task Dispatch (`TASK_DISPATCH` only)

---

## 1. Architectural Principles

1. **Authority Separation:**
   - **Sagara ProfileRegistry:** Identity and configuration authority.
   - **Sagara SkillRegistry:** Capability registry.
   - **Hermes Runtime:** Execution and runtime authority.
   - **Mission Control:** Human operator control plane, preflight safety, and governance ledger.

2. **Narrow Execution Boundary:**
   - There is NO generic execution interface (no `shell=True`, no arbitrary subprocess execution, no raw Python eval).
   - Only typed execution of `TASK_DISPATCH` via `HermesTaskDispatchExecutor` is implemented.
   - All other action mutations (`TASK_CANCEL`, `PROFILE_CHANGE_APPLY`, `SKILL_ASSIGNMENT_CHANGE`, `SCHEDULE_*`) remain strictly `EXECUTION_NOT_IMPLEMENTED`.

3. **Central Gateway Invariant:**
   - `hermes-gateway.service` is the single central gateway.
   - Task execution MUST NOT start, restart, stop, or replace the central gateway.
   - No profile-specific gateways or additional pollers may be spawned.

---

## 2. Canonical Hermes Execution Interface

### 2.1 Interface Discovery & Verification
From source inspection of installed Hermes (`/home/ubuntu/.hermes/hermes-agent`, binary `/home/ubuntu/.local/bin/hermes`):
- **Hermes Version:** `Hermes Agent v0.20.6 (2026.8.27) · upstream 254158f4 · Python 3.11.16`
- **Execution Mechanism:** CLI Subprocess invocation:
  ```bash
  hermes chat --query-file <path> -Q --oneshot
  ```
- **Typed Argument List:** Subprocess invocations MUST use structured `list[str]` arguments (never shell string concatenation):
  ```python
  cmd = [self.binary_path, "chat", "--query-file", str(query_path), "-Q", "--oneshot"]
  if target_profile_id and target_profile_id != "default":
      cmd.extend(["--profile", target_profile_id])
  if safe_mode:
      cmd.append("--safe-mode")
  ```
- **Profile Selection:** Hermes manages profile environments via `HERMES_HOME` (`~/.hermes` for `default`, `~/.hermes/profiles/<name>` for named profiles) or the `--profile <name>` argument.
- **Tool Restriction Support:** `--safe-mode` disables custom tools, custom MCP servers, and tool execution for non-destructive operations.

---

## 3. Exact Profile Targeting & Fail-Closed Targetability

- **Exact Identifier Matching:** Target profile MUST match exact `ProfileDefinition.id`. No display name lookup, fuzzy matching, or fallback to default is permitted.
- **Targetability vs Activity Separation:**
  - A profile's runtime state may be `UNKNOWN` (no active gateway session running).
  - Targetability refers specifically to whether the Hermes canonical execution adapter can start an execution run for that exact profile.
  - If a profile directory does not exist in Hermes (`~/.hermes/profiles/<id>`) and Hermes cannot locate that profile, targetability evaluates to `NOT_TARGETABLE`.
  - Any intent targeting a profile with `NOT_TARGETABLE` or `UNKNOWN` targetability fails closed in `FinalExecutionPreflightService`.

---

## 4. Task Payload Mapping & Immutability

- **Derived Exclusively from Approved ActionIntent:**
  - When `POST /api/v1/action-intents/{id}/execute` is called, the request body is empty `{}`.
  - The executor derives `task_id`, `target_profile_id`, and `prompt` exclusively from the server-persisted, cryptographically verified `ActionIntent`.
  - Frontend or client callers cannot alter target profile, task ID, prompt, risk, or parameters at execution time.
- **Safe Query Passing:** Prompts are passed to Hermes via a temporary file with `--query-file <path>` and restrictive permissions (`0600`), and securely deleted after execution.

---

## 5. Direct Session Receipt & Correlation Architecture

- **No Heuristic Matching:**
  - Heuristic timestamp matching, profile search, or title scraping is strictly FORBIDDEN.
  - An execution attempt is considered successfully acknowledged ONLY if Hermes returns a direct, authoritative session identifier.
- **Session ID Receipt Extraction:**
  - Hermes CLI `-Q` (quiet/exit summary) outputs: `Session: {session_id}` upon run completion.
  - `HermesTaskDispatchExecutor` parses this explicit exit token using regex: `r"Session:\s+([a-zA-Z0-9_\-]+)"`.
  - If no session ID is parsed from the response, the attempt transitions to `FAILED_PRE_SUBMISSION` (or `OUTCOME_UNKNOWN` if the process executed) and NEVER blindly creates heuristic links.
- **Receipt Persistence:**
  - An immutable `ExecutionReceipt` is persisted in Mission Control SQLite:
    - `receipt_id`, `attempt_id`, `intent_id`, `task_id`, `profile_id`
    - `hermes_session_id`
    - `receipt_hash` (deterministic SHA-256 fingerprint over receipt parameters)
  - Canonical `task_execution_correlations` table stores the direct link: `(task_id, intent_id, attempt_id, hermes_session_id, correlation_id)`.

---

## 6. Execution Lifecycle State Machine

```text
[PREPARED]
    │ (Atomic Claim)
    ▼
[CLAIMED]
    │ (Process Launch)
    ▼
[SUBMITTING]
    ├── (Hermes Acknowledges + Session ID) ──────────► [ACKNOWLEDGED]
    ├── (Process Crashes / Pre-Submit Fails) ────────► [FAILED_PRE_SUBMISSION]
    └── (Timeout / Network Drop / Broken Pipe) ──────► [OUTCOME_UNKNOWN]
                                                              │
                                                              ▼
                                                        [RECONCILED] (via Reconciliation Service)
```

---

## 7. Timeout Semantics & OUTCOME_UNKNOWN

- **Bounded Execution Time:** Hermes subprocess invocations are subject to a bounded timeout (e.g. 120s).
- **Ambiguous Timeout Handling:**
  - A timeout occurring after the process has been launched means the task *may* have been submitted to Hermes or executed partially.
  - Therefore, timeouts transition the attempt to `OUTCOME_UNKNOWN`.
- **Absolute Rule on Retries:**
  - **NO BLIND RETRIES.** Automatic retry of an `OUTCOME_UNKNOWN` attempt is strictly forbidden to prevent duplicate external side-effects.
  - An `OUTCOME_UNKNOWN` state requires operator intervention or reconciliation via `ExecutionReconciliationService`.

---

## 8. Execution Reconciliation Service

- **Purpose:** Resolves interrupted, ambiguous, or crashed execution attempts.
- **Authoritative Evidence Only:**
  - Reconciliation searches exclusively for direct session evidence or explicit response records.
  - If direct evidence is found, the attempt is reconciled to `RECONCILED` and linked to the session.
  - If no direct evidence exists, the attempt remains `OUTCOME_UNKNOWN` and requires human operator sign-off.

---

## 9. Current Production Limitations

1. **Single Action Type:** Only `TASK_DISPATCH` is supported.
2. **Profile Provisioning:** Sagara profiles defined in `sagara-profile-registry` must be installed/provisioned into Hermes (`~/.hermes/profiles/<id>`) before they become targetable. Until provisioned, preflight correctly reports `TARGETABILITY_NOT_TARGETABLE`.
3. **Execution Kill Switch:** Both `settings.execution_enabled` (env flag) and `execution_locks.status == 'UNLOCKED'` (database lock) must be unlocked for execution to proceed. Default state is LOCKED.
