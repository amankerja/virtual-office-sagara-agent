# Product Requirements Document

## Sagara Mission Control

### Interactive Agent Operations & Orchestration Dashboard

**Status:** Proposed V3  
**Target:** V1 Production  
**Product Type:** Self-hosted / single-host agent operations dashboard  
**Underlying Runtime:** Hermes Agent by Nous Research

---

# 0. Product Definition

## 0.1 Product Statement

**Sagara Mission Control** adalah lapisan kendali operasional visual di atas Hermes Agent yang memungkinkan pemilik bisnis, operator, dan manajer mengawasi serta mengendalikan pekerjaan agen AI tanpa harus memahami CLI, struktur file Hermes, atau detail runtime.

Sagara **bukan pengganti Hermes Agent**.

Hermes tetap menjadi runtime utama untuk:

- conversations;
- sessions;
- model execution;
- messaging gateways;
- cron;
- skills;
- memory;
- subagents;
- tool execution;
- permission/approval;
- terminal/sandbox.

Sagara menambahkan lapisan yang tidak secara khusus dimodelkan Hermes sebagai sistem operasi bisnis:

- task orchestration;
- business workflow;
- Kanban;
- assignment;
- operational status;
- approval inbox;
- unified incident/attention queue;
- business-level audit trail;
- command center;
- cost governance;
- visual agent workspace;
- human-team roles;
- artifact/output tracking.

---

# 1. Product Vision

Pengguna harus dapat membuka satu dashboard dan dalam waktu beberapa detik menjawab:

1. Apakah sistem sehat?
2. Agen mana yang aktif?
3. Apa yang sedang dikerjakan?
4. Apa yang membutuhkan perhatian manusia?
5. Apakah ada tugas gagal?
6. Apakah ada approval yang menunggu?
7. Apakah gateway/channel bermasalah?
8. Berapa penggunaan token dan biaya?
9. Output apa yang baru dihasilkan?
10. Apa tindakan yang dapat dilakukan sekarang?

Mission Control harus terasa seperti **operations center**, bukan sekadar kumpulan grafik.

---

# 2. Product Positioning

Hermes sekarang memiliki Web Dashboard resmi yang sudah menyediakan management surface untuk profiles, sessions, configuration, chat, channels, cron, skills, analytics, dan berbagai fungsi administratif lainnya. Sagara karena itu tidak boleh menduplikasi semuanya tanpa alasan.

## Sagara berfokus pada lapisan di atasnya:

**Hermes Dashboard**

> “Bagaimana saya mengonfigurasi dan mengoperasikan Hermes?”

**Sagara Mission Control**

> “Apa yang sedang dikerjakan organisasi AI saya, mana yang bermasalah, siapa yang bertanggung jawab, apa yang butuh keputusan, dan apa yang harus saya lakukan selanjutnya?”

---

# 3. Product Principles

## 3.1 Truth Before Animation

UI tidak boleh menunjukkan agen sebagai **Working** hanya karena menerima event baru.

Status visual harus mencerminkan tingkat kepastian sumber data.

Setiap runtime state memiliki:

- state;
- source;
- timestamp;
- confidence;
- stale status.

Contoh:

`RUNNING • confirmed • 3s ago`

atau:

`RECENTLY ACTIVE • inferred • 42s ago`

---

## 3.2 Business State ≠ Hermes State

Task Sagara, session Hermes, profile Hermes, subagent, dan conversation merupakan entity berbeda.

Jangan menyamakan:

`Task = Session = Agent`

Hubungannya harus eksplisit.

---

## 3.3 Human Attention First

Informasi yang membutuhkan manusia selalu mempunyai prioritas visual tertinggi:

- approval pending;
- security request;
- failed task;
- gateway offline;
- repeated retry;
- spending threshold;
- cron failure.

---

## 3.4 Safe by Default

Aksi yang mengubah state runtime tidak boleh terjadi hanya karena pengguna melakukan gesture UI yang mudah salah.

Contoh:

**Drag task ke agent**

hanya mengubah assignment.

Bukan langsung menjalankan prompt.

Eksekusi dilakukan melalui tombol:

**Run / Dispatch**

Kebijakan auto-dispatch boleh tersedia kemudian sebagai opsi eksplisit.

---

## 3.5 Progressive Disclosure

Dashboard utama menampilkan informasi minimum yang dibutuhkan untuk membuat keputusan.

Detail seperti:

- tool calls;
- raw logs;
- JSON;
- session metadata;
- token breakdown;

baru muncul ketika pengguna melakukan drill-down.

