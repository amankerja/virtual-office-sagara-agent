# TOOL SECURITY POLICY V1 Specification

**Document ID:** SAGARA-DOC-TSP-V1-001  
**Version:** TOOL_SECURITY_POLICY_V1  
**Deterministic Semantic Hash:** `9bdd1d54102280e49f1d23a13be404c44bb0f22e2c3f100b8d6aed61e3ec033d`  
**Status:** `INSTALLED_BUT_NOT_ENABLED`  
**Active Production Execution Mode:** `SAFE_NO_TOOLS`  

---

## 1. Primary Principles & Governance

1. **Default: DENY**  
   No tool, capability, or resource is accessible unless explicitly enumerated in the approved capability matrix.
2. **Model Cannot Determine Permissions**  
   The model requests logical tool IDs; the server enforces capability boundaries, resource scopes, and argument schemas.
3. **TOOL REGISTERED ≠ TOOL SAFE ≠ TOOL AUTHORIZED**  
   Hermes internal registration or skill enablement does NOT imply authorization. Only server-side broker policies grant access.
4. **Independent Evolution & Cryptographic Binding**  
   `TOOL_SECURITY_POLICY_V1` evolves independently from `PRODUCTION_EXECUTION_POLICY_V1`. Future ActionIntents and ExecutionAuthorizations bind both policy versions and hashes cryptographically.

---

## 2. Policy Matrix Summary

```json
{
  "version": "TOOL_SECURITY_POLICY_V1",
  "status": "INSTALLED_BUT_NOT_ENABLED",
  "default_action": "DENY",
  "network_enabled": false,
  "shell_enabled": false,
  "mcp_enabled": false,
  "arbitrary_sql_enabled": false,
  "mutation_enabled": false,
  "approved_capabilities_count": 2,
  "policy_hash": "9bdd1d54102280e49f1d23a13be404c44bb0f22e2c3f100b8d6aed61e3ec033d"
}
```

---

## 3. Approved Future Read-Only Candidates (Exactly 2)

### Candidate 1: `runtime_status`
- **Tool ID:** `runtime_status`
- **Version:** `1.0.0`
- **Implementation Fingerprint:** `d7befb92ca4d5174`
- **Risk Class:** `READ_ONLY`
- **Read-Only Proven:** `true`
- **Operation:** `inspect_service`
  - **Description:** Server-constructed typed systemd property query via `/usr/bin/systemctl --user show <unit> --property=...`.
  - **Argument Schema:** Strict object (`{"unit": "hermes-gateway.service", "properties": [...]}`), `additionalProperties: false`.
  - **Resource Scope:**
    - Allowed Units: `["hermes-gateway.service"]`
    - Allowed Properties: `["ActiveState", "SubState", "MainPID", "NRestarts", "ActiveEnterTimestamp", "UnitFileState"]`
    - Allowed Profiles: `["sagara-lab"]`
  - **Constraints:**
    - `shell=False` (Strict absolute path and argv list)
    - Mutations forbidden (`restart`, `stop`, `start`, `kill`, `daemon-reload`)
    - Bounded Timeout: 5.0 seconds
    - Max Result Bytes: 8,192 bytes
    - Max Lines: 100 lines
- **Status:** `APPROVED_FOR_FUTURE_READ_ONLY_CANARY`

