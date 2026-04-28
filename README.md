<p align="center">
  <img src="docs/logo.png" alt="K-Patrol" width="140" />
</p>

<h1 align="center">K-Patrol — Mobile / Operator App</h1>

<p align="center">
  <em>Real-time control dashboard for the K-Patrol indoor patrol robot.</em><br/>
  <em>Ứng dụng điều khiển và giám sát robot tuần tra K-Patrol theo thời gian thực.</em>
</p>

<p align="center">
  <a href="https://nextjs.org"><img alt="Next.js" src="https://img.shields.io/badge/Next.js-14.2-black?logo=next.js" /></a>
  <a href="https://www.typescriptlang.org"><img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" /></a>
  <a href="https://mqtt.org"><img alt="MQTT" src="https://img.shields.io/badge/MQTT-5-660066?logo=mqtt" /></a>
  <a href="#pwa"><img alt="PWA" src="https://img.shields.io/badge/PWA-ready-5a0fc8" /></a>
  <a href="#license"><img alt="License" src="https://img.shields.io/badge/license-MIT-green" /></a>
  <a href="https://github.com/KPatrol/KPatrol_MobileApp"><img alt="Repo" src="https://img.shields.io/badge/repo-KPatrol_MobileApp-181717?logo=github" /></a>
</p>

<p align="center">
  <a href="#overview--tổng-quan">Overview</a> ·
  <a href="#features">Features</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#deployment">Deployment</a> ·
  <a href="#license">License</a>
</p>

---

## Overview / Tổng quan

The mobile-app is the operator console for K-Patrol — a Next.js 14 PWA that pairs with the backend over Socket.io and the robot directly over MQTT. It is the daily-driver UI for:

- Live joystick + D-Pad teleoperation
- Multi-camera streaming with quality presets and recording
- IMU / motor / battery telemetry charts
- GPS + indoor map overlay with patrol route drawing
- Patrol mission scheduling and replay
- Alert triage and history review
- Per-robot settings, quick actions, and operator preferences

Designed for both desktop (full layout) and tablet/phone (PWA install).

---

## Features

### Dashboard (`/`)
- 📡 Real-time robot status (battery, speed, mode, fault flags)
- 🛰️ GPS map card with reverse-geocoded location
- 📈 Telemetry charts: motor encoders, IMU, temperature, current draw
- 🚦 Quick action toggles (auto-patrol, eco, night-mode, lights, lock, record, silent) — see [src/lib/quick-actions.ts](src/lib/quick-actions.ts)
- 🛡️ Safety/IMU display panel
- 🗺️ Patrol panel with waypoint drawing

### Views
- **Control** — Joystick + D-Pad, speed limit slider, emergency stop
- **Camera** — Multi-source video with PiP, snapshot, recording
- **Patrol** — Plan / start / replay autonomous patrols, route view
- **History** — Time-filtered logs of sessions, alerts, telemetry
- **Alerts** — Triage queue with acknowledgement
- **Settings** — Robot, network, MQTT, operator preferences

### Auth & multi-robot
- 🔐 Login / register / forgot-password flows
- 🤖 Robot picker — `/robots/*` routes for per-robot drill-down
- 🪪 JWT-based session via `useAuth` + `useSocket` hooks

### PWA
- 📲 Add-to-home-screen support
- 🛠️ Service-worker registration ([src/components/ServiceWorkerRegister.tsx](src/components/ServiceWorkerRegister.tsx))

---

## Tech Stack

| Layer | Library / Tool |
|-------|---------------|
| Framework | Next.js 14.2 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 3.4 + `class-variance-authority` |
| UI primitives | Radix UI (Dialog, Dropdown, Tabs, Tooltip, Slider, Switch, Progress) |
| State | Zustand 4 (`robotStore`, `patrolRouteStore`) |
| Realtime | Socket.io client 4.7, MQTT.js 5 |
| Charts | Recharts 2.12 |
| Maps | MapLibre GL 5, Leaflet 1.9, react-leaflet, react-map-gl |
| Animation | Framer Motion 11 |
| Icons | Lucide React |
| Testing | Vitest 1.4, Testing Library, jsdom |

