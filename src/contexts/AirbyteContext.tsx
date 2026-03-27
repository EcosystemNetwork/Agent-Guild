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
  fetchSyncedRecords,
} from '../services/airbyte'

// ── Static mission→connection mapping ──
// In production this would live in a config table. For now, every mission
// gets context from both sources.

// Live Airbyte connector IDs
const GITHUB_CONNECTOR_ID = 'f4ba487b-8d44-492e-8f2d-4da105540d35'

const MISSION_CONNECTION_MAP: Record<string, string[]> = {
  'MSN-2847': ['conn-threat-intel', 'conn-infra-cmdb', GITHUB_CONNECTOR_ID],
  'MSN-2844': ['conn-threat-intel', 'conn-infra-cmdb', GITHUB_CONNECTOR_ID],
  'MSN-2842': ['conn-threat-intel', 'conn-infra-cmdb', GITHUB_CONNECTOR_ID],
}

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

  // Pre-fetch context for mapped missions once connections load
  useEffect(() => {
    if (connections.length === 0) return
    for (const missionId of Object.keys(MISSION_CONNECTION_MAP)) {
      fetchContextForMission(missionId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connections])

  const fetchContextForMission = async (missionId: string) => {
    const connIds = MISSION_CONNECTION_MAP[missionId] ?? []
    if (connIds.length === 0) return

    const contexts: AirbyteMissionContext[] = await Promise.all(
      connIds.map(async connId => {
        const conn = connections.find(c => c.connectionId === connId)
        const records = await fetchSyncedRecords(connId, missionId)
        const lastSync = conn?.lastSyncAt ?? null
        const freshnessMs = lastSync ? Date.now() - new Date(lastSync).getTime() : Infinity

        return {
          missionId,
          connectionId: connId,
          sourceName: conn?.sourceName ?? connId,
          syncStatus: conn?.lastSyncStatus ?? 'pending',
          lastSyncAt: lastSync,
          records,
          freshnessMs,
        }
      }),
    )

    setMissionContexts(prev => ({ ...prev, [missionId]: contexts }))
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connections],
  )

  const triggerMissionSync = useCallback(
    async (missionId: string): Promise<AirbyteSyncJob[]> => {
      const connIds = MISSION_CONNECTION_MAP[missionId] ?? []
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
          // Refresh context after sync completes
          await loadConnections()
          await fetchContextForMission(missionId)
        }
      }, 3000)

      return jobs
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [connections, loadConnections],
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
