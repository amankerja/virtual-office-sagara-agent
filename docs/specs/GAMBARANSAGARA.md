# GAMBARAN SAGARA AI — Multi-Agent Architecture

> Terakhir diperbarui: 2026-09-09
> Status: 8 profil aktif, struktur terinisialisasi, SOUL & Skill spesifik BELUM di-custom

---

## 1. Config Profil Agen (SOUL / File Prompt Utama .md)

**Status: SEMUA PROFIL MASIH DEFAULT TEMPLATE** — SOUL.md identik bawaan Hermes. BELUM di-custom per peran.

| Profil | SOUL.md Lokasi | Status | Peran yang Dibutuhkan |
|--------|---------------|--------|----------------------|
| `lead` | `~/.hermes/profiles/lead/SOUL.md` | ⚠️ DEFAULT | Lead Agent / Manajer Tim AI — delegasi, troubleshooting, onboarding |
| `personal` | `~/.hermes/profiles/personal/SOUL.md` | ⚠️ DEFAULT | Asisten Pribadi / Sekretaris — jadwal, email, pengingat |
| `business` | `~/.hermes/profiles/business/SOUL.md` | ⚠️ DEFAULT | Manajemen Bisnis & Produk — strategi, analisis, laporan |
| `marketing` | `~/.hermes/profiles/marketing/SOUL.md` | ⚠️ DEFAULT | Marketing & Auto-Posting — konten, visual, scheduling |
| `cs` | `~/.hermes/profiles/cs/SOUL.md` | ⚠️ DEFAULT | Customer Service & Order — layanan pelanggan, pesanan |
| `it-support` | `~/.hermes/profiles/it-support/SOUL.md` | ⚠️ DEFAULT | Command Center & System — monitoring, alerting, infra |
| `it-coding` | `~/.hermes/profiles/it-coding/SOUL.md` | ⚠️ DEFAULT | IT Worker / Coding — development, debugging, code review |
| `sagara-lab` | `~/.hermes/profiles/sagara-lab/SOUL.md` | ⚠️ DEFAULT | R&D / Eksperimen — riset, paper, prototipe |

### Yang Perlu Dilakukan:
- Tulis SOUL.md custom per profil (persona, batasan peran, hak akses, constraints)
- Setiap SOUL harus berisi: nama agen, peran, instruksi persona, batasan peran, hak akses tools

---

## 2. Daftar & File Skill / SOP (.md)

**Status: SEMUA PROFIL PUNYA 58 SKILL BUNDLED (IDENTIK)** — BELUM di-custom/dipilih per peran.

### Total 58 Skill Bawaan (per profil):
Semua profil saat ini mewarisi SEMUA skill tanpa filtering. Perlu dipilih & assign skill yang relevan per peran.

### Skill yang Direkomendasikan Per Profil:

**Lead Agent (`lead`):**
- `autonomous-ai-agents/hermes-agent` — koordinasi & onboarding
- `research/grounded-citations` — verifikasi informasi
- `productivity/weekly-review-planning` — review berkala
- `software-development/systematic-debugging` — troubleshooting

**Personal (`personal`):**
- `productivity/google-workspace` — Gmail, Calendar, Drive
- `note-taking/obsidian` — catatan harian
- `email/himalaya` — email management
- `productivity/product-price-monitor` — monitoring harga

**Business (`business`):**
- `productivity/airtable` — database bisnis
- `productivity/notion` — manajemen proyek
- `research/competitor-news-monitor` — monitoring kompetitor
- `productivity/xlsx` — laporan & spreadsheet

**Marketing (`marketing`):**
- `media/gif-search` — aset visual
- `creative/baoyu-infographic` — pembuatan infografis
- `creative/claude-design` — desain konten
- `social-media/xurl` — posting social media
- `media/youtube-content` — konten YouTube

**Customer Service (`cs`):**
- `email/email-inbox-triage` — triage email masuk
- `career/follow-up` — follow-up pelanggan
- `productivity/docx` — dokumen resmi

