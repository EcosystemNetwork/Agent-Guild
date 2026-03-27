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
