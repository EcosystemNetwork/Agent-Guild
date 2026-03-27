import type { ToolAction } from '../types'

export interface GatewayConfig {
  baseUrl: string
  token: string
}

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StreamChunk {
  id: string
  choices: { delta: { content?: string; role?: string }; finish_reason: string | null }[]
}

/**
 * Stream a chat completion from the TrueFoundry AI Gateway via the local proxy.
 * Yields text chunks as they arrive over SSE.
 */
export async function* streamChatCompletion(
  agentId: string,
  sessionKey: string,
  messages: ChatCompletionMessage[],
): AsyncGenerator<string, void, unknown> {
  const resp = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-agent-id': agentId,
      'x-session-key': sessionKey,
    },
    body: JSON.stringify({ messages }),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Gateway stream failed (${resp.status}): ${text}`)
  }

  if (!resp.body) {
    throw new Error('No response body from gateway')
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') return
      try {
        const parsed = JSON.parse(payload)
        if (parsed.error) throw new Error(parsed.error)
        const delta = parsed.choices?.[0]?.delta?.content
        if (delta) yield delta
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('Gateway')) throw e
        // skip malformed SSE lines
      }
    }
  }
}

// ── Agent Run Event Types ──

export interface AgentRunContentEvent { type: 'content'; content: string }
export interface AgentRunToolStartEvent { type: 'tool_start'; toolCallId: string; toolName: string; input: Record<string, unknown> }
export interface AgentRunToolResultEvent { type: 'tool_result'; toolCallId: string; toolName: string; output: string | null; status: string; error: string | null; durationMs: number }
export type AgentRunEvent = AgentRunContentEvent | AgentRunToolStartEvent | AgentRunToolResultEvent

/**
 * Run an agent with function-calling support via /api/agent/run.
 * The server handles the tool-calling loop internally, streaming content
 * and tool events back as SSE.
 */
export async function* streamAgentRun(
  agentId: string,
  sessionKey: string,
  messages: ChatCompletionMessage[],
  missionId?: string,
): AsyncGenerator<AgentRunEvent, void, unknown> {
  const resp = await fetch('/api/agent/run', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-agent-id': agentId,
      'x-session-key': sessionKey,
    },
    body: JSON.stringify({ messages, agentId, missionId }),
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Agent run failed (${resp.status}): ${text}`)
  }

  if (!resp.body) {
    throw new Error('No response body from agent run')
  }

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (payload === '[DONE]') return
      try {
        const parsed = JSON.parse(payload)
        if (parsed.error) throw new Error(parsed.error)
        if (parsed.type === 'content' || parsed.type === 'tool_start' || parsed.type === 'tool_result') {
          yield parsed as AgentRunEvent
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith('Agent')) throw e
      }
    }
  }
}

/**
 * Execute a tool via the backend's live tool execution layer.
 * Replaces the previous local mock — now hits real DNS/HTTP endpoints.
 */
export async function invokeToolAction(
  agentId: string,
  toolName: string,
  input: Record<string, unknown>,
  missionId?: string,
): Promise<ToolAction> {
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  try {
    const resp = await fetch('/api/tools/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolName, input, agentId, missionId }),
    })

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: `HTTP ${resp.status}` }))
      return {
        id: `tool-${Date.now()}`,
        toolName,
        input,
        output: null,
        status: 'failure',
        startedAt: now,
        completedAt: now,
        error: err.error || `Tool execution failed (${resp.status})`,
      }
    }

    const { result } = await resp.json()
    return {
      id: `tool-${Date.now()}`,
      toolName: result.toolName,
      input: result.input,
      output: result.output,
      status: result.status,
      startedAt: now,
      completedAt: now,
      error: result.error,
    }
  } catch (err) {
    return {
      id: `tool-${Date.now()}`,
      toolName,
      input,
      output: null,
      status: 'failure',
      startedAt: now,
      completedAt: now,
      error: err instanceof Error ? err.message : 'Network error',
    }
  }
}

/**
 * Fetch an agent record from the backend.
 */
export async function fetchAgentRecord(agentId: string): Promise<AgentRecord | null> {
  try {
    const resp = await fetch(`/api/agents/${encodeURIComponent(agentId)}`)
    if (!resp.ok) return null
    const { agent } = await resp.json()
    return agent
  } catch {
    return null
  }
}

export interface AgentRecord {
  id: string
  name: string
  displayName: string
  role: string
  systemPrompt: string
  modelId: string
  toolPolicy: string
  allowedTools: string[]
  sessionMode: string
  sessionContinuity: boolean
  maxTokens: number
  temperature: number
}

/**
 * Persist a mission record to the backend.
 */
export async function persistMission(mission: {
  id: string
  name: string
  type: string
  status: string
  assignedAgentId: string
  sessionKey: string
  prompt: string
  context: string
  priority: string
  startedAt?: string | null
  completedAt?: string | null
  progress?: number
  error?: string | null
}): Promise<void> {
  await fetch(`/api/missions/${encodeURIComponent(mission.id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(mission),
  }).catch(() => {})
}

/**
 * Persist a transcript entry to the backend.
 */
export async function persistTranscript(missionId: string, entry: {
  role: string
  agentName: string
  content: string
  tokenCount?: number
}): Promise<void> {
  await fetch(`/api/missions/${encodeURIComponent(missionId)}/transcript`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(entry),
  }).catch(() => {})
}