**IT Support (`it-support`):**
- `software-development/codebase-inspection` — inspeksi kode
- `research/competitor-news-monitor` — monitoring sistem
- `software-development/requesting-code-review` — review kode
- `devops/sdlc-review` — review SDLC

**IT Coding (`it-coding`):**
- `software-development/github` — PR, issues, repos
- `software-development/python-debugpy` — debug Python
- `software-development/node-inspect-debugger` — debug Node.js
- `software-development/test-driven-development` — TDD
- `autonomous-ai-agents/claude-code` — delegation coding
- `autonomous-ai-agents/codex` — delegation coding
- `autonomous-ai-agents/opencode` — delegation coding

**Sagara Lab (`sagara-lab`):**
- `research/arxiv` — paper riset
- `research/llm-wiki` — knowledge base
- `creative/architecture-diagram` — diagram arsitektur
- `software-development/spike` — eksperimen

---

## 3. Struktur Pembagian Workspace & Lead Agent

### Google Drive Workspace Root:
- **Root ID:** `1MHhZz_BpOTK3enHFUzf7Dzi1NknUbhcF`
- **URL:** https://drive.google.com/drive/folders/1MHhZz_BpOTK3enHFUzf7Dzi1NknUbhcF

### Folder Google Drive (Sudah Terstruktur):
| Folder | ID | Fungsi |
|--------|-----|--------|
| `products` | `1zyNX2gsa2OozDUvFSyrNmQzQVHa0b8lv` | Data produk |
| `marketing` | `1jj86JVpwDsZDuKcqsLXhaTJ4dYV5gbp0` | Data marketing |
| `agent_status` | `1wF4XGMX5hOg19VciybOQtCQIZ7sbjgx9` | Status agen |
| `reminders` | `12fdeklnB2lORunp6ME3aoWl6Cbv-rvA_` | Pengingat |
| `lab` | `1SFHbxz77lhVhcuOtX8Z4JcjFrKV-OVUP` | Lab riset |

### Google Sheets (Sudah Terstruktur):
| Sheet | ID | Fungsi |
|-------|-----|--------|
| `katalog_produk` | `1UP5ixaeQxYnsx032EVqk0V4bQ35hAEAVMcrKXfIOJnA` | Katalog produk |
| `database_pembeli` | `1JuiJjPqSLWg7VuS2Ia1w4aTshVdiFIWn-03-YnFQB8c` | Database pembeli |
| `marketing_plan` | `1VJUt_w5XOSnPyN4INMufdPWtgvMu_c003w8W2cPXIz4` | Rencana marketing |
| `fb_group_queue` | `1jl2E_ViPhjmKtPJ1CXVOoZ-aPJfxT3_9FlA4DyeNkeE` | Antrian FB Group |
| `template_pesan` | `1_m-6AtHjC0Ef8Et1gKt2Qj3Tp9XYU3KGCw2rTkFaskY` | Template pesan |
| `target_pembeli` | `1JtKEsDVfLUbfnFbaHfNNsJ2WkX7Ee9HXpyZ_7KkC7HY` | Target pembeli |
| `variabel_master` | `1CjPrIEUwiItU4aDvejNdCPRsEgBRCsmiENxJijKDOAE` | Variabel master |
| `serial_number` | `1BEpavO7jq4D4Sc38Mb4dVKo6-2Q9FxplLkSoN5rnCQc` | Serial number pelanggan |

### Obsidian Vault (Memori & Wiki):
- **Lokasi:** `/home/ubuntu/sagara-vault/`
- **Struktur:** `Wiki/` (SOP & pengetahuan), `Memories/` (log harian & pengalaman)
- **Akses:** Terhubung ke profil `obsidian` skill

