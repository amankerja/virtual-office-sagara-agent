# Sagara Mission Control — Hermes Session Observability Semantics

**Document ID:** `SAGARA-DOC-SESSION-SEMANTICS-V1`  
**Hermes Agent Version:** `v0.20.6 (2026.8.27) · upstream d15ed444 · local a9c783f2`  
**Architecture:** Isolated Multi-Store Profile Database Topology  

---

## 1. Storage Architecture Overview (Prompt 14.6 Section 78-82)

In Hermes Agent v0.20.6, session state is persisted across SQLite databases based on profile environment scoping:

```text
/home/ubuntu/
├── .hermes/
│   ├── state.db                     <-- Central / Default-Profile Session Store
│   └── profiles/
│       ├── lead/
│       │   └── state.db             <-- Isolated Profile Store (lead)
│       ├── personal/
│       │   └── state.db             <-- Isolated Profile Store (personal)
│       ├── business/
│       │   └── state.db             <-- Isolated Profile Store (business)
│       ├── marketing/
│       │   └── state.db             <-- Isolated Profile Store (marketing)
│       ├── cs/
│       │   └── state.db             <-- Isolated Profile Store (cs)
│       ├── it-support/
│       │   └── state.db             <-- Isolated Profile Store (it-support)
│       ├── it-coding/
│       │   └── state.db             <-- Isolated Profile Store (it-coding)
│       └── sagara-lab/
│           └── state.db             <-- Isolated Profile Store (sagara-lab)
```

When Hermes is invoked without specifying a custom profile directory (`HERMES_HOME` unset), it reads and writes to `~/.hermes/state.db`.

When Hermes is invoked targeting an isolated profile (e.g. `HERMES_HOME=/home/ubuntu/.hermes/profiles/sagara-lab`), its session tables are populated exclusively inside `~/.hermes/profiles/sagara-lab/state.db`.

---

## 2. Canonical Session Metric Definitions (Prompt 14.6 Section 79)

To prevent confusion and eliminate misleading "global" labels:

| Canonical Metric Name | Physical Storage Location | Meaning & Scope |
|---|---|---|
| `central_store_sessions` (or `default_profile_sessions`) | `~/.hermes/state.db` | Sessions executed under the default or unassigned Hermes profile. Does **not** include isolated profile sessions. |
| `profile_local_sessions` | `~/.hermes/profiles/<profile_id>/state.db` | Sessions executed under a specific provisioned agent profile. |
| `aggregate_distinct_sessions` | Union of all `state.db` files | Total distinct sessions across the entire fleet, deduplicated by authoritative `session_id`. |

---

## 3. Reconciliation of Canary 001 Observations

During **Prompt 14.5 Single Safe Production Canary**:

- **Central Store Metric:**  
  Before canary: `85`  
  After canary: `85`  
  Delta: `0`
- **Sagara Lab Profile Store Metric:**  
  Before canary: `3`  
  After canary: `4`  
  Delta: `+1` (Session `20260911_160732_6b24b7` created)
- **Aggregate Fleet Metric:**  
  Before canary: `88`  
  After canary: `89`  
  Delta: `+1`

### Authoritative Canary Status
This terminology clarification strictly affirms the validity of Canary 001:
1. Direct Hermes session receipt was extracted from CLI standard output (`20260911_160732_6b24b7`).
2. The session was physically inspected in `/home/ubuntu/.hermes/profiles/sagara-lab/state.db`.
3. The Task ↔ Session correlation edge was confirmed directly without heuristics.
4. Zero duplicate sessions were created in the central store or other profile stores.

---

## 4. Multi-Store Observability Guidelines

When querying or aggregating session data in Mission Control:

1. **Explicit Scoping:** Always attach `profile_id` and `store_path` to session telemetry objects.
2. **Authoritative Primary Key:** Deduplicate sessions by `session_id`. Never sum counts naively if a session could be copied or mirrored.
3. **Bounded Reads:** Avoid pathological N+1 filesystem probes. Cache profile directory mappings and inspect active profile databases directly.
