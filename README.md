# Agent Guild

A mission-control dashboard for orchestrating autonomous AI agents. Monitor trust scores, dispatch missions, chat with agents in real time, and escalate to voice calls -- all from one tactical command center.

Built with React 19, Express, SQLite, TrueFoundry AI Gateway, Auth0, Bland.ai, and Airbyte.

## Features

- **Dashboard** -- guild-wide health, active missions, trust metrics, agent roster
- **Agent Management** -- view agents with trust scores, specialties, status, and mission history
- **Mission Board** -- create, assign, and track missions with priority and progress
- **Comms** -- real-time streaming chat with agents via TrueFoundry AI Gateway
- **Voice Escalation** -- trigger phone calls to agents via Bland.ai pathways
- **Trust Ledger** -- weekly trust trends, risk assessment, per-agent audit logs
- **Registry** -- bind guild agents to backend agent records
- **Operator Panel** -- system alerts, approval queue, critical overrides
- **Data Pipelines** -- Airbyte integration for syncing external data sources
- **Auth** -- Auth0 login with protected routes and user profiles
- **Persistent Backend** -- all state persists in SQLite across refreshes and restarts

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript 5.9, Vite 8, Tailwind CSS v4, React Router v7 |
| Backend | Express 5, Node.js, TrueFoundry AI Gateway (OpenAI-compatible) |
| Database | SQLite (better-sqlite3) -- file-based, zero-config persistence |
| Auth | Auth0 SPA SDK |
| Voice | Bland.ai (call launch + webhook receiver) |
| Data | Airbyte API |
| Design | Space Grotesk + Inter, glassmorphism, Electric Violet / Neon Cyan palette |

## Architecture

All runtime state is served from a SQLite database (`/.data/guild.db`). The files in `src/data/*` are **seed data only** -- they populate the database on first run and are never read at runtime by any page or component.

```
┌─────────────────────────────────┐
│  React Frontend (Vite)          │
│  useData() → /api/data/*        │
└────────────┬────────────────────┘
             │ fetch
┌────────────▼────────────────────┐
│  Express Server (:3001)         │
│  /api/data/*  → SQLite (R/W)    │
│  /api/chat/*  → TrueFoundry     │
│  /api/voice/* → Bland.ai        │
│  /api/airbyte → Airbyte API     │
└────────────┬────────────────────┘
             │
┌────────────▼────────────────────┐
│  .data/guild.db (SQLite)        │
│  24 tables, seeded from         │
│  src/data/* on first run        │
└─────────────────────────────────┘
```

### Data Flow

1. On first server start, `server/seed.ts` reads `src/data/*` fixtures and populates the SQLite database
2. `DataProvider` (React context) fetches all entities from `/api/data/*` on mount
3. Pages use `useData()` hook to access agents, missions, trust metrics, chat, etc.
4. Mutations (approve, rebind, update incident) PATCH the backend and update local state
5. The database persists across server restarts -- seed only runs if the DB is empty

## Quick Start

```bash
git clone https://github.com/EcosystemNetwork/Agent-Guild.git
cd Agent-Guild
npm install
cp .env.example .env   # fill in your API keys
```

**Full stack** (frontend + API gateway + SQLite persistence):

```bash
npm run dev:all
```

