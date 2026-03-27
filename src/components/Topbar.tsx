import { guildMetrics } from '../data/activity'
import Icon from './ui/Icon'
import agentLogo from '/agentlogo.png'

interface TopbarProps {
  onMenuToggle: () => void
}

export default function Topbar({ onMenuToggle }: TopbarProps) {
  return (
    <header className="flex justify-between items-center w-full px-4 sm:px-8 py-4 z-40 bg-surface/50 backdrop-blur-md sticky top-0 border-b border-white/5">
      <div className="flex items-center gap-4 sm:gap-8">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-on-surface-variant hover:text-white transition-colors"
        >
          <Icon name="menu" />
        </button>
        <div className="flex items-center gap-3">
          <img
            src={agentLogo}
            alt=""
            className="w-8 h-8 rounded object-cover drop-shadow-[0_0_8px_rgba(134,59,255,0.3)] hidden sm:block"
          />
          <h1 className="text-lg sm:text-xl font-black text-white tracking-widest font-headline uppercase">
            AGENT GUILD
          </h1>
        </div>
        <div className="hidden lg:flex items-center gap-3">
          <StatPill label={`${guildMetrics.activeMissions} Active Missions`} />
          <StatPill label={`${guildMetrics.agentsDeployed} Agents Deployed`} />
          <StatPill label={`${guildMetrics.uptime}% Uptime`} pulse />
        </div>
      </div>
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-4 text-on-surface-variant">
          <button className="hover:text-white transition-colors">
            <Icon name="search" />
          </button>
          <button className="hover:text-white transition-colors relative">
            <Icon name="notifications" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-primary-container rounded-full border border-surface" />
          </button>
        </div>
        <div className="flex items-center gap-3 pl-4 sm:pl-6 border-l border-white/10">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-white font-headline">Commander Kai</p>
            <p className="text-[10px] text-primary uppercase tracking-wider">Level 4 Operator</p>
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-primary/30 bg-primary-container/20 flex items-center justify-center">
            <span className="text-sm font-bold text-primary font-headline">CK</span>
          </div>
        </div>
      </div>
    </header>
  )
}

function StatPill({ label, pulse }: { label: string; pulse?: boolean }) {
  return (
    <span className="px-3 py-1 rounded-full bg-surface-container text-[10px] font-bold font-label text-secondary border border-secondary/20 flex items-center gap-1.5">
      {pulse && <span className="w-1.5 h-1.5 rounded-full bg-status-online animate-pulse" />}
      {label}
    </span>
  )
}
