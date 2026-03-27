// ── OpenClaw Session Management ──
// Session key derivation, metadata persistence, and reset logic

// ── Session Key Strategy ──

export function deriveSessionKey(channel: { id: string; missionId?: string }, agentId?: string): string {
  // Operator DM → agent:<agentId>:main
  if (agentId) return `agent:${agentId}:main`
  // Mission thread → mission-scoped key
  if (channel.missionId) return `mission:${channel.missionId}:thread`
  // Team/general channel → channel-derived key
  return `guild:channel:${channel.id}`
}

export function resetSessionKey(channelId: string): string {
  const suffix = crypto.randomUUID().slice(0, 8)
  return `guild:channel:${channelId}:${suffix}`
}

// ── Session Metadata (localStorage) ──

export interface SessionMeta {
  guildMissionId?: string
  openclawAgentId?: string
  sessionKey: string
  createdAt: string
}

const STORAGE_KEY = 'openclaw_sessions'

export function loadSessionMeta(): Record<string, SessionMeta> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function saveSessionMeta(channelId: string, meta: SessionMeta): void {
  const all = loadSessionMeta()
  all[channelId] = meta
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function clearSessionMeta(channelId: string): void {
  const all = loadSessionMeta()
  delete all[channelId]
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

// ── Agent ID mapping ──

const CHANNEL_AGENT_MAP: Record<string, string> = {
  general: 'oracle-1',
  intel: 'echo-9',
  alerts: 'sentinel-12',
}

export function resolveAgentId(channel: { id: string; missionId?: string }): string {
  return CHANNEL_AGENT_MAP[channel.id] || channel.id
}