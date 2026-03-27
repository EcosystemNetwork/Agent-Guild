import express from 'express'
import type { Request, Response } from 'express'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  seedAgents, getAllAgents, getAgent, upsertAgent, deleteAgent,
  upsertMission, getMission, getAllMissions,
  appendTranscript, getTranscripts,
  appendToolResult, getToolResults,
  type AgentRecord, type MissionRecord, type TranscriptEntry, type ToolResult,
} from './store.js'
import { executeTool, getAvailableToolNames, getToolDefinitions } from './tools.js'
import { airbyteRouter, isAirbyteConfigured } from './airbyte.js'
import { tokenVaultRouter } from './tokenVault.js'
import { seed as seedDatabase } from './seed.js'
import dataRoutes from './routes.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(express.json())

// ── Seed SQLite database from fixtures on first run ──
seedDatabase()

// ── Data API routes (persisted backend state for dashboard/missions/comms/operator) ──
app.use('/api/data', dataRoutes)

const TF_BASE_URL = process.env.TRUEFOUNDRY_BASE_URL || 'https://llm-gateway.truefoundry.com/api/inference/openai'
const TF_API_KEY = process.env.TRUEFOUNDRY_API_KEY || ''
const TF_MODEL = process.env.TRUEFOUNDRY_MODEL || 'openai-main/gpt-4o-mini'
const BLAND_API_KEY = process.env.BLAND_API_KEY || ''
const BLAND_PATHWAY_ID = process.env.BLAND_PATHWAY_ID || ''
const PORT = Number(process.env.PORT) || 3001

// ── Call Persistence (JSON file store) ──
const DATA_DIR = join(__dirname, '..', '.data')
const CALLS_FILE = join(DATA_DIR, 'calls.json')

interface PersistedCall {
  id: string
  blandCallId: string | null
  phoneNumber: string
  status: string
  missionId: string | null
  channelId: string
  launchedAt: string
  completedAt: string | null
  duration: number | null
  summary: string | null
  transcript: string | null
  recordingUrl: string | null
  pathwayId: string | null
  requestData: Record<string, unknown>
  error: string | null
  webhookEvents: Record<string, unknown>[]
  blandDetails: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function loadCalls(): PersistedCall[] {
  ensureDataDir()
  if (!existsSync(CALLS_FILE)) return []
  try {
    return JSON.parse(readFileSync(CALLS_FILE, 'utf-8'))
  } catch {
    return []
  }
}

function saveCalls(calls: PersistedCall[]) {
  ensureDataDir()
  writeFileSync(CALLS_FILE, JSON.stringify(calls, null, 2))
}

function upsertCall(update: Partial<PersistedCall> & { id: string }): PersistedCall {
  const calls = loadCalls()
  const idx = calls.findIndex(c => c.id === update.id)
  const now = new Date().toISOString()
  if (idx >= 0) {
    calls[idx] = { ...calls[idx], ...update, updatedAt: now }
    saveCalls(calls)
    return calls[idx]
  }
  const newCall: PersistedCall = {
    id: update.id,
    blandCallId: update.blandCallId ?? null,
    phoneNumber: update.phoneNumber ?? '',
    status: update.status ?? 'queued',
    missionId: update.missionId ?? null,
    channelId: update.channelId ?? '',
    launchedAt: update.launchedAt ?? now,
    completedAt: update.completedAt ?? null,
    duration: update.duration ?? null,
    summary: update.summary ?? null,
    transcript: update.transcript ?? null,
    recordingUrl: update.recordingUrl ?? null,
    pathwayId: update.pathwayId ?? null,
    requestData: update.requestData ?? {},
    error: update.error ?? null,
    webhookEvents: update.webhookEvents ?? [],
    blandDetails: update.blandDetails ?? null,
    createdAt: now,
    updatedAt: now,
  }
  calls.push(newCall)
  saveCalls(calls)
  return newCall
}

if (!TF_API_KEY) {
  console.warn('[gateway] WARNING: TRUEFOUNDRY_API_KEY is not set — LLM calls will fail')
}
if (!BLAND_API_KEY) {
  console.warn('[gateway] WARNING: BLAND_API_KEY is not set — voice calls will use simulation mode')
}

function upstreamHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${TF_API_KEY}`,
  }
  // Forward guild metadata so TrueFoundry can log per-agent / per-session
  const agentId = req.headers['x-agent-id']
  if (typeof agentId === 'string') headers['x-agent-id'] = agentId
  const sessionKey = req.headers['x-session-key']
  if (typeof sessionKey === 'string') headers['x-session-key'] = sessionKey
  // Forward Auth0 user token for user-scoped operations
  const authToken = req.headers['authorization']
  if (typeof authToken === 'string' && authToken.startsWith('Bearer ')) {
    headers['x-user-token'] = authToken.replace('Bearer ', '')
  }
  return headers
}

// ── Auth0 User Info (validates token and returns user profile) ──
app.get('/api/auth/me', async (req: Request, res: Response) => {
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' })
    return
  }
  // In production, verify the JWT with Auth0's JWKS endpoint.
  // For now, forward the token to Auth0's /userinfo endpoint.
  const domain = process.env.VITE_AUTH0_DOMAIN || process.env.AUTH0_DOMAIN
  if (!domain) {
    res.status(500).json({ error: 'AUTH0_DOMAIN not configured on server' })
    return
  }
  try {
    const resp = await fetch(`https://${domain}/userinfo`, {
      headers: { Authorization: authHeader },
    })
    if (!resp.ok) {
      res.status(resp.status).json({ error: 'Token validation failed' })
      return
    }
    const profile = await resp.json()
    res.json(profile)
  } catch (err) {
    res.status(502).json({ error: (err as Error).message })
  }
})

