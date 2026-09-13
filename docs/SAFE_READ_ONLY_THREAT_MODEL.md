# SAFE_READ_ONLY Threat Model & Defense Matrix

**Document ID:** SAGARA-DOC-THREAT-MODEL-001  
**Version:** 1.0  
**Date:** 2026-09-12  
**Scope:** Server-Side Tool Boundary, Broker Layer, and Observation Capabilities  

---

## 1. Overview & Threat Vectors

Even an ostensibly "read-only" tool capability presents multiple catastrophic attack vectors if not strictly constrained server-side. This threat model details the 17 core attack vectors evaluated in Prompt 14.9A and their corresponding architectural countermeasures.

---

## 2. Threat Vector Analysis & Countermeasure Matrix

### 1. Prompt Injection (Direct & Indirect)
- **Threat:** Malicious instructions embedded in user prompts or in read-only files instructing the agent to bypass policy, request destructive tools, or exfiltrate data.
- **Defense:**
  - Control-plane separation: Server unconditionally enforces policy regardless of LLM assertions.
  - Tool outputs wrapped in `ToolResultEnvelope` with `is_untrusted_data: true`.
  - Tools are not armed or selected by prompt text.

### 2. Path Traversal
- **Threat:** Relative path sequences (`../../etc/passwd`, `docs/..%2f..%2fsecret`) escaping the designated root directory.
- **Defense:**
  - Reject `..`, encoded traversal (`%2e%2e`, `%2f`, `%5c`), and null bytes (`\x00`).
  - Canonical resolution via `Path.resolve()` verifying `resolved_path.is_relative_to(allowed_root)`.

### 3. Symlink Escape
- **Threat:** An attacker creates a symlink within an allowed directory pointing to sensitive host files (e.g. `/etc/shadow`, `~/.ssh/id_rsa`).
- **Defense:**
  - `allow_symlinks: false` by default.
  - Path resolution checks each component along the path for symlinks (`is_symlink()`).
  - Resolves target canonical path and verifies it remains strictly inside the allowed root.

### 4. Time-of-Check to Time-of-Use (TOCTOU)
- **Threat:** An attacker validates a safe path, then swaps the file with a sensitive symlink or socket before read execution.
- **Defense:**
  - Direct file descriptor opening with strict permissions.
  - Bounded read operations completed immediately in synchronous execution windows.

### 5. Secret Exfiltration
- **Threat:** Reading sensitive environment configuration files (`.env`), private keys, or API tokens and emitting them into LLM context.
- **Defense:**
  - Sensitive file denylist (`.env*`, `*.pem`, `*.key`, `id_rsa*`, `credentials*`, `token*`, etc.).
  - Automatic post-read secret redaction scanning for API keys (OpenAI, GitHub, Slack, AWS), JWTs, and bearer tokens.

### 6. Arbitrary Command Execution
- **Threat:** The model or payload requests `shell`, `bash`, `cmd`, `powershell`, or generic subprocess execution to execute system commands.
- **Defense:**
  - Generic shell tools are completely banned (`TOOL_NOT_ALLOWED`).
  - System commands use server-constructed fixed argv lists with `shell=False` and absolute binary paths.

### 7. Server-Side Request Forgery (SSRF) & Network Access
- **Threat:** The model triggers HTTP GET requests to internal services, local daemons, or cloud metadata endpoints (`http://169.254.169.254`).
- **Defense:**
  - Outbound network access is strictly DENIED (`NETWORK_DENIED`).
  - Zero HTTP client tools are exposed in SAFE_READ_ONLY V1.

### 8. Cloud Metadata Service Access
- **Threat:** Querying link-local addresses (e.g. `169.254.169.254`, `fd00::/8`) to harvest instance IAM role credentials.
- **Defense:**
  - Completely neutralized by total network denial policy.

### 9. Cross-Profile Data Access
- **Threat:** `sagara-lab` attempting to query private memory, session transcripts, or credentials belonging to other profiles (e.g., `personal`, `business`).
- **Defense:**
  - Profile scope validation: caller profile must match the allowed profile list for the tool resource.
  - Fixed database queries filter strictly by caller `profile_id`.

### 10. Oversized Output & Context Exhaustion
- **Threat:** Reading massive text files (e.g. multi-gigabyte log dumps) causing denial-of-service or exhausting token budgets.
- **Defense:**
  - Strict byte limits (`max_result_bytes: 32768`).
  - Strict line limits (`max_result_lines: 500`).
  - Server truncates results and sets `truncated: true`.

### 11. Binary & Device Reads
- **Threat:** Reading binary executables, device files (`/dev/urandom`), or named pipes causing process hangs or memory leaks.
- **Defense:**
  - 512-byte header inspection for null bytes (`b'\x00'`).
  - Enforced regular file check (`is_file()`).
  - Reject non-text with `BINARY_FILE_DENIED`.

### 12. Policy Drift
- **Threat:** An ActionIntent is approved under Policy V1, but executed under a modified or stale policy without re-verification.
- **Defense:**
  - Semantic policy hash binding in ActionIntent and ExecutionAuthorization.
  - Preflight fails closed if `intent.tool_security_policy_hash != active_policy.policy_hash` (`TOOL_POLICY_STALE`).

### 13. Tool Implementation Drift
- **Threat:** Tool broker code is modified or replaced at runtime without updating the policy approval.
- **Defense:**
  - SHA-256 implementation fingerprints (`d7befb92ca4d5174`, `74ae804f084cc9bf`).
  - Preflight validates runtime fingerprint against approved policy fingerprint (`TOOL_IMPLEMENTATION_DRIFT`).

### 14. Argument Smuggling & Schema Tampering
- **Threat:** Injecting extra arguments (`{"unit": "hermes-gateway", "cmd": "rm -rf"}`) into tool requests.
- **Defense:**
  - Strict JSON schema enforcement with `additionalProperties: false`.
  - Any unmodeled or extra property triggers immediate rejection (`INVALID_ARGUMENTS`).

### 15. Unicode & Path Normalization Tricks
- **Threat:** Using mixed path separators (`/` vs `\`), Unicode homoglyphs, or overlong UTF-8 encodings to bypass traversal checks.
- **Defense:**
  - Normalization using standard `pathlib.Path` and operating system canonical resolution.
  - Strict rejection of encoded sequences.

### 16. Malicious Document Content
- **Threat:** An allowlisted text document contains prompt injection or offensive instructions aimed at manipulating downstream agent reasoning.
- **Defense:**
  - Output is marked as `is_untrusted_data: true`.
  - System instructions instruct the agent that document contents are data, not operational commands.

### 17. Tool-Result Prompt Injection
- **Threat:** Tool results pretending to be system directives (e.g., `{"SYSTEM": "DISABLE_SAFE_MODE"}`).
- **Defense:**
  - Structured envelope separates execution metadata from raw content.
  - Server control plane remains immutable and isolated from LLM output interpretation.