---

# 4. Personas & Roles

## Owner

Butuh:

- gambaran keseluruhan;
- biaya;
- outcome;
- risiko;
- approval kritis.

Tidak perlu melihat setiap tool-call secara default.

## Operator

Butuh:

- task queue;
- agent activity;
- approvals;
- errors;
- retry;
- logs;
- channel health.

## Manager

Butuh:

- task progress;
- output;
- KPI;
- workload;
- history.

## Viewer

Read-only.

## Approver

Permission khusus yang dapat diberikan terpisah dari role administratif.

Pengguna dapat menjadi Operator tanpa otomatis berhak menyetujui dangerous operation.

---

# 5. Information Architecture

Navigation utama V1:

### COMMAND
- Command Center
- Tasks
- Approvals

### AGENTS
- Agents
- Office
- Conversations

### AUTOMATION
- Cron & Automations
- Skills

### OPERATIONS
- Channels
- Artifacts
- Usage & Cost
- Logs & Health

### SYSTEM
- Audit Log
- Settings

---

# 6. Command Center

Command Center merupakan landing page utama.

**Office 2D bukan landing page wajib.**

Office adalah alternative visualization dari operational state.

---

## 6.1 Global Control Bar

Selalu tersedia di halaman operasional.

### Profile selector

- All Profiles
- default
- bisnis-online
- asistenpribadi
- sagara-lab
- profile lainnya

### Time Range

- Live
- 1 hour
- 24 hours
- 7 days
- 30 days
- custom

### Filter

- profile;
- task status;
- channel;
- agent;
- severity;
- owner.

### Global Search

Mencari:

- task;
- session;
- conversation;
- channel;
- agent;
- artifact;
- log event.

### Command Palette

Shortcut contoh:

`Ctrl/Cmd + K`

Perintah:

- Create Task
- Open Approvals
- Find Conversation
- Restart Gateway
- Open Agent
- Run Cron
- Search Logs

Action yang tidak diizinkan role tidak boleh muncul.

---

# 7. Command Center Layout

## 7.1 System Pulse

Card prioritas:

**Gateway**

`Healthy`

**Profiles**

`3 Active`

**Tasks Running**

`4`

**Needs Attention**

`2`

**Pending Approval**

`1`

**Cost Today**

`$x.xx`

**Cron Failures**

`0`

---

## 7.2 Attention Queue

Komponen paling penting setelah System Pulse.

Gabungkan kejadian yang membutuhkan manusia:

- approval;
- failed task;
- blocked task;
- offline channel;
- cost threshold;
- cron failure;
- repeated execution failure.

Urutkan berdasarkan:

1. severity;
2. waiting duration;
3. business priority.

---

## 7.3 Live Activity Feed

Contoh:

`10:31:25 Marketing Agent started TASK-281`

`10:31:42 Discord #marketing received message`

`10:31:51 TASK-281 requested approval`

`10:32:10 Approval approved by Operator A`

`10:32:34 TASK-281 produced campaign-draft.md`

Setiap activity dapat diklik untuk membuka side drawer.

---

## 7.4 Workload Overview

Visualisasi:

- task per agent;
- task by status;
- failure rate;
- average completion duration;
- pending attention;
- recent activity.

Chart harus mendukung click-to-filter.

Contoh:

Klik:

`Failed = 4`

maka Task Table otomatis berubah menjadi filter:

`status = failed`.

---

# 8. Interactive Dashboard Behavior

Interaktivitas dashboard V1 wajib meliputi:

### Cross Filtering

Klik chart, agent, channel, atau status memfilter komponen lain.

### Drill Down

`Summary → List → Detail → Action`

Tidak membuat pengguna berpindah halaman untuk informasi kecil.

### Detail Drawer

Klik entity membuka right-side drawer untuk:

- summary;
- status;
- timeline;
- related task;
- related session;
- logs;
- output;
- actions.

### Hover Detail

Grafik menyediakan tooltip untuk nilai detail.

### Deep Linking

State penting dapat direpresentasikan di URL.

Contoh konseptual:

`/tasks?status=failed&profile=bisnis-online`

Refresh browser tidak menghilangkan filter.

### Saved Views

Target V1.1:

`My Operations`

`Marketing`

`Critical Only`

`Finance`

---

# 9. Agent Model

Hermes memiliki beberapa konsep yang tidak boleh dicampur.

## Profile

Persistent Hermes environment.

Memiliki:

- configuration;
- model;
- skills;
- memory;
- sessions;
- state database;
- cron;
- gateway configuration.

