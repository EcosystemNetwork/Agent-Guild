import { useState, useEffect } from 'react'
import { missions } from '../data/missions'
import type { Mission, MissionStatus, MissionType } from '../types'
import { cn, missionTypeColor, priorityColor } from '../lib/utils'
import PageHeader from '../components/ui/PageHeader'
import ProgressBar from '../components/ui/ProgressBar'
import Icon from '../components/ui/Icon'

type ViewMode = 'list' | 'board'
const statusColumns: { key: MissionStatus; label: string; color: string; icon: string }[] = [
  { key: 'active', label: 'Active', color: '#10B981', icon: 'play_circle' },
  { key: 'pending', label: 'Pending', color: '#94A3B8', icon: 'schedule' },
  { key: 'completed', label: 'Completed', color: '#4cd7f6', icon: 'check_circle' },
  { key: 'failed', label: 'Failed', color: '#F43F5E', icon: 'cancel' },
]

export default function MissionsPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MissionStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<MissionType | 'all'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selected, setSelected] = useState<Mission | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const openDrawer = (mission: Mission) => {
    setSelected(mission)
    requestAnimationFrame(() => setDrawerOpen(true))
  }
  const closeDrawer = () => {
    setDrawerOpen(false)
    setTimeout(() => setSelected(null), 300)
  }

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape' && selected) closeDrawer() }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  })

  const filtered = missions.filter(m => {
    if (statusFilter !== 'all' && m.status !== statusFilter) return false
    if (typeFilter !== 'all' && m.type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q) || m.id.toLowerCase().includes(q) || m.assignedAgent.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mission Board"
        description={`${filtered.length} of ${missions.length} missions tracked`}
        actions={
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-container text-white rounded-lg font-label text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all glow-violet">
            <Icon name="add" size="sm" /> New Mission
          </button>
        }
      />

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Icon name="search" size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search missions, agents, IDs..."
            className="w-full bg-surface-container-lowest rounded-lg pl-9 pr-8 py-2.5 text-xs text-on-surface placeholder:text-on-surface-variant/40 border border-outline-variant/15 focus:border-secondary/60 focus:outline-none transition-colors"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-white">
              <Icon name="close" size="sm" />
            </button>
          )}
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as MissionStatus | 'all')}
          className="bg-surface-container-lowest rounded-lg px-3 py-2.5 text-xs text-on-surface border border-outline-variant/15 focus:border-secondary/60 focus:outline-none transition-colors cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="failed">Failed</option>
        </select>

        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value as MissionType | 'all')}
          className="bg-surface-container-lowest rounded-lg px-3 py-2.5 text-xs text-on-surface border border-outline-variant/15 focus:border-secondary/60 focus:outline-none transition-colors cursor-pointer"
        >
          <option value="all">All Types</option>
          <option value="recon">Recon</option>
          <option value="analysis">Analysis</option>
          <option value="critical">Critical</option>
          <option value="defense">Defense</option>
          <option value="intel">Intel</option>
        </select>

        <div className="flex rounded-lg border border-outline-variant/15 overflow-hidden ml-auto">
          <button onClick={() => setViewMode('list')} className={cn('p-2 transition-all', viewMode === 'list' ? 'bg-primary-container/20 text-primary-container' : 'text-on-surface-variant hover:text-white')}>
            <Icon name="view_list" size="sm" />
          </button>
          <button onClick={() => setViewMode('board')} className={cn('p-2 transition-all', viewMode === 'board' ? 'bg-primary-container/20 text-primary-container' : 'text-on-surface-variant hover:text-white')}>
            <Icon name="view_kanban" size="sm" />
          </button>
        </div>
      </div>

      {/* Board View */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {statusColumns.map(col => {
            const colItems = filtered.filter(m => m.status === col.key)
            return (
              <div key={col.key} className="flex flex-col">
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                  <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant">{col.label}</span>
                  <span className="text-[10px] text-on-surface-variant/40 ml-auto">{colItems.length}</span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {colItems.map(mission => (
                    <button
                      key={mission.id}
                      onClick={() => openDrawer(mission)}
                      className="w-full text-left glass-panel-subtle rounded-lg p-4 hover:bg-surface-bright/40 transition-all duration-200 group/card"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase" style={{ background: `${priorityColor[mission.priority]}15`, color: priorityColor[mission.priority] }}>
                          {mission.priority}
                        </span>
                        <span className="text-[9px] text-on-surface-variant/50">{mission.id}</span>
                      </div>
                      <h4 className="text-xs font-headline font-bold text-white mb-1.5 group-hover/card:text-primary transition-colors">{mission.name}</h4>
                      <p className="text-[10px] text-on-surface-variant/60 line-clamp-2 mb-3">{mission.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] text-on-surface-variant flex items-center gap-1">
                          <Icon name="smart_toy" size="sm" className="text-on-surface-variant/40" />
                          {mission.assignedAgent}
                        </span>
                        {mission.progress > 0 && (
                          <div className="flex items-center gap-1.5 w-16">
                            <ProgressBar value={mission.progress} color={col.color} />
                            <span className="text-[9px] font-bold text-white">{mission.progress}%</span>
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                  {colItems.length === 0 && (
                    <div className="text-center py-8 text-[10px] text-on-surface-variant/30 italic">Empty</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-3">
          {filtered.map(mission => {
            const typeColor = missionTypeColor[mission.type] ?? '#ccc3d8'
            const priColor = priorityColor[mission.priority] ?? '#94A3B8'
            return (
              <button
                key={mission.id}
                onClick={() => openDrawer(mission)}
                className={cn(
                  'w-full text-left glass-panel rounded-xl p-5 hover:bg-surface-bright/20 transition-all duration-200',
                  selected?.id === mission.id && 'border-primary-container/40',
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60">{mission.id}</span>
                    <h3 className="font-headline font-bold text-white tracking-tight">{mission.name}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: `${typeColor}15`, color: typeColor }}>{mission.type}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: `${priColor}15`, color: priColor }}>{mission.priority}</span>
                    <span className={cn('w-2 h-2 rounded-full',
                      mission.status === 'active' ? 'bg-status-online animate-pulse' :
                      mission.status === 'completed' ? 'bg-secondary' :
                      mission.status === 'failed' ? 'bg-status-offline' : 'bg-white/20'
                    )} />
                  </div>
                </div>
                <p className="text-xs text-on-surface-variant/70 mb-3">{mission.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-[10px] text-on-surface-variant/60">
                    <span className="flex items-center gap-1"><Icon name="smart_toy" size="sm" className="text-on-surface-variant/40" /> {mission.assignedAgent}</span>
                    <span className="flex items-center gap-1"><Icon name="schedule" size="sm" className="text-on-surface-variant/40" /> {mission.startedAt}</span>
                  </div>
                  <div className="w-32">
                    <ProgressBar value={mission.progress} color={typeColor} showLabel />
                  </div>
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <Icon name="search_off" size="lg" className="text-on-surface-variant/20 mb-3" />
              <p className="text-sm text-on-surface-variant/50">No missions match your filters</p>
              <button onClick={() => { setSearch(''); setStatusFilter('all'); setTypeFilter('all') }} className="mt-3 text-xs text-primary hover:text-white transition-colors">
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Detail Drawer */}
      {selected && (
        <>
          <div className={cn('fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300', drawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')} onClick={closeDrawer} />
          <div className={cn('fixed right-0 top-0 h-full w-[420px] max-w-[90vw] z-50 bg-surface-container-low/95 backdrop-blur-xl border-l border-white/10 shadow-2xl transition-transform duration-300 ease-out', drawerOpen ? 'translate-x-0' : 'translate-x-full')}>
            <div className="h-full overflow-y-auto custom-scrollbar p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1">{selected.id}</p>
                  <h3 className="text-xl font-bold font-headline text-white">{selected.name}</h3>
                </div>
                <button onClick={closeDrawer} className="p-2 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/5 transition-all">
                  <Icon name="close" />
                </button>
              </div>

              {/* Status Banner */}
              <div className={cn('rounded-lg p-3 mb-6 flex items-center gap-3',
                selected.status === 'active' ? 'bg-status-online/10 border border-status-online/20' :
                selected.status === 'completed' ? 'bg-secondary/10 border border-secondary/20' :
                selected.status === 'failed' ? 'bg-status-offline/10 border border-status-offline/20' :
                'bg-white/5 border border-white/10'
              )}>
                <span className={cn('w-3 h-3 rounded-full',
                  selected.status === 'active' ? 'bg-status-online animate-pulse' :
                  selected.status === 'completed' ? 'bg-secondary' :
                  selected.status === 'failed' ? 'bg-status-offline' : 'bg-white/30'
                )} />
                <span className="text-xs font-bold font-headline uppercase tracking-wider">{selected.status}</span>
              </div>

              {/* Details */}
              <div className="space-y-3 mb-6">
                {[
                  { label: 'Type', value: selected.type, color: missionTypeColor[selected.type] },
                  { label: 'Priority', value: selected.priority, color: priorityColor[selected.priority] },
                  { label: 'Agent', value: selected.assignedAgent },
                  { label: 'Started', value: selected.startedAt },
                ].map(row => (
                  <div key={row.label} className="flex justify-between items-center">
                    <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60">{row.label}</span>
                    {row.color ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: `${row.color}15`, color: row.color }}>{row.value}</span>
                    ) : (
                      <span className="text-xs font-bold text-white">{row.value}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60">Progress</span>
                  <span className="text-sm font-bold font-headline text-white">{selected.progress}%</span>
                </div>
                <ProgressBar value={selected.progress} height="md" color={missionTypeColor[selected.type]} />
              </div>

              <p className="text-sm text-on-surface/80 leading-relaxed mb-6">{selected.description}</p>

              {/* Timeline */}
              <div className="mb-6">
                <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-3">Activity Timeline</p>
                <div className="space-y-0">
                  {[
                    { time: '2 min ago', event: `Progress updated to ${selected.progress}%`, icon: 'update', color: '#4cd7f6' },
                    { time: '15 min ago', event: `${selected.assignedAgent} reported nominal status`, icon: 'check_circle', color: '#10B981' },
                    { time: selected.startedAt, event: 'Mission initialized by Commander Kai', icon: 'rocket_launch', color: '#863bff' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 pb-4">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: `${item.color}15` }}>
                          <Icon name={item.icon} size="sm" style={{ color: item.color }} />
                        </div>
                        {i < 2 && <div className="w-px flex-1 bg-white/10 mt-1" />}
                      </div>
                      <div>
                        <p className="text-xs text-on-surface">{item.event}</p>
                        <p className="text-[10px] text-on-surface-variant/40 mt-0.5">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button className="flex-1 py-2.5 rounded-lg bg-primary-container text-white text-[10px] font-bold uppercase tracking-wider hover:brightness-110 transition-all glow-violet flex items-center justify-center gap-1.5">
                  <Icon name="forum" size="sm" /> Open Comms
                </button>
                <button className="px-4 py-2.5 rounded-lg bg-surface-container-high border border-white/10 text-on-surface-variant hover:text-white text-[10px] font-bold uppercase tracking-wider transition-all">
                  Logs
                </button>
                {selected.status === 'active' && (
                  <button className="px-4 py-2.5 rounded-lg bg-status-offline/10 border border-status-offline/20 text-status-offline hover:bg-status-offline/20 text-[10px] font-bold uppercase tracking-wider transition-all">
                    Pause
                  </button>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
