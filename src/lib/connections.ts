import type { ConnectedAccountState, ConnectionProvider } from '../types'

const BASE = '/api/auth'

async function authHeaders(getAccessTokenSilently: () => Promise<string>): Promise<Record<string, string>> {
  const token = await getAccessTokenSilently()
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

export async function fetchConnections(
  getAccessTokenSilently: () => Promise<string>,
): Promise<ConnectedAccountState[]> {
  const headers = await authHeaders(getAccessTokenSilently)
  const resp = await fetch(`${BASE}/connections`, { headers })
  if (!resp.ok) throw new Error(`Failed to fetch connections: ${resp.status}`)
  const data = await resp.json()
  return data.connections
}

export async function initiateLink(
  getAccessTokenSilently: () => Promise<string>,
  provider: ConnectionProvider,
  scopes: string[] = [],
): Promise<string> {
  const headers = await authHeaders(getAccessTokenSilently)
  const resp = await fetch(`${BASE}/connections/${provider}/link`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      redirectUri: `${window.location.origin}/profile?linked=${provider}`,
      scopes,
    }),
  })
  if (!resp.ok) throw new Error(`Failed to initiate link: ${resp.status}`)
  const data = await resp.json()
  return data.authorizeUrl
}

export async function completeLink(
  getAccessTokenSilently: () => Promise<string>,
  provider: ConnectionProvider,
): Promise<{ status: string; provider: string }> {
  const headers = await authHeaders(getAccessTokenSilently)
  const resp = await fetch(`${BASE}/connections/${provider}/callback`, {
    method: 'POST',
    headers,
  })
  if (!resp.ok) throw new Error(`Failed to complete link: ${resp.status}`)
  return resp.json()
}

export async function revokeConnection(
  getAccessTokenSilently: () => Promise<string>,
  provider: ConnectionProvider,
): Promise<{ status: string; provider: string }> {
  const headers = await authHeaders(getAccessTokenSilently)
  const resp = await fetch(`${BASE}/connections/${provider}`, {
    method: 'DELETE',
    headers,
  })
  if (!resp.ok) throw new Error(`Failed to revoke connection: ${resp.status}`)
  return resp.json()
}
