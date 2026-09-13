# SAGARA AI — PRODUCTION PROFILE REGISTRY BASELINE

**Document Version:** 1.0.0  
**Verification Date:** 2026-09-11  
**Mode:** READ-ONLY LIVE VERIFICATION (Zero Mutation)  
**Host:** `VM-17-49-ubuntu`  
**User:** `ubuntu`  
**Sagara Root:** `/home/ubuntu/sagara-agent`  
**Git Branch:** `main`  
**Git Commit:** `bad9d7d2495685531c5e533d5a2e9f4a2674b6a5`  
**Git Status:** Verified untouched by validation probe  

---

## 1. Executive Summary

This document records the authoritative production baseline of the Sagara AI multi-agent system running on `VM-17-49-ubuntu`. All data was extracted via read-only introspections directly invoking canonical production classes `core.registry.profile.ProfileRegistry` and `core.registry.skill.SkillRegistry`.

---

## 2. Production ProfileRegistry

**Status:** Authoritative  
**Total Profiles:** 8  
**Enabled Profiles:** 8  
**Disabled Profiles:** 0  

| Profile ID | Role Title | Enabled | Memory Namespace | Allowed Domains | Assigned Skills |
| :--- | :--- | :---: | :--- | :--- | :---: |
| **`business`** | Business Strategic Operator | `true` | `profile:business` | `business`, `productivity`, `research`, `data-analysis`, `google-workspace`, `discord`, `obsidian` | 8 |
| **`cs`** | Customer Support Agent | `true` | `profile:cs` | `business`, `career`, `email`, `productivity`, `customer-service`, `google-workspace`, `discord`, `obsidian` | 7 |
| **`it-coding`** | IT Coding Specialist | `true` | `profile:it-coding` | `development`, `repository`, `infrastructure`, `software-development`, `devops`, `google-workspace`, `discord`, `obsidian`, `github` | 5 |
| **`it-support`** | IT Infrastructure & Ops Support | `true` | `profile:it-support` | `software-development`, `research`, `devops`, `ops`, `google-workspace`, `discord`, `obsidian`, `github` | 3 |
| **`lead`** | Team Lead & Orchestrator | `true` | `profile:lead` | `general`, `system`, `development`, `career`, `autonomous-ai-agents`, `research`, `productivity`, `software-development`, `google-workspace`, `discord`, `obsidian`, `telegram`, `github` | 4 |
| **`marketing`** | Marketing & Social Media Strategist | `true` | `profile:marketing` | `creative`, `media`, `social-media`, `marketing`, `google-workspace`, `discord`, `obsidian` | 6 |
| **`personal`** | Personal Assistant | `true` | `profile:personal` | `personal`, `career`, `productivity`, `email-management`, `text-processing`, `google-workspace`, `discord`, `obsidian`, `telegram` | 9 |
| **`sagara-lab`** | Lab Research & Innovation Agent | `true` | `profile:sagara-lab` | `research`, `creative`, `lab`, `software-development`, `google-workspace`, `discord`, `obsidian` | 5 |

**Total Active Skill Assignments Across Profiles:** 47

---

## 3. Production SkillRegistry

**Status:** Authoritative  
**Effective Registered Skills:** 73  
**Domains Present:** 19 (`autonomous-ai-agents`, `business`, `career`, `creative`, `data-analysis`, `development`, `devops`, `email`, `email-management`, `general`, `infrastructure`, `media`, `personal`, `productivity`, `repository`, `research`, `social-media`, `software-development`, `text-processing`)

### Authoritative Registered Skills by Domain