// ── Health Check ──
app.get('/api/chat/health', async (_req: Request, res: Response) => {
  try {
    const resp = await fetch(`${TF_BASE_URL}/models`, {
      headers: { 'Authorization': `Bearer ${TF_API_KEY}` },
    })
    if (resp.ok) {
      res.json({ status: 'ok', gateway: 'truefoundry', model: TF_MODEL })
    } else {
      res.status(502).json({ status: 'error', gateway: 'unreachable', code: resp.status })
    }
  } catch (err) {
    res.status(502).json({ status: 'error', gateway: 'unreachable', message: (err as Error).message })
  }
})

// ── Send Message (non-streaming) ──
app.post('/api/chat/message', async (req: Request, res: Response) => {
  try {
    const body = {
      model: req.body.model || TF_MODEL,
      messages: req.body.messages,
      stream: false,
      ...(req.body.temperature != null && { temperature: req.body.temperature }),
      ...(req.body.max_tokens != null && { max_tokens: req.body.max_tokens }),
    }
    const resp = await fetch(`${TF_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: upstreamHeaders(req),
      body: JSON.stringify(body),
    })
    if (!resp.ok) {
      const text = await resp.text()
      res.status(resp.status).json({ error: text })
      return
    }
    const data = await resp.json()
    res.json(data)
  } catch (err) {
    res.status(502).json({ error: (err as Error).message })
  }
})

// ── Stream Message (SSE) ── primary endpoint for CommsPage
app.post('/api/chat/stream', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const body = {
      model: req.body.model || TF_MODEL,
      messages: req.body.messages,
      stream: true,
      ...(req.body.temperature != null && { temperature: req.body.temperature }),
      ...(req.body.max_tokens != null && { max_tokens: req.body.max_tokens }),
    }
    const resp = await fetch(`${TF_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: upstreamHeaders(req),
      body: JSON.stringify(body),
    })

    if (!resp.ok) {
      const text = await resp.text()
      res.write(`data: ${JSON.stringify({ error: text, status: resp.status })}\n\n`)
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }

    if (!resp.body) {
      res.write('data: [DONE]\n\n')
      res.end()
      return
    }

    const reader = resp.body.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      res.write(chunk)
    }

    res.end()
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
  }
})

