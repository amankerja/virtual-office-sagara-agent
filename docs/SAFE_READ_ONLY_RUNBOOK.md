# SAFE_READ_ONLY Operations & Incident Runbook

**Document ID:** SAGARA-DOC-RUNBOOK-001  
**Version:** 1.0  
**Date:** 2026-09-12  
**Target Audience:** Sagara AI Mission Control Operators & SREs  

---

## 1. Tool Eligibility Verification Workflow

When evaluating a new or existing capability for read-only eligibility:
1. **Source Inspection:** Verify that the underlying implementation does not invoke `os.system`, `subprocess(shell=True)`, `eval`, `exec`, or generic HTTP clients.
2. **Resource Scoping:** Define explicit, bounded resource constraints:
   - Filesystem: Allowed directory roots (no root `/`, `~`, or sensitive config directories).
   - System services: Specific allowlisted unit names and properties.
   - Database: Specific predefined parameterized queries (never raw SQL strings).
3. **Fingerprint Calculation:** Compute deterministic SHA-256 implementation fingerprint and record in `IMPLEMENTATION_FINGERPRINTS`.
4. **Policy Inclusion:** Propose inclusion in `ToolSecurityPolicy` via draft changeset with diff inspection.

---

## 2. Policy Hash Verification & Drift Detection

- **Policy Hash Verification:**  
  Each ActionIntent binds `tool_security_policy_version` and `tool_security_policy_hash`. Preflight re-computes active hash via `compute_tool_policy_hash()` and blocks execution if mismatch is detected (`TOOL_POLICY_STALE`).
- **Implementation Drift Defense:**  
  If the broker handler logic changes without updating the fingerprint, preflight fails closed with `TOOL_IMPLEMENTATION_DRIFT`.

---

## 3. Emergency Tool Revocation Procedure

If a capability exhibits unexpected behavior or security regression:

### Immediate Tool Capability Revocation via API/Service
1. Invoke audited tool revocation:
   ```bash
   curl -X POST http://localhost:8000/api/v1/execution-policy/revoke-tool \
     -H "Content-Type: application/json" \
     -d '{"tool_id": "runtime_status", "reason": "Emergency revocation due to anomaly"}'
   ```
   Or via Python Service:
   ```python
   from app.db.connection import get_db_connection
   from app.services.execution_policy_service import ExecutionPolicyService
   conn = get_db_connection()
   ExecutionPolicyService.revoke_tool_capability(conn, "runtime_status", "operator:sre", "Emergency revocation")
   ```
2. Any pending intents bound to the prior policy hash immediately fail preflight with `POLICY_VERSION_STALE` or `TOOL_NOT_PERMITTED`.
3. **No Gateway Restart Required:** Enforcement is server-side in the Mission Control control plane; revocation takes effect immediately without restarting `hermes-gateway.service`.

### Immediate Read-Only Resource Revocation
If a document resource must be revoked immediately:
```bash
curl -X POST http://localhost:8000/api/v1/execution-policy/resources/toggle \
  -H "Content-Type: application/json" \
  -d '{"resource_id": "DOC-CANARY-001", "enabled": false, "reason": "Emergency resource deactivation"}'
```
Future preflight requests for this resource fail closed with `RESOURCE_REVOKED`.

### Policy Rollback to V1 (Immediate Safe Recovery)
If V2 must be rolled back completely:
```bash
curl -X POST http://localhost:8000/api/v1/execution-policy/rollback \
  -H "Content-Type: application/json" \
  -d '{"reason": "Emergency rollback to PRODUCTION_EXECUTION_POLICY_V1"}'
```
This atomically restores V1 as the active policy (`bda47521c788...`), immediately revoking all `SAFE_READ_ONLY` eligibility while preserving historical receipts.

---

## 4. Automatic Incident Relock Triggers

The system automatically triggers an emergency execution lock (`kill_switch = LOCKED`) and closes active execution windows under any of the following conditions:
- **Unexpected Mutation:** Any write or modification attempt observed during a read-only execution.
- **Tool Receipt Discrepancy:** Hermes execution receipt containing tools not authorized in the ActionIntent.
- **Network Request Detected:** Any outbound network socket opened by a tool broker process.
- **Secret Access Attempt:** An intent attempting to read `.env`, keys, or credentials.
- **Scope Escape:** Path traversal or symlink escape detected by path validation.
- **Resource Drift:** File hash mismatch between approval and preflight (`DOCUMENT_RESOURCE_CHANGED`).
- **Audit Tampering:** Any broken link in the append-only SHA-256 audit ledger.

---

## 5. Investigation Workflow for Policy Violations

When a tool request is denied:
1. Check `tool_execution_audits` in `data/mission-control.db`:
   ```sql
   SELECT id, tool_id, operation_id, profile_id, status, denial_reason, created_at
   FROM tool_execution_audits
   ORDER BY created_at DESC LIMIT 10;
   ```
2. Verify correlation ID against the audit ledger:
   ```sql
   SELECT sequence, event_id, action, outcome, reason
   FROM audit_ledger
   WHERE action IN ('TOOL_PREFLIGHT_DENIED', 'execution_policy.applied', 'execution_policy.rollback')
   ORDER BY sequence DESC LIMIT 5;
   ```
3. Check application logs for detailed preflight rejection messages.
