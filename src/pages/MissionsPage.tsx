import { useState, useEffect } from 'react'
import { missions } from '../data/missions'
import { agents } from '../data/agents'
import { routingRules } from '../data/registry'
import { availableTools } from '../data/tools'
import type { Mission, MissionStatus, MissionType, ExecutionMissionType, Priority, MissionExecution } from '../types'
import { cn, missionTypeColor, priorityColor, connectionStatusColor, routingRoleColor, executionStatusColor } from '../lib/utils'
import { useRegistry } from '../contexts/RegistryContext'
import { useMissions } from '../contexts/MissionContext'
import PageHeader from '../components/ui/PageHeader'
import ProgressBar from '../components/ui/ProgressBar'
import Icon from '../components/ui/Icon'
import StatusChip from '../components/ui/StatusChip'

type ViewMode = 'list' | 'board'

const statusColumns: { key: MissionStatus; label: string; color: string; icon: string }[] = [
  { key: 'active', label: 'Active', color: '#10B981', icon: 'play_circle' },
  { key: 'pending', label: 'Pending', color: '#94A3B8', icon: 'schedule' },
  { key: 'completed', label: 'Completed', color: '#4cd7f6', icon: 'check_circle' },
  { key: 'failed', label: 'Failed', color: '#F43F5E', icon: 'cancel' },
]

const missionTypeOptions: { value: ExecutionMissionType; label: string; icon: string; desc: string }[] = [
  { value: 'research', label: 'Research', icon: 'search', desc: 'Deep investigation of a target or topic' },
  { value: 'summarize', label: 'Summarize', icon: 'summarize', desc: 'Condense data into actionable intel' },
  { value: 'plan', label: 'Plan', icon: 'map', desc: 'Generate an operational strategy' },
  { value: 'execute-tool', label: 'Execute Tool', icon: 'build', desc: 'Run a tool-backed action via Gateway' },
]

