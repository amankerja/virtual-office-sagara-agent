# Safe Read-Only Limited Policy Activation (Prompt 14.9A.7)

## 1. Executive Summary

Prompt 14.9A.7 activates `PRODUCTION_EXECUTION_POLICY_V2` as an audited, server-authoritative policy object supporting:
```text
SAFE_NO_TOOLS
+
SAFE_READ_ONLY
```
for profile `sagara-lab` only.

All other 7 canonical profiles remain strictly `DISABLED`.

Production execution remains **LOCKED** by default. Zero live Hermes workloads, zero Hermes task submissions, zero session creations, and zero production tool invocations occurred during activation.

---

## 2. Policy Activation Verification & Differences

### Hash Verification
- **V1 Policy Hash (Historical, Immutable):** `bda47521c7881dc0a46fc62c9984fa307e297013fe40abf79083d8d87e4b319a`
- **V2 Policy Hash (Active, Deterministic):** `c5dc6df112e56739f2d96c8ef195bc4711c9631473f92cae064ad88353848ba1`
- **Bound Tool Security Policy:** `TOOL_SECURITY_POLICY_V1`
- **Tool Security Policy Hash:** `9bdd1d54102280e49f1d23a13be404c44bb0f22e2c3f100b8d6aed61e3ec033d`

### Semantic Differences (V1 → V2)
1. `version`: `PRODUCTION_EXECUTION_POLICY_V1` → `PRODUCTION_EXECUTION_POLICY_V2`
2. `supersedes_version`: `None` → `PRODUCTION_EXECUTION_POLICY_V1`
3. `tool_security_policy_version`: `None` → `TOOL_SECURITY_POLICY_V1`
4. `tool_security_policy_hash`: `None` → `9bdd1d54102280e49f1d23a13be404c44bb0f22e2c3f100b8d6aed61e3ec033d`
5. `allowed_tools`: `[]` → `["runtime_status", "document_inspection"]`
6. `max_tool_invocations_per_execution`: `0` → `1`
7. Profile `sagara-lab`:
   - `allowed_execution_modes`: `["SAFE_NO_TOOLS"]` → `["SAFE_NO_TOOLS", "SAFE_READ_ONLY"]`
   - `allowed_task_classes`: `["REASONING_ONLY", "DRAFT_GENERATION"]` → `["REASONING_ONLY", "DRAFT_GENERATION", "READ_ONLY_INSPECTION"]`

All other configuration (concurrency=1, rate limit=3/hr, approval required, 7 disabled profiles, action type `TASK_DISPATCH` only) remains identical.

---

## 3. Tool Eligibility Status

Following activation:
- `runtime_status`: `LIMITED_PRODUCTION_ELIGIBLE`
- `document_inspection`: `LIMITED_PRODUCTION_ELIGIBLE`
- All other tools: `DENIED`

Actual execution remains gated by:
1. Operator authentication & independent approval.
2. Bounded execution window unlock (`MISSION_CONTROL_EXECUTION_ENABLED=true`, `kill_switch=UNLOCKED`, phrase `UNLOCK TASK EXECUTION`).
3. Final execution preflight revalidating policy hash, tool fingerprint, resource registration, and resource SHA-256 hash.

---

## 4. Rollback & Revocation Semantics

- **Atomic Rollback to V1:** `ExecutionPolicyService.rollback_to_v1(conn, actor_id, reason)` immediately reverts active policy to V1 (`bda47521...`), instantly disabling `SAFE_READ_ONLY` eligibility while preserving historical V2 receipts and audit records.
- **Emergency Tool Revocation:** `ExecutionPolicyService.revoke_tool_capability(conn, tool_id, actor_id, reason)` removes specific tool capability from V2 immediately without requiring gateway restarts.
- **Emergency Resource Revocation:** `ReadOnlyResourceRegistry.set_resource_enabled(conn, resource_id, enabled=False, ...)` blocks subsequent preflight checks for that resource immediately.
