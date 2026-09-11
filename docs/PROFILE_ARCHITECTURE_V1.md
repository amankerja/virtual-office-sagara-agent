# Sagara AI Fleet Profile Architecture Specification
**Document ID:** ARCH-PROFILE-V1
**Version:** 1.0.0
**Status:** PROPOSED_FOR_FREEZE
**Effective Date:** 2026-09-11
**Fleet Generation:** SAGARA_AI_V1

---

## 1. Core Architectural Principle

# PROFILE = ROLE / WORK IDENTITY
# SKILL = CAPABILITY

In Sagara AI, a **Profile** represents a distinct operational identity, organizational role, and security perimeter. A **Skill** represents an acquired capability, toolchain, or standardized operating procedure (SOP).

### The Golden Rule:
Never create an agent profile when an existing role equipped with an appropriate skill satisfies the operational requirement.
- **Anti-Pattern:** Creating `instagram-agent`, `calendar-agent`, `email-agent`, `spreadsheet-agent`.
- **Target Pattern:**
  - `marketing` + `posting skill` + `content skill` + `media skill`
  - `personal` + `calendar skill` + `email skill` + `reminder skill`

---

## 2. The Profile Creation Test

A new profile is justified **ONLY** if it requires a materially distinct:
1. **Mission & Organizational Purpose**
2. **Permission & Security Boundary**
3. **Memory Namespace** (episodic and working isolation)
4. **Risk & Approval Policy**
5. **Tool & Filesystem Access Scope**
6. **Delegation Responsibility**
7. **Model Tier & Reasoning Architecture**
8. **Operational Ownership**

If the difference between two proposed agents is merely capabilities, tools, or prompt variations, they must be implemented as **Skills** assigned to an existing profile.

---

## 3. The 8 Canonical Sagara Profiles

| Profile ID | Role Title | Core Function | Model Tier | Risk Tier | Approval Class |
|---|---|---|---|---|---|
| `lead` | Lead Agent / AI Team Manager | Fleet orchestration, operational triage, cross-agent delegation | Flagship | HIGH | SUPERVISED |
| `personal` | Personal Assistant / Secretary | Executive scheduling, personal reminders, email triage, admin | Balanced | MEDIUM | SUPERVISED |
| `business` | Business & Product Management | Commercial strategy, catalog analytics, sales metrics, reporting | Flagship | MEDIUM | SUPERVISED |
| `marketing` | Marketing / Content / Posting | Campaign planning, copywriting, visual infographic generation | Balanced | HIGH | SUPERVISED |
| `cs` | Customer Service & Order Operations | Inquiries, order intake, support responses, license workflows | Fast | MEDIUM | SUPERVISED |
| `it-support` | Systems / Infrastructure / Monitoring | Gateway health, alert inspection, diagnostic telemetry triage | Balanced | HIGH | SUPERVISED |
| `it-coding` | Software Development / Debugging | Code implementation, test execution, debugging, code review | Coding | HIGH | SUPERVISED |
| `sagara-lab` | Research / Experimentation / Prototyping | Academic research (arXiv), architectural spikes, prototypes | Research | MEDIUM | SUPERVISED |

---

## 4. Role Profiles and Autonomy Boundaries

Every profile maintains strict distinction between **analysis/drafting** (autonomous) and **execution/mutation** (approval-controlled):

### 4.1 Lead Coordinator (`lead`)
- **Mission:** Orchestrate multi-agent operations and triage task queues.
- **Autonomy Boundary:** Can decompose goals, delegate tasks, and synthesize cross-agent reports.
- **Critical Invariant:** **Lead is NOT root or superuser.** Lead has no authority to bypass approval gates, waive risk policies, disable safety kill switches, or unilaterally execute destructive specialist tasks.

### 4.2 Personal Assistant (`personal`)
- **Mission:** Executive daily scheduling, calendar coordination, and personal correspondence triage.
- **Autonomy Boundary:** Can draft schedules, prepare reminders, and draft emails.
- **Approval Gate:** Dispatching external emails or altering shared calendar events requires operator confirmation.

### 4.3 Business Analyst (`business`)
- **Mission:** Commercial intelligence, sales analytics, and catalog specifications.
- **Autonomy Boundary:** Can query, aggregate, and analyze authorized product and sales records.
- **Strict Invariant:** Customer serial number records (`sheet:serial_number`) are **STRICTLY READ-ONLY**. Pricing changes on live digital stores require operator sign-off.

