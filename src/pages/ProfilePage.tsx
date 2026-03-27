import { useAuth0 } from '@auth0/auth0-react'
import { useEffect, useState, useCallback } from 'react'
import GlassPanel from '../components/ui/GlassPanel'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import type { ConnectedAccountConfig, ConnectedAccountState, ConnectionProvider } from '../types'
import { fetchConnections, initiateLink, completeLink, revokeConnection } from '../lib/connections'

const ACCOUNT_CONFIGS: ConnectedAccountConfig[] = [
  {
    provider: 'google',
    label: 'Google',
    icon: 'mail',
    description: 'Calendar, Gmail, Drive access for agent workflows',
    color: '#4285F4',
    scopes: ['email', 'calendar.readonly', 'drive.readonly'],
    auth0Connection: 'google-oauth2',
  },
  {
    provider: 'github',
    label: 'GitHub',
    icon: 'code',
    description: 'Repository access, issue management, PR workflows',
    color: '#f0f6fc',
    scopes: ['repo', 'read:org', 'read:user'],
    auth0Connection: 'github',
  },
  {
    provider: 'slack',
    label: 'Slack',
    icon: 'chat',
    description: 'Channel messaging, notifications, agent alerts',
    color: '#E01E5A',
    scopes: ['chat:write', 'channels:read', 'users:read'],
    auth0Connection: 'slack',
  },
]

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function ProfilePage() {
  const { user, logout, getAccessTokenSilently } = useAuth0()
  const [connections, setConnections] = useState<ConnectedAccountState[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??'

  const loadConnections = useCallback(async () => {
    try {
      const conns = await fetchConnections(getAccessTokenSilently)
      setConnections(conns)
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [getAccessTokenSilently])

  // Load connections on mount
  useEffect(() => {
    loadConnections()
  }, [loadConnections])

  // Handle callback after linking redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const linked = params.get('linked') as ConnectionProvider | null
    if (linked) {
      // Clean the URL
      window.history.replaceState({}, '', '/profile')
      // Confirm the link with the backend
      completeLink(getAccessTokenSilently, linked)
        .then(() => loadConnections())
        .catch(() => loadConnections()) // reload anyway to get latest state
    }
  }, [getAccessTokenSilently, loadConnections])

  async function handleConnect(provider: ConnectionProvider, scopes: string[]) {
    setActionLoading(provider)
    setError(null)
    try {
      const url = await initiateLink(getAccessTokenSilently, provider, scopes)
      window.location.href = url
    } catch (err) {
      setError((err as Error).message)
      setActionLoading(null)
    }
  }

  async function handleRevoke(provider: ConnectionProvider) {
    setActionLoading(provider)
    setError(null)
    try {
      await revokeConnection(getAccessTokenSilently, provider)
      await loadConnections()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setActionLoading(null)
    }
  }

  function getConnectionState(provider: ConnectionProvider): ConnectedAccountState | undefined {
    return connections.find(c => c.provider === provider)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <PageHeader
        title="Operator Profile"
        description="Identity, permissions, and connected service accounts"
      />

      {/* Profile Card */}
      <GlassPanel className="p-6">
        <div className="flex items-start gap-6">
          {user?.picture ? (
            <img
              src={user.picture}
              alt={user.name || 'Profile'}
              className="w-16 h-16 rounded-full border-2 border-primary/30"
            />
          ) : (
            <div className="w-16 h-16 rounded-full border-2 border-primary/30 bg-primary-container/20 flex items-center justify-center">
              <span className="text-xl font-bold text-primary font-headline">
                {initials}
              </span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white font-headline">
              {user?.name || 'Unknown Operator'}
            </h2>
            <p className="text-sm text-on-surface-variant mt-0.5">
              {user?.email}
            </p>
            <div className="flex items-center gap-3 mt-3">
              <span className="px-3 py-1 rounded-full bg-primary-container/20 text-[10px] font-bold font-label text-primary border border-primary/20 uppercase tracking-wider">
                Operator
              </span>
              {user?.email_verified && (
                <span className="flex items-center gap-1 px-3 py-1 rounded-full bg-status-online/10 text-[10px] font-bold font-label text-status-online border border-status-online/20 uppercase tracking-wider">
                  <Icon name="verified" className="!text-[12px]" />
                  Verified
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin + '/login' } })}
            className="px-4 py-2 rounded-lg border border-white/10 text-on-surface-variant text-xs font-label uppercase tracking-wider hover:bg-white/5 hover:text-white transition-all"
          >
            Sign Out
          </button>
        </div>
      </GlassPanel>

      {/* Connected Accounts */}
      <div>
        <h3 className="text-sm font-bold text-white font-headline uppercase tracking-wider mb-4 flex items-center gap-2">
          <Icon name="link" className="text-secondary" />
          Connected Accounts
        </h3>
        <p className="text-xs text-on-surface-variant mb-6">
          Connect third-party services so agents can act on your behalf via Auth0 Token Vault.
          Tokens are securely managed — agents never see your credentials.
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="grid gap-4">
          {ACCOUNT_CONFIGS.map((config) => {
            const state = getConnectionState(config.provider)
            const isLinked = state?.status === 'linked'
            const isExpired = state?.status === 'expired'
            const hasError = state?.status === 'error'
            const isLoading = actionLoading === config.provider

            return (
              <GlassPanel key={config.provider} className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center relative"
                      style={{ backgroundColor: `${config.color}15` }}
                    >
                      <Icon
                        name={config.icon}
                        className="!text-[20px]"
                        style={{ color: config.color }}
                      />
                      {isLinked && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-status-online border-2 border-surface flex items-center justify-center">
                          <Icon name="check" className="!text-[8px] text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-white font-headline">
                          {config.label}
                        </h4>
                        {isLinked && (
                          <span className="px-2 py-0.5 rounded-full bg-status-online/10 text-[9px] font-bold font-label text-status-online border border-status-online/20 uppercase tracking-wider">
                            Connected
                          </span>
                        )}
                        {isExpired && (
                          <span className="px-2 py-0.5 rounded-full bg-yellow-500/10 text-[9px] font-bold font-label text-yellow-400 border border-yellow-500/20 uppercase tracking-wider">
                            Expired
                          </span>
                        )}
                        {hasError && (
                          <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-[9px] font-bold font-label text-red-400 border border-red-500/20 uppercase tracking-wider">
                            Error
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        {config.description}
                      </p>
                      {/* Timestamps */}
                      {(state?.linkedAt || state?.lastUsedAt) && (
                        <div className="flex gap-4 mt-1.5">
                          {state.linkedAt && (
                            <span className="text-[10px] text-on-surface-variant/50">
                              Linked {formatRelativeTime(state.linkedAt)}
                            </span>
                          )}
                          {state.lastUsedAt && (
                            <span className="text-[10px] text-on-surface-variant/50">
                              Last used {formatRelativeTime(state.lastUsedAt)}
                            </span>
                          )}
                        </div>
                      )}
                      {hasError && state?.error && (
                        <p className="text-[10px] text-red-400/70 mt-1">{state.error}</p>
                      )}
                      <div className="flex gap-2 mt-2">
                        {config.scopes.map((scope) => (
                          <span
                            key={scope}
                            className="px-2 py-0.5 rounded bg-surface-container text-[9px] font-label text-on-surface-variant/60 uppercase tracking-wider"
                          >
                            {scope}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {loading ? (
                      <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider">Loading...</span>
                    ) : isLinked ? (
                      <>
                        <button
                          onClick={() => handleConnect(config.provider, config.scopes)}
                          disabled={isLoading}
                          className="px-3 py-2 rounded-lg border border-white/10 text-on-surface-variant text-xs font-label uppercase tracking-wider hover:bg-white/5 hover:text-white transition-all whitespace-nowrap disabled:opacity-50"
                        >
                          Reconnect
                        </button>
                        <button
                          onClick={() => handleRevoke(config.provider)}
                          disabled={isLoading}
                          className="px-3 py-2 rounded-lg border border-red-500/20 text-red-400 text-xs font-label uppercase tracking-wider hover:bg-red-500/10 transition-all whitespace-nowrap disabled:opacity-50"
                        >
                          {isLoading ? 'Revoking...' : 'Revoke'}
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleConnect(config.provider, config.scopes)}
                        disabled={isLoading}
                        className="px-4 py-2 rounded-lg bg-primary-container/20 text-primary text-xs font-label font-bold uppercase tracking-wider border border-primary/20 hover:bg-primary-container/30 transition-all whitespace-nowrap disabled:opacity-50"
                      >
                        {isLoading ? 'Connecting...' : (isExpired ? 'Reconnect' : 'Connect')}
                      </button>
                    )}
                  </div>
                </div>
              </GlassPanel>
            )
          })}
        </div>
      </div>

      {/* Security Info */}
      <GlassPanel className="p-5">
        <div className="flex items-start gap-3">
          <Icon name="shield" className="text-secondary mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-white font-headline">
              Token Vault Security
            </h4>
            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
              Connected account tokens are stored in Auth0's Token Vault and retrieved
              server-side via the Management API. Agents request scoped access through
              OAuth 2.0 — they never receive or store your passwords. Provider tokens
              are never exposed to the browser. You can revoke access at any time.
            </p>
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}