### Candidate 2: `document_inspection`
- **Tool ID:** `document_inspection`
- **Version:** `1.0.0`
- **Implementation Fingerprint:** `74ae804f084cc9bf`
- **Risk Class:** `READ_ONLY`
- **Read-Only Proven:** `true`
- **Operation:** `read_text`
  - **Description:** Server-controlled bounded text file inspection.
  - **Argument Schema:** Strict object (`{"path": "string", "max_bytes": integer}`), `additionalProperties: false`.
  - **Resource Scope:**
    - Scope Type: `FILESYSTEM_PATH`
    - Allowed Roots: `["docs", "artifacts"]`
    - Denied Patterns: `[".env*", "*.env", "*.pem", "*.key", "id_rsa*", "id_ed25519*", "*credentials*", "*token*", "*secret*", "*oauth*", "*cookie*", "*session*", "*auth*", "shadow", "passwd"]`
    - Allow Hidden: `false` (no leading dots)
    - Allow Symlinks: `false` (symlink escape detection)
    - Allowed Profiles: `["sagara-lab"]`
  - **Constraints:**
    - Path Traversal Defense: `..`, `%2e`, null byte `\x00` strictly rejected.
    - Binary Defense: binary headers rejected (`BINARY_FILE_DENIED`).
    - Secret Redaction: API keys, tokens, and private keys redacted to `[REDACTED_SECRET]`.
    - Untrusted Data Envelope: Output wrapped as untrusted data.
    - Max Result Bytes: 32,768 bytes
    - Max Lines: 500 lines
    - Timeout: 5.0 seconds
- **Status:** `APPROVED_FOR_FUTURE_READ_ONLY_CANARY`

---

## 4. Denied Tool Categories (Fail Closed)

The following categories are strictly forbidden from authorization under any read-only policy:

| Category | Typical Invocations | Reason Code | Security Rationale |
| :--- | :--- | :--- | :--- |
| **Generic Shell** | `bash`, `sh`, `powershell`, `cmd`, `run_command` | `TOOL_NOT_ALLOWED` | Arbitrary process execution can never be proven read-only. |
| **Network Access** | `http_get`, `curl`, `fetch`, `requests` | `NETWORK_DENIED` | HTTP GET can trigger state, exfiltrate tokens, or access cloud metadata (169.254.169.254). |
| **Model Context Protocol** | Dynamic MCP server integrations | `MCP_DENIED` | Third-party MCP tools lack deterministic static code proofs and unconstrained schemas. |
| **Filesystem Mutation** | `write_file`, `delete_file`, `mkdir`, `chmod` | `TOOL_NOT_ALLOWED` | Read-only mode strictly bans write operations. |
| **Systemd Mutation** | `restart`, `stop`, `start`, `kill` | `TOOL_OPERATION_NOT_ALLOWED` | Operational control is reserved for out-of-band operator procedures. |
| **Database Mutation** | Raw SQL queries, `INSERT`, `UPDATE`, `DROP` | `DATABASE_MUTATION_DENIED` | SQL injection and data corruption hazards. |
| **Cross-Profile Memory** | Inspecting sessions/memory of other profiles | `RESOURCE_SCOPE_DENIED` | Absolute profile boundary isolation must be maintained. |

---

## 5. Denial Reason Codes

- `TOOL_NOT_ALLOWED`: Tool not present in allowlist or belongs to a forbidden category.
- `TOOL_OPERATION_NOT_ALLOWED`: Operation is not defined or is mutation-capable.
- `RESOURCE_SCOPE_DENIED`: Target resource or profile is not in approved scope.
- `PATH_TRAVERSAL`: Path contains `..`, encoded escapes, or null bytes.
- `SYMLINK_ESCAPE`: Target path resolves outside approved root via symlink.
- `SENSITIVE_FILE_DENIED`: Target matches denylisted file pattern or is hidden.
- `BINARY_FILE_DENIED`: Non-text file content detected.
- `RESULT_SIZE_EXCEEDED`: Tool output exceeds byte/line budget.
- `NETWORK_DENIED`: Outbound network access requested.
- `MCP_DENIED`: Model Context Protocol tool requested.
- `TOOL_POLICY_STALE`: Intent was approved against an earlier policy hash.
- `TOOL_IMPLEMENTATION_DRIFT`: Handler implementation fingerprint mismatch.
- `READ_ONLY_PROOF_MISSING`: Tool capability lacks formal read-only proof.
- `INVALID_ARGUMENTS`: Extra properties detected or schema violation.
- `SAFE_NO_TOOLS_ACTIVE`: Production execution mode is SAFE_NO_TOOLS.
- `MISSING_POLICY`: No active tool security policy found (fails closed).
