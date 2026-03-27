import { Auth0Provider } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'
import type { AppState } from '@auth0/auth0-react'

const domain = import.meta.env.VITE_AUTH0_DOMAIN as string
const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID as string
const audience = import.meta.env.VITE_AUTH0_AUDIENCE as string | undefined

export default function Auth0ProviderWithNavigate({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()

  function onRedirectCallback(appState: AppState | undefined) {
    navigate(appState?.returnTo ?? window.location.pathname)
  }

  if (!domain || !clientId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="glass-panel rounded-xl p-8 max-w-md text-center">
          <p className="text-white font-headline text-lg font-bold mb-2">Auth Not Configured</p>
          <p className="text-on-surface-variant text-sm">
            Set <code className="text-primary">VITE_AUTH0_DOMAIN</code> and{' '}
            <code className="text-primary">VITE_AUTH0_CLIENT_ID</code> in your environment.
          </p>
        </div>
      </div>
    )
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      useRefreshTokens={true}
      cacheLocation="localstorage"
      authorizationParams={{
        redirect_uri: window.location.origin,
        ...(audience ? { audience } : {}),
      }}
      onRedirectCallback={onRedirectCallback}
    >
      {children}
    </Auth0Provider>
  )
}