Hermes resmi mendukung penggunaan banyak profile dan dashboard resminya dapat mengelola profile tersebut.

## Subagent

Worker sementara yang dibuat untuk pekerjaan paralel.

## Conversation

Thread komunikasi.

## Session

Execution/conversation state yang disimpan Hermes.

## Sagara Agent

Representasi bisnis sebuah profile atau execution capability di Mission Control.

---

# 10. Office Visualization

## Architecture Decision

Gunakan model:

### Hybrid Office

**Core Agent**

Persistent Hermes profile.

Contoh:

- Operations;
- Marketing;
- Career;
- Research.

**Dynamic Worker**

Subagent sementara.

Dynamic worker muncul saat diperlukan dan dapat hilang setelah tugas selesai.

---

## 10.1 Office Is a Visualization

Office **bukan sumber state**.

Semua visual diturunkan dari normalized operational state yang juga digunakan oleh halaman lain.

Artinya:

Task page mengatakan agent offline → Office juga harus menunjukkan offline.

Tidak boleh memiliki state engine sendiri.

---

# 11. Agent Runtime State Machine

Gunakan state minimum:

`OFFLINE`

`IDLE`

`ACTIVE`

`AWAITING_APPROVAL`

`DEGRADED`

`ERROR`

`UNKNOWN`

Optional:

`RECENTLY_ACTIVE`

---

## Important

Event Hermes MCP yang tersedia antara lain `message`, `approval_requested`, dan `approval_resolved`, tetapi event `message` saja tidak cukup untuk membuktikan bahwa LLM sedang mengeksekusi pekerjaan pada detik tersebut.

Karena itu:

### Confirmed State

Diperoleh dari direct execution lifecycle atau state yang diketahui middleware.

### Inferred State

Diperoleh dari recent activity/session/event.

UI wajib membedakan keduanya.

---

# 12. Office Visual Mapping

| State | UI |
|---|---|
| ACTIVE | avatar aktif + pulse |
| IDLE | avatar normal |
| AWAITING_APPROVAL | orange pulse + approval icon |
| DEGRADED | amber warning |
| ERROR | red indicator |
| OFFLINE | desaturated |
| UNKNOWN | neutral / question state |

Jangan menggunakan animasi berlebihan.

Dukung:

`prefers-reduced-motion`.

---

# 13. Task Management

Hermes tidak dijadikan authoritative task database.

Sagara memiliki entity:

`Task`

---

## 13.1 Task State Machine

Internal states:

`DRAFT`

↓

`READY`

↓

`QUEUED`

↓

`DISPATCHING`

↓

`RUNNING`

↓

`COMPLETED`

Branch:

`AWAITING_APPROVAL`

`BLOCKED`

`FAILED`

`CANCELLED`

---

## 13.2 User-Facing Kanban

Untuk mengurangi kompleksitas UI:

### TO DO
- Draft
- Ready
- Queued

### IN PROGRESS
- Dispatching
- Running

### NEEDS ATTENTION
- Awaiting Approval
- Blocked
- Failed

### DONE
- Completed
- Cancelled

---

# 14. Important Kanban Correction

`Blocked` tidak identik dengan `approval_requested`.

Task dapat membutuhkan perhatian karena:

- approval;
- dependency;
- agent offline;
- invalid configuration;
- provider error;
- timeout;
- output validation failure.

Karena itu card di kolom **Needs Attention** mempunyai reason badge:

`Approval`

`Error`

`Dependency`

`Offline`

`Budget`

---

# 15. Task Card

Minimal:

**TASK-102**

Generate September Marketing Campaign

Agent: Marketing  
Priority: High  
Status: Awaiting Approval  
Elapsed: 4m 12s

Badges:

`Discord`

`Approval`

`High`

Card action:

- Open
- Run
- Retry
- Cancel
- Reassign
- View Session
- View Output

Aksi bergantung pada state dan permission.

---

# 16. Drag-and-Drop Semantics

Drag antar kolom tidak boleh menghasilkan side-effect berbahaya secara implisit.

### Allowed

`To Do → assign agent`

`Task → reorder priority`

### Requires explicit action

- dispatch;
- retry;
- cancel;
- dangerous approval;
- gateway restart.

Contoh:

Setelah card dipindahkan ke Marketing Agent:

`Assigned to Marketing Agent`

Kemudian tombol:

**Run Task**

---

# 17. Task Detail

Detail drawer/page:

## Overview

- title;
- description;
- agent;
- profile;
- priority;
- requester;
- assignee;
- created;
- started;
- completed.

