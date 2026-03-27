import { useState } from 'react'
import { useRegistry } from '../contexts/RegistryContext'
import { useData } from '../contexts/DataContext'
import { cn, connectionStatusColor, connectionStatusLabel, routingRoleColor } from '../lib/utils'
import type { AgentRoutingRole } from '../types'
import PageHeader from '../components/ui/PageHeader'
import GlassPanel from '../components/ui/GlassPanel'
import Icon from '../components/ui/Icon'
import StatusChip from '../components/ui/StatusChip'

export default function RegistryPage() {
  const { registry, rebind } = useRegistry()
  const { agents, routingRules } = useData()
  const [rebindTarget, setRebindTarget] = useState<string | null>(null)
  const [selectedAgentRecord, setSelectedAgentRecord] = useState('')
  const [roleFilter, setRoleFilter] = useState<AgentRoutingRole | 'all'>('all')

  const filtered = roleFilter === 'all' ? registry : registry.filter(e => e.role === roleFilter)

  const connectedCount = registry.filter(e => e.connectionStatus === 'connected').length
  const disconnectedCount = registry.filter(e => e.connectionStatus === 'disconnected').length

  const handleRebind = (guildAgentId: string) => {
    if (!selectedAgentRecord) return
    rebind(guildAgentId, selectedAgentRecord)
    setRebindTarget(null)
    setSelectedAgentRecord('')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Registry"
        description={`${registry.length} guild agents mapped — ${connectedCount} linked, ${disconnectedCount} unlinked`}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassPanel className="p-4">
          <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1">Total Bindings</p>
          <p className="text-2xl font-headline font-bold text-white">{registry.length}</p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1">Connected</p>
          <p className="text-2xl font-headline font-bold text-status-online">{connectedCount}</p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1">Disconnected</p>
          <p className="text-2xl font-headline font-bold text-status-offline">{disconnectedCount}</p>
        </GlassPanel>
        <GlassPanel className="p-4">
          <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1">Active Sessions</p>
          <p className="text-2xl font-headline font-bold text-secondary">{registry.filter(e => e.currentSessionId).length}</p>
        </GlassPanel>
      </div>

      {/* Routing Rules */}
      <div>
        <h3 className="font-headline font-bold text-white uppercase tracking-wider text-xs mb-3 flex items-center gap-2">
          <Icon name="route" size="sm" className="text-secondary" /> Routing Rules
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
          {routingRules.map(rule => {
            const count = registry.filter(e => e.role === rule.role).length
            return (
              <GlassPanel key={rule.role} hover className="p-4 cursor-pointer" onClick={() => setRoleFilter(prev => prev === rule.role ? 'all' : rule.role)}>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${rule.color}15` }}>
                    <Icon name={rule.icon} size="sm" style={{ color: rule.color }} />
                  </div>
                  <div>
                    <p className="text-xs font-headline font-bold text-white">{rule.label}</p>
                    <p className="text-[9px] text-on-surface-variant/50">{count} agent{count !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <p className="text-[10px] text-on-surface-variant/60 leading-relaxed">{rule.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {rule.preferredAgentTypes.map(t => (
                    <span key={t} className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-white/5 text-on-surface-variant/50">{t}</span>
                  ))}
                </div>
              </GlassPanel>
            )
          })}
        </div>
      </div>

      {/* Role Filter */}
      <div className="flex flex-wrap gap-2">
        {[{ label: 'All', value: 'all' as const }, ...routingRules.map(r => ({ label: r.label, value: r.role }))].map(f => (
          <button
            key={f.value}
            onClick={() => setRoleFilter(f.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[10px] font-label font-bold uppercase tracking-wider transition-all border',
              roleFilter === f.value
                ? 'bg-primary-container/20 text-primary-container border-primary-container/30'
                : 'bg-surface-container-high border-white/5 text-on-surface-variant/60 hover:text-on-surface-variant hover:border-white/10',
            )}
          >
            {f.label} ({f.value === 'all' ? registry.length : registry.filter(e => e.role === f.value).length})
          </button>
        ))}
      </div>

      {/* Registry Table */}
      <div className="space-y-3">
        {filtered.map(entry => {
          const agent = agents.find(a => a.id === entry.guildAgentId)
          const connColor = connectionStatusColor[entry.connectionStatus] ?? '#94A3B8'
          const connLabel = connectionStatusLabel[entry.connectionStatus] ?? '—'
          const roleColor = routingRoleColor[entry.role] ?? '#94A3B8'
          const isRebinding = rebindTarget === entry.guildAgentId

          return (
            <GlassPanel key={entry.guildAgentId} className="p-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Agent Identity */}
                <div className="flex items-center gap-3 lg:w-[200px] shrink-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-headline font-bold text-sm"
                    style={{ background: `${roleColor}15`, color: roleColor, border: `1px solid ${roleColor}30` }}
                  >
                    {agent?.avatar ?? '??'}
                  </div>
                  <div>
                    <p className="font-headline font-bold text-white text-sm">{entry.displayName}</p>
                    <p className="text-[10px] text-on-surface-variant/60">{agent?.role ?? 'Unknown'}</p>
                  </div>
                </div>

                {/* Mapping Info */}
                <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3 text-[10px]">
                  <div>
                    <p className="font-label uppercase tracking-widest text-on-surface-variant/40 mb-0.5">Agent Record</p>
                    <p className="text-white font-mono text-[9px]">{entry.agentRecordId}</p>
                  </div>
                  <div>
                    <p className="font-label uppercase tracking-widest text-on-surface-variant/40 mb-0.5">Session</p>
                    <p className="text-white font-mono text-[9px]">{entry.currentSessionId ?? '—'}</p>
                  </div>
                  <div>
                    <p className="font-label uppercase tracking-widest text-on-surface-variant/40 mb-0.5">Mode / Policy</p>
                    <p className="text-white">{entry.defaultSessionMode} / {entry.toolPolicy}</p>
                  </div>
                  <div>
                    <p className="font-label uppercase tracking-widest text-on-surface-variant/40 mb-0.5">Last Activity</p>
                    <p className="text-on-surface-variant">{entry.lastActivity}</p>
                  </div>
                </div>

                {/* Status + Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  <StatusChip label={connLabel} color={connColor} pulse={entry.connectionStatus === 'connected'} />
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: `${roleColor}15`, color: roleColor }}>
                    {entry.role}
                  </span>
                  <button
                    onClick={() => { setRebindTarget(isRebinding ? null : entry.guildAgentId); setSelectedAgentRecord('') }}
                    className={cn(
                      'px-3 py-2 rounded-lg text-[10px] font-bold font-label uppercase tracking-wider transition-all border',
                      isRebinding
                        ? 'bg-status-offline/10 border-status-offline/30 text-status-offline'
                        : 'bg-surface-container-high border-white/10 text-on-surface-variant hover:text-white hover:border-white/20',
                    )}
                  >
                    {isRebinding ? 'Cancel' : 'Rebind'}
                  </button>
                </div>
              </div>

              {/* Rebind Panel */}
              {isRebinding && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Icon name="swap_horiz" size="sm" className="text-secondary" />
                      <span className="text-xs text-on-surface-variant">Rebind to:</span>
                    </div>
                    <input
                      value={selectedAgentRecord}
                      onChange={e => setSelectedAgentRecord(e.target.value)}
                      placeholder="Enter agent record ID..."
                      className="flex-1 bg-surface-container-lowest rounded-lg px-3 py-2 text-xs text-on-surface border border-outline-variant/15 focus:border-secondary/60 focus:outline-none transition-colors max-w-sm"
                    />
                    <button
                      onClick={() => handleRebind(entry.guildAgentId)}
                      disabled={!selectedAgentRecord}
                      className="px-4 py-2 rounded-lg bg-primary-container text-white text-[10px] font-bold uppercase tracking-wider hover:brightness-110 transition-all glow-violet disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Confirm Rebind
                    </button>
                  </div>
                </div>
              )}
            </GlassPanel>
          )
        })}
      </div>
    </div>
  )
}
