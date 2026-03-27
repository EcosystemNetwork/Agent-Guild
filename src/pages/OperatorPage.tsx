import { useState } from 'react'
import { operatorAlerts } from '../data/operator'
import { guildMetrics } from '../data/activity'
import { useAsyncData } from '../hooks/useAsyncData'
import type { AlertSeverity, AlertStatus, OperatorAlert } from '../types'
import { cn, severityColor, severityIcon } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import StatCard from '../components/ui/StatCard'
import GlassPanel from '../components/ui/GlassPanel'
import LoadingState from '../components/ui/LoadingState'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import Icon from '../components/ui/Icon'

export default function OperatorPage() {
  const [severityFilter, setSeverityFilter] = useState<AlertSeverity | 'all'>('all')
  const { data, isLoading, error } = useAsyncData(() => ({
    alerts: operatorAlerts,
    metrics: guildMetrics,
  }))

  if (isLoading) return <LoadingState message="Loading operator panel..." />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  const filtered =
    severityFilter === 'all'
      ? data.alerts
      : data.alerts.filter((a) => a.severity === severityFilter)

  const criticalCount = data.alerts.filter((a) => a.severity === 'critical' && a.status === 'active').length

  return (
    <div className="space-y-8">
      <PageHeader
        title="Operator Control"
        description="System health, alerts, and cluster management"
      />

      {/* Cluster Health */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          label="Cluster Status"
          value={criticalCount > 0 ? 'ALERT' : 'OPERATIONAL'}
          icon="dns"
          iconColor={criticalCount > 0 ? 'text-status-offline' : 'text-status-online'}
          sparkline={data.metrics.sparkline}
        />
        <StatCard
          label="CPU Load"
          value="42.8%"
          icon="speed"
          iconColor="text-secondary"
          trend={{ value: -3.2, label: 'from peak' }}
          accentBar={{ percent: 42.8, color: '#03b5d3' }}
        />
        <StatCard
          label="Memory Usage"
          value="68.2 GB"
          icon="memory"
          iconColor="text-on-surface-variant"
          accentBar={{ percent: 68.2, color: '#F59E0B' }}
        />
        <StatCard
          label="Active Alerts"
          value={`${data.alerts.filter((a) => a.status !== 'resolved').length}`}
          icon="notifications_active"
          iconColor="text-status-offline"
          trend={{ value: -2, label: 'from last hour' }}
        />
      </section>

      {/* Alert Feed */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="font-headline font-bold text-sm uppercase tracking-wider text-on-surface-variant">
            Alert Stream
          </h2>
          <div className="flex gap-2">
            {(['all', 'critical', 'warning', 'info'] as const).map((sev) => (
              <button
                key={sev}
                onClick={() => setSeverityFilter(sev)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[10px] font-label font-bold uppercase tracking-wider transition-all border',
                  severityFilter === sev
                    ? 'bg-primary-container/20 text-primary-container border-primary-container/30'
                    : 'bg-surface-container-high border-white/5 text-on-surface-variant/60 hover:text-on-surface-variant',
                )}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon="check_circle"
            title="All clear"
            description="No alerts match the selected filter."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AlertRow({ alert }: { alert: OperatorAlert }) {
  const color = severityColor[alert.severity] ?? '#ccc3d8'
  const icon = severityIcon[alert.severity] ?? 'info'

  const statusStyles: Record<AlertStatus, string> = {
    active: 'bg-status-offline/10 text-status-offline border-status-offline/20',
    acknowledged: 'bg-status-busy/10 text-status-busy border-status-busy/20',
    resolved: 'bg-status-online/10 text-status-online border-status-online/20',
  }

  return (
    <GlassPanel hover className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div
        className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
        style={{
          backgroundColor: `${color}15`,
          border: `1px solid ${color}25`,
        }}
      >
        <Icon name={icon} size="sm" style={{ color }} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-label font-bold uppercase tracking-wider" style={{ color }}>
            {alert.severity}
          </span>
          <span className="text-on-surface-variant/30">•</span>
          <span className="text-[10px] font-label text-on-surface-variant/50 uppercase tracking-wider">
            {alert.id}
          </span>
        </div>
        <h3 className="font-headline font-bold text-white text-sm tracking-tight">{alert.title}</h3>
        <p className="text-xs text-on-surface-variant/70 mt-1 line-clamp-1">{alert.description}</p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[10px] font-label text-on-surface-variant/50 uppercase tracking-wider whitespace-nowrap">
          {alert.source}
        </span>
        <span
          className={cn(
            'px-2 py-0.5 rounded text-[9px] font-label font-bold uppercase tracking-wider border',
            statusStyles[alert.status],
          )}
        >
          {alert.status}
        </span>
        <span className="text-[10px] font-label text-on-surface-variant/40 whitespace-nowrap">
          {alert.timestamp}
        </span>
      </div>
    </GlassPanel>
  )
}
