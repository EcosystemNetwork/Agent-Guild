import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react'
import type {
  AirbyteConnection,
  AirbyteSyncJob,
  AirbyteMissionContext,
} from '../types'
import {
  listConnections,
  triggerSync,
  getJobStatus,
  fetchMissionContext,
} from '../services/airbyte'

// Mission IDs that should have context pre-fetched
const KNOWN_MISSIONS = ['MSN-2847', 'MSN-2844', 'MSN-2842']

const POLL_INTERVAL = 60_000 // refresh connections list every 60s

interface AirbyteContextValue {
  connections: AirbyteConnection[]
  isLoading: boolean
  error: string | null
  getMissionContext: (missionId: string) => AirbyteMissionContext[]
  refreshMissionContext: (missionId: string) => Promise<void>
  triggerMissionSync: (missionId: string) => Promise<AirbyteSyncJob[]>
  activeSyncs: Record<string, AirbyteSyncJob>
}

const AirbyteCtx = createContext<AirbyteContextValue | null>(null)

export function AirbyteProvider({ children }: { children: ReactNode }) {
  const [connections, setConnections] = useState<AirbyteConnection[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [missionContexts, setMissionContexts] = useState<Record<string, AirbyteMissionContext[]>>({})
  const [activeSyncs, setActiveSyncs] = useState<Record<string, AirbyteSyncJob>>({})
  const pollRef = useRef<ReturnType<typeof setInterval>>(undefined)
  const syncPollRef = useRef<ReturnType<typeof setInterval>>(undefined)

  // Load connections on mount + poll
  const loadConnections = useCallback(async () => {
    try {
      const conns = await listConnections()
      setConnections(conns)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Airbyte connections')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadConnections()
    pollRef.current = setInterval(loadConnections, POLL_INTERVAL)
    return () => clearInterval(pollRef.current)
  }, [loadConnections])

  // Fetch context from the server for a mission
  const fetchContextForMission = useCallback(async (missionId: string) => {
    try {
      const contexts = await fetchMissionContext(missionId)
      setMissionContexts(prev => ({ ...prev, [missionId]: contexts }))
    } catch (err) {
      console.error(`[airbyte] Failed to fetch context for ${missionId}:`, err)
    }
  }, [])

  // Pre-fetch context for known missions once connections load
  useEffect(() => {
    if (connections.length === 0) return
    for (const missionId of KNOWN_MISSIONS) {
      fetchContextForMission(missionId)
    }
  }, [connections, fetchContextForMission])

  const getMissionContext = useCallback(
    (missionId: string): AirbyteMissionContext[] => {
      return missionContexts[missionId] ?? []
    },
    [missionContexts],
  )

  const refreshMissionContext = useCallback(
    async (missionId: string) => {
      await fetchContextForMission(missionId)
    },
    [fetchContextForMission],
  )

  const triggerMissionSync = useCallback(
    async (missionId: string): Promise<AirbyteSyncJob[]> => {
      // Get the connection IDs from the current context (server owns the mapping)
      const ctx = missionContexts[missionId] ?? []
      const connIds = ctx.map(c => c.connectionId)
      if (connIds.length === 0) {
        // Fallback: trigger a context fetch first to discover connections
        await fetchContextForMission(missionId)
        const refreshed = missionContexts[missionId] ?? []
        if (refreshed.length === 0) return []
        connIds.push(...refreshed.map(c => c.connectionId))
      }

      const jobs = await Promise.all(connIds.map(id => triggerSync(id)))

      // Track active syncs
      const newSyncs: Record<string, AirbyteSyncJob> = {}
      for (const job of jobs) {
        newSyncs[job.jobId] = job
      }
      setActiveSyncs(prev => ({ ...prev, ...newSyncs }))

      // Poll active sync jobs until complete
      if (syncPollRef.current) clearInterval(syncPollRef.current)
      syncPollRef.current = setInterval(async () => {
        let allDone = true
        for (const job of jobs) {
          if (job.status === 'running' || job.status === 'pending') {
            const updated = await getJobStatus(job.jobId)
            setActiveSyncs(prev => ({ ...prev, [job.jobId]: updated }))
            if (updated.status === 'running' || updated.status === 'pending') {
              allDone = false
            }
          }
        }
        if (allDone) {
          clearInterval(syncPollRef.current)
          // Refresh connections and context from the server after sync completes
          await loadConnections()
          await fetchContextForMission(missionId)
        }
      }, 3000)

      return jobs
    },
    [missionContexts, fetchContextForMission, loadConnections],
  )

  return (
    <AirbyteCtx.Provider
      value={{
        connections,
        isLoading,
        error,
        getMissionContext,
        refreshMissionContext,
        triggerMissionSync,
        activeSyncs,
      }}
    >
      {children}
    </AirbyteCtx.Provider>
  )
}

export function useAirbyte() {
  const ctx = useContext(AirbyteCtx)
  if (!ctx) throw new Error('useAirbyte must be used within AirbyteProvider')
  return ctx
}
