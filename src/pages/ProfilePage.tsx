import { useAuth0 } from '@auth0/auth0-react'
import GlassPanel from '../components/ui/GlassPanel'
import PageHeader from '../components/ui/PageHeader'
import Icon from '../components/ui/Icon'
import type { ConnectedAccount } from '../types'

const AVAILABLE_CONNECTIONS: ConnectedAccount[] = [
  {
    provider: 'google',
    label: 'Google',
    icon: 'mail',
    description: 'Calendar, Gmail, Drive access for agent workflows',
    color: '#4285F4',
    scopes: ['email', 'calendar.readonly', 'drive.readonly'],
  },
  {
    provider: 'github',
    label: 'GitHub',
    icon: 'code',
    description: 'Repository access, issue management, PR workflows',
    color: '#f0f6fc',
    scopes: ['repo', 'read:org', 'read:user'],
  },
  {
    provider: 'slack',
    label: 'Slack',
    icon: 'chat',
    description: 'Channel messaging, notifications, agent alerts',
    color: '#E01E5A',
    scopes: ['chat:write', 'channels:read', 'users:read'],
  },
]

export default function ProfilePage() {
  const { user, logout } = useAuth0()

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??'

  function handleConnect(provider: string) {
    // Auth0 Token Vault: redirect to connection authorization
    // In production this calls Auth0's /authorize with connection parameter
    const domain = import.meta.env.VITE_AUTH0_DOMAIN
    const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID
    const redirectUri = `${window.location.origin}/profile`
    const connectionMap: Record<string, string> = {
      google: 'google-oauth2',
      github: 'github',
      slack: 'slack',
    }
    const connection = connectionMap[provider]
    if (domain && clientId && connection) {
      window.location.href = `https://${domain}/authorize?response_type=code&client_id=${clientId}&connection=${connection}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid profile email`
    }
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

        <div className="grid gap-4">
          {AVAILABLE_CONNECTIONS.map((account) => (
            <GlassPanel key={account.provider} className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${account.color}15` }}
                  >
                    <Icon
                      name={account.icon}
                      className="!text-[20px]"
                      style={{ color: account.color }}
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white font-headline">
                      {account.label}
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {account.description}
                    </p>
                    <div className="flex gap-2 mt-2">
                      {account.scopes.map((scope) => (
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
                <button
                  onClick={() => handleConnect(account.provider)}
                  className="px-4 py-2 rounded-lg bg-primary-container/20 text-primary text-xs font-label font-bold uppercase tracking-wider border border-primary/20 hover:bg-primary-container/30 transition-all whitespace-nowrap"
                >
                  Connect
                </button>
              </div>
            </GlassPanel>
          ))}
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
              Connected account tokens are stored in Auth0's Token Vault. Agents request
              scoped access through OAuth 2.0 — they never receive or store your passwords.
              You can revoke access to any connected service at any time.
            </p>
          </div>
        </div>
      </GlassPanel>
    </div>
  )
}