* **`autonomous-ai-agents` (1):** `hermes-agent`
* **`business` (22):** `business-lead-generation`, `competitor-analysis-shopee`, `content-calendar-mingguan`, `customer-service-reply`, `digital-product-inventory-management`, `dual-pipeline-identity-architecture`, `generate-konten-visual`, `gmail-reply`, `gmail-send`, `marketing-plan-mingguan`, `master-marketing-template`, `online-business-management`, `order-notification-draft`, `order-notification-send`, `posting-multiplatform`, `posting-multiplatform-publish`, `privacy-first-osint-marketing`, `sheets-append`, `sheets-read`, `sheets-update`, `strategic-marketing`, `strategic-seller`
* **`career` (5):** `application-preparation`, `application-tracking`, `cek-email-penting`, `follow-up`, `lamaran-kerja`
* **`creative` (3):** `architecture-diagram`, `baoyu-infographic`, `claude-design`
* **`data-analysis` (1):** `xlsx`
* **`development` (2):** `debugging`, `software-development`
* **`devops` (1):** `sdlc-review`
* **`email` (2):** `email-inbox-triage`, `himalaya`
* **`email-management` (1):** `drafting`
* **`general` (4):** `delegation`, `orchestration`, `planning`, `project-management`
* **`infrastructure` (2):** `devops`, `infrastructure`
* **`media` (2):** `gif-search`, `youtube-content`
* **`personal` (11):** `parse-transaksi`, `personal-assistant`, `personal-finance`, `personal-memory-write`, `personal-reminder-cancel`, `personal-reminder-fire`, `personal-reminder-list`, `personal-reminder-reschedule`, `personal-reminders`, `sagara-obsidian-vault`, `self-motivation`
* **`productivity` (3):** `docx`, `google-workspace`, `weekly-review-planning`
* **`repository` (1):** `github`
* **`research` (4):** `arxiv`, `competitor-news-monitor`, `grounded-citations`, `llm-wiki`
* **`social-media` (1):** `xurl`
* **`software-development` (6):** `codebase-inspection`, `feature-planning-implementation`, `requesting-code-review`, `spike`, `systematic-debugging`, `test-driven-development`
* **`text-processing` (1):** `summarizer`

---

## 4. Canonical Profile Skill Assignments & Deterministic Fingerprints

**Total Canonical References:** 47  
**Unresolved References:** 0  
**Fixture Contamination:** 0  
**Fleet Assignment Hash (`profile_skill_assignment_hash`):** `c93038cf4a37fcb42fe20fca671e3fb89987a1af325874669e8fcad662f36797` (canonical dict) / `0cceecf4c5e8716637878f585ca11c88c6ee8ddab3625b857f716e737e95334e` (canonical sequence)

### Exact Allowed Skills & Hashes per Profile

1. **`lead`** (4 skills, hash: `4aeae6ec91d1c5f7710ba2a8a06a2f2d6c59f5855c8c4a1a5cc890e0242fc980`):
   - `grounded-citations`
   - `hermes-agent`
   - `systematic-debugging`
   - `weekly-review-planning`

2. **`personal`** (9 skills, hash: `1104c25403fcd124e6dc95ff88b35f6f0ce744cef425cf349dcced9b48f50d6a`):
   - `cek-email-penting`
   - `follow-up`
   - `google-workspace`
   - `himalaya` *(POLICY_WARNING: domain 'email')*
   - `lamaran-kerja`
   - `parse-transaksi`
   - `sagara-obsidian-vault`
   - `self-motivation`
   - `weekly-review-planning`

3. **`business`** (8 skills, hash: `c737e80f96e2b31ca831d0e733a4b8026b6a30aec7daa2af00a9c3ef6cbf38da`):
   - `competitor-analysis-shopee`
   - `digital-product-inventory-management`
   - `dual-pipeline-identity-architecture`
   - `google-workspace`
   - `grounded-citations`
   - `online-business-management`
   - `weekly-review-planning`
   - `xlsx`

4. **`marketing`** (6 skills, hash: `7c5a09fef56d587cfb9aa2a0df9ec6b59c96dd992be8ad58106fee09abf2774f`):
   - `baoyu-infographic`
   - `claude-design`
   - `content-calendar-mingguan` *(POLICY_WARNING: domain 'business')*
   - `gif-search`
   - `posting-multiplatform` *(POLICY_WARNING: domain 'business')*
   - `youtube-content`

