import { useState } from 'react'
import { agents } from '../data/agents'
import { useAsyncData } from '../hooks/useAsyncData'
import type { AgentStatus } from '../types'
import { cn } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import LoadingState from '../components/ui/LoadingState'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import AgentCard from '../components/AgentCard'
import Icon from '../components/ui/Icon'

const statusFilters: { label: string; value: AgentStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'In Mission', value: 'in-mission' },
  { label: 'Standby', value: 'standby' },
  { label: 'Offline', value: 'offline' },
]

export default function AgentsPage() {
  const [filter, setFilter] = useState<AgentStatus | 'all'>('all')
  const { data, isLoading, error } = useAsyncData(() => agents)

  if (isLoading) return <LoadingState message="Loading agent roster..." />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  const filtered = filter === 'all' ? data : data.filter((a) => a.status === filter)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agent Roster"
        description={`${data.length} agents registered in the guild`}
        actions={
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-container text-white rounded-lg font-label text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all glow-violet">
            <Icon name="add" size="sm" />
            New Agent
          </button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((sf) => (
          <button
            key={sf.value}
            onClick={() => setFilter(sf.value)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-[10px] font-label font-bold uppercase tracking-wider transition-all border',
              filter === sf.value
                ? 'bg-primary-container/20 text-primary-container border-primary-container/30'
                : 'bg-surface-container-high border-white/5 text-on-surface-variant/60 hover:text-on-surface-variant hover:border-white/10',
            )}
          >
            {sf.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="smart_toy"
          title="No agents found"
          description="No agents match the selected filter."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      )}
    </div>
  )
}