### Alur Delegasi Lead → Sub-Agen:
```
Lead Agent (Lead/Default)
  ├─► Personal Agent → jadwal, email, reminder
  ├─► Business Agent → strategi, produk, analisis
  ├─► Marketing Agent → konten, posting, visual
  ├─► CS Agent → pelanggan, order, layanan
  ├─► IT Support Agent → monitoring, alerting, infra
  ├─► IT Coding Agent → development, debugging, deploy
  └─► Sagara Lab Agent → riset, eksperimen, prototipe
```

### Local Workspace:
| Direktori | Fungsi |
|-----------|--------|
| `/home/ubuntu/sagara-agent/` | Repo utama (Git + GitHub backup) |
| `/home/ubuntu/sagara-agent/profiles/` | Konfigurasi semua profil |
| `/home/ubuntu/sagara-agent/integrations/` | Integrasi external (job-application, dll) |
| `/home/ubuntu/sagara-agent/skills/` | Skills master repository |
| `/home/ubuntu/sagara-vault/` | Obsidian vault (Wiki + Memories) |
| `/home/ubuntu/job-application-files/` | ❌ SUDAH DIHAPUS (pindah ke repo) |

---

## 4. Integrasi Tools / MCP (Model Context Protocol)

### Sudah Terhubung:
| Platform | Status | Channel / ID |
|----------|--------|-------------|
| Discord | ✅ Connected | Guild: `SAGARA AI — Virtual Office` |
| Telegram | ✅ Connected | DM: Ahmad Faqih I (`752812605`) |
| Google Workspace | ✅ Connected | Gmail, Drive, Sheets, Calendar |
| Obsidian | ✅ Connected | `/home/ubuntu/sagara-vault/` |
| GitHub | ✅ Connected | Repo: `amankerja/sagara-agent` |

### Discord Channels (20 channel terdaftar):
| Channel | ID | Alokasi Profil |
|---------|-----|---------------|
| `💻sagara-command` | `1539822084333641728` | Lead |
| `sagara-lab` | `1539822167473000472` | Sagara Lab |
| `marketing` | `1539822113894961153` | Marketing |
| `products` | `1539852817404010506` | Business |
| `content` | `1539852833233309736` | Marketing |
| `posting` | `1539852849306149006` | Marketing |
| `orders` | `1539852864321495040` | CS |
| `customer-service` | `1539852884483514459` | CS |
| `assistant` | `1539822141359267850` | Personal |
| `reminders` | `1539852910320422912` | Personal |
| `career` | `1539852924442775623` | Personal |
| `personal-finance` | `1539852939269644398` | Personal |
| `agent-status` | `1539852766665510953` | IT Support |
| `alerts` | `1539852785783414825` | IT Support |
| `gateway-status` | `1539853074359779458` | IT Support |
| `system-alerts` | `1539853090318975077` | IT Support |
| `🗓️cron` | `1539853039140208714` | Lead |
| `agent-coding-1` | `1540626169265913866` | IT Coding |
| `deep-search-engine` | `1541228613544976454` | Sagara Lab |

### Yang Perlu Ditambahkan / Dikoneksikan:
- ❌ Telegram bot per profil (saat ini hanya 1 DM ke Ahmad)
- ❌ Cron job per profil (scheduled tasks per divisi)
- ❌ MCP server custom (jika ada aplikasi internal)
- ❌ WhatsApp Business API (opsional)

---

## 5. Alokasi Model AI yang Digunakan

### Saat Ini: **SATU MODEL UNTUK SEMUA PROFIL**

| Profil | Model | Provider | Tipe |
|--------|-------|----------|------|
| lead | `fast-work-free` | `custom` (localhost:20128) | Flagship |
| personal | `fast-work-free` | `custom` (localhost:20128) | Flagship |
| business | `fast-work-free` | `custom` (localhost:20128) | Flagship |
| marketing | `fast-work-free` | `custom` (localhost:20128) | Flagship |
| cs | `fast-work-free` | `custom` (localhost:20128) | Flagship |
| it-support | `fast-work-free` | `custom` (localhost:20128) | Flagship |
| it-coding | `fast-work-free` | `custom` (localhost:20128) | Flagship |
| sagara-lab | `fast-work-free` | `custom` (localhost:20128) | Flagship |

