import { NavLink } from 'react-router-dom'
import Icon from './ui/Icon'
import { cn } from '../lib/utils'

const navItems = [
  { to: '/', icon: 'dashboard', label: 'Dashboard' },
  { to: '/agents', icon: 'smart_toy', label: 'Agents' },
  { to: '/missions', icon: 'assignment', label: 'Missions' },
  { to: '/trust', icon: 'security', label: 'Trust Ledger' },
  { to: '/operator', icon: 'insights', label: 'Operator' },
  { to: '/comms', icon: 'forum', label: 'Comms' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed left-0 top-0 h-full z-50 flex flex-col bg-surface-container-low/80 backdrop-blur-xl border-r border-white/10 transition-all duration-300 overflow-hidden',
          // Desktop: collapsible on hover
          'lg:w-[72px] lg:hover:w-[240px]',
          // Mobile: slide in/out
          open ? 'w-[240px]' : 'w-0 lg:w-[72px]',
        )}
      >
        {/* Brand */}
        <div className="p-4 flex items-center gap-3 min-h-[72px]">
          <div className="w-10 h-10 min-w-[40px] rounded-lg bg-primary-container/20 flex items-center justify-center">
            <Icon
              name="shield"
              filled
              className="text-primary-container drop-shadow-[0_0_8px_rgba(124,58,237,0.5)]"
              size="lg"
            />
          </div>
          <div className="opacity-0 lg:group-hover/sidebar:opacity-100 transition-opacity duration-300 whitespace-nowrap sidebar-label">
            <h2 className="font-headline font-bold text-white tracking-tight leading-none text-sm">
              Agent Guild
            </h2>
            <p className="text-[10px] font-label uppercase tracking-[0.1em] text-primary">
              Mission Control
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 mt-2 px-2 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-primary-container/20 text-primary-container border-r-2 border-primary-container'
                    : 'text-on-surface-variant/70 hover:bg-white/5 hover:text-secondary',
                )
              }
            >
              <Icon name={item.icon} className="min-w-[24px] text-center" />
              <span className="font-label uppercase tracking-[0.05em] text-xs whitespace-nowrap sidebar-label opacity-0 lg:group-hover/sidebar:opacity-100 transition-opacity duration-300">
                {item.label}
              </span>
            </NavLink>
          ))}
        </nav>

        {/* Settings */}
        <div className="p-3 border-t border-white/5">
          <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-on-surface-variant/70 hover:bg-white/5 hover:text-secondary transition-all duration-200 cursor-pointer">
            <Icon name="settings" className="min-w-[24px]" />
            <span className="font-label uppercase tracking-[0.05em] text-xs whitespace-nowrap sidebar-label opacity-0 lg:group-hover/sidebar:opacity-100 transition-opacity duration-300">
              Settings
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
