# PROMPT: Redesign "Unified 2.5D Isometric Office Floor" — Sagara Virtual Office

> **Cara pakai dokumen ini:** ini adalah prompt siap-tempel untuk agent coding (Claude Code atau
> sejenisnya) yang punya akses ke seluruh repo. Bagian "Peta Codebase & Audit" di bawah sudah
> diverifikasi langsung dari `office.zip` yang kamu upload (bukan asumsi dari brief saja), supaya
> agent tidak perlu menerka struktur project dari nol. Tempel seluruh dokumen ini sebagai task
> awal ke agent, lalu biarkan dia mengonfirmasi ulang temuan audit sebelum mulai mengubah kode.

---

## 0. Peran & Sikap Kerja

Kamu adalah senior frontend/graphics engineer yang mengerjakan redesign visual **tanpa** mengubah
domain logic. Prioritasmu, berurutan:

1. Pahami renderer yang sudah ada sebelum menulis kode apa pun.
2. Perbaiki **spatial structure** (bagaimana ruang dibentuk), baru **depth**, baru **hierarchy
   visual**, baru dekorasi.
3. Evolusi arsitektur yang ada — jangan rewrite total selama masih bisa dikembangkan.
4. Jangan sentuh logic agent, state, click/hover/navigasi, atau projection data.

Jangan mulai coding sebelum kamu bisa menjawab: _"Bagaimana OfficeScene menyusun layer-layer ini,
dan file mana yang bertanggung jawab atas tiap layer?"_

---

## 1. Tujuan

Ubah tampilan **office 2.5D/isometric** (`OfficeScene.tsx` dan seluruh dependensinya) dari:

> kumpulan dashboard card berisi agent

menjadi:

> satu lantai kantor 2.5D yang menyatu — punya ruangan, koridor, dinding, sekat kaca, furniture,
> konektor antarzona, signage arsitektural, dan hierarki ruang yang jelas.

Bukan sekadar mempercantik warna/rounded corner — perbaiki **struktur spasial**-nya.

Target akhir: dalam 2–3 detik, orang paham lokasi Command Center, koridor utama, ruang kerja,
lounge, Server Room, Artifact Vault, Approval area, dan bagaimana semua itu terhubung — tanpa
membaca label.

---

## 2. Lingkup Kerja (Scope)

### Termasuk scope — semua file di bawah `features/office/` yang dipakai jalur **2.5D SVG**:

```
features/office/
├── components/
│   ├── OfficeZone.tsx          ← FOKUS UTAMA #1 (shell/room card generik)
│   ├── OfficeFloor.tsx         ← FOKUS UTAMA #2 (lantai + koridor)
│   ├── OfficeScene.tsx         ← compositor semua layer, termasuk area Lounge inline
│   ├── OfficeDefs2_5D.tsx      ← <defs> SVG: gradient/pattern/filter bersama
│   ├── CommandRoomStation.tsx
│   ├── RuntimeRoom.tsx         ← furniture Server Room
│   ├── ArtifactVault.tsx       ← furniture Artifact Vault
│   ├── ApprovalPod.tsx
│   ├── CollaborationZone.tsx
│   ├── AgentDesk.tsx
│   ├── TemporaryWorker.tsx
│   ├── OfficeCharacterLayer.tsx
│   ├── OfficeViewport.tsx      ← pan/zoom/fit-to-container
│   └── VirtualOfficeCanvas.tsx
├── renderers/Office2_5D/
│   ├── Office2_5DRenderer.tsx
│   └── Office2_5DPalette.ts    ← single source of truth warna & token per-zone
├── layout/
│   ├── office-layout-engine.ts ← memetakan data domain → posisi desk/worker
│   └── office-layout.ts        ← re-export DEFAULT_OFFICE_CONFIG dari luar slice ini
├── types/office.ts
└── systems/OfficeStatusColors.ts
```

### **Di luar scope — JANGAN diubah:**

- `renderers/Office3D/**` — renderer Three.js terpisah (punya `ServerRoom3D.tsx`,
  `ArtifactVault3D.tsx`, `CommandRoom3D.tsx`, `ApprovalPod3D.tsx`, `SpecialistZone3D.tsx` sendiri).
  Boleh dilihat sebagai referensi bahasa visual (misalnya bagaimana dia membedakan Server Room vs
  Vault secara 3D), tapi **tidak untuk diedit**.
