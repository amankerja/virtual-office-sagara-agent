# Sagara Mission Control — Profile Configuration Mutation Proposal (RFC)

## Status: PROPOSAL ONLY (UNFROZEN)
*Document Version:* 1.0.0-draft  
*Target Backend Contract:* Future Sagara API Contract V1.1 / Governance & Profile Mutation Extension  
*Safety Notice:* SAGARA_MISSION_CONTROL_API_CONTRACT_V1 remains strictly frozen. Direct file mutations (`profile.yaml`, `skills.yaml`) from the browser are strictly prohibited.

---

## 1. Executive Summary & Why the ChangeSet Model Matters

In enterprise AI operations, modifying an agent's configuration (such as assigning or unassigning skills, changing tool permissions, or updating model preferences) directly impacts security boundaries and operational stability.

**Antipattern to Avoid:**
Direct `PATCH /api/v1/profiles/{id}` that immediately overwrites disk files (`profile.yaml`).

**Required Enterprise Workflow:**
```text
┌─────────────────┐       ┌────────────────────────┐       ┌────────────────────┐
│  Operator UI    │ ────> │ ConfigurationChangeSet │ ────> │ Validation Engine  │
│  (Draft Edits)  │       │ (Staged Diffs)         │       │ (Syntax & Policy)  │
└─────────────────┘       └────────────────────────┘       └─────────┬──────────┘
                                                                     │
                                                                     ▼
┌─────────────────┐       ┌────────────────────────┐       ┌────────────────────┐
│ Audit & Rollback│ <──── │ Controlled Apply       │ <──── │ Human Approval Gate│
│ (Telemetry)     │       │ (Git / Disk / Restart) │       │ (High Risk Actions)│
└─────────────────┘       └────────────────────────┘       └────────────────────┘
```

---

## 2. Core ChangeSet Data Model

```typescript
export interface ProfileChangeItem {
  field: 'skills' | 'model' | 'description' | 'env';
  action: 'ADD' | 'REMOVE' | 'UPDATE';
  targetValue: string | Record<string, unknown>;
  previousValue?: string | Record<string, unknown>;
  rationale?: string;
}

export interface ProfileConfigurationChangeSet {
  id: string;
  profileId: string;
  author: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'APPLIED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  changes: ProfileChangeItem[];
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  approvalRequestId?: string;
  appliedAt?: string;
}
```

---

## 3. Proposed REST API Endpoints

### 3.1 Fetch Current Configuration
```http
GET /api/v1/profiles/{id}/configuration
```
Returns profile metadata, allowed skills, default model parameters, and read-only vs editable field permissions.

### 3.2 Create or Update Draft ChangeSet
```http
POST /api/v1/profile-change-sets
Content-Type: application/json

{
  "profile_id": "marketing",
  "changes": [
    {
      "field": "skills",
      "action": "ADD",
      "target_value": "content-calendar-mingguan",
      "rationale": "Enable weekly editorial calendar synthesis"
    },
    {
      "field": "skills",
      "action": "REMOVE",
      "target_value": "legacy-posting-v1",
      "rationale": "Deprecated tool replacement"
    }
  ]
}
```

### 3.3 Validate ChangeSet
```http
POST /api/v1/profile-change-sets/{id}/validate
```
Performs static analysis:
- Does the skill exist in `SkillRegistry`?
- Does the profile allow the skill's domain?
- Are skill dependencies satisfied?
- Are memory namespaces conflicting?

### 3.4 Request Approval & Apply
```http
POST /api/v1/profile-change-sets/{id}/apply
```
If governance policies require approval, creates an `ApprovalRequest` in Sagara Governance before applying to disk or triggering runtime reloads.

---

## 4. Current Phase UX Implementation Rules

In Prompt 11.5:
1. **Zero Backend Network Mutation**: No calls to mutation endpoints.
2. **Local Draft Persistence**: Drafts are tracked in UI Zustand state and persisted to `localStorage` under `sagara-agent-config-drafts`.
3. **Explicit Draft Warning**: A prominent notification banner states:  
   `"Local Draft — Configuration changes are held locally and have not been applied to Sagara production."`
4. **Apply to Production Disabled**: The `Apply to Production` button is explicitly disabled with the explanation tooltip:  
   `"Production configuration mutations require future ChangeSet approval integration."`
