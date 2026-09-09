# Sagara Mission Control — Frontend Foundation & Responsive Theme System

```text
STATUS:
Frontend Foundation + Theme System & Responsive Shell

BACKEND:
Not Connected

HERMES:
No Direct Frontend Connection
```

An enterprise-grade, high-density operations dashboard for autonomous agent fleets and runtime telemetry, featuring full Light, Dark, and System theme support across all device viewports.

---

## 1. Architectural Boundary & Isolation Guards

* **Local Sandbox**: This frontend runs entirely locally in development.
* **No Direct VPS Connection**: Does not connect to or alter any production VPS or Hermes process.
* **Architecture Guard**: The frontend only communicates with the future **Sagara Mission Control API** via native fetch (`src/api/client.ts`). It **never** invokes Hermes or accesses SQLite directly.

```text
React Frontend  ──(HTTP/REST + SSE)──>  Mission Control API  ──>  Sagara Agent / Hermes Runtime
```

---

## 2. Technology Stack

* **Framework**: React 19 + TypeScript (Strict Mode)
* **Build Tool**: Vite 8 with ESM native alias resolution
* **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + Theme Semantic Design Tokens
* **Theming**: Custom lightweight `ThemeProvider` (`light`, `dark`, `system` with `prefers-color-scheme` listener)
* **UI Foundation**: Radix UI Primitives + shadcn/ui components (Nova preset with Lucide icons)
* **Routing**: React Router v7 (Persistent Shell layout, 9 routes + 404 handler)
* **State Management**: Zustand with `localStorage` persistence (desktop sidebar collapse state, mobile sheet, modals)
* **Server State & Querying**: TanStack React Query v5
* **Linter**: Oxlint

---

## 3. Getting Started

### Prerequisites

* Node.js: `v20+` (Verified on `v22.19.0`)
* npm: `v10+` (Verified on `11.7.0`)
* Git: Installed

### Installation

```bash
cd frontend
npm install
```

### Development Server

```bash
npm run dev
```

Default local URL: `http://localhost:5173` (or next available port).

### Production Build & Verification

```bash
# Type check and build bundle
npm run build

# Run linter
npm run lint

# Preview production build locally
npm run preview
```

---

## 4. Environment Variables

Create `.env` from `.env.example`:

```env
# Sagara Mission Control API Endpoint (Default Local Development Port)
VITE_MISSION_CONTROL_API_URL=http://localhost:8000
```

> **IMPORTANT**: Never insert production server IPs or credentials into local frontend environment configurations.

---

## 5. Theme System & Visual Direction

### Supported Modes
1. **Light Mode**: Modern enterprise SaaS aesthetic, soft neutral background (`#f8fafc`), crisp elevated white cards (`#ffffff`), subtle borders (`#e2e8f0`), dark primary typography (`#0f172a`), and blue primary interaction accents (`#2563eb`).
2. **Dark Mode**: Operational high-density dark aesthetic, deep neutral/navy background (`#090b10`), dark surface hierarchy (`#0f121a`, `#161a26`), restrained borders (`#1e2436`), and readable text (`#f1f5f9`).
3. **System Mode**: Automatically synchronizes with OS `prefers-color-scheme` preferences and dynamically updates when the operating system theme toggles.

### Persistence
* Key: `sagara-theme` in `localStorage`.
* Instant zero-flash initialization script in `index.html`.

---

## 6. Responsive Layout Breakpoints

* **Desktop (>= 1024px)**:
  * Persistent collapsible sidebar (expanded ~256px, collapsed ~64px).
  * System Pulse 6-column grid.
  * Side-by-side operational panels (Attention Queue & Agent Overview).
* **Tablet (768px – 1023px)**:
  * Compact sidebar navigation.
  * System Pulse 3-column grid.
  * Compact header with search and status indicators.
* **Mobile (< 768px)**:
  * Desktop sidebar hidden.
  * 56–64px compact mobile header with 44px touch targets.
  * Navigation Sheet drawer with all command sections and theme segmented control.
  * System Pulse 1–2 column stacked grid.
  * Filter modal / dropdown on Agents page.
  * Guaranteed `overflow-x: hidden` with zero accidental body horizontal scroll.

