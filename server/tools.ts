// ── Live Tool Execution Layer ──
// Real tool implementations that replace the mocked invokeToolAction()

import { resolve4, resolveMx, resolveTxt, resolveCname } from 'node:dns/promises'

export interface ToolExecResult {
  toolName: string
  input: Record<string, unknown>
  output: string | null
  status: 'success' | 'failure'
  durationMs: number
  error: string | null
}

// ── Tool Registry ──

type ToolHandler = (input: Record<string, unknown>) => Promise<{ output: string; error?: never } | { output?: never; error: string }>

const toolHandlers: Record<string, ToolHandler> = {
  'dns-lookup': dnsLookup,
  'http-probe': httpProbe,
}

export function getAvailableToolNames(): string[] {
  return Object.keys(toolHandlers)
}

/** OpenAI function-calling tool definitions for use in chat completion requests */
export function getToolDefinitions(allowedTools?: string[]): { type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }[] {
  const definitions: { type: 'function'; function: { name: string; description: string; parameters: Record<string, unknown> } }[] = [
    {
      type: 'function',
      function: {
        name: 'dns-lookup',
        description: 'Resolve a hostname to DNS records (A, MX, TXT, CNAME). Use this to investigate domain infrastructure, verify mail servers, or check DNS configuration.',
        parameters: {
          type: 'object',
          properties: {
            hostname: { type: 'string', description: 'The hostname to resolve (e.g. example.com)' },
            types: { type: 'array', items: { type: 'string', enum: ['A', 'MX', 'TXT', 'CNAME'] }, description: 'Record types to query. Defaults to ["A", "MX"].' },
          },
          required: ['hostname'],
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'http-probe',
        description: 'Make an HTTP request to a URL and report status code, headers, response time, and security headers. Use this to check if a service is up, inspect server configuration, or verify TLS.',
        parameters: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'The URL to probe (e.g. https://example.com)' },
            method: { type: 'string', enum: ['HEAD', 'GET'], description: 'HTTP method. Defaults to HEAD.' },
            timeout: { type: 'number', description: 'Timeout in milliseconds. Defaults to 10000.' },
          },
          required: ['url'],
        },
      },
    },
  ]

  if (!allowedTools) return definitions
  return definitions.filter(d => allowedTools.includes(d.function.name))
}

export async function executeTool(toolName: string, input: Record<string, unknown>): Promise<ToolExecResult> {
  const handler = toolHandlers[toolName]
  if (!handler) {
    return {
      toolName,
      input,
      output: null,
      status: 'failure',
      durationMs: 0,
      error: `Unknown tool: ${toolName}. Available: ${Object.keys(toolHandlers).join(', ')}`,
    }
  }

  const start = performance.now()
  try {
    const result = await handler(input)
    const durationMs = Math.round(performance.now() - start)
    if (result.error) {
      return { toolName, input, output: null, status: 'failure', durationMs, error: result.error }
    }
    return { toolName, input, output: result.output ?? null, status: 'success', durationMs, error: null }
  } catch (err) {
    const durationMs = Math.round(performance.now() - start)
    return {
      toolName,
      input,
      output: null,
      status: 'failure',
      durationMs,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

// ── dns-lookup ──
// Resolves a hostname to A, MX, TXT, and CNAME records

async function dnsLookup(input: Record<string, unknown>): Promise<{ output: string }> {
  const hostname = String(input.hostname || input.target || '')
  if (!hostname) return { output: 'Error: hostname parameter is required' }

  const recordTypes = (input.types as string[] | undefined) ?? ['A', 'MX']
  const results: Record<string, unknown> = { hostname, queriedAt: new Date().toISOString() }

  for (const rtype of recordTypes) {
    try {
      switch (rtype.toUpperCase()) {
        case 'A':
          results.A = await resolve4(hostname)
          break
        case 'MX':
          results.MX = await resolveMx(hostname)
          break
        case 'TXT':
          results.TXT = (await resolveTxt(hostname)).map(r => r.join(''))
          break
        case 'CNAME':
          results.CNAME = await resolveCname(hostname)
          break
        default:
          results[rtype] = `unsupported record type: ${rtype}`
      }
    } catch (err) {
      results[rtype] = `lookup failed: ${(err as Error).message}`
    }
  }

  return { output: JSON.stringify(results, null, 2) }
}

// ── http-probe ──
// Makes a real HTTP request to a URL and reports status, headers, timing

async function httpProbe(input: Record<string, unknown>): Promise<{ output: string }> {
  const url = String(input.url || input.target || '')
  if (!url) return { output: 'Error: url parameter is required' }

  // Validate URL format
  let parsed: URL
  try {
    parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
  } catch {
    return { output: `Error: invalid URL: ${url}` }
  }

  const method = String(input.method || 'HEAD').toUpperCase()
  const timeout = Number(input.timeout) || 10000

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  const start = performance.now()
  try {
    const resp = await fetch(parsed.href, {
      method,
      signal: controller.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'AgentGuild-HttpProbe/1.0' },
    })
    const elapsed = Math.round(performance.now() - start)
    clearTimeout(timer)

    const headers: Record<string, string> = {}
    const interestingHeaders = ['content-type', 'server', 'x-powered-by', 'strict-transport-security', 'x-frame-options', 'content-security-policy']
    for (const key of interestingHeaders) {
      const val = resp.headers.get(key)
      if (val) headers[key] = val
    }

    // Read a small body snippet for GET requests
    let bodySnippet: string | null = null
    if (method === 'GET') {
      const text = await resp.text()
      bodySnippet = text.slice(0, 500) + (text.length > 500 ? '... [truncated]' : '')
    }

    const result: Record<string, unknown> = {
      url: parsed.href,
      method,
      status: resp.status,
      statusText: resp.statusText,
      responseTimeMs: elapsed,
      headers,
      redirected: resp.redirected,
      finalUrl: resp.url !== parsed.href ? resp.url : undefined,
      probedAt: new Date().toISOString(),
    }
    if (bodySnippet) result.bodySnippet = bodySnippet

    return { output: JSON.stringify(result, null, 2) }
  } catch (err) {
    clearTimeout(timer)
    const elapsed = Math.round(performance.now() - start)
    const result = {
      url: parsed.href,
      method,
      status: 0,
      error: (err as Error).message,
      responseTimeMs: elapsed,
      probedAt: new Date().toISOString(),
    }
    return { output: JSON.stringify(result, null, 2) }
  }
}