- `renderers/OfficeList/OfficeListRenderer.tsx` — tampilan list/tabel, tidak relevan.
- Semua domain types (`@/types/agent`, `@/types/runtime`, `@/types/approval`, `@/types/task`) dan
  layout engine logic yang **menentukan** siapa masuk zona mana (`resolveAgentZone`,
  `activeTasksByAgent`, dll). Kamu boleh menambah _field visual_ baru (misalnya tier hierarchy atau
  bounds tambahan untuk pintu), tapi jangan mengubah aturan penempatan agent.
- `@/mocks/office-layout` (sumber `DEFAULT_OFFICE_CONFIG`) — **file ini tidak ada di slice yang kamu
  terima**, ada di bagian lain repo. Kamu WAJIB mencarinya (`grep -r "DEFAULT_OFFICE_CONFIG"`)
  sebelum mengerjakan Fase 2, karena di situlah `bounds` (x/y/width/height) tiap zona benar-benar
  didefinisikan. Redesign dinding/corridor/signage tidak akan akurat tanpa melihat bounds asli ini.

---

## 3. Peta Codebase & Hasil Audit (sudah diverifikasi dari kode, bukan tebakan)

Sebelum kamu re-audit sendiri (tetap lakukan ini, jangan percaya buta), berikut temuan konkret dari
pembacaan langsung `office.zip`:

### 3.1 `OfficeZone.tsx` — akar masalah utama

- Root `<g>` memakai `pointer-events-none` — zona background **tidak pernah** jadi click/hover
  target. Artinya redesign dinding/lantai/signage **aman** dari regresi interaksi, karena semua
  interaksi klik/hover ada di komponen lain (`AgentDesk`, `CommandRoomStation`, `RuntimeRoom`,
  `ArtifactVault`, `ApprovalPod`, `CollaborationZone` — masing-masing punya `onClick`,
  `onKeyDown`, `useState` tooltip sendiri).
- Dinding cuma dua sisi: **north wall** (`wallH = 26`, `wallT = 10`, hardcoded lokal di komponen,
  bukan dari token) dan **west wall** setinggi `wallT`. South & east tidak punya dinding sama
  sekali → ruangan terasa seperti card terbuka, persis seperti yang dikeluhkan di brief.
  Rounded-rect floor pakai `cornerR = 10` juga hardcoded lokal.
- "Glass partition" yang ada sekarang cuma satu garis tipis (`width ~2px`) di sisi barat dengan dua
  clip kecil — bukan sekat kaca yang terasa sebagai elemen arsitektur.
  Kamu perlu membangun sekat kaca yang punya frame + area transparan yang jelas terlihat, bukan
  garis dekoratif.
- Signage saat ini: `<rect>` pill mengambang di `(x+22, y+38)` dengan lebar dihitung dari
  `name.length * 8.5`, isinya accent bar + status dot + title + subtitle + badge jumlah agent
  bentuk pill terpisah. Ini **persis** pola "dashboard notification badge" yang disebut brief harus
  dihilangkan.
- Detail lantai per-tipe zona (`DEV_ZONE`, `COMMAND`, `RUNTIME`, `VAULT`) sudah ada tapi cuma berupa
  garis/crosshair tipis opacity 0.4–0.5 — bukan variasi _material_ lantai sungguhan.

### 3.2 `OfficeFloor.tsx` — koridor

- Satu floor plate besar rounded-rect (`x=15,y=15,w=1370`, tinggi dinamis) dengan pattern tile
  overlay (`#office-floor-grid`, sudah ada di `OfficeDefs2_5D.tsx`).
- Koridor cuma 2 rectangle solid tanpa depth/threshold: spine utara-selatan
  (`x=385,y=25,w=60,h=floorHeight-20`) dan jalur timur-barat ke lounge/server wing
  (`x=445,y=495,w=655,h=50`), masing-masing dikasih satu garis dash sebagai "center guide". Tidak
  ada pembeda tegas dengan lantai zona lain — ini yang bikin koridor terasa "whitespace", sesuai
  keluhan brief.
- Tidak ada elemen threshold/pintu/transisi lantai di titik pertemuan koridor↔zona sama sekali.
- Ada elemen branding "SAGARA MISSION CONTROL" di tengah lantai (`translate(700,435)`) — ini
  **elemen identitas produk**, pertahankan, tapi boleh disesuaikan proporsinya kalau corridor
  network berubah.

### 3.3 `Office2_5DPalette.ts` — warna & hierarchy

