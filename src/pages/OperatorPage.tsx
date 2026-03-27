import { useState } from 'react'
import { missions } from '../data/missions'
import { guildMetrics } from '../data/activity'
import { approvalQueue as initialApprovals, recentIncidents as initialIncidents, healthCards, approvalTypeIcon, severityColor, healthStatusColor } from '../data/operator'
import type { ApprovalItem, Incident } from '../data/operator'
import { cn } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import GlassPanel from '../components/ui/GlassPanel'
import ProgressBar from '../components/ui/ProgressBar'
import Icon from '../components/ui/Icon'
import StatusChip from '../components/ui/StatusChip'

export default function OperatorPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>(initialApprovals)
  const [incidents, setIncidents] = useState<Incident[]>(initialIncidents)
  const [activeTab, setActiveTab] = useState<'approvals' | 'incidents' | 'health'>('approvals')
  const [pauseConfirm, setPauseConfirm] = useState<string | null>(null)
  const [pausedMissions, setPausedMissions] = useState<Set<string>>(new Set())

  const handleApproval = (id: string, action: 'approved' | 'denied') => {
    setApprovals(prev => prev.map(a => a.id === id ? { ...a, status: action } : a))
  }

  const handleIncidentStatus = (id: string, status: Incident['status']) => {
    setIncidents(prev => prev.map(inc => inc.id === id ? { ...inc, status } : inc))
  }

  const handlePauseMission = (missionId: string) => {
    setPausedMissions(prev => {
      const next = new Set(prev)
      if (next.has(missionId)) next.delete(missionId)
      else next.add(missionId)
      return next
    })
    setPauseConfirm(null)
  }

  const pendingCount = approvals.filter(a => a.status === 'pending').length
  const activeIncidents = incidents.filter(i => i.status !== 'resolved').length
  const degradedSystems = healthCards.filter(h => h.status !== 'healthy').length

  const activeMissions = missions.filter(m => m.status === 'active')

  return (
    <div className="space-y-8">
      <PageHeader title="Operator Console" description="Guild runtime management, approvals, and incident response" />

      {/* Summary */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard label="Cluster Status" value={degradedSystems > 0 ? 'DEGRADED' : 'OPERATIONAL'} icon="dns" iconColor={degradedSystems > 0 ? 'text-status-busy' : 'text-status-online'} sparkline={guildMetrics.sparkline} />
        <StatCard label="Pending Approvals" value={String(pendingCount)} icon="pending_actions" iconColor="text-status-busy" trend={{ value: pendingCount > 3 ? 2 : -1, label: 'queue' }} />
        <StatCard label="Active Incidents" value={String(activeIncidents)} icon="warning" iconColor="text-status-offline" trend={{ value: -2, label: 'last hour' }} />
        <StatCard label="System Health" value={`${healthCards.filter(h => h.status === 'healthy').length}/${healthCards.length}`} icon="monitor_heart" iconColor="text-secondary" accentBar={{ percent: (healthCards.filter(h => h.status === 'healthy').length / healthCards.length) * 100, color: '#10B981' }} />
      </section>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-3">
        {([
          { key: 'approvals' as const, label: `Approvals (${pendingCount})`, icon: 'pending_actions' },
          { key: 'incidents' as const, label: `Incidents (${activeIncidents})`, icon: 'warning' },
          { key: 'health' as const, label: 'System Health', icon: 'monitor_heart' },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-label font-bold uppercase tracking-wider transition-all border',
              activeTab === tab.key
                ? 'bg-primary-container/20 text-primary-container border-primary-container/30'
                : 'bg-surface-container-high border-white/5 text-on-surface-variant/60 hover:text-on-surface-variant',
            )}>
            <Icon name={tab.icon} size="sm" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Approvals Tab */}
      {activeTab === 'approvals' && (
        <div className="space-y-3">
          {approvals.map(item => {
            const priColor = item.priority === 'critical' ? '#F43F5E' : item.priority === 'high' ? '#F59E0B' : item.priority === 'medium' ? '#4cd7f6' : '#94A3B8'
            return (
              <GlassPanel key={item.id} hover className={cn('p-5 transition-all duration-300', item.status !== 'pending' && 'opacity-50')}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${priColor}15`, border: `1px solid ${priColor}25` }}>
                    <Icon name={approvalTypeIcon[item.type]} size="sm" style={{ color: priColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[9px] font-label font-bold uppercase tracking-wider border"
                        style={{ color: priColor, borderColor: `${priColor}30`, backgroundColor: `${priColor}10` }}>
                        {item.priority}
                      </span>
                      <span className="text-[9px] font-label text-on-surface-variant/50 uppercase tracking-wider">{item.type.replace('-', ' ')}</span>
                      <span className="text-[9px] text-on-surface-variant/30 ml-auto">{item.timestamp}</span>
                    </div>
                    <h3 className="font-headline font-bold text-white text-sm tracking-tight mb-1">{item.title}</h3>
                    <p className="text-xs text-on-surface-variant/60 mb-1">{item.description}</p>
                    <p className="text-[10px] text-on-surface-variant/40">Requested by <span className="text-white font-headline">{item.requestedBy}</span></p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'pending' ? (
                      <>
                        <button onClick={() => handleApproval(item.id, 'approved')}
                          className="px-3 py-2 rounded-lg bg-status-online/10 text-status-online text-[10px] font-bold uppercase tracking-wider hover:bg-status-online/20 transition-all border border-status-online/20 flex items-center gap-1">
                          <Icon name="check" size="sm" /> Approve
                        </button>
                        <button onClick={() => handleApproval(item.id, 'denied')}
                          className="px-3 py-2 rounded-lg bg-status-offline/10 text-status-offline text-[10px] font-bold uppercase tracking-wider hover:bg-status-offline/20 transition-all border border-status-offline/20 flex items-center gap-1">
                          <Icon name="close" size="sm" /> Deny
                        </button>
                      </>
                    ) : (
                      <StatusChip
                        label={item.status}
                        color={item.status === 'approved' ? '#10B981' : '#F43F5E'}
                      />
                    )}
                  </div>
                </div>
              </GlassPanel>
            )
          })}
        </div>
      )}

      {/* Incidents Tab */}
      {activeTab === 'incidents' && (
        <div className="space-y-3">
          {incidents.map(inc => {
            const color = severityColor[inc.severity]
            const statusStyles: Record<string, string> = {
              active: 'text-status-offline',
              investigating: 'text-status-busy',
              resolved: 'text-status-online',
              escalated: 'text-error',
            }
            return (
              <GlassPanel key={inc.id} hover className={cn('p-5', inc.status === 'resolved' && 'opacity-50')}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}15`, border: `1px solid ${color}25` }}>
                    <Icon name={inc.severity === 'critical' ? 'error' : inc.severity === 'high' ? 'warning' : 'info'} size="sm" style={{ color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded text-[9px] font-label font-bold uppercase tracking-wider border"
                        style={{ color, borderColor: `${color}30`, backgroundColor: `${color}10` }}>
                        {inc.severity}
                      </span>
                      <span className="text-[9px] text-on-surface-variant/30 ml-auto">{inc.detectedAt}</span>
                    </div>
                    <h3 className="font-headline font-bold text-white text-sm tracking-tight mb-1">{inc.title}</h3>
                    <p className="text-xs text-on-surface-variant/60 mb-1">{inc.description}</p>
                    <div className="flex items-center gap-3 text-[10px] text-on-surface-variant/50">
                      <span>Assigned: <span className="text-white font-headline">{inc.assignedAgent}</span></span>
                      <span className={cn('font-bold uppercase', statusStyles[inc.status])}>{inc.status}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    {inc.status !== 'resolved' && (
                      <>
                        {inc.status === 'active' && (
                          <button onClick={() => handleIncidentStatus(inc.id, 'investigating')}
                            className="px-3 py-1.5 rounded-lg bg-status-busy/10 text-status-busy text-[9px] font-bold uppercase tracking-wider hover:bg-status-busy/20 transition-all border border-status-busy/20">
                            Investigate
                          </button>
                        )}
                        <button onClick={() => handleIncidentStatus(inc.id, 'resolved')}
                          className="px-3 py-1.5 rounded-lg bg-status-online/10 text-status-online text-[9px] font-bold uppercase tracking-wider hover:bg-status-online/20 transition-all border border-status-online/20">
                          Resolve
                        </button>
                        {inc.status !== 'escalated' && (
                          <button onClick={() => handleIncidentStatus(inc.id, 'escalated')}
                            className="px-3 py-1.5 rounded-lg bg-status-offline/10 text-status-offline text-[9px] font-bold uppercase tracking-wider hover:bg-status-offline/20 transition-all border border-status-offline/20">
                            Escalate
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </GlassPanel>
            )
          })}
        </div>
      )}

      {/* Health Tab */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Health Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {healthCards.map(card => {
              const color = healthStatusColor[card.status]
              return (
                <GlassPanel key={card.id} hover className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon name={card.icon} size="sm" style={{ color }} />
                      <h4 className="font-headline font-bold text-white text-sm">{card.name}</h4>
                    </div>
                    <StatusChip label={card.status} color={color} pulse={card.status === 'healthy'} />
                  </div>
                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-on-surface-variant/60">{card.metric}</span>
                      <span className="font-headline font-bold text-white">{card.value} / {card.max} {card.unit}</span>
                    </div>
                    <ProgressBar value={(card.value / card.max) * 100} color={color} height="md" />
                  </div>
                  <div className="flex items-center gap-1 text-[10px]">
                    <Icon name={card.trend === 'up' ? 'trending_up' : card.trend === 'down' ? 'trending_down' : 'trending_flat'} size="sm"
                      className={card.trend === 'up' ? 'text-status-online' : card.trend === 'down' ? 'text-status-offline' : 'text-on-surface-variant/40'} />
                    <span className="text-on-surface-variant/50 font-label uppercase tracking-wider">{card.trend}</span>
                  </div>
                </GlassPanel>
              )
            })}
          </div>

          {/* Active Missions — Pause Control */}
          <GlassPanel className="p-6">
            <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-2">
              <Icon name="rocket_launch" size="sm" className="text-secondary" /> Active Mission Control
            </h3>
            <div className="space-y-3">
              {activeMissions.map(mission => {
                const isPaused = pausedMissions.has(mission.id)
                return (
                  <div key={mission.id} className={cn('flex items-center gap-4 p-4 rounded-lg bg-surface-container-low/50 transition-all', isPaused && 'opacity-60')}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-label text-on-surface-variant/50 uppercase tracking-wider">{mission.id}</span>
                        {isPaused && <StatusChip label="PAUSED" color="#F43F5E" />}
                      </div>
                      <h4 className="font-headline font-bold text-white text-sm">{mission.name}</h4>
                      <p className="text-[10px] text-on-surface-variant/50">Agent: {mission.assignedAgent}</p>
                    </div>
                    <div className="w-24">
                      <ProgressBar value={mission.progress} color={isPaused ? '#F43F5E' : '#7c3aed'} showLabel />
                    </div>
                    {pauseConfirm === mission.id ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-status-offline font-label uppercase tracking-wider">Confirm?</span>
                        <button onClick={() => handlePauseMission(mission.id)}
                          className="px-3 py-1.5 rounded-lg bg-status-offline/10 text-status-offline text-[9px] font-bold uppercase tracking-wider hover:bg-status-offline/20 transition-all border border-status-offline/20">
                          {isPaused ? 'Resume' : 'Pause'}
                        </button>
                        <button onClick={() => setPauseConfirm(null)}
                          className="px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface-variant text-[9px] font-bold uppercase tracking-wider hover:text-white transition-all border border-white/5">
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setPauseConfirm(mission.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all border shrink-0',
                          isPaused
                            ? 'bg-status-online/10 text-status-online border-status-online/20 hover:bg-status-online/20'
                            : 'bg-status-offline/10 text-status-offline border-status-offline/20 hover:bg-status-offline/20',
                        )}>
                        {isPaused ? 'Resume' : 'Pause'}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </GlassPanel>

          {/* Critical Overrides */}
          <GlassPanel className="p-6">
            <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-2">
              <Icon name="emergency" size="sm" className="text-status-offline" /> Critical Overrides
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Emergency Lockdown', desc: 'Halt all missions and lock agent deployment', icon: 'lock', color: '#F43F5E' },
                { label: 'Force Trust Recalc', desc: 'Trigger full trust ledger recalculation', icon: 'calculate', color: '#F59E0B' },
                { label: 'Kill All Sessions', desc: 'Terminate all active agent sessions', icon: 'power_settings_new', color: '#F43F5E' },
              ].map(action => (
                <button key={action.label} className="text-left bg-surface-container-low rounded-lg p-4 border border-white/5 hover:border-status-offline/30 transition-all group">
                  <Icon name={action.icon} size="lg" style={{ color: action.color }} className="mb-2" />
                  <h4 className="font-headline font-bold text-white text-sm mb-1">{action.label}</h4>
                  <p className="text-[10px] text-on-surface-variant/60">{action.desc}</p>
                </button>
              ))}
            </div>
          </GlassPanel>
        </div>
      )}
    </div>
  )
}