## Execution

- Hermes session;
- conversation/channel;
- runtime;
- model;
- token usage.

## Timeline

Immutable event history.

## Output

Artifact yang dihasilkan.

## Attention

- approval;
- errors;
- retry reason.

## Actions

Role-dependent controls.

---

# 18. Approval Center

Approval tidak hanya menjadi badge pada task.

Harus tersedia centralized inbox.

---

## Approval Card

Menampilkan:

- requesting profile;
- related task;
- command/tool;
- risk level;
- request timestamp;
- elapsed waiting time;
- sanitized context;
- Approve;
- Reject.

Jika tersedia, tampilkan command/tool detail dalam expandable section.

---

## Approval Rules

Approval actions menggunakan pessimistic UI.

Setelah pengguna menekan:

`Approve`

tampilkan:

`Approving…`

baru ubah state setelah backend mengonfirmasi.

Jangan melakukan optimistic `Approved`.

Hermes MCP menyediakan primitive `permissions_list_open` dan `permissions_respond` untuk permission request yang diamati bridge.

---

# 19. Conversations

Unified conversation explorer.

Filter:

- profile;
- platform;
- channel;
- user;
- date;
- model;
- active/recent.

Hermes `state.db` merupakan canonical store untuk sessions dan messages serta menyediakan FTS5 untuk pencarian pesan.

---

# 20. Channels

Channel UI generik.

Jangan hardcode hanya Telegram/Discord/WhatsApp.

Hermes mendukung banyak messaging integration melalui gateway yang sama.

Setiap channel card:

- platform;
- connected;
- enabled;
- last activity;
- error;
- active conversations.

Actions:

- view;
- reconnect where supported;
- configure;
- test.

Secret tidak pernah dikirim kembali sebagai plaintext ke browser.

---

# 21. Cron & Automations

Tampilkan:

- job;
- profile;
- schedule;
- next run;
- previous run;
- result;
- delivery target;
- failure count.

Actions:

- Create
- Edit
- Pause
- Resume
- Run Now
- Delete

Karena fitur cron sudah tersedia secara native di Hermes dan dashboard resminya, Sagara sebaiknya menggunakan/adaptasi primitive tersebut daripada membuat scheduler kedua.

Sagara hanya menambahkan business-level visibility dan relation ke task/workflow.

---

# 22. Skills

Skill UI harus merepresentasikan skill Hermes yang sebenarnya.

Card:

- name;
- description;
- source;
- enabled;
- profile;
- updated;
- status.

Action:

- View
- Enable/Disable jika runtime mendukung
- Install
- Update
- Open Source

Tidak menyebut fitur ini sebagai custom RAG.

Hermes menggunakan Skills sebagai reusable procedural knowledge dan session database dengan FTS5 untuk message search.

---

# 23. Artifacts

Sagara membutuhkan artifact convention karena tidak semua output Hermes otomatis menjadi business artifact.

Entity:

`Artifact`

Fields:

- artifact_id;
- task_id;
- profile_id;
- session_id;
- name;
- type;
- path/reference;
- created_at;
- size;
- source;
- checksum optional.

Jenis:

- document;
- image;
- spreadsheet;
- code;
- report;
- log;
- attachment;
- link.

---

# 24. Usage & Cost

Views:

## Overview

- today;
- 7 days;
- 30 days;
- selected period.

## Dimensions

- profile;
- model;
- provider;
- task;
- source/channel.

## Metrics

- input tokens;
- output tokens;
- total tokens;
- cost;
- sessions;
- cost/task where correlation exists.

Hermes Dashboard resmi telah menghitung analytics berdasarkan session history; Sagara sebaiknya menggunakan data yang sama atau adapter terhadap primitive tersebut daripada membuat estimasi paralel yang dapat berbeda.

---

# 25. Budget Governance

Sagara-specific feature.

Per profile:

- warning threshold;
- daily soft budget;
- daily hard budget;
- monthly soft budget.

States:

`NORMAL`

`WARNING`

`LIMIT_REACHED`

`BLOCKED_BY_POLICY`

Hard budget enforcement adalah fitur middleware Sagara, bukan diklaim sebagai native Hermes capability.

---

# 26. Logs & Health

Unified health:

### System

- CPU;
- RAM;
- Disk;
- uptime.

### Gateway

- service;
- PID;
- restart count;
- last error.

### Profiles

- state;
- last activity;
- model;
- session count.

### Channels

- connected;
- error.

### Event Pipeline

- MCP connection;
- last cursor;
- WebSocket clients;
- event lag.