---

## 7. Application Structure

```text
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx                  # Root app provider wrapping RouterProvider
│   │   ├── router.tsx               # Route definitions with MissionControlLayout
│   │   ├── providers.tsx            # ThemeProvider, TanStack Query & Tooltip providers
│   │   ├── theme-provider.tsx       # Light/Dark/System ThemeProvider with OS scheme listener
│   │   └── query-client.ts          # Cache configurations & query defaults
│   │
│   ├── layouts/
│   │   └── MissionControlLayout.tsx # Persistent desktop & mobile responsive shell
│   │
│   ├── pages/
│   │   ├── CommandCenterPage.tsx    # Responsive System Pulse, Attention Queue, Agent Overview
│   │   ├── AgentsPage.tsx           # Fleet directory (responsive 1-4 column grid)
│   │   ├── TasksPage.tsx            # Task orchestration placeholder
│   │   ├── ApprovalsPage.tsx        # Human-in-the-loop approvals placeholder
│   │   ├── OfficePage.tsx           # 2.5D Virtual Office visualization standby
│   │   ├── ActivityPage.tsx         # Operational activity & event stream log
│   │   ├── SkillsPage.tsx           # Registered capabilities & tool manifests
│   │   ├── RuntimePage.tsx          # Hermes telemetry & supervisor status
│   │   ├── SettingsPage.tsx         # Theme controls, API boundaries, security, and environment
│   │   └── NotFoundPage.tsx         # 404 recovery route
│   │
│   ├── components/
│   │   ├── ui/                      # 12 foundation shadcn/Radix components
│   │   ├── shell/                   # AppSidebar, GlobalHeader & ThemeSwitcher
│   │   └── shared/                  # StatusBadge, MetricCard, SectionCard, PageHeader, EmptyState, ErrorState, LoadingState
│   │
│   ├── api/
│   │   ├── client.ts                # Lightweight native fetch client with error normalization
│   │   └── query-keys.ts            # Centralized React Query cache keys
│   │
│   ├── stores/
│   │   └── ui-store.ts              # Zustand store with localStorage persistence for sidebar
│   │
│   ├── types/
│   │   ├── agent.ts                 # Full 9-state AgentStatus contract & AgentProjection
│   │   ├── profile.ts               # Dynamic AgentProfile without hardcoded IDs
│   │   ├── skill.ts                 # Capability schemas
│   │   └── runtime.ts               # RuntimePulse & telemetry event types
│   │
│   ├── styles/
│   │   └── globals.css              # Light & Dark semantic tokens, scrollbars & table styles
│   │
│   └── main.tsx                     # React 19 entry point
│
├── .env.example                     # Reference environment config
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 8. Current Implementation Status

* [x] Pure local project scaffolded in Windows filesystem.
* [x] Full Light Mode, Dark Mode, and System Theme support with zero-flash reload.
* [x] Complete semantic tokens in `globals.css` covering surfaces, borders, text, status, and charts.
* [x] ThemeSwitcher dropdown in Global Header + segmented control on mobile & Settings page.
* [x] Desktop, Tablet, and Mobile responsive layout breakpoints.
* [x] Collapsible sidebar with `localStorage` persistence.
* [x] Mobile Navigation Sheet drawer with >= 44px touch targets.
* [x] System Pulse responsive grid (1-2 cols mobile, 3 cols tablet, 6 cols desktop).
* [x] Agents directory responsive grid (1 col mobile, 2 cols tablet, 3-4 cols desktop).
* [x] Section 15 Status contract (`ACTIVE`, `IDLE`, `RECENTLY_ACTIVE`, `AWAITING_APPROVAL`, `DEGRADED`, `ERROR`, `OFFLINE`, `UNKNOWN`, `CONFIGURATION_INCOMPLETE`) with high contrast in both light and dark modes.
* [x] Dynamic Agent directory schema supporting arbitrary `AgentProjection[]` without hardcoding profile names.
* [x] Zero fake production metric fabrication.
* [x] Clean production build (`npm run build`) passing with zero errors.
* [x] Linter (`npm run lint`) passing with zero errors.