Open [http://localhost:5173](http://localhost:5173)

## Environment Variables

Copy `.env.example` and fill in:

| Variable | Required | Description |
|----------|----------|-------------|
| `TRUEFOUNDRY_BASE_URL` | Yes | TrueFoundry LLM Gateway endpoint |
| `TRUEFOUNDRY_API_KEY` | Yes | API key for TrueFoundry |
| `TRUEFOUNDRY_MODEL` | No | Model ID (default: `openai-main/gpt-4o-mini`) |
| `VITE_AUTH0_DOMAIN` | Yes | Auth0 tenant domain |
| `VITE_AUTH0_CLIENT_ID` | Yes | Auth0 SPA client ID |
| `VITE_AUTH0_AUDIENCE` | No | Auth0 API audience |
| `BLAND_API_KEY` | No | Bland.ai key (voice calls; simulation mode if unset) |
| `BLAND_PATHWAY_ID` | No | Default Bland pathway |
| `WEBHOOK_BASE_URL` | No | Public URL for Bland webhooks (e.g. ngrok) |
| `VITE_AIRBYTE_TOKEN` | No | Airbyte API bearer token |
| `PORT` | No | Backend port (default: 3001) |

## Routes

| Route | Page | Description |
|-------|------|-------------|
| `/login` | Login | Auth0 authentication |
| `/` | Dashboard | Guild status, active missions, trust score, agent roster |
| `/agents` | Agents | Agent cards with trust scores, specialties, status |
| `/missions` | Mission Board | Mission tracking with priority and progress |
| `/comms` | Comms | Streaming chat with AI agents |
| `/trust` | Trust Ledger | Trust analytics, weekly trends, agent breakdown |
| `/operator` | Operator Panel | Alerts, approval queue, critical overrides |
| `/registry` | Registry | Bind guild agents to backend agent records |
| `/profile` | Profile | User profile and settings |

## API Endpoints

### Data API (`/api/data/*`) -- persisted backend state

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/data/agents` | List all agents |
| GET/POST/PATCH | `/api/data/agents/:id` | CRUD agent |
| GET | `/api/data/missions` | List missions (filter by status, type) |
| GET/POST/PATCH | `/api/data/missions/:id` | CRUD mission |
| GET | `/api/data/mission-context` | Mission operational context |
| GET | `/api/data/activity` | Activity feed events |
| GET/PATCH | `/api/data/guild-metrics` | Guild-wide metrics |
| GET | `/api/data/trust-metrics` | Per-agent trust scores |
| GET | `/api/data/trust-history` | Trust score time series |
| GET | `/api/data/trust-events` | Trust change events |
| GET | `/api/data/badges` | Achievement badges |
| GET | `/api/data/channels` | Chat channels |
| GET | `/api/data/messages` | All chat messages (grouped by channel) |
| GET | `/api/data/channels/:id/messages` | Messages for a channel |
| POST | `/api/data/messages` | Create chat message |
| GET/PATCH | `/api/data/approvals` | Operator approval queue |
| GET/PATCH | `/api/data/incidents` | Operator incidents |
| GET | `/api/data/health-cards` | System health cards |
| GET/PATCH | `/api/data/operator-alerts` | Operator alerts |
| GET/PATCH | `/api/data/registry` | Agent registry bindings |
| GET | `/api/data/routing-rules` | Agent routing rules |
| GET | `/api/data/tools` | Available tools |
| GET/POST/PATCH | `/api/data/executions` | Mission executions |
| POST | `/api/data/executions/:id/transcript` | Append transcript entry |
| GET/POST/PATCH | `/api/data/calls` | Voice call records |

### Gateway API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/health` | Gateway health check |
| POST | `/api/chat/message` | Send message (non-streaming) |
| POST | `/api/chat/stream` | Send message (SSE streaming) |
| GET | `/api/auth/me` | Validate token and return user profile |
| POST | `/api/voice/call` | Launch a Bland.ai phone call |
| POST | `/api/webhooks/bland` | Receive Bland call completion events |
| GET | `/api/voice/events` | Poll for voice call events |

## Project Structure

```
src/
  pages/              # Route pages (render from API, not fixtures)
  components/         # Shared UI (Sidebar, Topbar, AgentCard, etc.)
    ui/               # Primitives (Icon, GlassPanel, StatusChip)
  contexts/           # React context providers
    DataContext        # Loads all persisted state from /api/data/*
    RegistryContext    # Agent registry binding (delegates to DataContext)
    MissionContext     # Mission execution management
    AirbyteContext     # Data pipeline integration
  services/           # Integration clients
    gateway.ts        # TrueFoundry AI Gateway
    bland.ts          # Voice escalation
    airbyte.ts        # Data pipelines
    missionRunner.ts  # Mission execution
  data/               # Seed fixtures (optional, only used on first DB init)
  types/              # TypeScript interfaces
  layouts/            # App shell layout
  hooks/              # Custom React hooks
  lib/                # Utilities (cn(), formatters, API client)
  styles/             # Tailwind + design tokens
server/
  index.ts            # Express API gateway
  db.ts               # SQLite schema + initialization
  seed.ts             # Seed DB from src/data/* fixtures
  routes.ts           # REST API for all persisted entities
  store.ts            # JSON file store (agent records, missions)
  tools.ts            # Live tool execution
  airbyte.ts          # Airbyte proxy
  tokenVault.ts       # Token vault for connected accounts
.data/
  guild.db            # SQLite database (auto-created on first run)
```

## Database Schema

24 tables covering all entities:

- `agents`, `missions`, `mission_context` -- core operational state
- `activity_events`, `guild_metrics` -- dashboard metrics
- `trust_metrics`, `trust_history`, `trust_events`, `badges` -- trust ledger
- `chat_channels`, `chat_messages` -- comms system
- `approval_queue`, `incidents`, `health_cards`, `operator_alerts` -- operator console
- `agent_registry`, `routing_rules` -- agent bindings and routing
- `tools` -- available tool definitions
- `mission_executions`, `mission_transcript_entries`, `tool_actions` -- execution runtime
- `calls` -- voice call records

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (frontend only) |
| `npm run dev:server` | Express backend only |
| `npm run dev:all` | Frontend + backend concurrently |
| `npm run build` | TypeScript compile + Vite production build |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |

## Resetting the Database

To reset to seed data, delete the database file and restart:

```bash
rm .data/guild.db
npm run dev:server
```

## License

MIT
