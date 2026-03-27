import { useAuth0 } from '@auth0/auth0-react'
import { Navigate, useLocation } from 'react-router-dom'
import agentLogo from '/agentlogo.png'

export default function LoginPage() {
  const { loginWithRedirect, isAuthenticated, isLoading, error } = useAuth0()
  const { state } = useLocation()
  const returnTo: string = state?.returnTo ?? '/'

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="w-12 h-12 rounded-full border-2 border-primary-container border-t-transparent animate-spin" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to={returnTo} replace />
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(134,59,255,0.08)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(76,215,246,0.05)_0%,transparent_50%)]" />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md px-6 animate-fade-in">
        {/* Logo & Brand */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary-container/20 blur-2xl scale-150" />
            <img
              src={agentLogo}
              alt="Agent Guild"
              className="relative w-20 h-20 object-contain drop-shadow-[0_0_20px_rgba(134,59,255,0.4)]"
            />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-black text-white tracking-widest font-headline uppercase">
              Agent Guild
            </h1>
            <p className="text-sm font-label uppercase tracking-[0.15em] text-primary mt-1">
              Mission Control
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="w-full glass-panel rounded-xl p-8 flex flex-col items-center gap-6">
          <div className="text-center">
            <h2 className="text-lg font-bold text-white font-headline">
              Operator Authentication Required
            </h2>
            <p className="text-sm text-on-surface-variant mt-2">
              Sign in to access the command center. Identity verified through Auth0 secure login.
            </p>
          </div>

          {error && (
            <div className="w-full px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400 text-center">
              {error.message}
            </div>
          )}

          <button
            onClick={() => loginWithRedirect({ appState: { returnTo } })}
            className="w-full py-3 px-6 rounded-lg bg-primary-container text-white font-label font-bold uppercase tracking-wider text-sm transition-all duration-200 hover:brightness-110 hover:shadow-[0_0_20px_rgba(134,59,255,0.4)] active:scale-[0.98]"
          >
            Sign In
          </button>

          <div className="flex items-center gap-4 w-full">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider font-label">
              Secured by Auth0
            </span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <p className="text-xs text-on-surface-variant/40 text-center">
            Supports Google, GitHub, and email/password authentication.
            Connected accounts can be managed after login.
          </p>
        </div>

        {/* Footer status */}
        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant/30 uppercase tracking-wider font-label">
          <span className="w-1.5 h-1.5 rounded-full bg-status-online animate-pulse" />
          Systems Online
        </div>
      </div>
    </div>
  )
}