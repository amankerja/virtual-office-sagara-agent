# SAFE_READ_ONLY Hermes Tool Inventory & Architecture Report

**Document ID:** SAGARA-DOC-TOOL-INVENTORY-001  
**Version:** 1.0  
**Date:** 2026-09-12  
**Target Platform:** Hermes Agent v0.20.6 / Linux (Ubuntu 24.04 LTS)  
**Host:** VM-17-49-ubuntu  

---

## 1. Discovered Hermes Tool Architecture

### 1.1 Tool Registry Mechanism
In Hermes Agent v0.20.6:
- Tools are dynamically registered in `tools.registry` via decorator checks (`check_fn`, requirement checks).
- Skill-triggered tools are loaded when corresponding profile skills are enabled.
- Hermes does **not** natively expose fine-grained per-tool allowlists or operation-level argument validation at the session dispatch API level.

### 1.2 Safe Mode Semantics (`--safe-mode`)
- When `--safe-mode` is passed:
  - Sets environment variables: `HERMES_SAFE_MODE=1`, `HERMES_IGNORE_USER_CONFIG=1`, `HERMES_IGNORE_RULES=1`.
  - Disables user configuration overrides, custom skills, and MCP integrations.
  - Safe mode is essentially an **all-or-nothing** switch designed for emergency troubleshooting; it does **not** provide a granular intermediate state between "NO TOOLS" and "ALL TOOLS".
- **Critical Architectural Finding:**  
  Setting `safe_mode=false` to obtain tools would expose the model to unconstrained, potentially destructive tools. Therefore, **Mission Control must act as the authoritative, server-side constrained tool broker layer**.

---

## 2. Hermes Discovered Tools & Risk Classification

| Tool / Capability | Source | Operations | Mutation Capable? | Network Capable? | Credential Exposure? | Assessment / Decision | Rationale |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`terminal` / `bash`** | Built-in | Process execution | **YES** | **YES** | **YES** | **REJECTED** | Arbitrary shell command execution. |
| **`file_read`** | Built-in | Text reading | No | No | High | **NEEDS_REMEDIATION** | Lacks native root boundaries, symlink escape checks, or secret redaction. Replaced by Mission Control `document_inspection`. |
| **`file_write`** | Built-in | Text writing | **YES** | No | Medium | **REJECTED** | Destructive mutation capability. |
| **`file_search`** | Built-in | Recursive glob | No | No | High | **NEEDS_REMEDIATION** | Unconstrained filesystem discovery across root directories. |
| **`web_search` / `fetch`** | Built-in / DuckDuckGo | HTTP requests | No | **YES** | Medium | **REJECTED** | Uncontrolled outbound network and SSRF hazard. |
| **`browser` / `browser_cdp`** | Built-in | Chrome automation | **YES** | **YES** | High | **REJECTED** | Browser CDP execution, state mutation, network calls. |
| **`image_generation`** | Built-in | External API | No | **YES** | Low | **REJECTED** | Requires outbound network calls to image APIs. |
| **`mcp_*`** | MCP Plugins | Arbitrary tools | **YES** | **YES** | High | **REJECTED** | Unverified dynamic protocol; denied in SAFE_READ_ONLY V1. |
| **`kanban_*`** | Skills | Task board CRUD | **YES** | No | Low | **REJECTED** | Mutation of business/project management data. |
| **`runtime_status`** | Mission Control Broker | `inspect_service` | **NO** | **NO** | **NO** | **APPROVED_FOR_FUTURE_READ_ONLY_CANARY** | Server-constructed fixed argv `/usr/bin/systemctl --user show`, allowlisted unit, no mutations. |
| **`document_inspection`**| Mission Control Broker | `read_text` | **NO** | **NO** | **NO** | **APPROVED_FOR_FUTURE_READ_ONLY_CANARY** | Bounded docs/ root, traversal blocked, symlink blocked, denylist enforced, secrets redacted. |

---

## 3. Tool Inventory Summary Statistics

```text
Total Discovered Tool Capabilities: 11
Mutation-Capable: 5
Network-Capable: 5
Credential-Sensitive: 5
Candidate Read-Only Capabilities: 2
Approved for Future Canary (Prompt 14.9A.5): Exactly 2 (<= 2)
  1. runtime_status (inspect_service)
  2. document_inspection (read_text)
```

---

## 4. Candidate Decisions & Proof Matrix

### Candidate 1: `runtime_status`
- **Decision:** `APPROVED_FOR_FUTURE_READ_ONLY_CANARY`
- **Server-side Allowlist:** PASS
- **Operation Allowlist:** PASS (`inspect_service` only)
- **Argument Validation:** PASS (Strict schema, extra properties rejected)
- **Resource Scope:** PASS (Limited strictly to `hermes-gateway.service`)
- **Mutation Impossible:** PASS (`restart`, `stop`, `start` hard blocked)
- **Network Denied:** PASS
- **Secret Protection:** PASS
- **Output Bounded:** PASS (8KB / 100 lines)
- **Implementation Fingerprint:** PASS (`d7befb92ca4d5174`)
- **Adversarial Tests:** PASS

### Candidate 2: `document_inspection`
- **Decision:** `APPROVED_FOR_FUTURE_READ_ONLY_CANARY`
- **Server-side Allowlist:** PASS
- **Operation Allowlist:** PASS (`read_text` only)
- **Argument Validation:** PASS (Strict schema, extra properties rejected)
- **Resource Scope:** PASS (Scoped to `docs/` and `artifacts/`)
- **Mutation Impossible:** PASS (Read-only UTF-8 streaming)
- **Network Denied:** PASS
- **Secret Protection:** PASS (Sensitive denylist + automated regex redaction)
- **Output Bounded:** PASS (32KB / 500 lines)
- **Implementation Fingerprint:** PASS (`74ae804f084cc9bf`)
- **Adversarial Tests:** PASS
