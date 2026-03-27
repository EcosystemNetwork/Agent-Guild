import express from 'express'
import type { Request, Response } from 'express'

const app = express()
app.use(express.json())

const TF_BASE_URL = process.env.TRUEFOUNDRY_BASE_URL || 'https://llm-gateway.truefoundry.com/api/inference/openai'
const TF_API_KEY = process.env.TRUEFOUNDRY_API_KEY || ''
const TF_MODEL = process.env.TRUEFOUNDRY_MODEL || 'openai-main/gpt-4o-mini'
const BLAND_API_KEY = process.env.BLAND_API_KEY || ''
const BLAND_PATHWAY_ID = process.env.BLAND_PATHWAY_ID || ''
const PORT = Number(process.env.PORT) || 3001

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

    console.log(`[bland] Call launched: ${data.call_id} → ${phone_number}`)
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
  // Keep only last 100 events
  if (blandCallEvents.length > 100) blandCallEvents.splice(0, blandCallEvents.length - 100)

  res.json({ received: true })
})

// ── Voice Call — Poll for webhook events (frontend polling) ──
app.get('/api/voice/events', (_req: Request, res: Response) => {
  res.json({ events: blandCallEvents })
})

// ── Legacy aliases (keep old paths working during migration) ──
app.get('/api/agent/health', (_req, res) => res.redirect(307, '/api/chat/health'))
app.post('/api/agent/message', (_req, res) => res.redirect(307, '/api/chat/message'))
app.post('/api/agent/stream', (_req, res) => res.redirect(307, '/api/chat/stream'))

app.listen(PORT, () => {
  console.log(`[gateway] Agent Guild proxy listening on :${PORT}`)
  console.log(`[gateway] TrueFoundry → ${TF_BASE_URL}`)
  console.log(`[gateway] Default model: ${TF_MODEL}`)
  console.log(`[gateway] Bland.ai → ${BLAND_API_KEY ? 'configured' : 'simulation mode'}`)
})