// ── Voice Call — Launch via Bland.ai ──
app.post('/api/voice/call', async (req: Request, res: Response) => {
  if (!BLAND_API_KEY) {
    res.status(503).json({ error: 'BLAND_API_KEY not configured' })
    return
  }

  try {
    const { phone_number, pathway_id, request_data } = req.body
    if (!phone_number) {
      res.status(400).json({ error: 'phone_number is required' })
      return
    }

    const guildCallId = request_data?.guild_call_id || `CALL-${Date.now()}`

    const body: Record<string, unknown> = {
      phone_number,
      request_data: request_data ?? {},
    }

    // Use provided pathway_id, fall back to env default
    const pid = pathway_id || BLAND_PATHWAY_ID
    if (pid) body.pathway_id = pid

    // Set webhook to receive call completion events
    const webhookBase = process.env.WEBHOOK_BASE_URL || `http://localhost:${PORT}`
    body.webhook = `${webhookBase}/api/webhooks/bland`

    const resp = await fetch('https://api.bland.ai/v1/calls', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'authorization': BLAND_API_KEY,
      },
      body: JSON.stringify(body),
    })

    const data = await resp.json()
    if (!resp.ok) {
      res.status(resp.status).json({ error: data.message || 'Bland API error', details: data })
      return
    }

    // Persist the call
    upsertCall({
      id: guildCallId,
      blandCallId: data.call_id,
      phoneNumber: phone_number,
      status: 'queued',
      missionId: request_data?.mission_id ?? null,
      channelId: request_data?.channel_id ?? '',
      pathwayId: pid || null,
      requestData: request_data ?? {},
    })

    console.log(`[bland] Call launched: ${data.call_id} → ${phone_number} (guild: ${guildCallId})`)
    res.json({ status: 'success', call_id: data.call_id })
  } catch (err) {
    console.error('[bland] Launch error:', err)
    res.status(502).json({ error: (err as Error).message })
  }
})

// ── Voice Call — Bland Webhook Receiver ──
const blandCallEvents: Record<string, unknown>[] = []

app.post('/api/webhooks/bland', (req: Request, res: Response) => {
  const event = req.body
  console.log(`[bland:webhook] Received event for call ${event.call_id}:`, event.status || 'update')

  blandCallEvents.push({ ...event, received_at: new Date().toISOString() })
  if (blandCallEvents.length > 100) blandCallEvents.splice(0, blandCallEvents.length - 100)

  // Persist webhook event against the matching call
  const calls = loadCalls()
  const match = calls.find(c =>
    c.blandCallId === event.call_id ||
    c.id === event.request_data?.guild_call_id
  )
  if (match) {
    const updates: Partial<PersistedCall> & { id: string } = { id: match.id }
    updates.webhookEvents = [...(match.webhookEvents || []), { ...event, received_at: new Date().toISOString() }]

    if (event.status) updates.status = event.status
    if (event.completed) {
      updates.status = event.error_message ? 'failed' : 'completed'
      updates.completedAt = new Date().toISOString()
    }
    if (event.call_length != null) updates.duration = event.call_length
    if (event.summary) updates.summary = event.summary
    if (event.concatenated_transcript) updates.transcript = event.concatenated_transcript
    if (event.recording_url) updates.recordingUrl = event.recording_url
    if (event.error_message) updates.error = event.error_message

    upsertCall(updates)
  }

  res.json({ received: true })
})

// ── Voice Call — Poll for webhook events (frontend polling) ──
app.get('/api/voice/events', (_req: Request, res: Response) => {
  res.json({ events: blandCallEvents })
})

// ── Voice Call — List all persisted calls ──
app.get('/api/voice/calls', (_req: Request, res: Response) => {
  res.json({ calls: loadCalls() })
})

