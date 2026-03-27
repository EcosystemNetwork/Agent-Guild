/**
 * DataContext — loads all persisted backend state and provides it to the app.
 * Replaces direct imports from src/data/* as the runtime source of truth.
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import { dataApi } from '../lib/api'
import type {
  Agent,
  Mission,
  ActivityEvent,
  GuildMetrics,
  TrustMetric,
  OperatorAlert,
  AgentRegistryEntry,
  RoutingRule,
  ChatMessage,
  ChatChannel,
  TrustEvent,
  Badge,
  ApprovalItem,
  Incident,
  HealthCard,
  AvailableTool,
} from '../types'

interface DataContextValue {
  // Loading state
  isLoading: boolean
  error: string | null

  // Core entities
  agents: Agent[]
  missions: Mission[]
  activityFeed: ActivityEvent[]
  guildMetrics: GuildMetrics | null

  // Trust
  trustMetrics: TrustMetric[]
  trustHistory: { date: string; score: number }[]
  trustEvents: TrustEvent[]
  badges: Badge[]

  // Chat
  channels: ChatChannel[]
  chatMessages: Record<string, ChatMessage[]>
  missionContext: Record<string, { objective: string; status: string; agents: string[]; progress: number; threats: string[] }>

  // Operator
  approvalQueue: ApprovalItem[]
  incidents: Incident[]
  healthCards: HealthCard[]
  operatorAlerts: OperatorAlert[]

  // Registry
  registry: AgentRegistryEntry[]
  routingRules: RoutingRule[]

  // Tools
  availableTools: AvailableTool[]

  // Mutation helpers (update local state + persist to backend)
  updateApproval: (id: string, status: string) => Promise<void>
  updateIncident: (id: string, updates: Partial<Incident>) => Promise<void>
  updateAlert: (id: string, status: string) => Promise<void>
  updateRegistryEntry: (guildAgentId: string, updates: Partial<AgentRegistryEntry>) => Promise<void>
  updateMission: (id: string, updates: Partial<Mission>) => Promise<void>
  addChatMessage: (msg: ChatMessage) => Promise<void>

  // Refresh
  refresh: () => Promise<void>
}

const DataCtx = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [agents, setAgents] = useState<Agent[]>([])
  const [missions, setMissions] = useState<Mission[]>([])
  const [activityFeed, setActivityFeed] = useState<ActivityEvent[]>([])
  const [guildMetrics, setGuildMetrics] = useState<GuildMetrics | null>(null)
  const [trustMetrics, setTrustMetrics] = useState<TrustMetric[]>([])
  const [trustHistory, setTrustHistory] = useState<{ date: string; score: number }[]>([])
  const [trustEvents, setTrustEvents] = useState<TrustEvent[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [channels, setChannels] = useState<ChatChannel[]>([])
  const [chatMessages, setChatMessages] = useState<Record<string, ChatMessage[]>>({})
  const [missionContext, setMissionContext] = useState<Record<string, { objective: string; status: string; agents: string[]; progress: number; threats: string[] }>>({})
  const [approvalQueue, setApprovalQueue] = useState<ApprovalItem[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [healthCards, setHealthCards] = useState<HealthCard[]>([])
  const [operatorAlerts, setOperatorAlerts] = useState<OperatorAlert[]>([])
  const [registry, setRegistry] = useState<AgentRegistryEntry[]>([])
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([])
  const [availableTools, setAvailableTools] = useState<AvailableTool[]>([])

  const loadAll = useCallback(async () => {
    try {
      const [
        agentsData,
        missionsData,
        activityData,
        metricsData,
        trustMetricsData,
        trustHistoryData,
        trustEventsData,
        badgesData,
        channelsData,
        messagesData,
        missionCtxData,
        approvalsData,
        incidentsData,
        healthData,
        alertsData,
        registryData,
        rulesData,
        toolsData,
      ] = await Promise.all([
        dataApi.getAgents(),
        dataApi.getMissions(),
        dataApi.getActivity(),
        dataApi.getGuildMetrics(),
        dataApi.getTrustMetrics(),
        dataApi.getTrustHistory(),
        dataApi.getTrustEvents(),
        dataApi.getBadges(),
        dataApi.getChannels(),
        dataApi.getMessages(),
        dataApi.getMissionContext(),
        dataApi.getApprovals(),
        dataApi.getIncidents(),
        dataApi.getHealthCards(),
        dataApi.getOperatorAlerts(),
        dataApi.getRegistry(),
        dataApi.getRoutingRules(),
        dataApi.getTools(),
      ])

      setAgents(agentsData)
      setMissions(missionsData)
      setActivityFeed(activityData)
      setGuildMetrics(metricsData)
      setTrustMetrics(trustMetricsData)
      setTrustHistory(trustHistoryData)
      setTrustEvents(trustEventsData)
      setBadges(badgesData)
      setChannels(channelsData)
      setChatMessages(messagesData)
      setMissionContext(missionCtxData)
      setApprovalQueue(approvalsData)
      setIncidents(incidentsData)
      setHealthCards(healthData)
      setOperatorAlerts(alertsData)
      setRegistry(registryData)
      setRoutingRules(rulesData)
      setAvailableTools(toolsData)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  // ── Mutations ──

  const updateApproval = useCallback(async (id: string, status: string) => {
    const updated = await dataApi.updateApproval(id, status)
    setApprovalQueue(prev => prev.map(a => a.id === id ? updated : a))
  }, [])

  const updateIncident = useCallback(async (id: string, updates: Partial<Incident>) => {
    const updated = await dataApi.updateIncident(id, updates)
    setIncidents(prev => prev.map(i => i.id === id ? updated : i))
  }, [])

  const updateAlertFn = useCallback(async (id: string, status: string) => {
    const updated = await dataApi.updateAlert(id, status)
    setOperatorAlerts(prev => prev.map(a => a.id === id ? updated : a))
  }, [])

  const updateRegistryEntry = useCallback(async (guildAgentId: string, updates: Partial<AgentRegistryEntry>) => {
    const updated = await dataApi.updateRegistryEntry(guildAgentId, updates)
    setRegistry(prev => prev.map(r => r.guildAgentId === guildAgentId ? updated : r))
  }, [])

  const updateMission = useCallback(async (id: string, updates: Partial<Mission>) => {
    const updated = await dataApi.updateMission(id, updates)
    setMissions(prev => prev.map(m => m.id === id ? updated : m))
  }, [])

  const addChatMessage = useCallback(async (msg: ChatMessage) => {
    await dataApi.sendChatMessage({ ...msg, id: msg.id } as ChatMessage & { id: string })
    setChatMessages(prev => ({
      ...prev,
      [msg.channel]: [...(prev[msg.channel] ?? []), msg],
    }))
  }, [])

  return (
    <DataCtx.Provider value={{
      isLoading,
      error,
      agents,
      missions,
      activityFeed,
      guildMetrics,
      trustMetrics,
      trustHistory,
      trustEvents,
      badges,
      channels,
      chatMessages,
      missionContext,
      approvalQueue,
      incidents,
      healthCards,
      operatorAlerts,
      registry,
      routingRules,
      availableTools,
      updateApproval,
      updateIncident,
      updateAlert: updateAlertFn,
      updateRegistryEntry,
      updateMission,
      addChatMessage,
      refresh: loadAll,
    }}>
      {children}
    </DataCtx.Provider>
  )
}

export function useData() {
  const ctx = useContext(DataCtx)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