- Sudah ada struktur token yang cukup baik: tiap `OfficeZoneType` (`COMMAND`, `DEV_ZONE`,
  `CAREER_ZONE`, `MARKETING_ZONE`, `COLLABORATION`, `APPROVAL`, `RUNTIME`, `VAULT`, `SPECIALIST`)
  punya `accent`, `floorFill`, `floorStroke`, `wallTop`, `wallFace`, `glassFill`, `glassStroke`
  sendiri — hue-nya sebenarnya **sudah cukup berbeda** antar zona (biru/cyan/ungu/pink/amber/indigo/
  hijau).
- Masalah sebenarnya bukan hue-nya, tapi: (1) `floorFill` semua zona pakai alpha rendah & mirip
  (0.08–0.35) sehingga saturasi terasa seragam, dan (2) `wallTop`/`wallFace` untuk hampir semua tipe
  memakai pasangan warna netral yang **identik** (`#1e293b`/`#0f172a` dark, `#cbd5e1`/`#94a3b8`
  light) — cuma `COMMAND` yang beda. Ini akar dari "semua zona terasa sama pentingnya" di brief.
  → Solusinya bukan bikin palette baru dari nol, tapi **menaikkan differensiasi** field yang sudah
  ada + menambah field baru untuk tier (lihat Fase 4).
- Sudah ada namespace terpisah untuk furniture tiap facility station:
  `approvalPod`, `runtimeRoom`, `artifactVault`, `collaborationZone`, `breakLounge` — pola ini bagus
  dan harus dipertahankan/diperluas, jangan diganti sistem lain.
- `getAgentStatusVisual()` — sudah oke, tidak perlu disentuh.

### 3.4 Facility stations sudah lebih baik dari yang dikira brief — tapi "frame"-nya seragam

`RuntimeRoom.tsx`, `ArtifactVault.tsx`, `ApprovalPod.tsx`, `CollaborationZone.tsx` **sudah**
punya konten furniture yang jelas berbeda satu sama lain:

- `RuntimeRoom`: 3 server rack terpisah (LED hijau/biru/amber berbeda-beda), raised floor
  berlubang (`#server-raised-tiles`), cable management ladder overhead, console diagnostik.
- `ArtifactVault`: 2 rak arsip dengan kotak dokumen bertingkat, terminal ledger digital dengan
  "holographic cube" icon.
- `ApprovalPod`: meja review + 2 kursi berhadapan, beacon tower 3 warna (merah/amber/hijau),
  hazard-stripe threshold.
- `CollaborationZone`: meja rapat + lantai parquet kayu + 6 kursi + speakerphone.

Jadi klaim "Server Room dan Artifact Vault sulit dibedakan" di brief **sudah sebagian besar
teratasi di level furniture**. Yang masih membuat semuanya terasa seragam: **frame luar**-nya sama
persis di keempat komponen ini — pola berulang "Consistent Dual Grounding Contact Shadows" → plinth
3-tone → "Clean Floating Status Header Tag" (pill dengan status dot) → tooltip on hover. Karena
frame-nya identik, mata tetap membaca mereka sebagai "4 card yang isinya beda" bukan "4 ruangan yang
beda karakter". → Fokus Fase 5 & 6 harus ke _frame_, bukan menulis ulang furniture yang sudah bagus.

### 3.5 Lounge — literally tidak punya shell

Berbeda dari zona lain, area **Break/Refreshment Lounge** di `OfficeScene.tsx` (baris
`office-break-area`) **tidak pernah lewat `OfficeZone.tsx`**. Dia langsung digambar sebagai:
rug ellipse + espresso counter + water cooler + bistro table + sofa + plant, ditaruh mengambang di
atas floor plate umum tanpa perubahan material lantai, tanpa partisi, tanpa floor label. Ini
konfirmasi persis dari keluhan brief "lounge terlihat mengambang" — root cause-nya sudah jelas:
**lounge tidak punya definisi spasial sama sekali**, bukan cuma "kurang di-style".

### 3.6 Ketidakkonsistenan posisi — sumber kebenaran ganda

Setiap facility station punya default `position` prop sendiri di definisinya, TAPI
`OfficeScene.tsx` selalu memanggilnya dengan koordinat lain (hardcoded, override manual):