// ── Voice Call — Fetch post-call details from Bland API ──
app.get('/api/voice/call/:callId', async (req: Request, res: Response) => {
  const { callId } = req.params

  // Find the persisted call (callId can be guild ID or Bland ID)
  const calls = loadCalls()
  const persisted = calls.find(c => c.id === callId || c.blandCallId === callId)
  const blandId = persisted?.blandCallId || callId

  if (!BLAND_API_KEY) {
    // Return persisted data only (simulation mode)
    if (persisted) {
      res.json({ call: persisted, source: 'persisted' })
    } else {
      res.status(404).json({ error: 'Call not found' })
    }
    return
  }

  try {
    // Fetch real details from Bland API
    const resp = await fetch(`https://api.bland.ai/v1/calls/${blandId}`, {
      headers: { 'authorization': BLAND_API_KEY },
    })

    if (!resp.ok) {
      // Fall back to persisted data
      if (persisted) {
        res.json({ call: persisted, source: 'persisted' })
      } else {
        res.status(resp.status).json({ error: 'Call not found on Bland' })
      }
      return
    }

    const blandData = await resp.json()

    // Update persisted call with real Bland details
    if (persisted) {
      const updates: Partial<PersistedCall> & { id: string } = {
        id: persisted.id,
        blandDetails: blandData,
      }
      if (blandData.status) updates.status = blandData.status
      if (blandData.completed) {
        updates.status = blandData.error_message ? 'failed' : 'completed'
        updates.completedAt = blandData.end_at || new Date().toISOString()
      }
      if (blandData.call_length != null) updates.duration = blandData.call_length
      if (blandData.summary) updates.summary = blandData.summary
      if (blandData.concatenated_transcript) updates.transcript = blandData.concatenated_transcript
      if (blandData.recording_url) updates.recordingUrl = blandData.recording_url
      if (blandData.error_message) updates.error = blandData.error_message

      const updated = upsertCall(updates)
      res.json({ call: updated, bland: blandData, source: 'bland_api' })
    } else {
      res.json({ call: null, bland: blandData, source: 'bland_api' })
    }
  } catch (err) {
    console.error('[bland] Detail fetch error:', err)
    if (persisted) {
      res.json({ call: persisted, source: 'persisted' })
    } else {
      res.status(502).json({ error: (err as Error).message })
    }
  }
})

// ══════════════════════════════════════════════════════════════
// ── Agent Records API ──
// ══════════════════════════════════════════════════════════════

// Helper: Express 5 params can be string | string[]
function param(req: Request, key: string): string {
  const v = req.params[key]
  return Array.isArray(v) ? v[0] : (v ?? '')
}

// List all agent records
app.get('/api/agents', (_req: Request, res: Response) => {
  res.json({ agents: getAllAgents() })
})

// Get single agent record
app.get('/api/agents/:id', (req: Request, res: Response) => {
  const id = param(req, 'id')
  const agent = getAgent(id)
  if (!agent) {
    res.status(404).json({ error: `Agent ${id} not found` })
    return
  }
  res.json({ agent })
})

// Create or update an agent record
app.put('/api/agents/:id', (req: Request, res: Response) => {
  const id = param(req, 'id')
  const existing = getAgent(id)
  const now = new Date().toISOString()
  const record: AgentRecord = {
    id,
    name: req.body.name ?? existing?.name ?? id,
    displayName: req.body.displayName ?? existing?.displayName ?? id.toUpperCase(),
    role: req.body.role ?? existing?.role ?? 'general',
    systemPrompt: req.body.systemPrompt ?? existing?.systemPrompt ?? '',
    modelId: req.body.modelId ?? existing?.modelId ?? TF_MODEL,
    toolPolicy: req.body.toolPolicy ?? existing?.toolPolicy ?? 'sandboxed',
    allowedTools: req.body.allowedTools ?? existing?.allowedTools ?? [],
    sessionMode: req.body.sessionMode ?? existing?.sessionMode ?? 'autonomous',
    sessionContinuity: req.body.sessionContinuity ?? existing?.sessionContinuity ?? false,
    maxTokens: req.body.maxTokens ?? existing?.maxTokens ?? 2048,
    temperature: req.body.temperature ?? existing?.temperature ?? 0.5,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  }
  const saved = upsertAgent(record)
  res.json({ agent: saved })
})