### Database

- readable;
- WAL state;
- last query error.

---

# 27. Deployment-Specific Gateway Rule

Pada deployment Sagara saat ini, **central gateway merupakan authority**.

Mission Control tidak boleh secara otomatis menjalankan gateway terpisah untuk setiap profile.

UI gateway harus memperlakukan:

`hermes-gateway.service`

sebagai service produksi utama.

Per-profile `Start Gateway` harus disembunyikan atau dinonaktifkan pada topology ini kecuali konfigurasi deployment secara eksplisit berubah.

Hermes sendiri memiliki dukungan multiplex profile pada gateway default, sehingga model central gateway sesuai dengan capability runtime.

---

# 28. Architecture

Recommended logical architecture:

```text
┌────────────────────────────────────────────┐
│       SAGARA MISSION CONTROL UI            │
│                                            │
│ Command Center │ Tasks │ Office │ Approval │
│ Usage │ Logs │ Channels │ Artifacts        │
└───────────────────┬────────────────────────┘
                    │
            REST + WebSocket
                    │
┌───────────────────▼────────────────────────┐
│       SAGARA CONTROL / OPERATIONS API      │
│                                            │
│ Auth / RBAC                                │
│ Task Engine                                │
│ Approval Gateway                          │
│ Event Normalizer                          │
│ Cost Policy                               │
│ Audit                                     │
│ Artifact Registry                         │
│ WebSocket Hub                             │
└───────┬──────────┬─────────┬───────────────┘
        │          │         │
        │          │         └── Sagara DB
        │          │
        │          └──────────── Service Adapter
        │                        systemd / gateway
        │
        └─────────────────────── Hermes Adapter
                                 │
                  ┌──────────────┼──────────────┐
                  │              │              │
               MCP Serve      state.db       config
                  │              │              │
                  └──────── Hermes Runtime ─────┘
```

---

# 29. Integration Strategy

## Layer A — MCP Bridge

Primary capability untuk:

- conversation list;
- message read;
- event poll/wait;
- message send;
- channels;
- approvals.

Hermes MCP saat ini menyediakan 10 tools, termasuk `events_wait`, `messages_send`, `permissions_list_open`, dan `permissions_respond`.

---

## Layer B — Read-Only State Database

Gunakan untuk:

- historical analytics;
- session search;
- message search;
- metadata aggregation.

Database:

`~/.hermes/state.db`

Canonical session/message storage Hermes menggunakan SQLite.

### Rules

- read-only connection;
- respect WAL;
- no dashboard migration against Hermes DB;
- no dashboard-owned table inside Hermes DB;
- schema compatibility detection;
- graceful degradation jika schema berubah.

---

# 30. Configuration Adapter

Jangan memberikan frontend direct filesystem access.

Semua perubahan konfigurasi melewati backend.

Flow:

`UI`

→ validation

→ authorization

→ snapshot/backup

→ write

→ runtime reload/restart if required

→ verification

→ audit.

Jika integrasi resmi Hermes Dashboard/API dapat menangani config operation yang dibutuhkan, prioritaskan jalur tersebut daripada manipulasi file manual.

---

# 31. Dashboard Extension Architecture

Sebelum membuat management stack paralel, lakukan technical compatibility check terhadap **Hermes Dashboard extension system**.

Hermes menyediakan:

- dashboard themes;
- UI plugins;
- backend plugins;
- custom FastAPI routes;

tanpa memerlukan fork core dashboard.

## Recommended V1 Decision

Gunakan **extension/plugin-first** jika requirement branding dan UX Sagara dapat dipenuhi.

Gunakan standalone SPA + FastAPI hanya untuk bagian yang membutuhkan:

- independent application lifecycle;
- external multi-user business authentication;
- significantly different information architecture;
- future multi-host control plane;
- capabilities yang tidak cocok sebagai Hermes dashboard extension.

Tidak boleh melakukan fork langsung tanpa alasan teknis yang terdokumentasi.

---

# 32. Realtime Architecture

Gunakan pola:

## Initial Snapshot

REST:

`GET /api/mission-control/snapshot`

Menghasilkan current normalized state.

Kemudian:

## Delta Stream

WebSocket:

`/ws/mission-control`

Event contoh:

```text
agent.state.changed
task.created
task.updated
task.failed
approval.requested
approval.resolved
channel.changed
gateway.changed
artifact.created
usage.updated
cron.failed
```

---

# 33. Normalized Event Envelope

Setiap event minimal membawa:

