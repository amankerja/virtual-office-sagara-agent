# Sagara Mission Control — Frontend Foundation

```text
STATUS:
Frontend Foundation Only

BACKEND:
Not Connected

HERMES:
No Direct Frontend Connection
```

An enterprise-grade, high-density operations dashboard for autonomous agent fleets and runtime telemetry.

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
* **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + Custom Dark Enterprise Design Tokens
* **UI Foundation**: Radix UI Primitives + shadcn/ui components (Nova preset with Lucide icons)
* **Routing**: React Router v7 (Persistent Shell layout, 9 routes + 404 handler)
* **State Management**: Zustand (UI sidebar, mobile drawers, modal states)
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

## 5. Application Structure

```text
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx                  # Root app provider wrapping RouterProvider
│   │   ├── router.tsx               # Route definitions with MissionControlLayout
│   │   ├── providers.tsx            # TanStack Query & Tooltip providers
│   │   └── query-client.ts          # Cache configurations & query defaults
│   │
│   ├── layouts/
│   │   └── MissionControlLayout.tsx # Persistent desktop & mobile shell
│   │
│   ├── pages/
│   │   ├── CommandCenterPage.tsx    # System Pulse, Attention Queue, Agent Overview
│   │   ├── AgentsPage.tsx           # Fleet directory (dynamic AgentProjection[])
│   │   ├── TasksPage.tsx            # Task orchestration placeholder
│   │   ├── ApprovalsPage.tsx        # Human-in-the-loop approvals placeholder
│   │   ├── OfficePage.tsx           # 2.5D Virtual Office visualization standby
│   │   ├── ActivityPage.tsx         # Operational activity & event stream log
│   │   ├── SkillsPage.tsx           # Registered capabilities & tool manifests
│   │   ├── RuntimePage.tsx          # Hermes telemetry & supervisor status
│   │   ├── SettingsPage.tsx         # API boundaries, security, and environment
│   │   └── NotFoundPage.tsx         # 404 recovery route
│   │
│   ├── components/
│   │   ├── ui/                      # 12 foundation shadcn/Radix components
│   │   ├── shell/                   # AppSidebar & GlobalHeader
│   │   └── shared/                  # StatusBadge, MetricCard, SectionCard, PageHeader, EmptyState, ErrorState, LoadingState
│   │
│   ├── api/
│   │   ├── client.ts                # Lightweight native fetch client with error normalization
│   │   └── query-keys.ts            # Centralized React Query cache keys
│   │
│   ├── stores/
│   │   └── ui-store.ts              # Zustand store for sidebar, drawers, filters
│   │
│   ├── types/
│   │   ├── agent.ts                 # Full 9-state AgentStatus contract & AgentProjection
│   │   ├── profile.ts               # Dynamic AgentProfile without hardcoded IDs
│   │   ├── skill.ts                 # Capability schemas
│   │   └── runtime.ts               # RuntimePulse & telemetry event types
│   │
│   ├── styles/
│   │   └── globals.css              # Dark operations design tokens & scrollbars
│   │
│   └── main.tsx                     # React 19 entry point
│
├── .env.example                     # Reference environment config
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 6. Current Implementation Status

* [x] Pure local project scaffolded in Windows filesystem.
* [x] Tailwind CSS v4 + custom high-density dark enterprise design tokens.
* [x] 12 foundation shadcn UI components installed & verified.
* [x] Collapsible sidebar with COMMAND, AGENTS, OPERATIONS, SYSTEM sections.
* [x] Global header with breadcrumb context, profile filter, system health placeholder, command search trigger, and attention indicator.
* [x] 9 standard routes plus 404 fallback mounted under persistent shell.
* [x] Section 15 Status contract (`ACTIVE`, `IDLE`, `RECENTLY_ACTIVE`, `AWAITING_APPROVAL`, `DEGRADED`, `ERROR`, `OFFLINE`, `UNKNOWN`, `CONFIGURATION_INCOMPLETE`) with label, shape, and color.
* [x] Dynamic Agent directory schema supporting arbitrary `AgentProjection[]` without hardcoding profile names.
* [x] Zero fake production metric fabrication.
* [x] Native Fetch API client configured with `AbortSignal` and normalized error handling.
* [x] Clean production build (`npm run build`) passing with zero errors.
* [x] Linter (`npm run lint`) passing with zero errors.
