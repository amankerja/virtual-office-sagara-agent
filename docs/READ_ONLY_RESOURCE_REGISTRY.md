# Read-Only Resource Registry (Prompt 14.9A.7)

## 1. Concept & Architectural Rationale

To prevent prompt injection, path traversal, and arbitrary filesystem reconnaissance, the client or AI agent must **never** provide arbitrary filesystem paths to the backend.

Instead, the server maintains an explicit, audited `ReadOnlyResourceRegistry`.
- Clients/Operators select a logical `resource_id` (e.g. `DOC-CANARY-001`).
- The server resolves that logical ID to a canonical filesystem path or system resource.
- The server computes the SHA-256 hash of the canonical file at preflight and binds it to the `ActionIntent`.
- If the file changes between approval and dispatch, execution fails closed with `DOCUMENT_RESOURCE_CHANGED`.

---

## 2. Resource Data Model

```python
class ReadOnlyResource(BaseModel):
    resource_id: str             # Logical identifier (e.g. 'DOC-CANARY-001')
    display_name: str            # Human-readable title
    canonical_path: str          # Internal absolute filesystem or unit path
    root_id: str                 # Canonical root identifier (e.g. 'docs', 'artifacts', 'systemd')
    resource_type: str           # 'DOCUMENT' or 'SYSTEMD_SERVICE'
    enabled: bool                # Eligibility flag for preflight
    classification: str          # Sensitivity label (e.g. 'RESTRICTED_READ_ONLY')
    max_bytes: int               # Hard byte truncation ceiling (max 32768)
    max_lines: int               # Hard line truncation ceiling (max 500)
    current_hash: Optional[str]  # Authoritative SHA-256 hash
    allow_redaction: bool        # Whether secret redaction is mandatory
    owner_policy: str            # Policy version authorizing this resource
```

---

## 3. Initial Canonical Resource Allowlist

| Resource ID | Display Name | Resource Type | Classification | Max Limits | Redaction |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `DOC-CANARY-001` | Docs Architecture Overview | `DOCUMENT` | `RESTRICTED_READ_ONLY` | 32 KB / 500 lines | Mandatory |
| `DOC-CANARY-ARTIFACT-001` | Phase Completion Artifact | `DOCUMENT` | `RESTRICTED_READ_ONLY` | 32 KB / 500 lines | Mandatory |
| `hermes-gateway.service` | Hermes Gateway Service Status | `SYSTEMD_SERVICE` | `SYSTEM_STATUS_READ_ONLY` | 8 KB / 100 lines | N/A |

### Strict Boundary Invariant
- **No Wildcard Directories:** Registering `docs/architecture-overview.md` does **not** grant access to `docs/*` or any sibling files.
- **No Freeform Path Field:** The Mission Control frontend strictly renders a dropdown of registered logical resources. No input field exists for arbitrary file paths or service names.

---

## 4. Lifecycle & Changeset Semantics

Adding or revoking a readable resource requires:
```text
Draft Changeset → Validate Canonical Path → Compute SHA-256 Hash → Operator Approval → Atomic Apply
```
Every change logs an audited entry (`resource_registry.changed` or `resource_registry.revoked`) in the tamper-evident audit ledger.