```text
event_id
sequence
type
occurred_at
received_at
profile_id
entity_type
entity_id
correlation_id
source
confidence
payload
```

Tujuan:

- deduplication;
- audit;
- ordering;
- debugging;
- reconnect recovery.

---

# 34. Realtime UX

UI wajib mempunyai indicator:

`Live`

`Reconnecting`

`Stale`

Jika WebSocket putus:

1. tampilkan reconnect state;
2. reconnect exponential backoff;
3. ambil snapshot terbaru;
4. resume delta;
5. jangan menganggap cached state sebagai live state.

Jika data lebih tua dari threshold:

`Data may be outdated • last update 42s ago`

---

# 35. Core Data Model

Sagara-owned entities:

### Task

```text
id
title
description
status
attention_reason
priority
profile_id
assignee_id
created_by
session_id
conversation_key
created_at
queued_at
started_at
completed_at
retry_count
```

### TaskEvent

```text
id
task_id
type
actor
source
payload
occurred_at
```

### ApprovalLink

```text
id
external_approval_id
task_id
profile_id
state
requested_at
resolved_at
resolved_by
```

### Artifact

```text
id
task_id
session_id
profile_id
type
uri
metadata
created_at
```

### AuditEvent

```text
id
actor
action
entity
entity_id
before
after
ip/session
created_at
```

---

# 36. RBAC

Minimum permissions:

`dashboard.view`

`task.create`

`task.assign`

`task.dispatch`

`task.retry`

`task.cancel`

`approval.view`

`approval.respond`

`agent.view`

`gateway.control`

`channel.configure`

`cron.manage`

`skill.manage`

`usage.view`

`logs.view`

`settings.manage`

`audit.view`

RBAC harus enforced di backend.

UI hiding bukan security mechanism.

---

# 37. High-Risk Action UX

Aksi berikut membutuhkan confirmation:

- gateway restart;
- gateway stop;
- task cancel while running;
- delete cron;
- destructive configuration change;
- permission approval dengan high-risk classification.

Dialog harus menjelaskan:

**Action**

**Impact**

**Target**

**Confirmation**

Bukan hanya:

`Are you sure?`

---

# 38. Error States

Setiap page harus mempunyai empat state:

### Loading

Skeleton.

### Empty

Informative empty state + next action.

### Partial Failure

Contoh:

`Usage unavailable`

tetapi Tasks tetap tampil.

### Full Failure

Error screen dengan:

- human-readable cause;
- retry;
- diagnostic ID.

Jangan menampilkan Python stack trace atau raw backend exception kepada pengguna biasa.

---

# 39. Optimistic UI Policy

Boleh optimistic:

- reorder Kanban;
- assign label;
- UI preference.

Tidak boleh optimistic:

- approval;
- dispatch;
- cancel;
- gateway restart;
- configuration save;
- cron delete.

---

# 40. Search

Global search harus mencari indexed metadata dahulu.

Jangan scan seluruh filesystem setiap query.

Target entities:

- tasks;
- sessions;
- conversations;
- artifacts;
- agents;
- channels.

Full message search dapat menggunakan capabilities FTS5 Hermes.

---

# 41. Responsive Design

## Desktop ≥ 1280 px

Full command center.

## Tablet

Collapsible navigation.

Charts menjadi 2-column atau 1-column.

Office dapat pan/zoom.

## Mobile

Prioritas:

1. attention;
2. task;
3. approval;
4. agent status.

Office 2D tidak perlu mereplikasi layout desktop.

Gunakan simplified list/card view jika ruang tidak cukup.

---

# 42. Accessibility

Minimum:

- keyboard navigation;
- semantic buttons;
- visible focus;
- WCAG AA contrast target;
- status tidak hanya mengandalkan warna;
- reduced-motion;
- screen-reader labels;
- accessible tooltip;
- accessible dialog focus trap.

---

# 43. Performance Requirements

Target V1 pada kondisi server normal:

### Initial shell

UI interaktif secepat mungkin tanpa menunggu seluruh historical analytics.

### Realtime

Operational event target:

`≤ 1 second p95`

dari event diterima middleware hingga update UI.

### Interaction

Common UI action target:

`<100 ms` perceived response sebelum asynchronous operation.

### Long Tables

Gunakan virtualization untuk:

- logs;
- large conversation list;
- activity history.

### Charts

Aggregate data di backend.

Jangan mengirim raw puluhan ribu event agar browser menghitung semuanya.

---

# 44. Security Requirements

## Browser

- CSP;
- CSRF protection;
- secure cookie;
- no secrets in localStorage;
- output escaping;
- strict CORS.