// Delete an agent record
app.delete('/api/agents/:id', (req: Request, res: Response) => {
  const id = param(req, 'id')
  const deleted = deleteAgent(id)
  if (!deleted) {
    res.status(404).json({ error: `Agent ${id} not found` })
    return
  }
  res.json({ deleted: true })
})

// ══════════════════════════════════════════════════════════════
// ── Agent Run — Function-calling execution loop ──
// ══════════════════════════════════════════════════════════════

interface ToolCallAccumulator {
  id: string
  name: string
  arguments: string
}

app.post('/api/agent/run', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const { messages, agentId } = req.body
  if (!messages || !agentId) {
    res.write(`data: ${JSON.stringify({ error: 'messages and agentId required' })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
    return
  }

  // Load agent record for tool policy
  const agent = getAgent(agentId)
  const toolDefs = agent
    ? getToolDefinitions(agent.allowedTools.length > 0 ? agent.allowedTools : undefined)
    : getToolDefinitions()

  // Filter out tools blocked by policy
  const filteredTools = agent?.toolPolicy === 'read-only'
    ? toolDefs.filter(t => t.function.name === 'dns-lookup')
    : toolDefs

  let conversationMessages = [...messages]
  const maxToolRounds = 5
  let round = 0

  try {
    while (round < maxToolRounds) {
      round++

      const body: Record<string, unknown> = {
        model: agent?.modelId || req.body.model || TF_MODEL,
        messages: conversationMessages,
        stream: true,
        ...(agent?.temperature != null && { temperature: agent.temperature }),
        ...(agent?.maxTokens != null && { max_tokens: agent.maxTokens }),
      }

      // Include tools if agent has any allowed
      if (filteredTools.length > 0) {
        body.tools = filteredTools
      }

      const tfResp = await fetch(`${TF_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: upstreamHeaders(req),
        body: JSON.stringify(body),
      })

      if (!tfResp.ok) {
        const text = await tfResp.text()
        res.write(`data: ${JSON.stringify({ error: text, status: tfResp.status })}\n\n`)
        res.write('data: [DONE]\n\n')
        res.end()
        return
      }

      if (!tfResp.body) {
        res.write('data: [DONE]\n\n')
        res.end()
        return
      }

      // Parse SSE from TrueFoundry, accumulating tool_calls and content
      const reader = tfResp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let contentAccum = ''
      const toolCalls: ToolCallAccumulator[] = []
      let finishReason: string | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6).trim()
          if (payload === '[DONE]') { finishReason = finishReason || 'stop'; break }
          try {
            const parsed = JSON.parse(payload)
            const choice = parsed.choices?.[0]
            if (!choice) continue

            if (choice.finish_reason) finishReason = choice.finish_reason

            // Accumulate content deltas — stream them to the client
            const contentDelta = choice.delta?.content
            if (contentDelta) {
              contentAccum += contentDelta
              res.write(`data: ${JSON.stringify({ type: 'content', content: contentDelta })}\n\n`)
            }

            // Accumulate tool call deltas
            const tcDeltas = choice.delta?.tool_calls
            if (tcDeltas) {
              for (const tc of tcDeltas) {
                const idx = tc.index ?? 0
                if (!toolCalls[idx]) {
                  toolCalls[idx] = { id: tc.id || '', name: tc.function?.name || '', arguments: '' }
                }
                if (tc.id) toolCalls[idx].id = tc.id
                if (tc.function?.name) toolCalls[idx].name = tc.function.name
                if (tc.function?.arguments) toolCalls[idx].arguments += tc.function.arguments
              }
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      // If the model returned tool_calls, execute them and loop
      if (finishReason === 'tool_calls' && toolCalls.length > 0) {
        // Add assistant message with tool_calls to conversation
        conversationMessages.push({
          role: 'assistant',
          content: contentAccum || null,
          tool_calls: toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: { name: tc.name, arguments: tc.arguments },
          })),
        })

        // Execute each tool and add results
        for (const tc of toolCalls) {
          let parsedArgs: Record<string, unknown> = {}
          try { parsedArgs = JSON.parse(tc.arguments) } catch {}

          // Notify client about tool execution
          res.write(`data: ${JSON.stringify({ type: 'tool_start', toolCallId: tc.id, toolName: tc.name, input: parsedArgs })}\n\n`)

          const result = await executeTool(tc.name, parsedArgs)

          // Persist tool result if missionId provided
          const missionId = req.body.missionId
          if (missionId) {
            const toolRecord: ToolResult = {
              id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              missionId,
              toolName: result.toolName,
              input: result.input,
              output: result.output,
              status: result.status,
              startedAt: new Date(Date.now() - result.durationMs).toISOString(),
              completedAt: new Date().toISOString(),
              error: result.error,
            }
            appendToolResult(toolRecord)
          }

          res.write(`data: ${JSON.stringify({ type: 'tool_result', toolCallId: tc.id, toolName: tc.name, output: result.output, status: result.status, error: result.error, durationMs: result.durationMs })}\n\n`)

          conversationMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: result.output ?? result.error ?? 'No output',
          })
        }

        // Continue the loop — model will process tool results
        continue
      }

      // No tool calls — we're done
      break
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: (err as Error).message })}\n\n`)
    res.write('data: [DONE]\n\n')
    res.end()
  }
})

// ══════════════════════════════════════════════════════════════
// ── Tool Execution API ──
// ══════════════════════════════════════════════════════════════

// List available live tools
app.get('/api/tools', (_req: Request, res: Response) => {
  res.json({ tools: getAvailableToolNames() })
})

// Execute a tool (real execution, not mocked)
app.post('/api/tools/execute', async (req: Request, res: Response) => {
  const { toolName, input, agentId, missionId } = req.body
  if (!toolName) {
    res.status(400).json({ error: 'toolName is required' })
    return
  }

  // Check agent tool policy if agentId provided
  if (agentId) {
    const agent = getAgent(agentId)
    if (agent) {
      if (agent.toolPolicy === 'read-only' && toolName !== 'dns-lookup') {
        res.status(403).json({ error: `Agent ${agentId} has read-only tool policy — only dns-lookup allowed` })
        return
      }
      if (agent.allowedTools.length > 0 && !agent.allowedTools.includes(toolName)) {
        res.status(403).json({ error: `Agent ${agentId} is not allowed to use tool: ${toolName}. Allowed: ${agent.allowedTools.join(', ')}` })
        return
      }
    }
  }

  console.log(`[tools] Executing ${toolName} for agent=${agentId || 'anonymous'} mission=${missionId || 'none'}`)
  const result = await executeTool(toolName, input ?? {})
  console.log(`[tools] ${toolName} → ${result.status} (${result.durationMs}ms)`)

  // Persist tool result if mission context provided
  if (missionId) {
    const toolRecord: ToolResult = {
      id: `tool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      missionId,
      toolName: result.toolName,
      input: result.input,
      output: result.output,
      status: result.status,
      startedAt: new Date(Date.now() - result.durationMs).toISOString(),
      completedAt: new Date().toISOString(),
      error: result.error,
    }
    appendToolResult(toolRecord)
  }

  res.json({ result })
})

