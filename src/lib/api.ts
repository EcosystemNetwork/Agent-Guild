// ── TrueFoundry AI Gateway Client ──

const API_BASE = '/api/chat'

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface SendMessageOptions {
  agentId: string
  sessionKey: string
  messages: ChatCompletionMessage[]
  model?: string
}

export async function checkGatewayHealth(): Promise<{ status: string; gateway: string }> {
  const resp = await fetch(`${API_BASE}/health`)
  if (!resp.ok) throw new Error(`Health check failed: ${resp.status}`)
  return resp.json()
}

export async function sendMessage(opts: SendMessageOptions): Promise<string> {
  const resp = await fetch(`${API_BASE}/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-agent-id': opts.agentId,
      'x-session-key': opts.sessionKey,
    },
    body: JSON.stringify({
      messages: opts.messages,
      ...(opts.model && { model: opts.model }),
    }),
  })
  if (!resp.ok) {
    const err = await resp.text()
    throw new Error(`Message failed (${resp.status}): ${err}`)
  }
  const data = await resp.json()
  return data.choices?.[0]?.message?.content ?? ''
}

export async function streamMessage(
  opts: SendMessageOptions,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): Promise<AbortController> {
  const controller = new AbortController()

  try {
    const resp = await fetch(`${API_BASE}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-id': opts.agentId,
        'x-session-key': opts.sessionKey,
      },
      body: JSON.stringify({
        messages: opts.messages,
        ...(opts.model && { model: opts.model }),
      }),
      signal: controller.signal,
    })

    if (!resp.ok) {
      const err = await resp.text()
      onError(new Error(`Stream failed (${resp.status}): ${err}`))
      return controller
    }

    if (!resp.body) {
      onError(new Error('No response body'))
      return controller
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const read = async (): Promise<void> => {
      const { done, value } = await reader.read()
      if (done) {
        onDone()
        return
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') {
          onDone()
          return
        }
        try {
          const parsed = JSON.parse(payload)
          if (parsed.error) {
            onError(new Error(parsed.error))
            return
          }
          const delta = parsed.choices?.[0]?.delta?.content
          if (delta) onChunk(delta)
        } catch {
          // skip malformed lines
        }
      }

      return read()
    }

    read().catch(err => {
      if (err.name !== 'AbortError') onError(err)
    })
  } catch (err) {
    if ((err as Error).name !== 'AbortError') onError(err as Error)
  }

  return controller
}

// ── Voice Call API ──

export interface LaunchCallOptions {
  phone_number: string
  pathway_id?: string
  request_data?: Record<string, unknown>
}

export async function launchCall(opts: LaunchCallOptions): Promise<{ status: string; call_id?: string }> {
  const resp = await fetch('/api/voice/call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(opts),
  })
  const data = await resp.json()
  if (!resp.ok) throw new Error(data.error || `Call launch failed (${resp.status})`)
  return data
}

export async function pollCallEvents(): Promise<Record<string, unknown>[]> {
  const resp = await fetch('/api/voice/events')
  if (!resp.ok) return []
  const data = await resp.json()
  return data.events ?? []
}

// ── Persisted Data API (/api/data/*) ──

const DATA_BASE = '/api/data'

async function dataGet<T>(path: string): Promise<T> {
  const resp = await fetch(`${DATA_BASE}${path}`)
  if (!resp.ok) throw new Error(`GET ${path} failed: ${resp.status}`)
  return resp.json()
}

async function dataPatch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const resp = await fetch(`${DATA_BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) throw new Error(`PATCH ${path} failed: ${resp.status}`)
  return resp.json()
}

async function dataPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const resp = await fetch(`${DATA_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!resp.ok) throw new Error(`POST ${path} failed: ${resp.status}`)
  return resp.json()
}

// Agents
import type { Agent, Mission, ActivityEvent, GuildMetrics, TrustMetric, OperatorAlert, AgentRegistryEntry, RoutingRule, MissionExecution, ChatMessage, ChatChannel, TrustEvent, Badge, ApprovalItem, Incident, HealthCard, AvailableTool } from '../types'

