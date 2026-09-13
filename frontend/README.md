# Sagara Mission Control — Production Operations Interface

`	ext
STATUS:
Production Operations Control Center (Mission Control V1)

DEPLOYMENT:
Same-Origin Relative API (/api/v1/...)

DATA MODE:
API Mode (Default, fails closed in production)
Explicit Mock Mode (Development & Story/Demo testing only)

HERMES RUNTIME:
Connected via Mission Control Backend Supervisor
`

An enterprise-grade, high-density operations dashboard for autonomous agent fleets and runtime telemetry, featuring full Light, Dark, and System theme support across all device viewports.

---

## 1. Architectural Boundary & Operational Semantics

* **Production Same-Origin**: The frontend is deployed same-origin with the Mission Control backend, communicating over relative /api/v1/... and WebSocket endpoints.
* **Fail-Closed Semantics**: Production builds default strictly to live API mode. An API communication failure displays UNAVAILABLE or OFFLINE status—it never silently falls back to synthetic mock data in production.
* **Development Modes**:
  * **API Mode (Default)**: Proxies /api and /ws to http://localhost:8000 via Vite dev server.
  * **Mock Mode (Explicit)**: Enabled only when explicitly requested via VITE_DATA_MODE=mock.
* **Execution Safety Guard**: The frontend operates under PRODUCTION_EXECUTION_POLICY_V3 with human-in-the-loop safety gates and explicit approval workflows. It never issues direct arbitrary shell executions or bypasses safety locks.

`	ext
Operator Browser  ──(Same-Origin HTTP/WS)──>  Mission Control API  ──>  Sagara Agent / Hermes Runtime
`

---

## 2. Technology Stack

* **Framework**: React 19 + TypeScript (Strict Mode)
* **Build Tool**: Vite 8 with ESM native alias resolution
* **Styling**: Tailwind CSS v4 (@tailwindcss/vite) + Theme Semantic Design Tokens
* **Theming**: Custom lightweight ThemeProvider (light, dark, system with prefers-color-scheme listener)
* **UI Foundation**: Radix UI Primitives + shadcn/ui components (Nova preset with Lucide icons)
* **Routing**: React Router v7 (Persistent Shell layout, 10 routes + 404 handler)
* **State Management**: Zustand with localStorage persistence (desktop sidebar collapse state, mobile sheet, modals)
* **Server State & Querying**: TanStack React Query v5
* **Linter**: Oxlint

---

## 3. Getting Started

### Prerequisites

* Node.js: 20+ (Verified on 22.19.0)
* npm: 10+ (Verified on 11.7.0)
* Git: Installed

### Installation

`ash
cd frontend
npm install
`

### Development Server

`ash
# Run in default live API mode (proxied to localhost:8000)
npm run dev

# Run in explicit mock mode for isolated UI development
npm run dev:mock
`

Default local URL: http://localhost:5173.

### Production Build & Verification

`ash
# Run unit & component test suite
npm test

# Type check and build production bundle
npm run build

# Run linter
npm run lint

# Preview production build locally
npm run preview
`

---

## 4. Environment Variables

Configure .env for development if customizing endpoints:

`env
# Optional: explicitly configure API origin for external backend development
# Leave empty or omitted for same-origin relative deployment
VITE_MISSION_CONTROL_API_URL=

# Data mode: 'api' (default in production) or 'mock' (dev only)
VITE_DATA_MODE=api
`

> **SECURITY NOTE**: Production deployments use same-origin relative paths. Never embed production server credentials or secret tokens into client bundles.

---

## 5. Theme System & Visual Direction

### Supported Modes
1. **Light Mode**: Modern enterprise SaaS aesthetic, soft neutral background (#f8fafc), crisp elevated white cards (#ffffff), subtle borders (#e2e8f0), dark primary typography (#0f172a), and blue primary interaction accents (#2563eb).
2. **Dark Mode**: Operational high-density dark aesthetic, deep neutral/navy background (#090b10), dark surface hierarchy (#0f121a, #161a26), restrained borders (#1e2436), and readable text (#f1f5f9).
3. **System Mode**: Automatically synchronizes with OS prefers-color-scheme preferences and dynamically updates when the operating system theme toggles.

### Persistence
* Key: sagara-theme in localStorage.
* Instant zero-flash initialization script in index.html.

---

## 6. Responsive Layout Breakpoints

* **Wide Display (>= 1440px)**:
  * Expanded container (max-w-[1560px]).
  * Dense operational tables and multi-column telemetry strips.
  * Persistent collapsible sidebar.
* **Desktop (1024px – 1439px)**:
  * Persistent collapsible sidebar (expanded ~256px, collapsed ~64px).
  * Standard multi-column operational views.
* **Tablet (768px – 1023px)**:
  * Compact sidebar navigation.
  * 3-column metric strips and scrollable data tables.
* **Mobile (< 768px)**:
  * Desktop sidebar hidden.
  * Compact 56–64px header with 44px minimum touch targets.
  * Full navigation drawer sheet.
  * Stacked list rows and compact status cards.
  * Guaranteed overflow-x: hidden with zero accidental body horizontal scroll.

---

## 7. Operational Verification Checklist

* [x] Production same-origin relative API routing (/api/v1/...).
* [x] Production data provider fails closed (no silent fallback to mock fixtures).
* [x] Zero prototype or sandbox environment labels in production interface.
* [x] Nonfunctional header placeholder controls removed or connected to real telemetry.
* [x] Persistent Execution Safety status pill (LOCKED) visible across operational views.
* [x] Card container density reduced by 30-50% using flat status strips and compact tables.
* [x] Border radiuses normalized to 4–8px (ounded-lg, ounded-md).
* [x] Monospace typography strictly constrained to IDs, hashes, timestamps, and technical data.
* [x] Full responsive compliance across Desktop (1440px+), Tablet (1024px), and Mobile (390px).
* [x] Clean unit test suite (
pm test).
* [x] Clean production build (
pm run build).
* [x] Clean lint check (
pm run lint).