// ══════════════════════════════════════════════════════════════
// ── Mission Persistence API ──
// ══════════════════════════════════════════════════════════════

// List all missions
app.get('/api/missions', (_req: Request, res: Response) => {
  res.json({ missions: getAllMissions() })
})

// Get single mission with transcript and tool results
app.get('/api/missions/:id', (req: Request, res: Response) => {
  const id = param(req, 'id')
  const mission = getMission(id)
  if (!mission) {
    res.status(404).json({ error: `Mission ${id} not found` })
    return
  }
  const transcript = getTranscripts(id)
  const toolResults = getToolResults(id)
  res.json({ mission, transcript, toolResults })
})

// Create or update a mission record
app.put('/api/missions/:id', (req: Request, res: Response) => {
  const id = param(req, 'id')
  const existing = getMission(id)
  const record: MissionRecord = {
    id,
    name: req.body.name ?? existing?.name ?? id,
    type: req.body.type ?? existing?.type ?? 'research',
    status: req.body.status ?? existing?.status ?? 'approved',
    assignedAgentId: req.body.assignedAgentId ?? existing?.assignedAgentId ?? '',
    sessionKey: req.body.sessionKey ?? existing?.sessionKey ?? '',
    prompt: req.body.prompt ?? existing?.prompt ?? '',
    context: req.body.context ?? existing?.context ?? '',
    priority: req.body.priority ?? existing?.priority ?? 'medium',
    createdAt: existing?.createdAt ?? req.body.createdAt ?? new Date().toISOString(),
    startedAt: req.body.startedAt ?? existing?.startedAt ?? null,
    completedAt: req.body.completedAt ?? existing?.completedAt ?? null,
    progress: req.body.progress ?? existing?.progress ?? 0,
    error: req.body.error ?? existing?.error ?? null,
  }
  const saved = upsertMission(record)
  res.json({ mission: saved })
})