export const dataApi = {
  // Agents
  getAgents: () => dataGet<Agent[]>('/agents'),
  getAgent: (id: string) => dataGet<Agent>(`/agents/${id}`),
  createAgent: (agent: Partial<Agent> & { id: string }) => dataPost<Agent>('/agents', agent),
  updateAgent: (id: string, updates: Partial<Agent>) => dataPatch<Agent>(`/agents/${id}`, updates),

  // Missions
  getMissions: (filters?: { status?: string; type?: string }) => {
    const params = new URLSearchParams()
    if (filters?.status) params.set('status', filters.status)
    if (filters?.type) params.set('type', filters.type)
    const qs = params.toString()
    return dataGet<Mission[]>(`/missions${qs ? '?' + qs : ''}`)
  },
  getMission: (id: string) => dataGet<Mission>(`/missions/${id}`),
  createMission: (mission: Partial<Mission> & { id: string }) => dataPost<Mission>('/missions', mission),
  updateMission: (id: string, updates: Partial<Mission>) => dataPatch<Mission>(`/missions/${id}`, updates),

  // Mission context
  getMissionContext: () => dataGet<Record<string, { objective: string; status: string; agents: string[]; progress: number; threats: string[] }>>('/mission-context'),

  // Activity
  getActivity: (limit?: number) => dataGet<ActivityEvent[]>(`/activity${limit ? '?limit=' + limit : ''}`),

  // Guild metrics
  getGuildMetrics: () => dataGet<GuildMetrics>('/guild-metrics'),
  updateGuildMetrics: (updates: Partial<GuildMetrics>) => dataPatch<GuildMetrics>('/guild-metrics', updates),

  // Trust
  getTrustMetrics: () => dataGet<TrustMetric[]>('/trust-metrics'),
  getTrustHistory: () => dataGet<{ date: string; score: number }[]>('/trust-history'),
  getTrustEvents: () => dataGet<TrustEvent[]>('/trust-events'),
  getBadges: () => dataGet<Badge[]>('/badges'),

  // Chat
  getChannels: () => dataGet<ChatChannel[]>('/channels'),
  getMessages: () => dataGet<Record<string, ChatMessage[]>>('/messages'),
  getChannelMessages: (channelId: string) => dataGet<ChatMessage[]>(`/channels/${channelId}/messages`),
  sendChatMessage: (msg: Partial<ChatMessage> & { id: string }) => dataPost<ChatMessage>('/messages', msg as Record<string, unknown>),

  // Operator
  getApprovals: () => dataGet<ApprovalItem[]>('/approvals'),
  updateApproval: (id: string, status: string) => dataPatch<ApprovalItem>(`/approvals/${id}`, { status }),
  getIncidents: () => dataGet<Incident[]>('/incidents'),
  updateIncident: (id: string, updates: Partial<Incident>) => dataPatch<Incident>(`/incidents/${id}`, updates as Record<string, unknown>),
  getHealthCards: () => dataGet<HealthCard[]>('/health-cards'),
  getOperatorAlerts: () => dataGet<OperatorAlert[]>('/operator-alerts'),
  updateAlert: (id: string, status: string) => dataPatch<OperatorAlert>(`/operator-alerts/${id}`, { status }),

  // Registry
  getRegistry: () => dataGet<AgentRegistryEntry[]>('/registry'),
  updateRegistryEntry: (guildAgentId: string, updates: Partial<AgentRegistryEntry>) => dataPatch<AgentRegistryEntry>(`/registry/${guildAgentId}`, updates as Record<string, unknown>),
  getRoutingRules: () => dataGet<RoutingRule[]>('/routing-rules'),

  // Tools
  getTools: () => dataGet<AvailableTool[]>('/tools'),

  // Mission executions
  getExecutions: () => dataGet<MissionExecution[]>('/executions'),
  getExecution: (id: string) => dataGet<MissionExecution>(`/executions/${id}`),
}
