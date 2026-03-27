import type { Agent } from '../types'
import { agentStatusColor, agentStatusLabel, connectionStatusColor, connectionStatusLabel, routingRoleColor } from '../lib/utils'
import { useRegistry } from '../contexts/RegistryContext'
import GlassPanel from './ui/GlassPanel'
import StatusChip from './ui/StatusChip'
import ProgressBar from './ui/ProgressBar'
import Icon from './ui/Icon'

interface AgentCardProps {
  agent: Agent
  compact?: boolean
}

export default function AgentCard({ agent, compact }: AgentCardProps) {
  const { getEntry } = useRegistry()
  const entry = getEntry(agent.id)
  const statusColor = agentStatusColor[agent.status] ?? '#ccc3d8'
  const statusText = agentStatusLabel[agent.status] ?? agent.status
  const connColor = entry ? (connectionStatusColor[entry.connectionStatus] ?? '#94A3B8') : '#94A3B8'
  const connLabel = entry ? (connectionStatusLabel[entry.connectionStatus] ?? '—') : 'UNBOUND'
  const roleColor = entry ? (routingRoleColor[entry.role] ?? '#94A3B8') : '#94A3B8'

  if (compact) {
    return (
      <GlassPanel hover className="p-4 flex items-center gap-4">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-headline font-bold text-sm shrink-0"
          style={{
            backgroundColor: `${statusColor}15`,
            color: statusColor,
            border: `1px solid ${statusColor}30`,
          }}
        >
          {agent.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="font-headline font-bold text-sm text-white truncate">{agent.name}</p>
            <StatusChip label={statusText} color={statusColor} pulse={agent.status === 'active'} />
          </div>
          <p className="text-xs text-on-surface-variant truncate">{agent.role}</p>
        </div>
      </GlassPanel>
    )
  }

  return (
    <GlassPanel hover className="p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center font-headline font-bold text-base"
            style={{
              backgroundColor: `${statusColor}15`,
              color: statusColor,
              border: `1px solid ${statusColor}30`,
            }}
          >
            {agent.avatar}
          </div>
          <div>
            <h3 className="font-headline font-bold text-white tracking-tight">{agent.name}</h3>
            <p className="text-xs text-on-surface-variant">{agent.role}</p>
          </div>
        </div>
        <StatusChip label={statusText} color={statusColor} pulse={agent.status === 'active'} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {agent.specialty.map((s) => (
          <span
            key={s}
            className="px-2 py-0.5 rounded-full bg-surface-container-high text-[10px] font-label uppercase tracking-wider text-on-surface-variant border border-white/5"
          >
            {s}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-4 pt-2 border-t border-white/5">
        <div>
          <p className="text-[10px] font-label uppercase text-on-surface-variant/60 tracking-wider mb-1">Trust</p>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-headline font-bold text-white">{agent.trustScore}</span>
            <ProgressBar value={agent.trustScore} color={statusColor} />
          </div>
        </div>
        <div>
          <p className="text-[10px] font-label uppercase text-on-surface-variant/60 tracking-wider mb-1">Missions</p>
          <span className="text-sm font-headline font-bold text-white">{agent.missionsCompleted}</span>
        </div>
        <div>
          <p className="text-[10px] font-label uppercase text-on-surface-variant/60 tracking-wider mb-1">Clock</p>
          <div className="flex items-center gap-1">
            <Icon name="schedule" size="sm" className="text-on-surface-variant/40" />
            <span className="text-sm font-headline font-bold text-white">{agent.missionClock}</span>
          </div>
        </div>
      </div>

      {/* OpenClaw Registry Binding */}
      {entry && (
        <div className="pt-2 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: connColor }} />
              <span className="text-[9px] font-label uppercase tracking-wider" style={{ color: connColor }}>{connLabel}</span>
            </div>
            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase" style={{ background: `${roleColor}15`, color: roleColor }}>
              {entry.role}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[9px]">
            <div className="flex justify-between">
              <span className="text-on-surface-variant/50">Target</span>
              <span className="text-white font-mono text-[8px]">{entry.openclawAgentId.slice(-8)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-on-surface-variant/50">Session</span>
              <span className="text-white font-mono text-[8px]">{entry.currentSessionId?.slice(-5) ?? '—'}</span>
            </div>
            <div className="flex justify-between col-span-2">
              <span className="text-on-surface-variant/50">Last active</span>
              <span className="text-on-surface-variant">{entry.lastActivity}</span>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-2 border-t border-white/5">
        <button className="flex-1 py-2 rounded-lg bg-primary-container text-white text-[10px] font-bold font-label uppercase tracking-wider hover:brightness-110 transition-all glow-violet">
          Assign
        </button>
        <button className="px-3 py-2 rounded-lg bg-surface-container-high border border-white/10 text-on-surface-variant hover:text-white transition-all">
          <Icon name="visibility" size="sm" />
        </button>
        <button className="px-3 py-2 rounded-lg bg-surface-container-high border border-white/10 text-on-surface-variant hover:text-white transition-all">
          <Icon name="forum" size="sm" />
        </button>
      </div>
    </GlassPanel>
  )
}