// Append a transcript entry
app.post('/api/missions/:id/transcript', (req: Request, res: Response) => {
  const missionId = param(req, 'id')
  const entry: TranscriptEntry = {
    id: req.body.id || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    missionId,
    timestamp: req.body.timestamp || new Date().toISOString(),
    role: req.body.role,
    agentName: req.body.agentName,
    content: req.body.content,
    tokenCount: req.body.tokenCount,
  }
  const saved = appendTranscript(entry)
  res.json({ entry: saved })
})

// Get transcript for a mission
app.get('/api/missions/:id/transcript', (req: Request, res: Response) => {
  res.json({ transcript: getTranscripts(param(req, 'id')) })
})

// Get tool results for a mission
app.get('/api/missions/:id/tools', (req: Request, res: Response) => {
  res.json({ toolResults: getToolResults(param(req, 'id')) })
})

// ── Airbyte Data Plane (server-side proxy + mission context) ──
app.use('/api/airbyte', airbyteRouter)

// ── Auth0 Token Vault (connected accounts, token exchange, revoke) ──
app.use('/api/auth', tokenVaultRouter)

// ── Legacy aliases (keep old paths working during migration) ──
app.get('/api/agent/health', (_req, res) => res.redirect(307, '/api/chat/health'))
app.post('/api/agent/message', (_req, res) => res.redirect(307, '/api/chat/message'))
app.post('/api/agent/stream', (_req, res) => res.redirect(307, '/api/chat/stream'))

// ── Startup ──
seedAgents()

app.listen(PORT, () => {
  console.log(`[gateway] Agent Guild proxy listening on :${PORT}`)
  console.log(`[gateway] TrueFoundry → ${TF_BASE_URL}`)
  console.log(`[gateway] Default model: ${TF_MODEL}`)
  console.log(`[gateway] Bland.ai → ${BLAND_API_KEY ? 'configured' : 'simulation mode'}`)
  console.log(`[gateway] Airbyte → ${isAirbyteConfigured() ? 'configured' : 'mock mode'}`)
  console.log(`[gateway] Agent records: ${getAllAgents().length} loaded`)
  console.log(`[gateway] Live tools: ${getAvailableToolNames().join(', ')}`)
})