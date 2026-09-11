# Sagara Mission Control: Approval Policy V1

**Document Version:** 1.0.0  
**Phase Status:** PROMPT 13 — PRODUCTION APPROVAL INTEGRATION & ACTION SAFETY GATE  
**Standard:** Canonical Mission Control Governance Specification

---

## 1. Objective

This policy explicitly maps action semantics, targets, and blast radii to risk tiers, required approval workflows, expiration limits, confirmation protocols, and self-approval constraints.

---

## 2. Action Classification Matrix

| Action Type | Target Type | Base Risk Tier | Approval Required | Minimum Approvers | Explicit Confirmation Phrase | Expiration TTL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `SAFETY_GATE_SELF_TEST` | `SYSTEM` | **LOW** | No | 0 | None | 30 minutes |
| `SCHEDULE_CREATE` | `SCHEDULE` | **MEDIUM** | Yes | 1 | None | 30 minutes |
| `SCHEDULE_UPDATE` | `SCHEDULE` | **MEDIUM** | Yes | 1 | None | 30 minutes |
| `SCHEDULE_PAUSE` | `SCHEDULE` | **MEDIUM** | Yes | 1 | None | 30 minutes |
| `SCHEDULE_CANCEL` | `SCHEDULE` | **MEDIUM** | Yes | 1 | None | 30 minutes |
| `TASK_CANCEL` | `TASK` | **MEDIUM** | Yes | 1 | None | 30 minutes |
| `TASK_DISPATCH` | `TASK` | **HIGH** | Yes | 1 | `APPROVE TASK DISPATCH` | 15 minutes |
| `PROFILE_CHANGE_APPLY` | `PROFILE` | **HIGH** | Yes | 1 | `APPROVE PROFILE CHANGE APPLY` | 15 minutes |
| `SKILL_ASSIGNMENT_CHANGE`| `PROFILE` | **HIGH** | Yes | 1 | `APPROVE SKILL ASSIGNMENT CHANGE` | 15 minutes |
| Elevated Destructive Flags | Any | **CRITICAL** | Yes | 2 | `APPROVE CRITICAL <ACTION>` | 10 minutes |

---

## 3. Risk Tier Definitions

### 3.1 LOW Risk
- **Characteristics:** Internal self-diagnostic checks, non-mutating inspections, and harmless verification intents with zero external side effects.
- **Workflow:** Automatically transitions from `PREFLIGHT` to `READY_TO_EXECUTE` if all preflight checks pass. Does not require manual operator sign-off.
- **Expiration:** 1800 seconds (30 minutes).

### 3.2 MEDIUM Risk
- **Characteristics:** Internal schedule modifications, task cancellation requests, and routine configuration drafts that affect local scheduling without dispatching autonomous external execution.
- **Workflow:** Transitions to `READY_FOR_APPROVAL` / `PENDING_APPROVAL`. Requires 1 authorized operator decision.
- **Self-Approval:** Permitted for single-operator local engineering contexts.
- **Expiration:** 1800 seconds (30 minutes).

### 3.3 HIGH Risk
- **Characteristics:** External task execution dispatch, profile definition mutation, and skill assignment changes that alter agent capabilities.
- **Workflow:** Transitions to `PENDING_APPROVAL`. Requires 1 authorized operator decision with explicit typed confirmation phrase.
- **Self-Approval:** **Strictly Forbidden.** The operator who requested the action cannot be the approver.
- **Confirmation:** Operator must submit exact uppercase phrase (e.g. `APPROVE TASK DISPATCH`).
- **Expiration:** 900 seconds (15 minutes).

### 3.4 CRITICAL Risk
- **Characteristics:** Destructive system operations, mass skill deletions, or actions marked with `system_wide: true` or `is_destructive: true`.
- **Workflow:** Requires dual-operator sign-off (2 distinct approvers).
- **Self-Approval:** **Strictly Forbidden.**
- **Confirmation:** Requires `APPROVE CRITICAL <ACTION>`.
- **Expiration:** 600 seconds (10 minutes).
- **Execution Boundary:** Production execution remains **completely disabled** in this phase.

---

## 4. Concurrency & Optimistic Locking

1. **Preflight Revision Concurrency:** Every ActionIntent and Approval maintains an integer `preflight_revision` counter.
2. **If-Match Verification:** When approving or rejecting, callers must submit the matching `If-Match` header or revision counter. If an approval has been modified or decided concurrently, the subsequent attempt returns `409 / RESOURCE_CONFLICT` or `409 / APPROVAL_ALREADY_RESOLVED`.
3. **Double Approval Prevention:** In high-concurrency scenarios, SQLite atomic write transactions ensure exactly one caller wins, while the other receives an idempotency replay or a `409` conflict.
