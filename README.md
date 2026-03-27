# Agent Guild

A mission-control dashboard for orchestrating autonomous AI agents. Monitor trust scores, dispatch missions, chat with agents in real time, and escalate to voice calls -- all from one tactical command center.

Built with React 19, Express, TrueFoundry AI Gateway, Auth0, Bland.ai, and Airbyte.

## Features

- **Dashboard** -- guild-wide health, active missions, trust metrics, agent roster
- **Agent Management** -- view agents with trust scores, specialties, status, and mission history
- **Mission Board** -- create, assign, and track missions with priority and progress
- **Comms** -- real-time streaming chat with agents via TrueFoundry AI Gateway
- **Voice Escalation** -- trigger phone calls to agents via Bland.ai pathways
- **Trust Ledger** -- weekly trust trends, risk assessment, per-agent audit logs
- **Registry** -- bind guild agents to external agent IDs (Openclaw)
- **Operator Panel** -- system alerts, approval queue, critical overrides
- **Data Pipelines** -- Airbyte integration for syncing external data sources
- **Auth** -- Auth0 login with protected routes and user profiles

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, TypeScript 5.9, Vite 8, Tailwind CSS v4, React Router v7 |
| Backend | Express 5, Node.js, TrueFoundry AI Gateway (OpenAI-compatible) |
| Auth | Auth0 SPA SDK |
| Voice | Bland.ai (call launch + webhook receiver) |
| Data | Airbyte API |
| Design | Space Grotesk + Inter, glassmorphism, Electric Violet / Neon Cyan palette |

## Quick Start

```bash
git clone https://github.com/EcosystemNetwork/Agent-Guild.git
cd Agent-Guild
npm install
cp .env.example .env   # fill in your API keys
```

**Frontend only** (mock data, no backend needed):

```bash
npm run dev
```

**Full stack** (frontend + API gateway):

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
| `/registry` | Registry | Bind guild agents to external IDs |
| `/profile` | Profile | User profile and settings |

## API Endpoints

The Express backend on port 3001 proxies requests to TrueFoundry and Bland.ai:

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
  pages/              # Route pages
  components/         # Shared UI (Sidebar, Topbar, AgentCard, etc.)
    ui/               # Primitives (Icon, GlassPanel, StatusChip)
  contexts/           # React context providers
    RegistryContext    # Agent registry binding
    MissionContext     # Mission management
    AirbyteContext     # Data pipeline integration
  services/           # Integration clients
    gateway.ts        # TrueFoundry AI Gateway
    bland.ts          # Voice escalation
    airbyte.ts        # Data pipelines
    missionRunner.ts  # Mission execution
  data/               # Mock fixtures
  types/              # TypeScript interfaces
  layouts/            # App shell layout
  hooks/              # Custom React hooks
  lib/                # Utilities (cn(), formatters)
  styles/             # Tailwind + design tokens
server/
  index.ts            # Express API gateway
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server (frontend only) |
| `npm run dev:server` | Express backend only |
| `npm run dev:all` | Frontend + backend concurrently |
| `npm run build` | TypeScript compile + Vite production build |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |

## License

MIT