---

## Project Structure

```
mobile-app/
├── public/                          # Static assets, PWA manifest, icons
├── src/
│   ├── app/
│   │   ├── layout.tsx               # Root shell + service worker
│   │   ├── page.tsx                 # Default dashboard route
│   │   ├── globals.css
│   │   ├── login/                   # Auth: login, register, forgot
│   │   ├── register/
│   │   ├── forgot-password/
│   │   └── robots/[id]/             # Per-robot drill-down routes
│   ├── components/
│   │   ├── dashboard/               # GPSMapCard, MotorStatus, PatrolPanel,
│   │   │                            # PathDrawer, QuickActions, SafetyIMU…
│   │   ├── views/                   # Camera, Control, Dashboard, History,
│   │   │                            # Settings, Alerts, Patrol, PatrolRoute
│   │   ├── layout/                  # Header, Sidebar
│   │   ├── map/                     # Map renderers
│   │   ├── ui/                      # Button, primitives
│   │   └── ServiceWorkerRegister.tsx
│   ├── hooks/
│   │   ├── useAuth.ts               # JWT session + restore
│   │   └── useSocket.ts             # Socket.io connection + reconnect
│   ├── lib/
│   │   └── quick-actions.ts         # Sidebar quick-action catalog
│   └── store/
│       ├── robotStore.ts            # Selected robot, telemetry, settings
│       └── patrolRouteStore.ts      # Drawn route + waypoint state
├── next.config.js
├── tailwind.config.ts
├── vitest.config.ts
└── package.json
```

---

## Quick Start

```bash
# Install
pnpm install      # or npm install

# Configure env
cp .env.example .env.local
#   NEXT_PUBLIC_API_URL=http://localhost:4000
#   NEXT_PUBLIC_WS_URL=ws://localhost:4000
#   NEXT_PUBLIC_MQTT_URL=ws://localhost:8083/mqtt
#   NEXT_PUBLIC_MQTT_USERNAME=...
#   NEXT_PUBLIC_MQTT_PASSWORD=...

# Develop on http://localhost:3000
pnpm dev

# Production build
pnpm build && pnpm start
```

### Environment variables

| Key | Required | Description |
|-----|----------|-------------|
| `NEXT_PUBLIC_API_URL` | yes | Backend REST base URL |
| `NEXT_PUBLIC_WS_URL` | yes | Backend Socket.io URL |
| `NEXT_PUBLIC_MQTT_URL` | yes | Robot MQTT broker over WebSocket |
| `NEXT_PUBLIC_MQTT_USERNAME` | optional | MQTT auth |
| `NEXT_PUBLIC_MQTT_PASSWORD` | optional | MQTT auth |

---

## Testing

```bash
pnpm test         # vitest run (one-shot)
pnpm test:watch   # vitest watch mode
```

Tests live next to the code they cover (`*.test.ts(x)`) and run in `jsdom` with `@testing-library/react`.

---

## Deployment

### Docker

```bash
docker build -f Dockerfile.docker -t kpatrol-mobile .
docker run -p 3000:3000 --env-file .env.local kpatrol-mobile
```

### Netlify / Vercel

Standard Next.js build. Set the env vars above in the platform dashboard. For PWA installability the site must be served over HTTPS with the manifest reachable at `/manifest.webmanifest`.

---

## Scripts

| Script | Action |
|--------|--------|
| `pnpm dev` | Dev server on port 3000 |
| `pnpm build` | Production build |
| `pnpm start` | Run production server |
| `pnpm lint` | ESLint via `next lint` |
| `pnpm test` | Vitest run |
| `pnpm clean` | Remove `.next`, `node_modules` |

---

## License

MIT License — © K-Patrol / Vu Dang Khoa, 2026.
