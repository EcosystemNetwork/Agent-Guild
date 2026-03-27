import { trustMetrics } from '../data/trust'
import { guildMetrics } from '../data/activity'
import { useAsyncData } from '../hooks/useAsyncData'
import { formatPercent, formatNumber } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import LoadingState from '../components/ui/LoadingState'
import ErrorState from '../components/ui/ErrorState'
import GlassPanel from '../components/ui/GlassPanel'
import TrustBadge from '../components/TrustBadge'
import DataTable from '../components/DataTable'
import ProgressBar from '../components/ui/ProgressBar'
import Icon from '../components/ui/Icon'
import type { TrustMetric } from '../types'

const riskColor: Record<string, string> = {
  low: '#10B981',
  medium: '#F59E0B',
  high: '#F43F5E',
}

export default function TrustLedgerPage() {
  const { data, isLoading, error } = useAsyncData(() => ({
    metrics: trustMetrics,
    guild: guildMetrics,
  }))

  if (isLoading) return <LoadingState message="Synchronizing trust ledger..." />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  const avgTrust = data.metrics.reduce((s, m) => s + m.trustScore, 0) / data.metrics.length
  const avgSuccess = data.metrics.reduce((s, m) => s + m.successRate, 0) / data.metrics.length

  return (
    <div className="space-y-8">
      <PageHeader
        title="Trust Ledger"
        description="Agent trust scores, audit history, and risk analysis"
      />

      {/* Summary Cards */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          label="Average Trust"
          value={formatPercent(avgTrust)}
          icon="verified_user"
          iconColor="text-primary"
          trend={{ value: data.guild.trustTrend, label: 'this cycle' }}
          accentBar={{ percent: avgTrust, color: '#7c3aed' }}
        />
        <StatCard
          label="Success Rate"
          value={formatPercent(avgSuccess)}
          icon="target"
          iconColor="text-secondary"
          trend={{ value: 1.4, label: 'sustained' }}
          accentBar={{ percent: avgSuccess, color: '#03b5d3' }}
        />
        <StatCard
          label="Active Agents"
          value={`${data.metrics.length}`}
          icon="hub"
          iconColor="text-on-surface-variant"
        />
        <StatCard
          label="Verified Logs"
          value={formatNumber(data.guild.verifiedLogs)}
          icon="fact_check"
          iconColor="text-status-online"
        />
      </section>

      {/* Trust Leaderboard */}
      <GlassPanel className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-headline font-bold text-sm uppercase tracking-wider text-on-surface-variant">
            Agent Trust Rankings
          </h2>
          <span className="text-[10px] font-label text-on-surface-variant/50 uppercase tracking-wider">
            Last synchronized: {data.guild.verifiedLogs.toLocaleString()} entries
          </span>
        </div>

        <DataTable
          data={data.metrics}
          keyFn={(m) => m.agentId}
          columns={[
            {
              key: 'rank',
              header: '#',
              className: 'w-12',
              render: (_item: TrustMetric, i: number) => (
                <span className="font-headline font-bold text-on-surface-variant/40 text-sm">
                  {i + 1}
                </span>
              ),
            },
            {
              key: 'agent',
              header: 'Agent',
              render: (m: TrustMetric) => (
                <div className="flex items-center gap-3">
                  <TrustBadge score={m.trustScore} size="sm" />
                  <div>
                    <p className="font-headline font-bold text-white text-sm">{m.agentName}</p>
                    <p className="text-[10px] text-on-surface-variant/60 font-label uppercase tracking-wider">
                      Last audit: {m.lastAudit}
                    </p>
                  </div>
                </div>
              ),
            },
            {
              key: 'trust',
              header: 'Trust Score',
              render: (m: TrustMetric) => (
                <div className="space-y-1">
                  <span className="font-headline font-bold text-white text-sm">
                    {formatPercent(m.trustScore)}
                  </span>
                  <ProgressBar value={m.trustScore} color={riskColor[m.riskLevel]} />
                </div>
              ),
            },
            {
              key: 'trend',
              header: 'Trend',
              render: (m: TrustMetric) => (
                <div className="flex items-center gap-1">
                  <Icon
                    name={m.trend >= 0 ? 'trending_up' : 'trending_down'}
                    size="sm"
                    className={m.trend >= 0 ? 'text-status-online' : 'text-status-offline'}
                  />
                  <span
                    className="text-xs font-label font-bold"
                    style={{ color: m.trend >= 0 ? '#10B981' : '#F43F5E' }}
                  >
                    {m.trend >= 0 ? '+' : ''}{m.trend}%
                  </span>
                </div>
              ),
            },
            {
              key: 'success',
              header: 'Success Rate',
              render: (m: TrustMetric) => (
                <span className="text-sm font-headline text-white">{formatPercent(m.successRate)}</span>
              ),
            },
            {
              key: 'risk',
              header: 'Risk',
              render: (m: TrustMetric) => (
                <span
                  className="px-2 py-0.5 rounded text-[9px] font-label font-bold uppercase tracking-wider border"
                  style={{
                    color: riskColor[m.riskLevel],
                    borderColor: `${riskColor[m.riskLevel]}30`,
                    backgroundColor: `${riskColor[m.riskLevel]}10`,
                  }}
                >
                  {m.riskLevel}
                </span>
              ),
            },
          ]}
        />
      </GlassPanel>
    </div>
  )
}