## Backend

- RBAC;
- validation;
- rate limits;
- audit;
- no arbitrary shell endpoint.

## Hermes Integration

Tidak boleh ada endpoint:

`POST /api/shell { command: "..." }`

sebagai generic operator API.

Task harus disalurkan melalui controlled agent/task interface sehingga permission boundary Hermes tetap digunakan.

Untuk workloads berisiko, gunakan terminal isolation seperti Docker/SSH/remote sandbox yang memang didukung Hermes.

---

# 45. Audit Requirements

Audit immutable untuk mutating action:

- task created;
- task dispatched;
- task cancelled;
- approval accepted/rejected;
- cron mutation;
- channel change;
- config change;
- gateway action;
- role change.

Audit record:

`who`

`what`

`target`

`before`

`after`

`when`

`result`

---

# 46. Observability

Backend harus mengeluarkan structured logs.

Minimal fields:

```text
timestamp
level
component
request_id
correlation_id
profile_id
task_id
event_type
latency_ms
result
```

Task dan event harus dapat dilacak end-to-end menggunakan correlation ID.

---

# 47. Dashboard Metrics

Product metrics:

- tasks completed;
- success rate;
- failure rate;
- median duration;
- pending approvals;
- approval wait time;
- active profiles;
- gateway uptime;
- cron success rate;
- cost/task;
- cost/profile.

Jangan membuat vanity metric yang tidak membantu keputusan.

---

# 48. V1 Scope

## P0 — Required

- Authentication
- RBAC
- Command Center
- Profile overview
- Task management
- Kanban
- Task detail/timeline
- Approvals
- Conversations
- Channel health
- Gateway health
- Cron visibility
- Usage & cost
- Logs
- Audit
- REST snapshot
- WebSocket realtime
- responsive UI
- stale/reconnect handling

## P1 — Strongly Desired

- Office visualization
- artifact registry
- global command palette
- cross-chart filtering
- advanced cost controls

## P2 — Later

- customizable dashboard widgets
- saved dashboard layouts
- workflow builder
- autonomous auto-routing
- multi-host fleet management
- mobile-native app
- organization-wide cloud control plane.

---

# 49. Non-Goals V1

Tidak membangun:

- LLM runtime baru;
- vector RAG replacement;
- messaging gateway baru;
- scheduler kedua;
- permission system pengganti Hermes;
- multi-server Hermes fleet;
- generic remote shell;
- fully autonomous high-risk action execution.

---

# 50. Acceptance Criteria — Command Center

### AC-CMD-001

Given gateway dan profiles tersedia,

when Command Center dibuka,

then pengguna dapat melihat gateway health, profile state, tasks, pending attention, dan usage summary tanpa berpindah halaman.

### AC-CMD-002

Klik pada KPI:

`Failed Tasks`

memfilter Task view ke failed tasks.

### AC-CMD-003

Jika realtime disconnect,

dashboard menunjukkan `Reconnecting/Stale` dan tidak tetap mengklaim `Live`.

---

# 51. Acceptance Criteria — Tasks

### AC-TASK-001

Pengguna dengan permission dapat membuat task.

### AC-TASK-002

Assignment tidak otomatis mengeksekusi task.

### AC-TASK-003

Dispatch menghasilkan execution record dan timeline event.

### AC-TASK-004

Task gagal masuk `Needs Attention` dengan reason yang jelas.

### AC-TASK-005

Retry tidak menghapus history execution sebelumnya.

---

# 52. Acceptance Criteria — Approvals

### AC-APR-001

Pending Hermes approval muncul di Approval Center.

### AC-APR-002

Jika approval berkaitan dengan Sagara task, link ditampilkan.

### AC-APR-003

Approve/Reject hanya tersedia untuk permission yang sesuai.

### AC-APR-004

UI baru menunjukkan resolved setelah backend mengonfirmasi result.

### AC-APR-005

Double submit tidak menghasilkan dua resolution operation.

---

# 53. Acceptance Criteria — Agents

### AC-AGT-001

Agent card menampilkan profile identity dan last activity.

### AC-AGT-002

Inferred state dibedakan dari confirmed state.

### AC-AGT-003

Tidak ada agent yang ditampilkan `Working` hanya berdasarkan generic recent message.

### AC-AGT-004

Office dan Agent List mengambil state dari normalized backend yang sama.

---

# 54. Acceptance Criteria — Security

### AC-SEC-001

Viewer tidak dapat melakukan mutating request dengan memanggil endpoint langsung.

### AC-SEC-002