### Rekomendasi Alokasi Model:
| Profil | Tipe Model | Alasan |
|--------|-----------|--------|
| `lead` | Flagship (berat) | Butuh reasoning kuat untuk delegasi & troubleshooting |
| `personal` | Medium | Asisten harian, tidak perlu reasoning ekstrem |
| `business` | Flagship | Analisis bisnis butuh akurasi tinggi |
| `marketing` | Medium + Creative | Butuh kreatifitas, reasoning sedang |
| `cs` | Ringan/Fast | Respon cepat, percakapan langsung |
| `it-support` | Medium | Monitoring & troubleshooting |
| `it-coding` | Flagship | Coding butuh reasoning kuat |
| `sagara-lab` | Flagship | R&D butuh reasoning & pengetahuan luas |

### ⚠️ Saat ini SEMUA profil pakai model yang sama (belum dioptimasi cost)

---

## 6. Gambaran Singkat Proyek / Alur Bisnis SAGARA

### Tujuan Utama SAGARA AI:
Sistem AI multi-agent untuk **otomatisasi bisnis digital produk** (jual beli lisensi software, serial number, digital goods).

### Alur Bisnis:
```
1. PRODUKSI KONTEN (Marketing Agent)
   └─► Buat konten visual, posting multi-platform, schedule

2. MARKETING & SALES (Marketing + Business Agent)
   └─► FB Group posting, target pembeli, follow-up

3. ORDER & CS (CS Agent)
   └─► Terima order, verifikasi pembayaran, kirim lisensi

4. OPERASIONAL (Personal Agent)
   └─► Jadwal, email, reminder, koordinasi harian

5. SYSTEM MONITORING (IT Support Agent)
   └─► Command center, alerting, infra health

6. DEVELOPMENT (IT Coding Agent)
   └─► Fitur baru, bug fix, deploy, code review

7. R&D (Sagara Lab Agent)
   └─► Eksperimen, riset, prototipe baru

8. KOORDINASI (Lead Agent)
   └─► Delegasi tugas, onboarding agen baru, troubleshooting
```

### Integrasi Bisnis:
- **Google Sheets** → Katalog produk, database pembeli, marketing plan
- **Google Drive** → File & dokumen terstruktur per divisi
- **Discord** → Komunikasi tim & command center
- **Telegram** → DM & notifikasi personal
- **Obsidian** → Knowledge base (Wiki SOP) & catatan harian
- **GitHub** → Backup & version control seluruh kode

### SOP Penting:
- Serial Number Spreadsheet (`1fd43EcttCUt-OVGbLs9LhAsjVWiqtIHyo_1mHFOujN4`) → **READ-ONLY, JANGAN MODIFY**
- Auto-backup harian: GitHub (01:00), GDrive secrets (01:15)
- Sentinel self-healing: setiap 4 jam

---

## RINGKASAN YANG PERLU DILAKUKAN

| No | Item | Status | Prioritas |
|----|------|--------|-----------|
| 1 | Custom SOUL.md per profil | ⚠️ BELUM | 🔴 TINGGI |
| 2 | Filter & assign skill per profil | ⚠️ BELUM | 🔴 TINGGI |
| 3 | Alokasi model berbeda per profil | ⚠️ BELUM | 🟡 SEDANG |
| 4 | Mapping Discord channel → profil | ⚠️ BELUM | 🔴 TINGGI |
| 5 | Setup workspace GDrive per profil | ⚠️ BELUM | 🟡 SEDANG |
| 6 | Cron job per divisi | ⚠️ BELUM | 🟡 SEDANG |
| 7 | Telegram bot per profil | ⚠️ BELUM | 🟢 RENDAH |
| 8 | MCP server custom | ⚠️ BELUM | 🟢 RENDAH |
| 9 | Testing & validasi per profil | ⚠️ BELUM | 🔴 TINGGI |
| 10 | Push ke GitHub | ✅ SELESAI | ✅ |
