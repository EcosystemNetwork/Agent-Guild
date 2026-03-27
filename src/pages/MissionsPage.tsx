import { useState } from 'react'
import { missions } from '../data/missions'
import { useAsyncData } from '../hooks/useAsyncData'
import type { MissionStatus } from '../types'
import { cn, missionTypeColor } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import LoadingState from '../components/ui/LoadingState'
import ErrorState from '../components/ui/ErrorState'
import EmptyState from '../components/ui/EmptyState'
import MissionCard from '../components/MissionCard'
import Icon from '../components/ui/Icon'

const statusTabs: { label: string; value: MissionStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Pending', value: 'pending' },
  { label: 'Failed', value: 'failed' },
]

export default function MissionsPage() {
  const [tab, setTab] = useState<MissionStatus | 'all'>('all')
  const { data, isLoading, error } = useAsyncData(() => missions)

  if (isLoading) return <LoadingState message="Loading mission board..." />
  if (error) return <ErrorState message={error} />
  if (!data) return null

  const filtered = tab === 'all' ? data : data.filter((m) => m.status === tab)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mission Board"
        description="Track and manage all guild operations"
        actions={
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-container text-white rounded-lg font-label text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all glow-violet">
            <Icon name="add" size="sm" />
            New Mission
          </button>
        }
      />

      {/* Type legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(missionTypeColor).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] font-label uppercase tracking-wider text-on-surface-variant/60">
              {type}
            </span>
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/5 pb-4">
        {statusTabs.map((st) => {
          const count = st.value === 'all' ? data.length : data.filter((m) => m.status === st.value).length
          return (
            <button
              key={st.value}
              onClick={() => setTab(st.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[10px] font-label font-bold uppercase tracking-wider transition-all border',
                tab === st.value
                  ? 'bg-primary-container/20 text-primary-container border-primary-container/30'
                  : 'bg-surface-container-high border-white/5 text-on-surface-variant/60 hover:text-on-surface-variant hover:border-white/10',
              )}
            >
              {st.label} ({count})
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="assignment"
          title="No missions found"
          description="No missions match the selected status filter."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((mission) => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>
      )}
    </div>
  )
}
