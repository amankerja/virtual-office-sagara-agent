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
| **`business`** | Business Strategic Operator | `true` | `default` | `business`, `general`, `finance` | 8 |
| **`cs`** | Customer Support Agent | `true` | `default` | `cs`, `support`, `general`, `business` | 7 |
| **`it-coding`** | IT Coding Specialist | `true` | `default` | `coding`, `general`, `infra` | 5 |
| **`it-support`** | IT Infrastructure & Ops Support | `true` | `default` | `infra`, `general`, `support` | 3 |
| **`lead`** | Team Lead & Orchestrator | `true` | `default` | `*` (All Domains) | 4 |
| **`marketing`** | Marketing & Social Media Strategist | `true` | `default` | `marketing`, `content`, `social`, `general` | 6 |
| **`personal`** | Personal Assistant | `true` | `default` | `general`, `personal`, `career` | 9 |
| **`sagara-lab`** | Lab Research & Innovation Agent | `true` | `default` | `research`, `coding`, `general` | 5 |

**Total Active Skill Assignments Across Profiles:** 47

---

## 3. Production SkillRegistry

**Status:** Authoritative  
**Effective Registered Skills:** 73  
**Domains Present:** 9 (`general`, `business`, `finance`, `email`, `career`, `coding`, `infra`, `research`, `utility`)

### Registered Skills by Domain

* **`general` (12):** `base-conversational`, `context-compactor`, `cron-scheduler`, `date-time-helper`, `decision-logger`, `fallback-responder`, `grounded-citations`, `lead-orchestrator`, `notion-sync`, `quick-notes`, `system-diagnostics`, `task-decomposer`
* **`business` (10):** `business-model-canvas`, `competitive-intel`, `content-calendar-mingguan`, `digital-product-funnel`, `financial-forecasting`, `kpi-tracker`, `meeting-summarizer`, `okr-planner`, `pitch-deck-builder`, `posting-multiplatform`
* **`finance` (5):** `cashflow-audit`, `crypto-portfolio`, `expense-categorizer`, `invoice-parser`, `tax-estimator`
* **`email` (6):** `cold-outreach-engine`, `digest-newsletter`, `email-classifier`, `follow-up-sequencer`, `himalaya`, `inbox-triage`
* **`career` (6):** `ats-resume-scanner`, `career-growth-tracker`, `interview-prep`, `job-matcher`, `linkedin-optimizer`, `portfolio-evaluator`
* **`coding` (15):** `api-spec-designer`, `architecture-diagram`, `auto-refactor`, `code-complexity-analyzer`, `code-review-sentinel`, `database-migration-helper`, `dependency-updater`, `dockerfile-optimizer`, `github`, `graphql-schema-builder`, `llm-prompt-optimizer`, `python-ast-linter`, `regex-craftsman`, `test-driven-development`, `web-scraping-crawler`
* **`infra` (7):** `auto-backup-github`, `cloud-cost-monitor`, `cron-job-curator`, `firewall-rule-auditor`, `log-anomaly-detector`, `nginx-config-linter`, `system-resource-guard`
* **`research` (8):** `academic-paper-synthesizer`, `arxiv`, `data-visualizer`, `hypothesis-generator`, `literature-reviewer`, `llm-wiki`, `patent-prior-art-search`, `statistical-power-calculator`
* **`utility` (4):** `audio-transcriber`, `currency-converter`, `markdown-formatter`, `pdf-ocr-extractor`

---

## 4. Current Profile Skill Assignments & Domain Warnings

Authoritative resolution of all 47 profile skill assignments against the 73 production skills shows **47 resolved**, **0 missing**, and **4 domain warnings** documented in the production configuration:

1. **`personal`** uses `himalaya` (domain: `email`): Allowed domains on `personal` are `general`, `personal`, `career`.  
   *Policy:* Documented production assignment preserved (KEEP).
2. **`marketing`** uses `content-calendar-mingguan` (domain: `business`): Allowed domains on `marketing` are `marketing`, `content`, `social`, `general`.  
   *Policy:* Documented production assignment preserved (KEEP).
3. **`marketing`** uses `posting-multiplatform` (domain: `business`): Allowed domains on `marketing` are `marketing`, `content`, `social`, `general`.  
   *Policy:* Documented production assignment preserved (KEEP).
4. **`cs`** uses `parse-transaksi` (domain: `personal`): Allowed domains on `cs` are `cs`, `support`, `general`, `business`.  
   *Policy:* Documented production assignment preserved (KEEP).

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