Secret tidak pernah dikembalikan dalam plaintext.

### AC-SEC-003

Gateway control memiliki role enforcement dan audit trail.

### AC-SEC-004

Tidak terdapat generic unrestricted shell execution endpoint.

---

# 55. Test Matrix

Wajib diuji:

### Functional

- create;
- assign;
- dispatch;
- complete;
- fail;
- retry;
- cancel;
- approval;
- channel outage;
- gateway outage.

### Realtime

- event ordering;
- duplicate event;
- reconnect;
- lost connection;
- stale state.

### Security

- unauthenticated request;
- unauthorized role;
- CSRF;
- XSS payload;
- manipulated task ID;
- duplicate approval;
- dangerous action.

### Failure Injection

Simulasikan:

- Hermes MCP down;
- `state.db` unavailable;
- gateway stopped;
- Supabase/Sagara DB unavailable;
- channel disconnected;
- LLM provider timeout;
- WebSocket disconnected.

Dashboard harus mengalami **graceful degradation**, bukan blank screen.

---

# 56. Architectural Source-of-Truth Matrix

| Data | Authority |
|---|---|
| Hermes sessions | Hermes `state.db` |
| Messages | Hermes |
| Profile config | Hermes config |
| Skills | Hermes |
| Cron runtime | Hermes |
| Permissions | Hermes |
| Gateway runtime | Hermes service |
| Sagara tasks | Sagara DB |
| Kanban | Sagara DB |
| Business assignment | Sagara DB |
| Business audit | Sagara DB |
| Artifact registry | Sagara DB |
| Cost policies | Sagara DB |
| UI preferences | Sagara DB/client |

Tidak boleh ada dua authority untuk entity yang sama.

---

# 57. Architecture Decision Records Required

Sebelum implementation lock:

### ADR-001
Hermes Dashboard Plugin vs Standalone Sagara SPA.

### ADR-002
Sagara DB: local SQLite/Postgres/Supabase.

### ADR-003
Task-to-Hermes execution/correlation mechanism.

### ADR-004
Runtime status inference rules.

### ADR-005
Artifact storage convention.

### ADR-006
Authentication model for remote deployment.

---

# 58. Critical Technical Spike

Sebelum membangun seluruh UI, validasi satu vertical slice:

`Create Task`

→ `Assign`

→ `Dispatch`

→ Hermes executes

→ realtime activity

→ approval requested

→ approve from dashboard

→ Hermes resumes

→ output produced

→ Task Completed

→ artifact visible

→ audit complete.

Jika vertical slice ini berhasil, fondasi arsitektur dianggap layak.

Jangan memulai pembuatan seluruh halaman sebelum execution correlation dan realtime lifecycle tersebut terbukti.

---

# 59. Definition of Done V1

V1 dianggap selesai apabila operator dapat:

1. masuk ke Mission Control;
2. memahami health sistem;
3. melihat semua profile utama;
4. membuat task;
5. memilih agent;
6. dispatch task;
7. mengikuti progress;
8. menerima warning;
9. merespons approval;
10. membuka conversation;
11. melihat output;
12. mengetahui biaya;
13. mengetahui jika channel/gateway gagal;
14. menelusuri audit;
15. melakukan semua hal tersebut tanpa membuka terminal untuk workflow harian.

Terminal tetap tersedia untuk troubleshooting advanced, tetapi bukan requirement workflow operator normal.

---

# 60. Product Success Definition

Mission Control berhasil bukan ketika dashboard mempunyai banyak chart.

Mission Control berhasil ketika operator bisa menjawab:

> **Apa yang sedang terjadi, apa yang membutuhkan perhatian saya, dan tindakan apa yang aman untuk saya lakukan sekarang?**

dalam satu interface yang konsisten.

---

# 61. Recommended Product Direction

Gunakan tiga lapisan UX utama:

### 1. OBSERVE

Command Center  
Agents  
Office  
Usage  
Logs

### 2. DECIDE

Tasks  
Attention Queue  
Approvals  
Task Detail

### 3. ACT

Dispatch  
Approve/Reject  
Retry  
Cancel  
Run Automation  
Gateway/Channel control

Ini harus menjadi alur utama seluruh desain Sagara Mission Control:

**Observe → Understand → Decide → Act → Verify.**

Setiap action kemudian kembali menghasilkan state/event yang bisa diverifikasi di dashboard.

---

# Final Architecture Principle

> **Hermes menjalankan agen.  
> Sagara memahami pekerjaan.  
> Mission Control menghubungkan keduanya untuk manusia.**