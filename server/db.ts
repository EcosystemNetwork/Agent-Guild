import Database from 'better-sqlite3'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdirSync, existsSync } from 'node:fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', '.data')
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

const DB_PATH = join(DATA_DIR, 'guild.db')

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// ── Schema ──

db.exec(`
  -- Agents
  CREATE TABLE IF NOT EXISTS agents (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL,
    specialty     TEXT NOT NULL DEFAULT '[]',   -- JSON array
    trust_score   REAL NOT NULL DEFAULT 0,
    status        TEXT NOT NULL DEFAULT 'standby',
    mission_clock TEXT NOT NULL DEFAULT '0h',
    avatar        TEXT NOT NULL DEFAULT '',
    missions_completed INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Missions
  CREATE TABLE IF NOT EXISTS missions (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending',
    assigned_agent  TEXT NOT NULL DEFAULT '',
    progress        INTEGER NOT NULL DEFAULT 0,
    priority        TEXT NOT NULL DEFAULT 'medium',
    started_at      TEXT NOT NULL DEFAULT '',
    description     TEXT NOT NULL DEFAULT '',
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Mission context (per-mission operational context)
  CREATE TABLE IF NOT EXISTS mission_context (
    mission_id  TEXT PRIMARY KEY REFERENCES missions(id) ON DELETE CASCADE,
    objective   TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT '',
    agents      TEXT NOT NULL DEFAULT '[]',   -- JSON array
    progress    INTEGER NOT NULL DEFAULT 0,
    threats     TEXT NOT NULL DEFAULT '[]'     -- JSON array
  );

  -- Activity feed
  CREATE TABLE IF NOT EXISTS activity_events (
    id          TEXT PRIMARY KEY,
    timestamp   TEXT NOT NULL,
    type        TEXT NOT NULL,
    icon        TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    color       TEXT NOT NULL DEFAULT '',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Guild metrics (singleton)
  CREATE TABLE IF NOT EXISTS guild_metrics (
    id                      INTEGER PRIMARY KEY CHECK (id = 1),
    status                  TEXT NOT NULL DEFAULT 'OPERATIONAL',
    active_missions         INTEGER NOT NULL DEFAULT 0,
    total_mission_capacity  INTEGER NOT NULL DEFAULT 15,
    mission_breakdown       TEXT NOT NULL DEFAULT '{}',   -- JSON
    trust_score             REAL NOT NULL DEFAULT 0,
    trust_trend             REAL NOT NULL DEFAULT 0,
    agents_deployed         INTEGER NOT NULL DEFAULT 0,
    uptime                  REAL NOT NULL DEFAULT 0,
    verified_logs           INTEGER NOT NULL DEFAULT 0,
    sparkline               TEXT NOT NULL DEFAULT '[]',   -- JSON array
    updated_at              TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Trust metrics (per-agent)
  CREATE TABLE IF NOT EXISTS trust_metrics (
    agent_id          TEXT PRIMARY KEY,
    agent_name        TEXT NOT NULL,
    trust_score       REAL NOT NULL DEFAULT 0,
    trend             REAL NOT NULL DEFAULT 0,
    success_rate      REAL NOT NULL DEFAULT 0,
    missions_audited  INTEGER NOT NULL DEFAULT 0,
    last_audit        TEXT NOT NULL DEFAULT '',
    risk_level        TEXT NOT NULL DEFAULT 'low',
    verified_logs     INTEGER NOT NULL DEFAULT 0
  );

  -- Trust history (time-series)
  CREATE TABLE IF NOT EXISTS trust_history (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    date  TEXT NOT NULL,
    score REAL NOT NULL
  );

  -- Trust events
  CREATE TABLE IF NOT EXISTS trust_events (
    id          TEXT PRIMARY KEY,
    agent_id    TEXT NOT NULL,
    agent_name  TEXT NOT NULL,
    delta       REAL NOT NULL DEFAULT 0,
    reason      TEXT NOT NULL DEFAULT '',
    timestamp   TEXT NOT NULL,
    mission_id  TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Badges
  CREATE TABLE IF NOT EXISTS badges (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    icon        TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    color       TEXT NOT NULL DEFAULT '',
    earned_by   TEXT NOT NULL DEFAULT '[]'   -- JSON array of agent IDs
  );

  -- Chat channels
  CREATE TABLE IF NOT EXISTS chat_channels (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    icon        TEXT NOT NULL DEFAULT '',
    unread      INTEGER NOT NULL DEFAULT 0,
    mission_id  TEXT
  );

  -- Chat messages
  CREATE TABLE IF NOT EXISTS chat_messages (
    id          TEXT PRIMARY KEY,
    "from"      TEXT NOT NULL,
    from_avatar TEXT NOT NULL DEFAULT '',
    "to"        TEXT NOT NULL,
    content     TEXT NOT NULL DEFAULT '',
    timestamp   TEXT NOT NULL,
    channel     TEXT NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
    pinned      INTEGER NOT NULL DEFAULT 0,
    type        TEXT NOT NULL DEFAULT 'message',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Operator: approval queue
  CREATE TABLE IF NOT EXISTS approval_queue (
    id            TEXT PRIMARY KEY,
    type          TEXT NOT NULL,
    title         TEXT NOT NULL DEFAULT '',
    description   TEXT NOT NULL DEFAULT '',
    requested_by  TEXT NOT NULL DEFAULT '',
    priority      TEXT NOT NULL DEFAULT 'medium',
    timestamp     TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'pending'
  );

  -- Operator: incidents
  CREATE TABLE IF NOT EXISTS incidents (
    id              TEXT PRIMARY KEY,
    severity        TEXT NOT NULL DEFAULT 'low',
    title           TEXT NOT NULL DEFAULT '',
    description     TEXT NOT NULL DEFAULT '',
    detected_at     TEXT NOT NULL,
    resolved_at     TEXT,
    assigned_agent  TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'active'
  );

  -- Operator: health cards
  CREATE TABLE IF NOT EXISTS health_cards (
    id      TEXT PRIMARY KEY,
    name    TEXT NOT NULL DEFAULT '',
    status  TEXT NOT NULL DEFAULT 'healthy',
    metric  TEXT NOT NULL DEFAULT '',
    value   REAL NOT NULL DEFAULT 0,
    max     REAL NOT NULL DEFAULT 0,
    unit    TEXT NOT NULL DEFAULT '',
    trend   TEXT NOT NULL DEFAULT 'stable',
    icon    TEXT NOT NULL DEFAULT ''
  );

  -- Operator: alerts
  CREATE TABLE IF NOT EXISTS operator_alerts (
    id          TEXT PRIMARY KEY,
    timestamp   TEXT NOT NULL,
    severity    TEXT NOT NULL DEFAULT 'info',
    title       TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    source      TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'active'
  );

  -- Agent registry (guild ↔ backend agent record bindings)
  CREATE TABLE IF NOT EXISTS agent_registry (
    guild_agent_id       TEXT PRIMARY KEY,
    agent_record_id      TEXT NOT NULL DEFAULT '',
    display_name         TEXT NOT NULL DEFAULT '',
    role                 TEXT NOT NULL DEFAULT 'general',
    default_session_mode TEXT NOT NULL DEFAULT 'supervised',
    tool_policy          TEXT NOT NULL DEFAULT 'sandboxed',
    connection_status    TEXT NOT NULL DEFAULT 'disconnected',
    current_session_id   TEXT,
    last_activity        TEXT NOT NULL DEFAULT ''
  );

  -- Routing rules
  CREATE TABLE IF NOT EXISTS routing_rules (
    role                  TEXT PRIMARY KEY,
    label                 TEXT NOT NULL DEFAULT '',
    description           TEXT NOT NULL DEFAULT '',
    preferred_agent_types TEXT NOT NULL DEFAULT '[]',   -- JSON array
    icon                  TEXT NOT NULL DEFAULT '',
    color                 TEXT NOT NULL DEFAULT ''
  );

  -- Available agent records (fetched from backend /api/agents)
  CREATE TABLE IF NOT EXISTS available_agent_records (
    id    TEXT PRIMARY KEY,
    label TEXT NOT NULL DEFAULT '',
    role  TEXT NOT NULL DEFAULT ''
  );

  -- Available tools
  CREATE TABLE IF NOT EXISTS tools (
    name        TEXT PRIMARY KEY,
    label       TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    icon        TEXT NOT NULL DEFAULT '',
    category    TEXT NOT NULL DEFAULT 'admin',
    parameters  TEXT NOT NULL DEFAULT '[]'   -- JSON array
  );

  -- Mission executions (runtime state)
  CREATE TABLE IF NOT EXISTS mission_executions (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL DEFAULT '',
    type                TEXT NOT NULL DEFAULT 'research',
    status              TEXT NOT NULL DEFAULT 'awaiting-approval',
    assigned_agent_id   TEXT NOT NULL DEFAULT '',
    agent_record_id     TEXT NOT NULL DEFAULT '',
    session_key         TEXT NOT NULL DEFAULT '',
    prompt              TEXT NOT NULL DEFAULT '',
    context             TEXT NOT NULL DEFAULT '',
    priority            TEXT NOT NULL DEFAULT 'medium',
    requires_approval   INTEGER NOT NULL DEFAULT 1,
    created_at          TEXT NOT NULL DEFAULT (datetime('now')),
    started_at          TEXT,
    completed_at        TEXT,
    progress            INTEGER NOT NULL DEFAULT 0,
    error               TEXT
  );

  -- Mission transcript entries
  CREATE TABLE IF NOT EXISTS mission_transcript_entries (
    id            TEXT PRIMARY KEY,
    execution_id  TEXT NOT NULL REFERENCES mission_executions(id) ON DELETE CASCADE,
    timestamp     TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'system',
    agent_name    TEXT NOT NULL DEFAULT '',
    content       TEXT NOT NULL DEFAULT '',
    token_count   INTEGER,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Tool actions (invocations)
  CREATE TABLE IF NOT EXISTS tool_actions (
    id            TEXT PRIMARY KEY,
    execution_id  TEXT NOT NULL REFERENCES mission_executions(id) ON DELETE CASCADE,
    tool_name     TEXT NOT NULL DEFAULT '',
    input         TEXT NOT NULL DEFAULT '{}',   -- JSON
    output        TEXT,
    status        TEXT NOT NULL DEFAULT 'pending',
    started_at    TEXT NOT NULL,
    completed_at  TEXT,
    error         TEXT
  );

  -- Voice calls
  CREATE TABLE IF NOT EXISTS calls (
    id              TEXT PRIMARY KEY,
    bland_call_id   TEXT,
    phone_number    TEXT NOT NULL DEFAULT '',
    status          TEXT NOT NULL DEFAULT 'queued',
    mission_id      TEXT,
    channel_id      TEXT NOT NULL DEFAULT '',
    launched_at     TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at    TEXT,
    duration        INTEGER,
    summary         TEXT,
    transcript      TEXT,
    recording_url   TEXT,
    pathway_id      TEXT,
    request_data    TEXT NOT NULL DEFAULT '{}',   -- JSON
    error           TEXT,
    webhook_events  TEXT NOT NULL DEFAULT '[]',   -- JSON array
    bland_details   TEXT,                         -- JSON
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
  CREATE INDEX IF NOT EXISTS idx_missions_type ON missions(type);
  CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON chat_messages(channel);
  CREATE INDEX IF NOT EXISTS idx_trust_events_agent ON trust_events(agent_id);
  CREATE INDEX IF NOT EXISTS idx_mission_transcript_exec ON mission_transcript_entries(execution_id);
  CREATE INDEX IF NOT EXISTS idx_tool_actions_exec ON tool_actions(execution_id);
  CREATE INDEX IF NOT EXISTS idx_calls_channel ON calls(channel_id);
  CREATE INDEX IF NOT EXISTS idx_calls_mission ON calls(mission_id);
`)

export default db
