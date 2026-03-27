import { Router } from 'express'
import type { Request, Response } from 'express'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', '.data')

// ── Config ──
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN || process.env.VITE_AUTH0_DOMAIN || ''
const AUTH0_M2M_CLIENT_ID = process.env.AUTH0_M2M_CLIENT_ID || ''
const AUTH0_M2M_CLIENT_SECRET = process.env.AUTH0_M2M_CLIENT_SECRET || ''
const AUTH0_SPA_CLIENT_ID = process.env.VITE_AUTH0_CLIENT_ID || ''

const CONNECTION_MAP: Record<string, string> = {
  google: 'google-oauth2',
  github: 'github',
  slack: 'slack',
}

// ── Management API Token (cached) ──
let mgmtToken: string | null = null
let mgmtTokenExp = 0

async function getManagementToken(): Promise<string> {
  if (mgmtToken && Date.now() < mgmtTokenExp - 60_000) return mgmtToken
  if (!AUTH0_DOMAIN || !AUTH0_M2M_CLIENT_ID || !AUTH0_M2M_CLIENT_SECRET) {
    throw new Error('Auth0 M2M credentials not configured')
  }
  const resp = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: AUTH0_M2M_CLIENT_ID,
      client_secret: AUTH0_M2M_CLIENT_SECRET,
      audience: `https://${AUTH0_DOMAIN}/api/v2/`,
    }),
  })
  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Management token request failed (${resp.status}): ${text}`)
  }
  const data = await resp.json() as { access_token: string; expires_in: number }
  mgmtToken = data.access_token
  mgmtTokenExp = Date.now() + data.expires_in * 1000
  return mgmtToken
}

// ── User resolution ──
async function resolveUserSub(authHeader: string): Promise<string | null> {
  if (!AUTH0_DOMAIN) return null
  const resp = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
    headers: { Authorization: authHeader },
  })
  if (!resp.ok) return null
  const profile = await resp.json() as { sub?: string }
  return profile.sub ?? null
}

async function requireAuth(req: Request, res: Response): Promise<string | null> {
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' })
    return null
  }
  const sub = await resolveUserSub(authHeader)
  if (!sub) {
    res.status(401).json({ error: 'Invalid token' })
    return null
  }
  return sub
}

// ── Connection Persistence ──
const CONNECTIONS_FILE = join(DATA_DIR, 'connections.json')

interface PersistedConnection {
  userId: string
  provider: string
  status: 'linked' | 'unlinked' | 'expired' | 'error'
  linkedAt: string | null
  lastUsedAt: string | null
  scopes: string[]
  error: string | null
}

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
}

function loadConnections(): PersistedConnection[] {
  ensureDataDir()
  if (!existsSync(CONNECTIONS_FILE)) return []
  try {
    return JSON.parse(readFileSync(CONNECTIONS_FILE, 'utf-8'))
  } catch {
    return []
  }
}

function saveConnections(conns: PersistedConnection[]) {
  ensureDataDir()
  writeFileSync(CONNECTIONS_FILE, JSON.stringify(conns, null, 2))
}

function upsertConnection(userId: string, provider: string, update: Partial<PersistedConnection>): PersistedConnection {
  const conns = loadConnections()
  const idx = conns.findIndex(c => c.userId === userId && c.provider === provider)
  if (idx >= 0) {
    conns[idx] = { ...conns[idx], ...update }
    saveConnections(conns)
    return conns[idx]
  }
  const newConn: PersistedConnection = {
    userId,
    provider,
    status: update.status ?? 'unlinked',
    linkedAt: update.linkedAt ?? null,
    lastUsedAt: update.lastUsedAt ?? null,
    scopes: update.scopes ?? [],
    error: update.error ?? null,
  }
  conns.push(newConn)
  saveConnections(conns)
  return newConn
}

// Express 5 params can be string | string[] — extract first value
function paramStr(val: string | string[] | undefined): string {
  if (Array.isArray(val)) return val[0] ?? ''
  return val ?? ''
}

// ── Router ──
export const tokenVaultRouter = Router()

// List Connected Accounts
tokenVaultRouter.get('/connections', async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res)
  if (!userId) return

  try {
    const token = await getManagementToken()
    const resp = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}?fields=identities&include_fields=true`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!resp.ok) {
      const text = await resp.text()
      res.status(resp.status).json({ error: `Failed to fetch user identities: ${text}` })
      return
    }

    const user = await resp.json() as { identities?: Array<{ connection: string; provider: string }> }
    const identities = user.identities ?? []

    const linkedProviders = new Map<string, boolean>()
    for (const id of identities) {
      for (const [key, connName] of Object.entries(CONNECTION_MAP)) {
        if (id.connection === connName || id.provider === connName) {
          linkedProviders.set(key, true)
        }
      }
    }

    const persisted = loadConnections().filter(c => c.userId === userId)
    const providers = ['google', 'github', 'slack']

    const connections = providers.map(provider => {
      const isLinked = linkedProviders.has(provider)
      const saved = persisted.find(c => c.provider === provider)
      return {
        provider,
        status: isLinked ? 'linked' as const : (saved?.status === 'expired' ? 'expired' as const : 'unlinked' as const),
        linkedAt: saved?.linkedAt ?? null,
        lastUsedAt: saved?.lastUsedAt ?? null,
        scopes: saved?.scopes ?? [],
        error: saved?.error ?? null,
      }
    })

    res.json({ connections })
  } catch (err) {
    console.error('[token-vault] List connections error:', err)
    res.status(502).json({ error: (err as Error).message })
  }
})

