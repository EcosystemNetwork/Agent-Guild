import { useState } from 'react'
import { agents } from '../data/agents'
import { trustMetrics } from '../data/trust'
import { trustEvents, badges, trustHistory } from '../data/trustAnalytics'
import { guildMetrics } from '../data/activity'
import { formatPercent, formatNumber, cn } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import GlassPanel from '../components/ui/GlassPanel'
import TrustBadge from '../components/TrustBadge'
import ProgressBar from '../components/ui/ProgressBar'
import Icon from '../components/ui/Icon'

const riskColor: Record<string, string> = { low: '#10B981', medium: '#F59E0B', high: '#F43F5E' }

export default function TrustLedgerPage() {
  const [selectedTab, setSelectedTab] = useState<'rankings' | 'events' | 'badges'>('rankings')
  const [compareA, setCompareA] = useState<string>('')
  const [compareB, setCompareB] = useState<string>('')
  const [showCompare, setShowCompare] = useState(false)

  const avgTrust = trustMetrics.reduce((s, m) => s + m.trustScore, 0) / trustMetrics.length
  const avgSuccess = trustMetrics.reduce((s, m) => s + m.successRate, 0) / trustMetrics.length

  const agentA = agents.find(a => a.id === compareA)
  const agentB = agents.find(a => a.id === compareB)
  const metricA = trustMetrics.find(m => m.agentId === compareA)
  const metricB = trustMetrics.find(m => m.agentId === compareB)

  return (
    <div className="space-y-8">
      <PageHeader
        title="Trust Ledger"
        description="Agent trust scores, audit history, and risk analysis"
        actions={
          <button
            onClick={() => setShowCompare(!showCompare)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg font-label text-xs font-bold uppercase tracking-wider transition-all',
              showCompare
                ? 'bg-primary-container text-white glow-violet'
                : 'bg-surface-container-high border border-white/10 text-on-surface-variant hover:text-white',
            )}
          >
            <Icon name="compare" size="sm" /> Compare Agents
          </button>
        }
      />

      {/* Summary */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard label="Average Trust" value={formatPercent(avgTrust)} icon="verified_user" iconColor="text-primary" trend={{ value: guildMetrics.trustTrend, label: 'this cycle' }} accentBar={{ percent: avgTrust, color: '#7c3aed' }} />
        <StatCard label="Success Rate" value={formatPercent(avgSuccess)} icon="target" iconColor="text-secondary" trend={{ value: 1.4, label: 'sustained' }} accentBar={{ percent: avgSuccess, color: '#03b5d3' }} />
        <StatCard label="Trust Events (24h)" value="1,247" icon="event" iconColor="text-status-online" trend={{ value: 8, label: 'this hour' }} />
        <StatCard label="Verified Logs" value={formatNumber(guildMetrics.verifiedLogs)} icon="fact_check" iconColor="text-on-surface-variant" />
      </section>

      {/* Comparison Module */}
      {showCompare && (
        <GlassPanel className="p-6">
          <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-on-surface-variant mb-4 flex items-center gap-2">
            <Icon name="compare" size="sm" className="text-primary-container" /> Agent Comparison
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-6 items-start">
            <div>
              <select value={compareA} onChange={e => setCompareA(e.target.value)}
                className="w-full bg-surface-container-lowest rounded-lg px-3 py-2.5 text-xs text-on-surface border border-white/5 focus:outline-none focus:border-primary-container/30 mb-4 cursor-pointer">
                <option value="">Select Agent A</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name} — {a.role}</option>)}
              </select>
              {agentA && metricA && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-3">
                    <TrustBadge score={metricA.trustScore} size="md" />
                    <div>
                      <p className="font-headline font-bold text-white">{agentA.name}</p>
                      <p className="text-[10px] text-on-surface-variant/60">{agentA.role}</p>
                    </div>
                  </div>
                  <CompareRow label="Trust Score" value={formatPercent(metricA.trustScore)} bar={metricA.trustScore} color={riskColor[metricA.riskLevel]} />
                  <CompareRow label="Success Rate" value={formatPercent(metricA.successRate)} bar={metricA.successRate} color="#03b5d3" />
                  <CompareRow label="Missions" value={String(agentA.missionsCompleted)} />
                  <CompareRow label="Verified Logs" value={formatNumber(metricA.verifiedLogs)} />
                  <CompareRow label="Risk Level" value={metricA.riskLevel.toUpperCase()} valueColor={riskColor[metricA.riskLevel]} />
                </div>
              )}
            </div>

            <div className="hidden md:flex flex-col items-center justify-center py-8">
              <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center">
                <span className="font-headline font-bold text-on-surface-variant/50 text-sm">VS</span>
              </div>
            </div>

            <div>
              <select value={compareB} onChange={e => setCompareB(e.target.value)}
                className="w-full bg-surface-container-lowest rounded-lg px-3 py-2.5 text-xs text-on-surface border border-white/5 focus:outline-none focus:border-primary-container/30 mb-4 cursor-pointer">
                <option value="">Select Agent B</option>
                {agents.map(a => <option key={a.id} value={a.id}>{a.name} — {a.role}</option>)}
              </select>
              {agentB && metricB && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 mb-3">
                    <TrustBadge score={metricB.trustScore} size="md" />
                    <div>
                      <p className="font-headline font-bold text-white">{agentB.name}</p>
                      <p className="text-[10px] text-on-surface-variant/60">{agentB.role}</p>
                    </div>
                  </div>
                  <CompareRow label="Trust Score" value={formatPercent(metricB.trustScore)} bar={metricB.trustScore} color={riskColor[metricB.riskLevel]} />
                  <CompareRow label="Success Rate" value={formatPercent(metricB.successRate)} bar={metricB.successRate} color="#03b5d3" />
                  <CompareRow label="Missions" value={String(agentB.missionsCompleted)} />
                  <CompareRow label="Verified Logs" value={formatNumber(metricB.verifiedLogs)} />
                  <CompareRow label="Risk Level" value={metricB.riskLevel.toUpperCase()} valueColor={riskColor[metricB.riskLevel]} />
                </div>
              )}
            </div>
          </div>
        </GlassPanel>
      )}

      {/* Trust History Chart */}
      <GlassPanel className="p-6">
        <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-on-surface-variant mb-4">Guild Trust Trend</h3>
        <div className="flex items-end gap-2 h-40">
          {trustHistory.map((point, i) => {
            const min = Math.min(...trustHistory.map(p => p.score)) - 1
            const max = Math.max(...trustHistory.map(p => p.score))
            const height = ((point.score - min) / (max - min)) * 100
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[9px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">{point.score}</span>
                <div className="w-full rounded-t-lg bg-gradient-to-t from-primary-container to-secondary transition-all group-hover:brightness-125 cursor-pointer" style={{ height: `${height}%` }} />
                <span className="text-[9px] text-on-surface-variant/50">{point.date}</span>
              </div>
            )
          })}
        </div>
      </GlassPanel>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/5 pb-3">
        {([
          { key: 'rankings' as const, label: 'Rankings', icon: 'leaderboard' },
          { key: 'events' as const, label: 'Score Changes', icon: 'timeline' },
          { key: 'badges' as const, label: 'Badges', icon: 'military_tech' },
        ]).map(tab => (
          <button key={tab.key} onClick={() => setSelectedTab(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-[10px] font-label font-bold uppercase tracking-wider transition-all border',
              selectedTab === tab.key
                ? 'bg-primary-container/20 text-primary-container border-primary-container/30'
                : 'bg-surface-container-high border-white/5 text-on-surface-variant/60 hover:text-on-surface-variant',
            )}>
            <Icon name={tab.icon} size="sm" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Rankings Tab */}
      {selectedTab === 'rankings' && (
        <GlassPanel className="p-6 overflow-x-auto custom-scrollbar">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['#', 'Agent', 'Trust Score', 'Trend', 'Success', 'Risk', 'Last Audit'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trustMetrics.map((m, i) => (
                <tr key={m.agentId} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                  <td className="py-3 px-4"><span className="font-headline font-bold text-on-surface-variant/40 text-sm">{i + 1}</span></td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <TrustBadge score={m.trustScore} size="sm" />
                      <div>
                        <p className="font-headline font-bold text-white text-sm">{m.agentName}</p>
                        <p className="text-[10px] text-on-surface-variant/50">{agents.find(a => a.id === m.agentId)?.role}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1">
                      <span className="font-headline font-bold text-white text-sm">{formatPercent(m.trustScore)}</span>
                      <ProgressBar value={m.trustScore} color={riskColor[m.riskLevel]} />
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1">
                      <Icon name={m.trend >= 0 ? 'trending_up' : 'trending_down'} size="sm" className={m.trend >= 0 ? 'text-status-online' : 'text-status-offline'} />
                      <span className="text-xs font-label font-bold" style={{ color: m.trend >= 0 ? '#10B981' : '#F43F5E' }}>
                        {m.trend >= 0 ? '+' : ''}{m.trend}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4"><span className="text-sm font-headline text-white">{formatPercent(m.successRate)}</span></td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-[9px] font-label font-bold uppercase tracking-wider border"
                      style={{ color: riskColor[m.riskLevel], borderColor: `${riskColor[m.riskLevel]}30`, backgroundColor: `${riskColor[m.riskLevel]}10` }}>
                      {m.riskLevel}
                    </span>
                  </td>
                  <td className="py-3 px-4"><span className="text-xs text-on-surface-variant/60">{m.lastAudit}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassPanel>
      )}

      {/* Events Tab */}
      {selectedTab === 'events' && (
        <div className="space-y-3">
          {trustEvents.map(event => (
            <GlassPanel key={event.id} hover className="p-5 flex items-center gap-4">
              <div className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-headline font-bold text-sm',
                event.delta >= 0 ? 'bg-status-online/15 text-status-online' : 'bg-status-offline/15 text-status-offline',
              )}>
                {event.delta >= 0 ? '+' : ''}{event.delta.toFixed(1)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-headline font-bold text-white text-sm">{event.agentName}</span>
                  {event.missionId && (
                    <span className="text-[9px] font-label text-on-surface-variant/50 uppercase tracking-wider">{event.missionId}</span>
                  )}
                </div>
                <p className="text-xs text-on-surface-variant/70">{event.reason}</p>
              </div>
              <span className="text-[10px] text-on-surface-variant/40 font-label uppercase tracking-wider whitespace-nowrap shrink-0">{event.timestamp}</span>
            </GlassPanel>
          ))}
        </div>
      )}

      {/* Badges Tab */}
      {selectedTab === 'badges' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {badges.map(badge => (
            <GlassPanel key={badge.id} hover className="p-5">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${badge.color}15`, border: `1px solid ${badge.color}30` }}>
                  <Icon name={badge.icon} size="lg" style={{ color: badge.color }} />
                </div>
                <div>
                  <h4 className="font-headline font-bold text-white text-sm">{badge.name}</h4>
                  <p className="text-[10px] text-on-surface-variant/60 mt-0.5">{badge.description}</p>
                </div>
              </div>
              <div>
                <p className="text-[9px] font-label uppercase tracking-widest text-on-surface-variant/50 mb-2">Earned by ({badge.earnedBy.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {badge.earnedBy.map(agentId => {
                    const agent = agents.find(a => a.id === agentId)
                    return (
                      <span key={agentId} className="px-2 py-0.5 rounded-full bg-surface-container-high text-[9px] font-label uppercase tracking-wider text-on-surface-variant border border-white/5">
                        {agent?.name || agentId}
                      </span>
                    )
                  })}
                </div>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </div>
  )
}

function CompareRow({ label, value, bar, color, valueColor }: { label: string; value: string; bar?: number; color?: string; valueColor?: string }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60">{label}</span>
        <span className="text-xs font-headline font-bold" style={{ color: valueColor || 'white' }}>{value}</span>
      </div>
      {bar !== undefined && color && <ProgressBar value={bar} color={color} />}
    </div>
  )
}
