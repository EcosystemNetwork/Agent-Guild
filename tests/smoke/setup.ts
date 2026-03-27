/**
 * Smoke test setup — starts the Express server on a test port
 * and provides helpers to make requests against it.
 */

import { beforeAll, afterAll } from 'vitest'
import { spawn, type ChildProcess } from 'node:child_process'

let serverProcess: ChildProcess | null = null
let baseUrl = ''

const TEST_PORT = 3099

export function getBaseUrl(): string {
  return baseUrl
}

export async function api(path: string, options?: RequestInit): Promise<Response> {
  return fetch(`${baseUrl}${path}`, options)
}

export async function apiJson<T = unknown>(path: string, options?: RequestInit): Promise<{ status: number; data: T }> {
  const resp = await api(path, options)
  const data = await resp.json() as T
  return { status: resp.status, data }
}

beforeAll(async () => {
  baseUrl = `http://127.0.0.1:${TEST_PORT}`

  serverProcess = spawn(
    process.execPath,
    ['--import', 'tsx', 'server/index.ts'],
    {
      env: {
        ...process.env,
        PORT: String(TEST_PORT),
        BLAND_API_KEY: process.env.BLAND_API_KEY || '',
        TRUEFOUNDRY_API_KEY: process.env.TRUEFOUNDRY_API_KEY || '',
      },
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  // Capture stderr for debugging
  serverProcess.stderr?.on('data', (chunk: Buffer) => {
    const msg = chunk.toString()
    if (msg.includes('Error') || msg.includes('error')) {
      console.error('[test:server:err]', msg.trim())
    }
  })

  // Wait for server to be ready (up to 12s)
  const deadline = Date.now() + 12_000
  let ready = false
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(`${baseUrl}/api/voice/events`)
      if (resp.ok) {
        ready = true
        break
      }
    } catch {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, 300))
  }

  if (!ready) {
    throw new Error(`Server did not start on port ${TEST_PORT} within 12s`)
  }
}, 15_000)

afterAll(() => {
  if (serverProcess) {
    serverProcess.kill('SIGTERM')
    serverProcess = null
  }
})
