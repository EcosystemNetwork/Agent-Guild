import express from 'express'
import type { Request, Response } from 'express'

const app = express()
app.use(express.json())

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:8080'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || ''
const PORT = Number(process.env.PORT) || 3001

if (!GATEWAY_TOKEN) {
  console.warn('[gateway] WARNING: OPENCLAW_GATEWAY_TOKEN is not set')
}

function gatewayHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${GATEWAY_TOKEN}`,
  }
  const agentId = req.headers['x-openclaw-agent-id']
  if (typeof agentId === 'string') {
    headers['x-openclaw-agent-id'] = agentId
  }
  const sessionKey = req.headers['x-openclaw-session-key']
  if (typeof sessionKey === 'string') {
    headers['x-openclaw-session-key'] = sessionKey
  }
  return headers
}

// ── Health Check ──
app.get('/api/agent/health', async (_req: Request, res: Response) => {
  try {
    const resp = await fetch(`${GATEWAY_URL}/v1/models`, {
      headers: { 'Authorization': `Bearer ${GATEWAY_TOKEN}` },
    })
    if (resp.ok) {
      res.json({ status: 'ok', gateway: 'reachable' })
    } else {
      res.status(502).json({ status: 'error', gateway: 'unreachable', code: resp.status })
    }
  } catch (err) {
    res.status(502).json({ status: 'error', gateway: 'unreachable', message: (err as Error).message })
  }
})

// ── Send Message (non-streaming) ──
app.post('/api/agent/message', async (req: Request, res: Response) => {
  try {
    const resp = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: gatewayHeaders(req),
      body: JSON.stringify({
        ...req.body,
        stream: false,
      }),
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

// ── Stream Message (SSE) ──
app.post('/api/agent/stream', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  try {
    const resp = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: gatewayHeaders(req),
      body: JSON.stringify({
        ...req.body,
        stream: true,
      }),
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

app.listen(PORT, () => {
  console.log(`[gateway] Agent Guild proxy listening on :${PORT}`)
  console.log(`[gateway] Forwarding to ${GATEWAY_URL}`)
})