export default function MissionsPage() {
  const { registry } = useRegistry()
  const { executions, launchMission, approveMission, operatorAction, executeToolAction } = useMissions()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<MissionStatus | 'all'>('all')
  const [typeFilter, setTypeFilter] = useState<MissionType | 'all'>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [selected, setSelected] = useState<Mission | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [showLauncher, setShowLauncher] = useState(false)
  const [selectedExecution, setSelectedExecution] = useState<MissionExecution | null>(null)
  const [execDrawerOpen, setExecDrawerOpen] = useState(false)

  // Launcher form
  const [launchForm, setLaunchForm] = useState({
    name: '',
    type: 'research' as ExecutionMissionType,
    agentId: '',
    prompt: '',
    context: '',
    priority: 'medium' as Priority,
    requiresApproval: true,
  })
  const [launching, setLaunching] = useState(false)

  // Tool action state
  const [toolForm, setToolForm] = useState<Record<string, string>>({})
  const [selectedTool, setSelectedTool] = useState('')
  const [toolRunning, setToolRunning] = useState(false)

  const openDrawer = (mission: Mission) => {
    setSelected(mission)
    requestAnimationFrame(() => setDrawerOpen(true))
  }
  const closeDrawer = () => {
    setDrawerOpen(false)
    setTimeout(() => setSelected(null), 300)
  }

  const openExecDrawer = (exec: MissionExecution) => {
    setSelectedExecution(exec)
    requestAnimationFrame(() => setExecDrawerOpen(true))
  }
  const closeExecDrawer = () => {
    setExecDrawerOpen(false)
    setTimeout(() => setSelectedExecution(null), 300)
  }

  // Keep selectedExecution in sync with live updates
  useEffect(() => {
    if (!selectedExecution) return
    const updated = executions.find(e => e.id === selectedExecution.id)
    if (updated) setSelectedExecution(updated)
  }, [executions, selectedExecution?.id])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showLauncher) setShowLauncher(false)
        else if (execDrawerOpen) closeExecDrawer()
        else if (selected) closeDrawer()
      }
    }
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

  const handleLaunch = () => {
    if (!launchForm.name || !launchForm.agentId || !launchForm.prompt) return
    setLaunching(true)
    const mission = launchMission(launchForm)
    setLaunching(false)
    setShowLauncher(false)
    setLaunchForm({ name: '', type: 'research', agentId: '', prompt: '', context: '', priority: 'medium', requiresApproval: true })
    setTimeout(() => {
      const fresh = executions.find(e => e.id === mission.id) ?? { ...mission }
      openExecDrawer(fresh)
    }, 100)
  }

  const handleToolAction = async () => {
    if (!selectedExecution || !selectedTool) return
    setToolRunning(true)
    const tool = availableTools.find(t => t.name === selectedTool)
    const input: Record<string, unknown> = {}
    tool?.parameters.forEach(p => {
      if (toolForm[p.key]) input[p.key] = toolForm[p.key]
    })
    await executeToolAction(selectedExecution.id, selectedTool, input)
    setToolRunning(false)
    setSelectedTool('')
    setToolForm({})
  }

  const activeAgents = agents.filter(a => a.status !== 'offline')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mission Board"
        description={`${filtered.length} legacy + ${executions.length} live missions tracked`}
        actions={
          <button
            onClick={() => setShowLauncher(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-container text-white rounded-lg font-label text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all glow-violet"
          >
            <Icon name="rocket_launch" size="sm" /> Launch Mission
          </button>
        }
      />

      {/* Live Executions */}
      {executions.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-label uppercase tracking-widest text-secondary">
            Live Missions — {executions.filter(e => e.status === 'running').length} running
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {executions.map(exec => (
              <button
                key={exec.id}
                onClick={() => openExecDrawer(exec)}
                className="text-left glass-panel rounded-xl p-4 hover:bg-surface-bright/20 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] font-label text-on-surface-variant/50 uppercase tracking-wider">{exec.id}</span>
                  <StatusChip label={exec.status} color={executionStatusColor[exec.status]} pulse={exec.status === 'running'} />
                </div>
                <h4 className="text-xs font-headline font-bold text-white mb-1">{exec.name}</h4>
                <div className="flex items-center gap-2 text-[10px] text-on-surface-variant/60 mb-2">
                  <Icon name="smart_toy" size="sm" className="text-on-surface-variant/40" />
                  {exec.assignedAgentId}
                  <span className="ml-auto px-1.5 py-0.5 rounded text-[8px] font-bold uppercase" style={{ background: `${missionTypeColor[exec.type] ?? '#d2bbff'}15`, color: missionTypeColor[exec.type] ?? '#d2bbff' }}>
                    {exec.type}
                  </span>
                </div>
                <ProgressBar value={exec.progress} color={executionStatusColor[exec.status]} showLabel />
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* Legacy Detail Drawer */}
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
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60">Progress</span>
                  <span className="text-sm font-bold font-headline text-white">{selected.progress}%</span>
                </div>
                <ProgressBar value={selected.progress} height="md" color={missionTypeColor[selected.type]} />
              </div>
              <p className="text-sm text-on-surface/80 leading-relaxed mb-6">{selected.description}</p>

              {/* Agent Targeting (preserved from PRD 3) */}
              {(() => {
                const assignedAgent = agents.find(a => a.name === selected.assignedAgent)
                const entry = assignedAgent ? registry.find(e => e.guildAgentId === assignedAgent.id) : undefined
                const rule = entry ? routingRules.find(r => r.role === entry.role) : undefined
                const connColor = entry ? (connectionStatusColor[entry.connectionStatus] ?? '#94A3B8') : '#94A3B8'
                const roleColor = entry ? (routingRoleColor[entry.role] ?? '#94A3B8') : '#94A3B8'

                return (
                  <div className="mb-6 glass-panel-subtle rounded-lg p-4">
                    <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-3 flex items-center gap-1.5">
                      <Icon name="hub" size="sm" className="text-secondary" /> OpenClaw Target
                    </p>
                    {entry ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ background: connColor }} />
                            <span className="text-xs font-headline font-bold text-white">{entry.openclawAgentId}</span>
                          </div>
                          <StatusChip label={entry.connectionStatus === 'connected' ? 'LINKED' : 'UNLINKED'} color={connColor} pulse={entry.connectionStatus === 'connected'} />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase" style={{ background: `${roleColor}15`, color: roleColor }}>
                            {entry.role}
                          </span>
                          {rule && <span className="text-[9px] text-on-surface-variant/50">{rule.description}</span>}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[9px] pt-1">
                          <div>
                            <span className="text-on-surface-variant/40">Session: </span>
                            <span className="text-white font-mono">{entry.currentSessionId ?? '—'}</span>
                          </div>
                          <div>
                            <span className="text-on-surface-variant/40">Mode: </span>
                            <span className="text-white">{entry.defaultSessionMode}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-on-surface-variant/40 italic">No OpenClaw binding found for this agent</p>
                    )}
                  </div>
                )
              })()}

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

      {/* ═══ Mission Execution Drawer ═══ */}
      {selectedExecution && (
        <>
          <div className={cn('fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300', execDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')} onClick={closeExecDrawer} />
          <div className={cn('fixed right-0 top-0 h-full w-[520px] max-w-[95vw] z-50 bg-surface-container-low/95 backdrop-blur-xl border-l border-white/10 shadow-2xl transition-transform duration-300 ease-out', execDrawerOpen ? 'translate-x-0' : 'translate-x-full')}>
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="p-6 border-b border-white/5 shrink-0">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1">{selectedExecution.id} · {selectedExecution.type}</p>
                    <h3 className="text-lg font-bold font-headline text-white">{selectedExecution.name}</h3>
                  </div>
                  <button onClick={closeExecDrawer} className="p-2 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/5 transition-all">
                    <Icon name="close" />
                  </button>
                </div>

                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <StatusChip label={selectedExecution.status} color={executionStatusColor[selectedExecution.status]} pulse={selectedExecution.status === 'running'} />
                  <span className="text-[10px] text-on-surface-variant/50">Agent: <span className="text-white font-headline">{selectedExecution.assignedAgentId}</span></span>
                  <span className="text-[10px] text-on-surface-variant/50">Session: <span className="text-secondary font-mono">{selectedExecution.sessionKey.slice(0, 12)}...</span></span>
                </div>
                <ProgressBar value={selectedExecution.progress} height="md" color={executionStatusColor[selectedExecution.status]} showLabel />

                {/* Operator Controls */}
                <div className="flex gap-2 mt-4 flex-wrap">
                  {selectedExecution.status === 'awaiting-approval' && (
                    <button onClick={() => approveMission(selectedExecution.id)}
                      className="px-3 py-2 rounded-lg bg-status-online/10 text-status-online text-[10px] font-bold uppercase tracking-wider hover:bg-status-online/20 transition-all border border-status-online/20 flex items-center gap-1">
                      <Icon name="check" size="sm" /> Approve
                    </button>
                  )}
                  {(selectedExecution.status === 'running' || selectedExecution.status === 'paused') && (
                    <button onClick={() => operatorAction(selectedExecution.id, 'stop')}
                      className="px-3 py-2 rounded-lg bg-status-offline/10 text-status-offline text-[10px] font-bold uppercase tracking-wider hover:bg-status-offline/20 transition-all border border-status-offline/20 flex items-center gap-1">
                      <Icon name="stop" size="sm" /> Stop
                    </button>
                  )}
                  {(selectedExecution.status === 'failed' || selectedExecution.status === 'cancelled') && (
                    <button onClick={() => operatorAction(selectedExecution.id, 'retry')}
                      className="px-3 py-2 rounded-lg bg-secondary/10 text-secondary text-[10px] font-bold uppercase tracking-wider hover:bg-secondary/20 transition-all border border-secondary/20 flex items-center gap-1">
                      <Icon name="replay" size="sm" /> Retry
                    </button>
                  )}
                  <button onClick={() => operatorAction(selectedExecution.id, 'fork')}
                    className="px-3 py-2 rounded-lg bg-primary-container/10 text-primary text-[10px] font-bold uppercase tracking-wider hover:bg-primary-container/20 transition-all border border-primary-container/20 flex items-center gap-1">
                    <Icon name="call_split" size="sm" /> Fork
                  </button>
                  {selectedExecution.status === 'running' && (
                    <button onClick={() => operatorAction(selectedExecution.id, 'escalate')}
                      className="px-3 py-2 rounded-lg bg-status-busy/10 text-status-busy text-[10px] font-bold uppercase tracking-wider hover:bg-status-busy/20 transition-all border border-status-busy/20 flex items-center gap-1">
                      <Icon name="priority_high" size="sm" /> Escalate
                    </button>
                  )}
                </div>
              </div>

              {/* Transcript */}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1">Mission Transcript</p>
                {selectedExecution.transcript.map(entry => {
                  const roleColor = entry.role === 'system' ? '#94A3B8' : entry.role === 'operator' ? '#863bff' : entry.role === 'tool' ? '#F59E0B' : '#10B981'
                  return (
                    <div key={entry.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${roleColor}15`, border: `1px solid ${roleColor}25` }}>
                        <Icon
                          name={entry.role === 'system' ? 'info' : entry.role === 'operator' ? 'person' : entry.role === 'tool' ? 'build' : 'smart_toy'}
                          size="sm" style={{ color: roleColor }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-label font-bold uppercase tracking-wider" style={{ color: roleColor }}>{entry.agentName}</span>
                          <span className="text-[9px] text-on-surface-variant/40">{entry.timestamp}</span>
                          {entry.tokenCount && <span className="text-[8px] text-on-surface-variant/30">{entry.tokenCount} tokens</span>}
                        </div>
                        <div className="rounded-lg px-3 py-2 bg-surface-container-high/40 border border-white/5">
                          <p className="text-xs text-on-surface/80 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {selectedExecution.transcript.length === 0 && (
                  <div className="text-center py-8 text-on-surface-variant/30">
                    <Icon name="hourglass_empty" size="lg" className="mb-2" />
                    <p className="text-[10px] font-label uppercase tracking-widest">Awaiting execution...</p>
                  </div>
                )}
              </div>

              {/* Tool Actions Panel */}
              {(selectedExecution.status === 'running' || selectedExecution.status === 'completed') && (
                <div className="p-4 border-t border-white/5 shrink-0">
                  <p className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2">Tool Actions</p>

                  {selectedExecution.toolActions.length > 0 && (
                    <div className="space-y-2 mb-3 max-h-32 overflow-y-auto custom-scrollbar">
                      {selectedExecution.toolActions.map(action => (
                        <div key={action.id} className={cn(
                          'rounded-lg px-3 py-2 text-[11px] border',
                          action.status === 'success' ? 'bg-status-online/5 border-status-online/15 text-status-online' :
                          action.status === 'failure' ? 'bg-status-offline/5 border-status-offline/15 text-status-offline' :
                          'bg-status-busy/5 border-status-busy/15 text-status-busy'
                        )}>
                          <div className="flex items-center gap-2">
                            <Icon name={action.status === 'success' ? 'check_circle' : action.status === 'failure' ? 'error' : 'hourglass_top'} size="sm" />
                            <span className="font-bold uppercase">{action.toolName}</span>
                            <span className="text-[9px] opacity-50 ml-auto">{action.completedAt ?? 'running...'}</span>
                          </div>
                          {action.output && <p className="mt-1 text-on-surface/60 text-[10px]">{action.output}</p>}
                          {action.error && <p className="mt-1 text-status-offline/80 text-[10px]">{action.error}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedExecution.status === 'running' && (
                    <div className="space-y-2">
                      <select
                        value={selectedTool}
                        onChange={e => { setSelectedTool(e.target.value); setToolForm({}) }}
                        className="w-full bg-surface-container-lowest rounded-lg px-3 py-2 text-xs text-on-surface border border-outline-variant/15 focus:border-secondary/60 focus:outline-none transition-colors cursor-pointer"
                      >
                        <option value="">Select tool to invoke...</option>
                        {availableTools.map(t => (
                          <option key={t.name} value={t.name}>{t.label} — {t.description}</option>
                        ))}
                      </select>

                      {selectedTool && (() => {
                        const tool = availableTools.find(t => t.name === selectedTool)
                        if (!tool) return null
                        return (
                          <div className="space-y-2">
                            {tool.parameters.map(p => (
                              <div key={p.key}>
                                <label className="text-[9px] font-label uppercase tracking-widest text-on-surface-variant/50 mb-1 block">{p.label}</label>
                                {p.type === 'select' ? (
                                  <select
                                    value={toolForm[p.key] ?? ''}
                                    onChange={e => setToolForm(prev => ({ ...prev, [p.key]: e.target.value }))}
                                    className="w-full bg-surface-container-lowest rounded-lg px-3 py-2 text-xs text-on-surface border border-outline-variant/15 focus:border-secondary/60 focus:outline-none transition-colors cursor-pointer"
                                  >
                                    <option value="">Select...</option>
                                    {p.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={toolForm[p.key] ?? ''}
                                    onChange={e => setToolForm(prev => ({ ...prev, [p.key]: e.target.value }))}
                                    placeholder={p.label}
                                    className="w-full bg-surface-container-lowest rounded-lg px-3 py-2 text-xs text-on-surface placeholder:text-on-surface-variant/30 border border-outline-variant/15 focus:border-secondary/60 focus:outline-none transition-colors"
                                  />
                                )}
                              </div>
                            ))}
                            <button
                              onClick={handleToolAction}
                              disabled={toolRunning}
                              className="w-full py-2 rounded-lg bg-status-busy/10 text-status-busy text-[10px] font-bold uppercase tracking-wider hover:bg-status-busy/20 transition-all border border-status-busy/20 flex items-center justify-center gap-1.5 disabled:opacity-40"
                            >
                              <Icon name="play_arrow" size="sm" />
                              {toolRunning ? 'Executing...' : `Invoke ${tool.label}`}
                            </button>
                          </div>
                        )
                      })()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ═══ Mission Launcher Modal ═══ */}
      {showLauncher && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowLauncher(false)}>
          <div className="w-full max-w-lg bg-surface-container-low/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-container/20 flex items-center justify-center">
                    <Icon name="rocket_launch" className="text-primary-container" />
                  </div>
                  <div>
                    <h2 className="font-headline font-bold text-white text-lg">Launch Mission</h2>
                    <p className="text-[10px] text-on-surface-variant/50 uppercase tracking-wider">Dispatch a structured mission to an agent</p>
                  </div>
                </div>
                <button onClick={() => setShowLauncher(false)} className="p-2 rounded-lg text-on-surface-variant hover:text-white hover:bg-white/5">
                  <Icon name="close" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              {/* Mission Type */}
              <div>
                <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-2 block">Mission Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {missionTypeOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setLaunchForm(f => ({ ...f, type: opt.value }))}
                      className={cn(
                        'text-left p-3 rounded-lg border transition-all',
                        launchForm.type === opt.value
                          ? 'bg-primary-container/15 border-primary-container/30'
                          : 'bg-surface-container-high/30 border-white/5 hover:border-white/15',
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon name={opt.icon} size="sm" className={launchForm.type === opt.value ? 'text-primary-container' : 'text-on-surface-variant/50'} />
                        <span className="text-xs font-headline font-bold text-white">{opt.label}</span>
                      </div>
                      <p className="text-[10px] text-on-surface-variant/50">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1 block">Mission Name</label>
                <input
                  type="text"
                  value={launchForm.name}
                  onChange={e => setLaunchForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Operation Codename..."
                  className="w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 border border-outline-variant/15 focus:border-secondary/60 focus:outline-none transition-colors"
                />
              </div>

              {/* Agent */}
              <div>
                <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1 block">Assign Agent</label>
                <select
                  value={launchForm.agentId}
                  onChange={e => setLaunchForm(f => ({ ...f, agentId: e.target.value }))}
                  className="w-full bg-surface-container-lowest rounded-lg px-3 py-2.5 text-sm text-on-surface border border-outline-variant/15 focus:border-secondary/60 focus:outline-none transition-colors cursor-pointer"
                >
                  <option value="">Select agent...</option>
                  {activeAgents.map(a => (
                    <option key={a.id} value={a.name}>{a.name} — {a.role} (Trust: {a.trustScore})</option>
                  ))}
                </select>
              </div>

              {/* Prompt */}
              <div>
                <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1 block">Mission Prompt</label>
                <textarea
                  value={launchForm.prompt}
                  onChange={e => setLaunchForm(f => ({ ...f, prompt: e.target.value }))}
                  placeholder="Describe the mission objective..."
                  rows={3}
                  className="w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 border border-outline-variant/15 focus:border-secondary/60 focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Context */}
              <div>
                <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1 block">Additional Context</label>
                <textarea
                  value={launchForm.context}
                  onChange={e => setLaunchForm(f => ({ ...f, context: e.target.value }))}
                  placeholder="Background intel, constraints, references..."
                  rows={2}
                  className="w-full bg-surface-container-lowest rounded-lg px-4 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/30 border border-outline-variant/15 focus:border-secondary/60 focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Priority + Approval */}
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1 block">Priority</label>
                  <select
                    value={launchForm.priority}
                    onChange={e => setLaunchForm(f => ({ ...f, priority: e.target.value as Priority }))}
                    className="w-full bg-surface-container-lowest rounded-lg px-3 py-2.5 text-sm text-on-surface border border-outline-variant/15 focus:border-secondary/60 focus:outline-none transition-colors cursor-pointer"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-label uppercase tracking-widest text-on-surface-variant/60 mb-1 block">Operator Approval</label>
                  <button
                    onClick={() => setLaunchForm(f => ({ ...f, requiresApproval: !f.requiresApproval }))}
                    className={cn(
                      'w-full py-2.5 rounded-lg text-sm font-headline font-bold border transition-all flex items-center justify-center gap-2',
                      launchForm.requiresApproval
                        ? 'bg-status-busy/10 border-status-busy/20 text-status-busy'
                        : 'bg-status-online/10 border-status-online/20 text-status-online',
                    )}
                  >
                    <Icon name={launchForm.requiresApproval ? 'lock' : 'lock_open'} size="sm" />
                    {launchForm.requiresApproval ? 'Required' : 'Auto-run'}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-white/5 flex gap-3">
              <button
                onClick={() => setShowLauncher(false)}
                className="flex-1 py-2.5 rounded-lg bg-surface-container-high border border-white/10 text-on-surface-variant hover:text-white text-xs font-bold uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleLaunch}
                disabled={!launchForm.name || !launchForm.agentId || !launchForm.prompt || launching}
                className="flex-1 py-2.5 rounded-lg bg-primary-container text-white text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all glow-violet disabled:opacity-40 disabled:glow-none flex items-center justify-center gap-2"
              >
                <Icon name="rocket_launch" size="sm" />
                {launching ? 'Launching...' : 'Launch Mission'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