5. **`cs`** (7 skills, hash: `2ae4b347eb49e8dcf1062a7cea246ff4948b9fa52abae7aa4b95abb57749e576`):
   - `customer-service-reply`
   - `docx`
   - `email-inbox-triage`
   - `google-workspace`
   - `himalaya`
   - `order-notification-draft`
   - `parse-transaksi` *(POLICY_WARNING: domain 'personal')*

6. **`it-support`** (3 skills, hash: `ce9fa53d0175a44ec60ca9e776ea5d0991c5078c97c5478a5b81d5d556c7d08f`):
   - `codebase-inspection`
   - `requesting-code-review`
   - `sdlc-review`

7. **`it-coding`** (5 skills, hash: `18b9d80b6c1b4bc37b95804eaf28edd813978f4c6b5995b5a7b57bd1e33edd6b`):
   - `github`
   - `requesting-code-review`
   - `sdlc-review`
   - `systematic-debugging`
   - `test-driven-development`

8. **`sagara-lab`** (5 skills, hash: `79811d22055f28fedd7fba6bc99341c3c94f768c96c203c26532e179c6c443a8`):
   - `architecture-diagram`
   - `arxiv`
   - `grounded-citations`
   - `llm-wiki`
   - `spike`

### Discrepancy Reconciliation & Root Cause (Prompt 14.1D)

* **Classification:** `MANUAL_REPORT_ERROR` / `DOCUMENTATION_MAPPING_ERROR`
* **Root Cause Analysis:**
  1. In Prompt 14.1B, the code implementation (`profile-skills.seed.yaml` and `production_snapshot.json`) correctly captured the 47 live production skill assignments from `/home/ubuntu/sagara-agent/profiles/*/profile.yaml`.
  2. However, in the narrative documentation drafted for Prompt 14.1B (`PROFILE_REGISTRY_PRODUCTION_BASELINE.md` and `PROFILE_BLUEPRINT_RECONCILIATION.md`), the author manually transcribed speculative English skill names (`lead-orchestrator`, `task-decomposer`, `decision-logger`, `digital-product-funnel`, `financial-forecasting`, etc.) to match the role descriptions instead of pasting the actual registered skill IDs.
  3. In Prompt 14.1C and 14.1D, programmatic verification against `ProfileRegistry.load()`, production `profile.yaml`, and git history (`git log -S lead-orchestrator` = 0 results) confirmed that the hallucinated names NEVER existed in production.
  4. The 47 skills documented above represent the actual, unchanging production baseline verified across `profile.yaml`, `ProfileRegistry`, and `profile-skills.seed.yaml`.
* **Policy Warnings Preserved (0 Auto-Fixed):**
  - `personal` -> `himalaya` (domain: `email`)
  - `marketing` -> `content-calendar-mingguan` (domain: `business`)
  - `marketing` -> `posting-multiplatform` (domain: `business`)
  - `cs` -> `parse-transaksi` (domain: `personal`)


---

## 5. Channel Routing & Matrix

**Status:** Authoritative  
**Configured Channels in `~/.hermes/channel_directory.json`:** 17  
**Routed Interactive Channels:** 13  
**System/Monitoring Channels:** 4  
**Unmapped Channels:** 0  
**Route Collisions:** 0  

### 19-vs-20 Channel Documentation Resolution
Commit `197a1ec` consolidated `content` and `posting` channels into `marketing`, and introduced `it-support-self-healing`. The legacy "20 channels" note reflected an earlier planning phase. The live canonical channel directory contains 17 channels, all mapped deterministically.

---

## 6. Model Configuration

**Status:** Authoritative  
**Config Path:** `/home/ubuntu/.hermes/config.yaml`  
**Default Model:** `gratisan_and_googlepro`  
**Provider:** `9router` (Local OpenAI-compatible router endpoint: `http://localhost:1984/v1`)  
**Tier Policy:** `MODEL_TIER_POLICY_DEFINED`  
**Tier Resolver:** `MODEL_TIER_RUNTIME_RESOLVER_PENDING` (Hermes executes through configured `9router` fallback chain)  
