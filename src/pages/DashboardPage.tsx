import { agents } from '../data/agents'
import { missions } from '../data/missions'
import { activityFeed, guildMetrics } from '../data/activity'
import { useAsyncData } from '../hooks/useAsyncData'
import { formatPercent, formatNumber } from '../lib/utils'
import StatCard from '../components/ui/StatCard'
import LoadingState from '../components/ui/LoadingState'
import ErrorState from '../components/ui/ErrorState'
import PageHeader from '../components/ui/PageHeader'
import GlassPanel from '../components/ui/GlassPanel'
import AgentCard from '../components/AgentCard'
import MissionCard from '../components/MissionCard'
import ActivityFeedItem from '../components/ActivityFeedItem'
import Icon from '../components/ui/Icon'

export default function DashboardPage() {
  const { data, isLoading, error } = useAsyncData(() => ({
    agents: agents.slice(0, 4),
    missions: missions.filter((m) => m.status === 'active').slice(0, 3),
    activity: activityFeed.slice(0, 6),
    metrics: guildMetrics,
  }))

  if (isLoading) return <LoadingState message="Initializing dashboard..." />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  const { metrics } = data

  return (
    <div className="space-y-8">
      <PageHeader
        title="Mission Control"
        description="Guild operational overview and real-time intelligence"
      />

      {/* Hero Metrics */}
      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          label="Guild Status"
          value={metrics.status}
          icon="sensors"
          iconColor="text-status-online"
          sparkline={metrics.sparkline}
          accentBar={{ percent: metrics.uptime, color: '#10B981' }}
        />
        <StatCard
          label="Active Missions"
          value={`${metrics.activeMissions} / ${metrics.totalMissionCapacity}`}
          icon="assignment"
          iconColor="text-secondary"
          trend={{ value: 8, label: 'this cycle' }}
          accentBar={{ percent: (metrics.activeMissions / metrics.totalMissionCapacity) * 100, color: '#4cd7f6' }}
        />
        <StatCard
          label="Trust Score"
          value={formatPercent(metrics.trustScore)}
          icon="verified_user"
          iconColor="text-primary"
          trend={{ value: metrics.trustTrend, label: 'this cycle' }}
          accentBar={{ percent: metrics.trustScore, color: '#7c3aed' }}
        />
        <StatCard
          label="Verified Logs"
          value={formatNumber(metrics.verifiedLogs)}
          icon="fact_check"
          iconColor="text-on-surface-variant"
          trend={{ value: 2.1, label: 'from last sync' }}
        />
      </section>

      {/* Main Grid: Agents + Activity */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Active Agents */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-bold text-sm uppercase tracking-wider text-on-surface-variant">
              Top Agents
            </h2>
            <span className="text-[10px] font-label text-secondary uppercase tracking-wider">
              {agents.filter((a) => a.status === 'active').length} active
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        </div>

        {/* Activity Feed */}
        <GlassPanel className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline font-bold text-sm uppercase tracking-wider text-on-surface-variant">
              Activity Feed
            </h2>
            <Icon name="rss_feed" size="sm" className="text-on-surface-variant/40" />
          </div>
          <div className="divide-y divide-white/[0.03]">
            {data.activity.map((evt) => (
              <ActivityFeedItem key={evt.id} event={evt} />
            ))}
          </div>
        </GlassPanel>
      </div>

      {/* Active Missions */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline font-bold text-sm uppercase tracking-wider text-on-surface-variant">
            Active Missions
          </h2>
          <span className="text-[10px] font-label text-secondary uppercase tracking-wider">
            {missions.filter((m) => m.status === 'active').length} in progress
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.missions.map((mission) => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>
      </section>
    </div>
  )
}