// Initiate Account Linking
tokenVaultRouter.post('/connections/:provider/link', async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res)
  if (!userId) return

  const provider = paramStr(req.params.provider)
  const connection = CONNECTION_MAP[provider]
  if (!connection) {
    res.status(400).json({ error: `Unknown provider: ${provider}` })
    return
  }

  const redirectUri = req.body.redirectUri || `${req.headers.origin || 'http://localhost:5173'}/profile`
  const scopes: string[] = req.body.scopes || []

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: AUTH0_SPA_CLIENT_ID,
    connection,
    redirect_uri: redirectUri,
    scope: ['openid', 'profile', 'email', ...scopes].join(' '),
    state: JSON.stringify({ provider, linkTo: userId }),
  })

  const authorizeUrl = `https://${AUTH0_DOMAIN}/authorize?${params.toString()}`
  upsertConnection(userId, provider, { scopes, status: 'unlinked' })

  res.json({ authorizeUrl })
})

// Complete Account Linking (callback from frontend)
tokenVaultRouter.post('/connections/:provider/callback', async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res)
  if (!userId) return

  const provider = paramStr(req.params.provider)
  const connection = CONNECTION_MAP[provider]
  if (!connection) {
    res.status(400).json({ error: `Unknown provider: ${provider}` })
    return
  }

  try {
    const token = await getManagementToken()
    const userResp = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}?fields=identities&include_fields=true`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!userResp.ok) {
      res.status(userResp.status).json({ error: 'Failed to verify linked identity' })
      return
    }

    const user = await userResp.json() as { identities?: Array<{ connection: string; provider: string }> }
    const linked = (user.identities ?? []).some(id => id.connection === connection)

    if (linked) {
      upsertConnection(userId, provider, {
        status: 'linked',
        linkedAt: new Date().toISOString(),
        error: null,
      })
      res.json({ status: 'linked', provider })
    } else {
      const { secondaryToken } = req.body
      if (secondaryToken) {
        const linkResp = await fetch(
          `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}/identities`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              provider: connection.includes('-') ? connection.split('-')[0] : connection,
              connection_id: connection,
              link_with: secondaryToken,
            }),
          },
        )
        if (linkResp.ok) {
          upsertConnection(userId, provider, {
            status: 'linked',
            linkedAt: new Date().toISOString(),
            error: null,
          })
          res.json({ status: 'linked', provider })
        } else {
          const text = await linkResp.text()
          upsertConnection(userId, provider, { status: 'error', error: text })
          res.status(linkResp.status).json({ error: `Linking failed: ${text}` })
        }
      } else {
        res.json({ status: 'unlinked', provider, message: 'Identity not yet linked' })
      }
    }
  } catch (err) {
    console.error('[token-vault] Callback error:', err)
    upsertConnection(userId, provider, { status: 'error', error: (err as Error).message })
    res.status(502).json({ error: (err as Error).message })
  }
})

// Get Provider Access Token (for agent use)
tokenVaultRouter.post('/connections/:provider/token', async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res)
  if (!userId) return

  const provider = paramStr(req.params.provider)
  const connection = CONNECTION_MAP[provider]
  if (!connection) {
    res.status(400).json({ error: `Unknown provider: ${provider}` })
    return
  }

  try {
    const token = await getManagementToken()
    const resp = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!resp.ok) {
      res.status(resp.status).json({ error: 'Failed to fetch user' })
      return
    }

    const user = await resp.json() as {
      identities?: Array<{
        connection: string
        provider: string
        access_token?: string
        refresh_token?: string
        expires_in?: number
      }>
    }

    const identity = (user.identities ?? []).find(id => id.connection === connection)
    if (!identity) {
      res.status(404).json({ error: `Provider ${provider} is not linked` })
      return
    }

    if (!identity.access_token) {
      upsertConnection(userId, provider, { status: 'expired', error: 'No access token available — reconnect required' })
      res.status(410).json({ error: 'Access token expired or unavailable. User must reconnect.' })
      return
    }

    upsertConnection(userId, provider, { lastUsedAt: new Date().toISOString(), status: 'linked', error: null })

    res.json({
      provider,
      access_token: identity.access_token,
      expires_in: identity.expires_in ?? null,
    })
  } catch (err) {
    console.error('[token-vault] Token retrieval error:', err)
    res.status(502).json({ error: (err as Error).message })
  }
})

// Revoke / Unlink a Connected Account
tokenVaultRouter.delete('/connections/:provider', async (req: Request, res: Response) => {
  const userId = await requireAuth(req, res)
  if (!userId) return

  const provider = paramStr(req.params.provider)
  const connection = CONNECTION_MAP[provider]
  if (!connection) {
    res.status(400).json({ error: `Unknown provider: ${provider}` })
    return
  }

  try {
    const token = await getManagementToken()
    const userResp = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}?fields=identities&include_fields=true`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!userResp.ok) {
      res.status(userResp.status).json({ error: 'Failed to fetch user identities' })
      return
    }

    const user = await userResp.json() as {
      identities?: Array<{ connection: string; provider: string; user_id: string }>
    }

    const identity = (user.identities ?? []).find(id => id.connection === connection)
    if (!identity) {
      upsertConnection(userId, provider, { status: 'unlinked', linkedAt: null, error: null })
      res.json({ status: 'unlinked', provider })
      return
    }

    const unlinkResp = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}/identities/${encodeURIComponent(identity.provider)}/${encodeURIComponent(identity.user_id)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
    )

    if (!unlinkResp.ok) {
      const text = await unlinkResp.text()
      res.status(unlinkResp.status).json({ error: `Unlink failed: ${text}` })
      return
    }

    upsertConnection(userId, provider, { status: 'unlinked', linkedAt: null, lastUsedAt: null, error: null })
    console.log(`[token-vault] Unlinked ${provider} for user ${userId}`)
    res.json({ status: 'unlinked', provider })
  } catch (err) {
    console.error('[token-vault] Revoke error:', err)
    res.status(502).json({ error: (err as Error).message })
  }
})

// Exported for agent-side token retrieval (server-only, no HTTP)
export async function getProviderTokenForUser(userId: string, provider: string): Promise<{ access_token: string; expires_in: number | null } | null> {
  const connection = CONNECTION_MAP[provider]
  if (!connection) return null

  try {
    const token = await getManagementToken()
    const resp = await fetch(
      `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (!resp.ok) return null

    const user = await resp.json() as {
      identities?: Array<{
        connection: string
        access_token?: string
        expires_in?: number
      }>
    }

    const identity = (user.identities ?? []).find(id => id.connection === connection)
    if (!identity?.access_token) return null

    upsertConnection(userId, provider, { lastUsedAt: new Date().toISOString(), status: 'linked', error: null })

    return {
      access_token: identity.access_token,
      expires_in: identity.expires_in ?? null,
    }
  } catch {
    return null
  }
}
