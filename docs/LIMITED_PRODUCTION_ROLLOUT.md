# Sagara Mission Control — Limited Production Rollout Strategy

**Document ID:** `SAGARA-ROLLOUT-STRATEGY-V1`  
**Phase:** `PROMPT-14.6-LIMITED-ROLLOUT`  
**Current Execution State:** `LOCKED`  
**Eligible Profile:** `sagara-lab` (LIMITED)  
**Disabled Profiles:** `lead`, `personal`, `business`, `marketing`, `cs`, `it-support`, `it-coding` (7 profiles DISABLED)  

---

## 1. Rollout Philosophy & Progression

The successful single canary execution (Canary 001) demonstrated that the technical execution path functions end-to-end. However, transitioning from canary verification to live production requires an incremental, conservative progression:

```text
Phase 1: Canary 001 (Verification)
  ↳ Exactly 1 safe synthetic canary task proven.

Phase 2: Policy Configuration (Prompt 14.6 — Current)
  ↳ Server-authoritative ProductionExecutionPolicy V1 installed.
  ↳ Execution remains strictly LOCKED. Zero live tasks during configuration.

Phase 3: First Useful Limited Workload (Prompt 14.7 — Recommended Next Step)
  ↳ Authorize exactly ONE safe, non-destructive Sagara Lab reasoning task.
  ↳ Zero tools, zero external communication, safe mode forced.

Phase 4: Expanded Read-Only Workloads (Future)
  ↳ Introduce SAFE_READ_ONLY mode for Sagara Lab once proven.

Phase 5: Staged Profile Enablement (Future)
  ↳ Evaluate individual profiles (e.g. IT Coding with bounded git repos).
  ↳ High-risk profiles (Marketing with posting, CS with messaging) remain disabled until audited.
```

---

## 2. Active Profile Matrix & Constraints

| Profile | Rollout Tier | Allowed Workloads | Execution Mode | Approvals | Concurrency | Hourly Budget |
|---|---|---|---|---|---|---|
| `sagara-lab` | **LIMITED** | Non-destructive reasoning & draft generation | `SAFE_NO_TOOLS` | Independent Approval | 1 | 3 / hour |
| `lead` | **DISABLED** | *None* | *None* | N/A | 0 | 0 |
| `personal` | **DISABLED** | *None* | *None* | N/A | 0 | 0 |
| `business` | **DISABLED** | *None* | *None* | N/A | 0 | 0 |
| `marketing` | **DISABLED** | *None* | *None* | N/A | 0 | 0 |
| `cs` | **DISABLED** | *None* | *None* | N/A | 0 | 0 |
| `it-support` | **DISABLED** | *None* | *None* | N/A | 0 | 0 |
| `it-coding` | **DISABLED** | *None* | *None* | N/A | 0 | 0 |

---

## 3. Scope of Sagara Lab Limited Workloads

`sagara-lab` is the initial candidate for limited rollout because its canonical persona is oriented around pure intelligence, architecture planning, and hypothesis evaluation.

### Permitted Workloads
- **Architecture Notes Evaluation:** Ingesting architectural documentation and synthesizing recommendations.
- **Design Review Drafting:** Reviewing provided schemas and producing analytical feedback.
- **Hypothesis Formulation:** Generating experimental reasoning without executing commands.

### Strictly Forbidden for Sagara Lab
- Tool execution (Hermes CLI, Bash, Python interpreter).
- MCP extension invocations.
- Outbound network requests.
- Writing or mutating files on the host or in Mission Control repositories.
- Dispatches without explicit operator preflight and approval.

---

## 4. Rollout Expansion Criteria

No profile may be transitioned from `DISABLED` to `LIMITED` or `ENABLED` without satisfying all of the following requirements:

1. **Formal Workload Definition:** Explicit schema of allowed task classes and forbidden actions.
2. **Side-Effect Boundary Audit:** Proof that any tools or capabilities associated with the profile cannot leak sensitive data, trigger monetary expenses, or send unreviewed outbound messages.
3. **Dedicated Canary Execution:** Successful single-use canary execution in staging/isolated environment.
4. **Independent Approver Sign-off:** Changeset drafted, reviewed, diffed, and approved via the Execution Policy Changeset workflow.
5. **No Regressions in Existing Suites:** Complete test suites remain green across both backend and frontend.

---

## 5. Rollback Procedures

If an anomaly, performance issue, or security violation is detected during any phase of the rollout:

1. **Immediate Execution Lock:**
   Operator or automated guard triggers emergency lock:
   ```bash
   POST /api/v1/execution-lock/lock
   ```
   Or via Mission Control UI: **Emergency Lock** button.
2. **Policy Rollback:**
   Apply canonical V1 baseline changeset restoring all profiles to `DISABLED` and `sagara-lab` to `SAFE_NO_TOOLS`.
3. **Session Audit & Quarantine:**
   Query `task_execution_correlations` and Hermes session records to isolate any affected sessions.
