// ── JSON File-Based Persistence Layer ──
// Stores agent records, mission executions, transcripts, and tool results

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, 'data')

function ensureDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function readJSON<T>(file: string, fallback: T): T {
  ensureDir()
  const path = join(DATA_DIR, file)
  if (!existsSync(path)) return fallback
  try {
    return JSON.parse(readFileSync(path, 'utf-8'))
  } catch {
    return fallback
  }
}

function writeJSON(file: string, data: unknown) {
  ensureDir()
  writeFileSync(join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf-8')
}

// ── Agent Records ──

export interface AgentRecord {
  id: string
  name: string
  displayName: string
  role: 'scout' | 'operator' | 'analyst' | 'negotiator' | 'general'
  systemPrompt: string
  modelId: string
  toolPolicy: 'unrestricted' | 'sandboxed' | 'restricted' | 'read-only'
  allowedTools: string[]
  sessionMode: 'autonomous' | 'supervised' | 'manual'
  sessionContinuity: boolean  // whether agent retains memory across missions
  maxTokens: number
  temperature: number
  createdAt: string
  updatedAt: string
}

const AGENTS_FILE = 'agents.json'

export function getAllAgents(): AgentRecord[] {
  return readJSON<AgentRecord[]>(AGENTS_FILE, [])
}

export function getAgent(id: string): AgentRecord | undefined {
  return getAllAgents().find(a => a.id === id)
}

export function upsertAgent(agent: AgentRecord): AgentRecord {
  const agents = getAllAgents()
  const idx = agents.findIndex(a => a.id === agent.id)
  agent.updatedAt = new Date().toISOString()
  if (idx >= 0) {
    agents[idx] = agent
  } else {
    agent.createdAt = agent.createdAt || new Date().toISOString()
    agents.push(agent)
  }
  writeJSON(AGENTS_FILE, agents)
  return agent
}

export function deleteAgent(id: string): boolean {
  const agents = getAllAgents()
  const filtered = agents.filter(a => a.id !== id)
  if (filtered.length === agents.length) return false
  writeJSON(AGENTS_FILE, filtered)
  return true
}

// ── Mission Records ──

export interface MissionRecord {
  id: string
  name: string
  type: string
  status: string
  assignedAgentId: string
  sessionKey: string
  prompt: string
  context: string
  priority: string
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  progress: number
  error: string | null
}

export interface TranscriptEntry {
  id: string
  missionId: string
  timestamp: string
  role: 'system' | 'operator' | 'agent' | 'tool'
  agentName: string
  content: string
  tokenCount?: number
}

export interface ToolResult {
  id: string
  missionId: string
  toolName: string
  input: Record<string, unknown>
  output: string | null
  status: 'pending' | 'running' | 'success' | 'failure'
  startedAt: string
  completedAt: string | null
  error: string | null
}

const MISSIONS_FILE = 'missions.json'
const TRANSCRIPTS_FILE = 'transcripts.json'
const TOOL_RESULTS_FILE = 'tool_results.json'

// Missions
export function getAllMissions(): MissionRecord[] {
  return readJSON<MissionRecord[]>(MISSIONS_FILE, [])
}

export function getMission(id: string): MissionRecord | undefined {
  return getAllMissions().find(m => m.id === id)
}

export function upsertMission(mission: MissionRecord): MissionRecord {
  const missions = getAllMissions()
  const idx = missions.findIndex(m => m.id === mission.id)
  if (idx >= 0) {
    missions[idx] = mission
  } else {
    missions.push(mission)
  }
  writeJSON(MISSIONS_FILE, missions)
  return mission
}

// Transcripts
export function getTranscripts(missionId: string): TranscriptEntry[] {
  return readJSON<TranscriptEntry[]>(TRANSCRIPTS_FILE, []).filter(t => t.missionId === missionId)
}

export function appendTranscript(entry: TranscriptEntry): TranscriptEntry {
  const all = readJSON<TranscriptEntry[]>(TRANSCRIPTS_FILE, [])
  all.push(entry)
  writeJSON(TRANSCRIPTS_FILE, all)
  return entry
}

// Tool Results
export function getToolResults(missionId: string): ToolResult[] {
  return readJSON<ToolResult[]>(TOOL_RESULTS_FILE, []).filter(t => t.missionId === missionId)
}

export function appendToolResult(result: ToolResult): ToolResult {
  const all = readJSON<ToolResult[]>(TOOL_RESULTS_FILE, [])
  const idx = all.findIndex(r => r.id === result.id)
  if (idx >= 0) {
    all[idx] = result
  } else {
    all.push(result)
  }
  writeJSON(TOOL_RESULTS_FILE, all)
  return result
}

// ── Seed default agent records ──

const DEFAULT_AGENTS: Omit<AgentRecord, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'cipher-7',
    name: 'cipher-7',
    displayName: 'CIPHER-7',
    role: 'scout',
    systemPrompt: 'You are CIPHER-7, an elite reconnaissance agent in the Agent Guild. Your specialty is network infiltration, signal interception, and covert data extraction. You approach problems methodically, mapping attack surfaces before recommending action. Always report findings in structured format with confidence levels. When using tools, prefer shallow scans first to minimize detection.',
    modelId: 'openai-main/gpt-4o-mini',
    toolPolicy: 'sandboxed',
    allowedTools: ['dns-lookup', 'http-probe', 'network-scan', 'log-export'],
    sessionMode: 'autonomous',
    sessionContinuity: true,
    maxTokens: 2048,
    temperature: 0.4,
  },
  {
    id: 'pulse',
    name: 'pulse',
    displayName: 'PULSE',
    role: 'operator',
    systemPrompt: 'You are PULSE, a systems operator in the Agent Guild. Your domain is perimeter defense, infrastructure hardening, and real-time threat response. You are decisive under pressure and always verify before executing destructive actions. Report operational status clearly. When tools are available, use them to gather evidence before recommending defensive measures.',
    modelId: 'openai-main/gpt-4o-mini',
    toolPolicy: 'restricted',
    allowedTools: ['http-probe', 'network-scan'],
    sessionMode: 'supervised',
    sessionContinuity: true,
    maxTokens: 2048,
    temperature: 0.3,
  },
  {
    id: 'nova-3',
    name: 'nova-3',
    displayName: 'NOVA-3',
    role: 'analyst',
    systemPrompt: 'You are NOVA-3, a deep analysis agent in the Agent Guild. Your specialty is threat modeling, pattern recognition, and predictive intelligence. You synthesize data from multiple sources into actionable intelligence briefs. Always quantify confidence and cite evidence. Use DNS and HTTP probes to validate hypotheses about infrastructure.',
    modelId: 'openai-main/gpt-4o-mini',
    toolPolicy: 'sandboxed',
    allowedTools: ['dns-lookup', 'http-probe', 'network-scan', 'log-export'],
    sessionMode: 'autonomous',
    sessionContinuity: true,
    maxTokens: 4096,
    temperature: 0.5,
  },
  {
    id: 'sentinel-12',
    name: 'sentinel-12',
    displayName: 'SENTINEL-12',
    role: 'operator',
    systemPrompt: 'You are SENTINEL-12, a perimeter defense specialist in the Agent Guild. You monitor network boundaries, detect intrusion attempts, and coordinate rapid response. You are methodical and never take action without confirming the threat is real. Use probing tools to verify alerts before escalating.',
    modelId: 'openai-main/gpt-4o-mini',
    toolPolicy: 'restricted',
    allowedTools: ['dns-lookup', 'http-probe'],
    sessionMode: 'supervised',
    sessionContinuity: true,
    maxTokens: 2048,
    temperature: 0.3,
  },
  {
    id: 'echo-9',
    name: 'echo-9',
    displayName: 'ECHO-9',
    role: 'scout',
    systemPrompt: 'You are ECHO-9, an intelligence-gathering scout in the Agent Guild. Your specialty is open-source intelligence (OSINT), DNS reconnaissance, and service enumeration. You work fast and report findings concisely. Always use available tools to back up claims with real data.',
    modelId: 'openai-main/gpt-4o-mini',
    toolPolicy: 'sandboxed',
    allowedTools: ['dns-lookup', 'http-probe', 'network-scan', 'log-export'],
    sessionMode: 'autonomous',
    sessionContinuity: false,
    maxTokens: 2048,
    temperature: 0.4,
  },
  {
    id: 'wraith-5',
    name: 'wraith-5',
    displayName: 'WRAITH-5',
    role: 'scout',
    systemPrompt: 'You are WRAITH-5, a stealth reconnaissance agent in the Agent Guild. You specialize in deep infrastructure mapping and covert enumeration. You have unrestricted tool access and use it wisely. Always assess risk before probing targets.',
    modelId: 'openai-main/gpt-4o-mini',
    toolPolicy: 'unrestricted',
    allowedTools: ['dns-lookup', 'http-probe', 'network-scan', 'log-export'],
    sessionMode: 'autonomous',
    sessionContinuity: true,
    maxTokens: 2048,
    temperature: 0.4,
  },
  {
    id: 'oracle-1',
    name: 'oracle-1',
    displayName: 'ORACLE-1',
    role: 'analyst',
    systemPrompt: 'You are ORACLE-1, the principal analyst of the Agent Guild. Your role is strategic threat assessment, mission planning, and intelligence synthesis. You see patterns others miss and provide clear, actionable recommendations. Use tools to validate intelligence before issuing assessments.',
    modelId: 'openai-main/gpt-4o-mini',
    toolPolicy: 'sandboxed',
    allowedTools: ['dns-lookup', 'http-probe', 'log-export'],
    sessionMode: 'autonomous',
    sessionContinuity: true,
    maxTokens: 4096,
    temperature: 0.6,
  },
  {
    id: 'vex-4',
    name: 'vex-4',
    displayName: 'VEX-4',
    role: 'negotiator',
    systemPrompt: 'You are VEX-4, a diplomatic negotiation agent in the Agent Guild. You handle external communications, vulnerability disclosure coordination, and inter-guild relations. You are careful with words and never reveal more than necessary. Your tools are read-only by policy.',
    modelId: 'openai-main/gpt-4o-mini',
    toolPolicy: 'read-only',
    allowedTools: ['dns-lookup'],
    sessionMode: 'manual',
    sessionContinuity: false,
    maxTokens: 2048,
    temperature: 0.7,
  },
]

export function seedAgents() {
  const existing = getAllAgents()
  if (existing.length > 0) return // already seeded
  const now = new Date().toISOString()
  for (const agent of DEFAULT_AGENTS) {
    upsertAgent({ ...agent, createdAt: now, updatedAt: now })
  }
  console.log(`[store] Seeded ${DEFAULT_AGENTS.length} agent records`)
}