| Komponen             | Default prop di file-nya | Dipanggil dari `OfficeScene.tsx` |
| -------------------- | ------------------------ | -------------------------------- |
| `CommandRoomStation` | `{x:210, y:175}`         | `{x:215, y:195}`                 |
| `CollaborationZone`  | `{x:210, y:460}`         | `{x:700, y:520}`                 |
| `RuntimeRoom`        | `{x:640, y:670}`         | `{x:215, y:785}`                 |
| `ApprovalPod`        | `{x:210, y:730}`         | `{x:700, y:785}`                 |
| `ArtifactVault`      | `{x:1120, y:670}`        | `{x:1180, y:785}`                |

Dan posisi desk agent (`office-layout-engine.ts`) juga hardcoded terpisah lagi (`devStartX=540`,
`devColSpacing=240`, dst). Artinya **shell zona** (dari `DEFAULT_OFFICE_CONFIG.bounds`), **furniture
facility station**, dan **posisi desk agent** masing-masing punya sumber angka sendiri-sendiri yang
harus disinkronkan manual oleh manusia. Ini persis "random hardcoded transform" yang brief minta
dihindari di bagian token depth (#11). Default props yang tidak pernah dipakai sebaiknya dihapus
atau dijadikan derivasi dari satu sumber tunggal (lihat Fase 2).

### 3.7 Sistem koordinat & constraint teknis yang wajib dipertahankan

- Seluruh scene adalah **satu `<svg viewBox="0 0 1400 {totalHeight}">`** dengan koordinat absolut
  piksel (bukan relative/flex/grid). `OfficeViewport.tsx` yang menangani responsive: dia mengukur
  container dengan `ResizeObserver`, menghitung `fitScale = min(width/1400, height/sceneHeight)`,
  lalu pan/zoom/pinch di atas scale itu. → **Redesign HARUS tetap bekerja dalam sistem koordinat
  absolut 1400px ini.** Jangan pindah ke CSS transform 3D terpisah atau ubah viewport handling.
- `OfficeDefs2_5D.tsx` sudah punya gradient & pattern siap pakai yang bisa/harus kamu daur ulang:
  `office-floor-grid`, `server-raised-tiles`, `office-wood-parquet`, `office-tech-dots`,
  `office-floor-plate-gradient`, `office-glass-specular`, `office-server-face-gradient`,
  `office-slab-edge-gradient`, plus filter `office-contact-shadow`. Jangan bikin filter/gradient
  duplikat — extend file `<defs>` ini kalau perlu pattern lantai baru.
- Urutan layer di `OfficeScene.tsx` (dari belakang ke depan) sudah benar secara konsep dan harus
  dipertahankan: `OfficeFloor` → zona/wall (`OfficeZone`) → lounge inline → connector paths →
  facility stations → command desk → specialist desks → temporary workers → character layer. Kalau
  kamu menambah elemen baru (pintu, threshold, signage tambahan), sisipkan di layer yang sesuai,
  jangan acak urutannya karena akan menutupi karakter/desk.
- `AgentStatus`/status warna (`getAgentStatusVisual`, `getDeskStatusAccent` di
  `OfficeStatusColors.ts`) adalah **domain-driven**, jangan diubah maknanya — kamu boleh pakai warna
  ini untuk hierarchy visual tapi jangan redefine arti warnanya.

---

## 4. Root Cause Masalah Visual (ringkas)

| #   | Gejala di brief               | File & penyebab konkret                                                                                     |
| --- | ----------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Zona terlihat seperti card UI | `OfficeZone.tsx`: hanya 2 sisi dinding tipis, rounded-rect solid, pill label mengambang                     |
| 2   | Koridor terasa whitespace     | `OfficeFloor.tsx`: 2 rect polos tanpa threshold/transisi ke zona                                            |
| 3   | Tidak ada hierarchy visual    | `Office2_5DPalette.ts`: `wallTop/wallFace` identik lintas zona, `floorFill` alpha seragam rendah            |
| 4   | Server Room vs Vault mirip    | Bukan di furniture (sudah beda) — frame luar (`plinth` + `floating pill tag`) identik di 4 facility station |
| 5   | Lounge mengambang             | `OfficeScene.tsx`: lounge tidak pernah melewati `OfficeZone`, tidak ada shell sama sekali                   |
| 6   | Depth mismatch (isi > wadah)  | `OfficeZone.tsx` pakai `wallH/wallT/cornerR` lokal hardcoded, bukan token depth bersama                     |

---

## 5. Rencana Kerja Bertahap

Kerjakan berurutan. Setelah tiap fase, jalankan build/lint (kalau ada script-nya) dan screenshot
hasil sebelum lanjut fase berikutnya — jangan tumpuk semua perubahan lalu baru dicek di akhir.

### Fase 0 — Verifikasi Audit (wajib, sebelum menulis kode)

1. Temukan `@/mocks/office-layout` di repo, baca `DEFAULT_OFFICE_CONFIG.zones` — catat
   `id/type/bounds/name/subtitle` tiap zona yang benar-benar dipakai saat ini.
2. Konfirmasi ulang tabel di §3.6 (posisi default vs posisi terpakai) masih akurat.
3. Konfirmasi tidak ada consumer lain dari `OfficeZone`/`OfficeFloor` di luar `OfficeScene.tsx`
   (`grep -rn "OfficeZone\|OfficeFloor"` di seluruh repo, bukan cuma slice ini).
4. Cek apakah tipe zona `SPECIALIST` benar-benar dipakai di `DEFAULT_OFFICE_CONFIG` atau cuma ada
   di type union tapi tidak pernah muncul — ini menentukan apakah kamu perlu desain Tier untuk tipe
   ini juga.

### Fase 1 — Design Tokens / Depth System (fondasi semua fase berikutnya)

Buat satu sumber kebenaran, contoh nama file: `features/office/systems/office-depth-tokens.ts`
(atau tambahkan ke `Office2_5DPalette.ts` kalau tim lebih suka satu file), isinya minimal:

```ts
export const OFFICE_DEPTH = {
  FLOOR: 0,
  FLOOR_MATERIAL_INLAY: 1,
  RUG: 2,
  THRESHOLD: 4,
  FURNITURE_BASE: 6,
  LOW_PARTITION: 12,
  WALL_BASE: 18, // pengganti wallT=10 hardcoded
  DESK_HEIGHT: 20,
  WALL_TOP: 34, // pengganti wallH=26 hardcoded, dinaikkan agar depth lebih terasa
  GLASS_TOP: 34,
  SIGN_HEIGHT: 42,
} as const;

export const OFFICE_LIGHT = {
  direction: "top-left",
  shadowOffsetX: 4,
  shadowOffsetY: 6,
} as const;
```

Semua komponen wall/glass/sign/shadow baru **wajib** memakai nilai dari sini, bukan angka lokal.
Ganti `wallH`/`wallT`/`cornerR` di `OfficeZone.tsx` supaya mengambil dari token ini.

Sekaligus di fase ini: rapikan §3.6 — jadikan satu sumber posisi (bisa berupa map
`ZONE_ANCHOR[type] = {x,y}` yang diturunkan dari `bounds` zona, atau di reverse: `bounds` zona
diturunkan dari anchor yang sama dipakai facility station). Hapus default `position` prop yang
menyesatkan di tiap facility component kalau memang tidak pernah dipakai, atau selaraskan agar
default itu **sama persis** dengan yang dipanggil `OfficeScene.tsx`.

### Fase 2 — Arsitektur Dinding & Ruangan (`OfficeZone.tsx`)

Pecah `OfficeZone.tsx` yang sekarang monolitik menjadi sub-komponen reusable, sejalan dengan
struktur existing (evolusi, bukan folder baru yang tidak nyambung):

```
components/
  zone/
    ZoneWall.tsx          // north+south+west+east, dengan top face + front face (2 tone minimum)
    ZoneGlassPartition.tsx
    ZoneDoorway.tsx        // celah/threshold di titik sambungan ke koridor
    ZoneSign.tsx           // signage arsitektural, ganti pill lama
  OfficeZone.tsx            // compose 4 komponen di atas + floor + detail existing per-type
```

Ketentuan:

- Empat sisi dinding harus punya top-face + front-face (minimal 2-tone shading) memakai token Fase
  1, bukan cuma utara+barat.
- Sisi yang **menghadap kamera/depan** (biasanya selatan) harus pakai treatment low-wall atau
  cutaway supaya karakter & desk di dalamnya tidak tertutup — lihat §7 poin "Readability Agent".
- `ZoneGlassPartition` dipakai khusus untuk tipe `COMMAND`, `APPROVAL`, `COLLABORATION`, `RUNTIME`
  (zona yang menurut brief butuh visibility tinggi); tipe lain pakai solid wall biasa.
- Setiap `OfficeZone` merender minimal satu `ZoneDoorway` di sisi yang menghadap koridor terdekat —
  posisinya dihitung dari `bounds` zona relatif ke rect koridor di `OfficeFloor.tsx` (lihat Fase 3).

### Fase 3 — Koridor Nyata (`OfficeFloor.tsx`)

- Ganti 2 rect koridor polos dengan sistem yang eksplisit: tile pattern berbeda dari lantai zona
  (boleh reuse `office-floor-grid` dengan skala berbeda, atau bikin varian baru di
  `OfficeDefs2_5D.tsx`), garis arah (directional line, bukan cuma satu dashed center line), dan
  edge shadow di kedua sisi koridor supaya kelihatan "turun" sedikit dari floor plate utama.
- Tambahkan elemen `door threshold` tepat di titik sambungan koridor ↔ tiap zona (dipasangkan
  dengan `ZoneDoorway` dari Fase 2) — bentuknya bisa strip lantai dengan warna/material transisi,
  tidak perlu objek 3D rumit.
- Pertimbangkan lampu lantai/directional signage kecil di persimpangan koridor spine N-S dan jalur
  E-W, supaya "Main Corridor" terbaca sebagai satu elemen arsitektur yang disengaja, bukan sisa
  ruang kosong.

### Fase 4 — Visual Hierarchy (3 Tier)

Tambahkan field tier ke sistem token (jangan ke domain type `OfficeZoneType` — cukup di layer
presentasi, misal map terpisah `ZONE_TIER: Record<OfficeZoneType, 1|2|3>` di
`Office2_5DPalette.ts` atau file token baru):

- **Tier 1 (Critical):** `COMMAND`, `APPROVAL`, `RUNTIME`/monitoring — naikkan kontras
  `wallTop/wallFace`, `floorFill` alpha lebih tinggi, tambahkan micro-animation/activity indicator
  yang sudah ada di codebase (lihat `office-ambient` class di `RuntimeRoom.tsx`, reuse polanya).
- **Tier 2 (Active workspace):** `DEV_ZONE`, `CAREER_ZONE`, `MARKETING_ZONE`, `COLLABORATION` —
  moderat, seperti sekarang tapi dengan wall depth dari Fase 2.
- **Tier 3 (Infrastructure):** `VAULT` (dan `RUNTIME` kalau tim memutuskan Runtime lebih ke
  infrastruktur daripada critical-monitoring — putuskan berdasarkan hasil Fase 0) — tone lebih
  subdued tapi tetap punya identitas material sendiri (lihat Fase 5).

Jangan buat palette baru dari nol untuk ini — cukup naikkan varians `floorFill` alpha dan
differensiasi `wallTop/wallFace` per tier di `Office2_5DPalette.ts` yang sudah ada.

### Fase 5 — Frame Konsisten untuk Facility Stations (bukan rewrite furniture)

Furniture di `RuntimeRoom`, `ArtifactVault`, `ApprovalPod`, `CollaborationZone` **sudah bagus**
(lihat §3.4) — jangan ditulis ulang. Yang perlu diubah cuma "frame" luarnya supaya masing-masing
py komponen terasa sebagai ruangan berkarakter, bukan card dengan isi beda:

- `RuntimeRoom`: pertahankan raised floor + rack, tapi bungkus dalam shell `OfficeZone` tipe
  `RUNTIME` versi Tier-1/teknikal — tambahkan aksen "high-tech" di dinding (mis. garis LED tipis di
  wall face, bukan di floating tag).
  Ganti "Clean Floating Status Header Tag" jadi signage arsitektural (lihat Fase 6) yang
  ditempatkan di dinding/atas pintu, bukan pill mengambang di dalam ruangan.
- `ArtifactVault`: shell `OfficeZone` tipe `VAULT` Tier-3 — beri kesan "secure/access-controlled"
  lewat elemen di `ZoneDoorway` (mis. access-scanner kecil di pintu) alih-alih lewat pengulangan
  pola plinth yang sama dengan RuntimeRoom.
- `ApprovalPod` & `CollaborationZone`: sama — status tag lama diganti sign arsitektural, plinth
  grounding shadow boleh tetap ada (itu bukan masalah, cuma konsisten dengan sistem shadow global
  Fase 7), tapi hilangkan pola pill/badge yang identik antar-komponen.

### Fase 6 — Signage Arsitektural

Hapus pola pill `[icon] Nama / subtitle / N agents` di `OfficeZone.tsx` dan status-tag serupa di
tiap facility station. Ganti dengan satu komponen `ZoneSign.tsx` yang dipakai konsisten di semua
tempat:

- Bentuk: plat logam/acrylic menempel ke `ZoneWall` atau di atas `ZoneDoorway`, bukan mengambang
  bebas di tengah ruangan.
- Isi minimal: nama ruangan (uppercase, seperti sekarang) + subtitle kecil. Badge jumlah agent
  boleh tetap ada tapi ubah jadi `● N active` inline kecil di bawah nama, **bukan** rounded pill
  terpisah bergaya notification badge dashboard.
- Style disesuaikan tier dari Fase 4 (Tier 1 boleh sedikit "illuminated", Tier 3 lebih matte).

### Fase 7 — Lounge Sebagai Ruang Sungguhan

Lounge (`office-break-area` di `OfficeScene.tsx`) tidak perlu 4 dinding penuh, tapi wajib punya
definisi spasial minimal salah satu dari: perubahan material lantai yang jelas (bukan cuma ellipse
rug mengambang di atas floor plate polos — buat area lantai lounge benar-benar beda tile/warna dari
`office-floor-grid` sekitarnya), planter/low-partition divider di sisi yang berbatasan dengan
koridor E-W, atau ceiling/light cue sederhana. Sambungkan ke koridor dengan `ZoneDoorway`/threshold
yang sama seperti zona lain supaya tidak terasa mengambang.

### Fase 8 — Shadow & Lighting Konsisten

Audit semua shadow (`shadowAmbient/shadowContact/shadowDeep` di palette, plus filter
`office-contact-shadow`) — pastikan semua elemen baru (wall, glass, sign, threshold) pakai arah
cahaya yang sama dengan token `OFFICE_LIGHT` di Fase 1 (top-left → shadow bottom-right), konsisten
dengan yang sudah dipakai furniture existing (`ellipse cx=0 cy=+N` di banyak facility station sudah
mengikuti pola ini — jangan diubah, cukup diteruskan ke elemen baru).

### Fase 9 — Readability Agent (regression check, bukan fase pengerjaan baru)

Setelah Fase 2–7 selesai, cek eksplisit:

- Dinding sisi selatan/depan tidak menutupi `AgentDesk`/karakter — pakai cutaway/opacity fade kalau
  perlu (lihat rekomendasi brief §14). Karena `OfficeZone` di-render **sebelum** layer desk/character
  di urutan SVG (§3.7), secara default wall baru tidak akan menutupi karakter selama tinggi wall
  tidak dibuat berlebihan — tetap uji visual di zona dengan banyak agent.
  - Label agent, status indicator, hover/selection state, click target semua ada di komponen lain
    (`AgentDesk.tsx` dkk.) yang **tidak diubah** — pastikan tidak ada elemen baru dari `OfficeZone`
    yang mendapat `pointer-events` aktif dan menutupi z-order klik desk secara tidak sengaja
    (root `<g>` `OfficeZone` harus tetap `pointer-events-none`).

### Fase 10 — Responsive & Performance Check

- Uji dengan `OfficeViewport.tsx` pada beberapa ukuran container (desktop besar, laptop, viewport
  medium) — karena semua scaling berbasis `fitScale` dari `ResizeObserver`, pastikan detail wall/
  glass/sign baru tetap legible saat di-scale down, jangan pakai stroke width sangat tipis yang
  hilang saat displayScale kecil.
- Hindari `backdrop-filter`, blur besar, atau filter SVG baru — reuse `office-contact-shadow` yang
  sudah ada. Kalau butuh efek glass baru, pakai gradient/opacity sederhana seperti
  `office-glass-specular` yang sudah ada, jangan filter blur mahal.
- Hindari continuous animation baru yang berat; kalau perlu activity indicator Tier-1, reuse pola
  `motion-safe:animate-pulse` yang sudah dipakai (lihat connector "Awaiting Approval" di
  `OfficeScene.tsx`) dan hormati `settings.reducedMotion` dari `useAnimationSettings()`.

---

## 6. Guardrail — Jangan Lakukan Ini

- Jangan mengganti sistem SVG absolute-coordinate dengan pendekatan lain (CSS grid/flex/3D
  transform terpisah). Semua harus tetap hidup di dalam `viewBox="0 0 1400 {totalHeight}"`.
- Jangan menyentuh `office-layout-engine.ts` bagian yang menentukan **penempatan agent ke zona**
  (`resolveAgentZone`, prioritas command agent, dll.) — hanya boleh menambah/menyelaraskan
  data posisi visual bila memang diperlukan untuk sinkronisasi di Fase 1.
- Jangan menulis ulang furniture `RuntimeRoom`/`ArtifactVault`/`ApprovalPod`/`CollaborationZone`
  dari nol — itu sudah baik, fokus ke frame (Fase 5) dan signage (Fase 6).
- Jangan menambah `<filter>` blur besar, `backdrop-filter`, atau nested transform baru demi efek
  kaca/glow — reuse defs yang sudah ada di `OfficeDefs2_5D.tsx`.
- Jangan mengubah makna warna status agent (`getAgentStatusVisual`, `getDeskStatusAccent`).
- Jangan selesaikan masalah hierarchy/depth hanya dengan `border-radius`, `box-shadow` generik,
  atau gradient dekoratif tanpa mengubah struktur (wall, glass, threshold, tier).

---

## 7. Acceptance Criteria

**Architecture**

- [ ] Seluruh office terbaca sebagai satu lantai, bukan kumpulan card.
- [ ] Koridor utama terlihat jelas dan berbeda dari lantai zona.
- [ ] Setiap zona (termasuk Lounge) punya minimal satu bentuk akses/pintu/threshold ke koridor.
- [ ] Dinding punya depth (top face + front face) di keempat sisi yang relevan, bukan cuma 2 sisi.

**Visual**

- [ ] Command / Approval / Runtime (Tier 1) punya kontras & aktivitas visual lebih kuat dari Tier 2/3.
- [ ] Server Room dan Artifact Vault berbeda secara frame maupun furniture (furniture sudah oke,
      frame menyusul).
- [ ] Lounge punya definisi spasial (material lantai/partisi/rug jelas), tidak mengambang.
- [ ] Semua elemen baru pakai bahasa 2.5D konsisten (depth token Fase 1), tidak ada yang flat sendirian.

**Depth**

- [ ] Hierarchy floor < furniture < character < wall/sign konsisten di semua zona.
- [ ] Arah shadow seragam (top-left light) di semua elemen baru.
- [ ] Tidak ada ruangan yang terasa lebih flat daripada isi furniturenya.

**UX**

- [ ] Semua interaksi existing (klik/hover desk, tooltip facility station, navigasi
      `useNavigate`, keyboard `Enter`/`Space`) tetap berfungsi tanpa regresi.
- [ ] Karakter/agent tetap terlihat penuh, tidak tertutup dinding baru.
- [ ] Layout tetap baik di beberapa ukuran viewport lewat `OfficeViewport.tsx`.

**Code**

- [ ] Tidak ada hardcoded angka baru untuk depth/posisi — semua lewat token Fase 1.
- [ ] Komponen `zone/*` baru reusable dan dipakai konsisten oleh semua tipe zona.
- [ ] Tidak ada regresi pada state agent, projection data, atau layout engine.

---

## 8. Format Laporan Akhir (wajib disampaikan setelah implementasi selesai)

Jangan cuma bilang "redesign selesai". Berikan laporan terstruktur:

1. Root cause visual lama (boleh rujuk §4 di atas + temuan tambahanmu).
2. Daftar file yang diubah/ditambah.
3. Struktur renderer setelah redesign (diagram folder singkat).
4. Perubahan `OfficeFloor.tsx` (sistem koridor baru).
5. Perubahan `OfficeZone.tsx` + komponen `zone/*` baru.
6. Sistem wall / glass partition yang dipakai.
7. Sistem signage baru (`ZoneSign.tsx`).
8. Depth/elevation token system (isi filenya).
9. Perbedaan final Server Room vs Artifact Vault (frame + furniture).
10. Perubahan Lounge.
11. Hasil pengecekan responsive (screenshot/deskripsi di beberapa breakpoint).
12. Hasil regression check interaksi (list interaksi yang diuji + hasilnya).
13. Dampak performa (elemen apa yang ditambah/dihindari, kenapa).
14. Isu visual yang masih tersisa (kalau ada), dengan rekomendasi lanjutan.

Terakhir, jawab pertanyaan audit final dengan jujur:

> **"Apakah tampilan ini masih terlihat seperti kumpulan dashboard card?"**

Kalau jawabannya masih "ya" di area manapun, lanjutkan iterasi di area itu sebelum menyatakan
redesign selesai.
