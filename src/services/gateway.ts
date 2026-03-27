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

export async function invokeToolAction(
  _agentId: string,
  toolName: string,
  input: Record<string, unknown>,
): Promise<ToolAction> {
  // Tool invocation remains a local mock for now — will be wired to
  // TrueFoundry function-calling once tool schemas are registered.
  await new Promise(r => setTimeout(r, 800 + Math.random() * 1200))

  const success = Math.random() > 0.15
  const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  return {
    id: `tool-${Date.now()}`,
    toolName,
    input,
    output: success ? buildMockToolOutput(toolName, input) : null,
    status: success ? 'success' : 'failure',
    startedAt: now,
    completedAt: now,
    error: success ? null : `Tool execution failed: ${toolName} returned non-zero exit code`,
  }
}

function buildMockToolOutput(toolName: string, input: Record<string, unknown>): string {
  const outputs: Record<string, string> = {
    'network-scan': `Scan complete. 47 active hosts detected. 3 flagged for anomalous behavior: ${JSON.stringify(input.targets ?? ['10.0.4.12', '10.0.4.15', '10.0.7.22'])}`,
    'threat-classify': 'Classification: POLYMORPHIC_TUNNEL (confidence: 89%). Signature matches Syndicate Omega TTP database entry #2847.',
    'credential-rotate': 'Credentials rotated successfully. 12 service accounts updated. New keys distributed to authorized nodes.',
    'firewall-update': 'Firewall rules applied. 3 new block rules added. 2 deprecated rules purged.',
    'log-export': 'Exported 2,847 log entries to secure archive. Hash verification: PASSED.',
  }
  return outputs[toolName] ?? `Tool "${toolName}" executed successfully. Output: ${JSON.stringify(input)}`
}