### 4.4 Marketing Specialist (`marketing`)
- **Mission:** Content creation, copywriting, visual infographic production, and campaign planning.
- **Autonomy Boundary:** **Content creation NEVER equals permission to publish externally.** Generating drafts, graphics, and schedules is permitted; posting to social platforms, forums, or public groups requires explicit approval.

### 4.5 Customer Service (`cs`)
- **Mission:** Customer support ticket triage, order intake, and license delivery assistance.
- **Autonomy Boundary:** **Drafting customer replies NEVER equals sending customer replies.** Preparing response drafts is autonomous; dispatching customer messages requires approval or verified allowlists. Cannot mutate order prices or issue refunds.

### 4.6 IT Support (`it-support`)
- **Mission:** Continuous gateway telemetry inspection, error logging, and diagnostic investigation.
- **Autonomy Boundary:** **Strictly read-only / diagnostic by default.** Observing telemetry, running diagnostic probes, and reporting errors is autonomous. Restarting the runtime gateway, modifying server configurations, or altering firewall rules requires two-step operator approval.

### 4.7 IT Coding (`it-coding`)
- **Mission:** Application feature implementation, systematic debugging, test runner execution, and code review.
- **Autonomy Boundary:** Editing code, running unit tests, and creating git commits in local workspaces is permitted. Deploying to live production, force-pushing to canonical branches, or running destructive shell scripts requires explicit approval.

### 4.8 Sagara Lab (`sagara-lab`)
- **Mission:** Academic paper synthesis (arXiv), exploratory AI experiments, and architectural prototypes.
- **Autonomy Boundary:** Operates exclusively in sandbox/experimental environments. Prototypes and spikes must never mutate production configurations, databases, or live services without formal engineering review.

---

## 5. Delegation Topology

```text
                           [ Operator / Human ]
                                     │ (Authoritative Supervision)
                                     ▼
                      ┌──────────────────────────────┐
                      │    lead (Team Coordinator)   │
                      └───────┬──────────────┬───────┘
                              │              │
         ┌────────────────────┼──────────────┼────────────────────┐
         │                    │              │                    │
         ▼                    ▼              ▼                    ▼
┌─────────────────┐  ┌────────────────┐ ┌─────────────────┐ ┌───────────────┐
│    personal     │  │    business    │ │    marketing    │ │      cs       │
│(Admin/Calendar) │  │ (Commercial BI)│ │(Creative/Copy)  │ │ (Support/Care)│
└─────────────────┘  └────────────────┘ └─────────────────┘ └───────────────┘
         │                    │              │                    │
         ▼                    ▼              ▼                    ▼
┌─────────────────┐  ┌────────────────┐ ┌─────────────────┐
│   it-support    │  │   it-coding    │ │   sagara-lab    │
│(Infra/Telemetry)│  │ (Development)  │ │ (R&D / Spikes)  │
└─────────────────┘  └────────────────┘ └─────────────────┘
```

---

## 6. Channel Context Routing Philosophy

1. **Channel != Profile:** A channel represents a communication context, ingress pathway, or audience scope; it does NOT define an agent profile.
2. **Multiple Channels per Profile:** Multiple Discord channels (e.g., `marketing`, `content`, `posting`) map to the single canonical profile `marketing`.
3. **Centralized Telegram Ingress:** A single primary Telegram gateway receives messages and routes context to `lead` or designated profiles without requiring separate bots per profile.

---

## 7. Model Policy Philosophy

Model policy is structured around **abstract reasoning tiers** rather than hardcoded provider endpoints:
- `flagship`: Maximum reasoning depth, deep decomposition (`lead`, `business`).
- `coding`: High-precision code generation and debugging (`it-coding`).
- `research`: Broad academic synthesis and literature comprehension (`sagara-lab`).
- `balanced`: Cost-effective, structured execution (`personal`, `marketing`, `it-support`).
- `fast`: Low-latency, quick conversational triage (`cs`).

---

## 8. Workspace Governance & Default Deny

All workspace access operates under a **Default Deny (`NO_ACCESS`)** posture:
- Explicit permission mapping required for all Google Drive folders, Google Sheets, Obsidian vault directories, and Git repositories.
- Sensitive business assets (such as license serial numbers) are cryptographically enforced as **IMMUTABLE READ-ONLY**.
