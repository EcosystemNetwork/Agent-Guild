/**
 * Airbyte Server-Side Data Plane
 *
 * All Airbyte API calls and warehouse reads happen here on the server.
 * Credentials (AIRBYTE_TOKEN) never reach the browser. When the token
 * is not set, structured mock data is returned so the app runs standalone.
 */

import { Router } from 'express'
import type { Request, Response } from 'express'

const router = Router()

const AIRBYTE_BASE_URL = process.env.AIRBYTE_BASE_URL || 'https://api.airbyte.com/v1'
const AIRBYTE_TOKEN = process.env.AIRBYTE_TOKEN || ''

export const isAirbyteConfigured = () => AIRBYTE_TOKEN.length > 0

// ── Airbyte API fetch helper ──

async function airbyteFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${AIRBYTE_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${AIRBYTE_TOKEN}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) throw new Error(`Airbyte ${path}: ${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

// ── Types ──

interface AirbyteConnectionDTO {
  connectionId: string
  name: string
  sourceId: string
  sourceName: string
  status: string
  schedule: string
  lastSyncAt: string | null
  lastSyncStatus: string | null
}

interface AirbyteSyncJobDTO {
  jobId: string
  connectionId: string
  status: string
  startedAt: string
  completedAt: string | null
  bytesLoaded: number
  recordsLoaded: number
  error: string | null
}

interface SyncedRecord {
  stream: string
  data: Record<string, unknown>
  syncedAt: string
}

// ── Mission → Connection Mapping ──

const GITHUB_CONNECTOR_ID = 'f4ba487b-8d44-492e-8f2d-4da105540d35'

const MISSION_CONNECTION_MAP: Record<string, string[]> = {
  'MSN-2847': ['conn-threat-intel', 'conn-infra-cmdb', GITHUB_CONNECTOR_ID],
  'MSN-2844': ['conn-threat-intel', 'conn-infra-cmdb', GITHUB_CONNECTOR_ID],
  'MSN-2842': ['conn-threat-intel', 'conn-infra-cmdb', GITHUB_CONNECTOR_ID],
}

// ── Mock Data ──

function mockConnections(): AirbyteConnectionDTO[] {
  return [
    { connectionId: 'conn-threat-intel', name: 'Threat Intel Feed → Guild Warehouse', sourceId: 'src-threat-intel', sourceName: 'Threat Intelligence API', status: 'active', schedule: 'Every 15 min', lastSyncAt: new Date(Date.now() - 4 * 60_000).toISOString(), lastSyncStatus: 'succeeded' },
    { connectionId: 'conn-infra-cmdb', name: 'Infrastructure CMDB → Guild Warehouse', sourceId: 'src-infra-cmdb', sourceName: 'Infrastructure CMDB', status: 'active', schedule: 'Every 30 min', lastSyncAt: new Date(Date.now() - 12 * 60_000).toISOString(), lastSyncStatus: 'succeeded' },
    { connectionId: GITHUB_CONNECTOR_ID, name: 'GitHub → Guild Warehouse', sourceId: 'src-github', sourceName: 'GitHub', status: 'active', schedule: 'Every 15 min', lastSyncAt: new Date(Date.now() - 2 * 60_000).toISOString(), lastSyncStatus: 'succeeded' },
  ]
}

function mockTriggerSync(connectionId: string): AirbyteSyncJobDTO {
  return { jobId: `job-${Date.now()}`, connectionId, status: 'running', startedAt: new Date().toISOString(), completedAt: null, bytesLoaded: 0, recordsLoaded: 0, error: null }
}

function mockJobStatus(jobId: string): AirbyteSyncJobDTO {
  return { jobId, connectionId: 'conn-threat-intel', status: 'succeeded', startedAt: new Date(Date.now() - 30_000).toISOString(), completedAt: new Date().toISOString(), bytesLoaded: 47_200, recordsLoaded: 312, error: null }
}

function mockListJobs(connectionId: string): AirbyteSyncJobDTO[] {
  const now = Date.now()
  return [
    { jobId: `job-${now - 1}`, connectionId, status: 'succeeded', startedAt: new Date(now - 4 * 60_000).toISOString(), completedAt: new Date(now - 3.5 * 60_000).toISOString(), bytesLoaded: 47_200, recordsLoaded: 312, error: null },
    { jobId: `job-${now - 2}`, connectionId, status: 'succeeded', startedAt: new Date(now - 19 * 60_000).toISOString(), completedAt: new Date(now - 18.5 * 60_000).toISOString(), bytesLoaded: 45_800, recordsLoaded: 298, error: null },
    { jobId: `job-${now - 3}`, connectionId, status: 'succeeded', startedAt: new Date(now - 34 * 60_000).toISOString(), completedAt: new Date(now - 33 * 60_000).toISOString(), bytesLoaded: 44_100, recordsLoaded: 287, error: null },
  ]
}

const THREAT_INTEL_RECORDS: Record<string, SyncedRecord[]> = {
  'MSN-2847': [
    { stream: 'threat_indicators', data: { indicator: 'Polymorphic tunnel on 8443-8447', severity: 'high', confidence: 0.89, source: 'Syndicate Omega TTP DB', firstSeen: '2026-03-27T06:12:00Z', ttl: 'persistent' }, syncedAt: new Date(Date.now() - 4 * 60_000).toISOString() },
    { stream: 'threat_indicators', data: { indicator: 'External relay at 47.3N, 122.1W', severity: 'medium', confidence: 0.67, source: 'SIGINT Trace Alpha', firstSeen: '2026-03-27T03:00:00Z', ttl: '6h' }, syncedAt: new Date(Date.now() - 4 * 60_000).toISOString() },
    { stream: 'network_anomalies', data: { zone: 'Sector 7-G', anomalyType: 'traffic_spike', magnitude: '340% above baseline', affectedPorts: [8443, 8444, 8445, 8446, 8447], correlationId: 'COR-7G-2847' }, syncedAt: new Date(Date.now() - 4 * 60_000).toISOString() },
  ],
  'MSN-2844': [
    { stream: 'threat_indicators', data: { indicator: 'Compromised svc-account: svc-4alpha-reader', severity: 'critical', confidence: 0.95, source: 'IAM Audit Log', firstSeen: '2026-03-27T10:00:00Z', ttl: 'until rotated' }, syncedAt: new Date(Date.now() - 4 * 60_000).toISOString() },
    { stream: 'threat_indicators', data: { indicator: 'Coordinated follow-up probability: 34%', severity: 'high', confidence: 0.34, source: 'Predictive Model v4.2', firstSeen: '2026-03-27T10:45:00Z', ttl: '2h' }, syncedAt: new Date(Date.now() - 4 * 60_000).toISOString() },
  ],
  'MSN-2842': [
    { stream: 'network_anomalies', data: { zone: 'Node cluster 9-Delta', anomalyType: 'irregular_heartbeat', affectedNodes: 3, totalNodes: 7, pattern: 'dormant_activation', correlationId: 'COR-9D-2842' }, syncedAt: new Date(Date.now() - 4 * 60_000).toISOString() },
    { stream: 'threat_indicators', data: { indicator: '3 dormant nodes activated outside manifest', severity: 'medium', confidence: 0.72, source: 'WRAITH passive probe', firstSeen: '2026-03-27T10:58:00Z', ttl: 'persistent' }, syncedAt: new Date(Date.now() - 4 * 60_000).toISOString() },
  ],
}

const CMDB_RECORDS: Record<string, SyncedRecord[]> = {
  'MSN-2847': [
    { stream: 'infrastructure_assets', data: { assetId: 'node-7g-01', zone: 'Sector 7-G', type: 'perimeter_scanner', status: 'active', lastPatched: '2026-03-20', owner: 'CIPHER-7', riskScore: 78 }, syncedAt: new Date(Date.now() - 12 * 60_000).toISOString() },
    { stream: 'infrastructure_assets', data: { assetId: 'relay-ext-47n', zone: 'External', type: 'relay_station', status: 'suspicious', lastPatched: 'unknown', owner: 'unassigned', riskScore: 92 }, syncedAt: new Date(Date.now() - 12 * 60_000).toISOString() },
  ],
  'MSN-2844': [
    { stream: 'infrastructure_assets', data: { assetId: 'node-4a-entry', zone: 'Entry Node 4-Alpha', type: 'access_gateway', status: 'lockdown', lastPatched: '2026-03-25', owner: 'SENTINEL-12', riskScore: 88 }, syncedAt: new Date(Date.now() - 12 * 60_000).toISOString() },
    { stream: 'infrastructure_assets', data: { assetId: 'fw-perimeter-01', zone: 'Perimeter', type: 'firewall_cluster', status: 'patching', lastPatched: '2026-03-27', owner: 'PULSE', riskScore: 45 }, syncedAt: new Date(Date.now() - 12 * 60_000).toISOString() },
  ],
  'MSN-2842': [
    { stream: 'infrastructure_assets', data: { assetId: 'node-9d-cluster', zone: 'Node Cluster 9-Delta', type: 'compute_cluster', status: 'compromised', lastPatched: '2026-03-15', owner: 'WRAITH-5', riskScore: 85 }, syncedAt: new Date(Date.now() - 12 * 60_000).toISOString() },
  ],
}

const GITHUB_RECORDS: Record<string, SyncedRecord[]> = {
  'MSN-2847': [
    { stream: 'github_issues', data: { repo: 'Agent-Guild/Agent-Guild', number: 47, title: 'Anomalous packet signatures on 8443-8447', state: 'open', labels: ['P0', 'recon', 'sector-7g'], assignee: 'cipher-7', createdAt: '2026-03-27T06:30:00Z', comments: 3 }, syncedAt: new Date(Date.now() - 2 * 60_000).toISOString() },
    { stream: 'github_pull_requests', data: { repo: 'Agent-Guild/Agent-Guild', number: 112, title: 'feat: polymorphic tunnel detection rules', state: 'open', author: 'nova-3', reviewers: ['cipher-7'], additions: 240, deletions: 12, updatedAt: '2026-03-27T09:15:00Z' }, syncedAt: new Date(Date.now() - 2 * 60_000).toISOString() },
  ],
  'MSN-2844': [
    { stream: 'github_issues', data: { repo: 'Agent-Guild/Agent-Guild', number: 51, title: 'CRITICAL: Unauthorized access via svc-4alpha-reader', state: 'open', labels: ['P0', 'security', 'incident'], assignee: 'sentinel-12', createdAt: '2026-03-27T10:02:00Z', comments: 8 }, syncedAt: new Date(Date.now() - 2 * 60_000).toISOString() },
    { stream: 'github_commits', data: { repo: 'Agent-Guild/Agent-Guild', sha: 'a3f8c1d', message: 'fix: rotate compromised svc-4alpha-reader credentials', author: 'pulse', branch: 'hotfix/credential-rotation', timestamp: '2026-03-27T10:15:00Z' }, syncedAt: new Date(Date.now() - 2 * 60_000).toISOString() },
  ],
  'MSN-2842': [
    { stream: 'github_issues', data: { repo: 'Agent-Guild/Agent-Guild', number: 53, title: 'Investigate dormant node activation in cluster 9-Delta', state: 'open', labels: ['recon', 'stealth', 'cluster-9d'], assignee: 'wraith-5', createdAt: '2026-03-27T10:50:00Z', comments: 1 }, syncedAt: new Date(Date.now() - 2 * 60_000).toISOString() },
  ],
}

function mockSyncedRecords(connectionId: string, missionId: string): SyncedRecord[] {
  if (connectionId === 'conn-threat-intel') return THREAT_INTEL_RECORDS[missionId] ?? []
  if (connectionId === 'conn-infra-cmdb') return CMDB_RECORDS[missionId] ?? []
  if (connectionId === GITHUB_CONNECTOR_ID) return GITHUB_RECORDS[missionId] ?? []
  return []
}

// ── Airbyte API mapper helpers ──

function mapJob(j: Record<string, unknown>): AirbyteSyncJobDTO {
  return {
    jobId: (j.jobId ?? j.id ?? '') as string,
    connectionId: (j.connectionId ?? '') as string,
    status: (j.status ?? 'pending') as string,
    startedAt: (j.startTime ?? j.createdAt ?? '') as string,
    completedAt: (j.lastUpdatedAt ?? null) as string | null,
    bytesLoaded: (j.bytesSynced ?? 0) as number,
    recordsLoaded: (j.rowsSynced ?? 0) as number,
    error: null,
  }
}

function mapConnection(c: Record<string, unknown>): AirbyteConnectionDTO {
  return {
    connectionId: c.connectionId as string,
    name: c.name as string,
    sourceId: (c.sourceId ?? '') as string,
    sourceName: (c.sourceName ?? c.name) as string,
    status: c.status as string,
    schedule: (c.schedule as string) ?? 'manual',
    lastSyncAt: (c.latestSyncJobCreatedAt as string) ?? null,
    lastSyncStatus: (c.latestSyncJobStatus as string) ?? null,
  }
}

// ── Routes ──

// List connections
router.get('/connections', async (_req: Request, res: Response) => {
  try {
    if (!AIRBYTE_TOKEN) {
      res.json({ data: mockConnections() })
      return
    }
    const raw = await airbyteFetch<{ data: Array<Record<string, unknown>> }>('/connections')
    res.json({ data: raw.data.map(mapConnection) })
  } catch (err) {
    res.status(502).json({ error: (err as Error).message })
  }
})

// Trigger sync
router.post('/sync', async (req: Request, res: Response) => {
  const { connectionId } = req.body
  if (!connectionId) {
    res.status(400).json({ error: 'connectionId is required' })
    return
  }
  try {
    if (!AIRBYTE_TOKEN) {
      res.json(mockTriggerSync(connectionId))
      return
    }
    const raw = await airbyteFetch<Record<string, unknown>>('/jobs', {
      method: 'POST',
      body: JSON.stringify({ connectionId, jobType: 'sync' }),
    })
    res.json(mapJob(raw))
  } catch (err) {
    res.status(502).json({ error: (err as Error).message })
  }
})

// Job status
router.get('/jobs/:jobId', async (req: Request, res: Response) => {
  const jobId = req.params.jobId as string
  try {
    if (!AIRBYTE_TOKEN) {
      res.json(mockJobStatus(jobId))
      return
    }
    const raw = await airbyteFetch<Record<string, unknown>>(`/jobs/${jobId}`)
    res.json(mapJob(raw))
  } catch (err) {
    res.status(502).json({ error: (err as Error).message })
  }
})

// List jobs for a connection
router.get('/jobs', async (req: Request, res: Response) => {
  const connectionId = req.query.connectionId as string
  if (!connectionId) {
    res.status(400).json({ error: 'connectionId query param is required' })
    return
  }
  try {
    if (!AIRBYTE_TOKEN) {
      res.json({ data: mockListJobs(connectionId) })
      return
    }
    const raw = await airbyteFetch<{ data: Array<Record<string, unknown>> }>(
      `/jobs?connectionId=${encodeURIComponent(connectionId)}&limit=5&orderBy=createdAt%7CDESC`,
    )
    res.json({ data: raw.data.map(mapJob) })
  } catch (err) {
    res.status(502).json({ error: (err as Error).message })
  }
})

// ── Mission Context endpoint ──
// Reads destination warehouse data and maps it to mission context.
// In production with a real warehouse, the mockSyncedRecords call would be
// replaced by a SQL query against the Airbyte destination (Postgres/BigQuery/etc).
router.get('/context/:missionId', async (req: Request, res: Response) => {
  const missionId = req.params.missionId as string
  const connIds = MISSION_CONNECTION_MAP[missionId]
  if (!connIds) {
    res.status(404).json({ error: `No connections mapped for mission ${missionId}` })
    return
  }

  try {
    let connections: AirbyteConnectionDTO[]
    if (AIRBYTE_TOKEN) {
      const raw = await airbyteFetch<{ data: Array<Record<string, unknown>> }>('/connections')
      connections = raw.data.map(mapConnection)
    } else {
      connections = mockConnections()
    }

    const contexts = connIds.map(connId => {
      const conn = connections.find(c => c.connectionId === connId)
      // Production: SELECT * FROM synced_table WHERE mission_id = ? ORDER BY _airbyte_extracted_at DESC
      const records = mockSyncedRecords(connId, missionId)
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
    })

    res.json({ missionId, contexts, fetchedAt: new Date().toISOString() })
  } catch (err) {
    res.status(502).json({ error: (err as Error).message })
  }
})

export { router as airbyteRouter }
