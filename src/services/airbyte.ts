/**
 * Airbyte Service — Mission Context Engine
 *
 * Wraps the Airbyte API (https://api.airbyte.com) for syncing external data
 * sources into mission context. Falls back to realistic mock data when no
 * VITE_AIRBYTE_TOKEN is configured, so the app runs standalone.
 */

import type {
  AirbyteConnection,
  AirbyteSyncJob,
  AirbyteSyncedRecord,
  AirbyteSyncStatus,
} from '../types'

// ── Config ──

interface AirbyteConfig {
  baseUrl: string
  token: string
}

const config: AirbyteConfig = {
  baseUrl: import.meta.env.VITE_AIRBYTE_BASE_URL || 'https://api.airbyte.com/v1',
  token: import.meta.env.VITE_AIRBYTE_TOKEN || '',
}

const isLive = () => config.token.length > 0

// ── API helpers ──

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  })
  if (!res.ok) throw new Error(`Airbyte ${path}: ${res.status} ${res.statusText}`)
  return res.json()
}

// ── Public API ──

export async function listConnections(): Promise<AirbyteConnection[]> {
  if (!isLive()) return mockConnections()

  const res = await apiFetch<{ data: Array<Record<string, unknown>> }>('/connections')
  return res.data.map(c => ({
    connectionId: c.connectionId as string,
    name: c.name as string,
    sourceId: (c.sourceId ?? '') as string,
    sourceName: (c.sourceName ?? c.name) as string,
    status: mapConnectionStatus(c.status as string),
    schedule: (c.schedule as string) ?? 'manual',
    lastSyncAt: (c.latestSyncJobCreatedAt as string) ?? null,
    lastSyncStatus: mapSyncStatus((c.latestSyncJobStatus as string) ?? ''),
  }))
}

export async function triggerSync(connectionId: string): Promise<AirbyteSyncJob> {
  if (!isLive()) return mockTriggerSync(connectionId)

  const res = await apiFetch<Record<string, unknown>>('/jobs', {
    method: 'POST',
    body: JSON.stringify({ connectionId, jobType: 'sync' }),
  })
  return mapJob(res)
}

export async function getJobStatus(jobId: string): Promise<AirbyteSyncJob> {
  if (!isLive()) return mockJobStatus(jobId)

  const res = await apiFetch<Record<string, unknown>>(`/jobs/${jobId}`)
  return mapJob(res)
}

export async function listJobs(connectionId: string): Promise<AirbyteSyncJob[]> {
  if (!isLive()) return mockListJobs(connectionId)

  const res = await apiFetch<{ data: Array<Record<string, unknown>> }>(
    `/jobs?connectionId=${connectionId}&limit=5&orderBy=createdAt%7CDESC`,
  )
  return res.data.map(mapJob)
}

/**
 * Fetch synced records for a mission. In production this would read from the
 * destination warehouse. For now we return structured mock data shaped like
 * real intelligence feeds.
 */
export async function fetchSyncedRecords(
  connectionId: string,
  missionId: string,
): Promise<AirbyteSyncedRecord[]> {
  if (!isLive()) return mockSyncedRecords(connectionId, missionId)

  // In a real setup, this queries the destination (Postgres, BigQuery, etc.)
  // via a lightweight proxy or directly. The Airbyte API doesn't serve
  // destination data — that's in the warehouse. We'd add a /api/context
  // endpoint on the Express backend. For now, mock it.
  return mockSyncedRecords(connectionId, missionId)
}

// ── Mappers ──

function mapConnectionStatus(s: string): AirbyteConnection['status'] {
  if (s === 'active') return 'active'
  if (s === 'inactive') return 'inactive'
  return 'deprecated'
}

function mapSyncStatus(s: string): AirbyteSyncStatus | null {
  const map: Record<string, AirbyteSyncStatus> = {
    pending: 'pending',
    running: 'running',
    succeeded: 'succeeded',
    incomplete: 'succeeded',
    failed: 'failed',
    cancelled: 'cancelled',
  }
  return map[s] ?? null
}

function mapJob(j: Record<string, unknown>): AirbyteSyncJob {
  return {
    jobId: (j.jobId ?? j.id ?? '') as string,
    connectionId: (j.connectionId ?? '') as string,
    status: mapSyncStatus(j.status as string) ?? 'pending',
    startedAt: (j.startTime ?? j.createdAt ?? '') as string,
    completedAt: (j.lastUpdatedAt ?? null) as string | null,
    bytesLoaded: (j.bytesSynced ?? 0) as number,
    recordsLoaded: (j.rowsSynced ?? 0) as number,
    error: null,
  }
}

// ── Mock data ──
// Three sources: threat-intel feed, infrastructure CMDB, and GitHub.

const GITHUB_CONNECTOR_ID = 'f4ba487b-8d44-492e-8f2d-4da105540d35'

const MOCK_CONNECTIONS: AirbyteConnection[] = [
  {
    connectionId: 'conn-threat-intel',
    name: 'Threat Intel Feed → Guild Warehouse',
    sourceId: 'src-threat-intel',
    sourceName: 'Threat Intelligence API',
    status: 'active',
    schedule: 'Every 15 min',
    lastSyncAt: new Date(Date.now() - 4 * 60_000).toISOString(),
    lastSyncStatus: 'succeeded',
  },
  {
    connectionId: 'conn-infra-cmdb',
    name: 'Infrastructure CMDB → Guild Warehouse',
    sourceId: 'src-infra-cmdb',
    sourceName: 'Infrastructure CMDB',
    status: 'active',
    schedule: 'Every 30 min',
    lastSyncAt: new Date(Date.now() - 12 * 60_000).toISOString(),
    lastSyncStatus: 'succeeded',
  },
  {
    connectionId: GITHUB_CONNECTOR_ID,
    name: 'GitHub → Guild Warehouse',
    sourceId: 'src-github',
    sourceName: 'GitHub',
    status: 'active',
    schedule: 'Every 15 min',
    lastSyncAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    lastSyncStatus: 'succeeded',
  },
]

function mockConnections(): AirbyteConnection[] {
  // Update lastSyncAt to be relative to "now" so freshness indicators work
  return MOCK_CONNECTIONS.map(c => ({
    ...c,
    lastSyncAt: c.connectionId === 'conn-threat-intel'
      ? new Date(Date.now() - 4 * 60_000).toISOString()
      : c.connectionId === GITHUB_CONNECTOR_ID
        ? new Date(Date.now() - 2 * 60_000).toISOString()
        : new Date(Date.now() - 12 * 60_000).toISOString(),
  }))
}

function mockTriggerSync(connectionId: string): AirbyteSyncJob {
  return {
    jobId: `job-${Date.now()}`,
    connectionId,
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: null,
    bytesLoaded: 0,
    recordsLoaded: 0,
    error: null,
  }
}

function mockJobStatus(jobId: string): AirbyteSyncJob {
  return {
    jobId,
    connectionId: 'conn-threat-intel',
    status: 'succeeded',
    startedAt: new Date(Date.now() - 30_000).toISOString(),
    completedAt: new Date().toISOString(),
    bytesLoaded: 47_200,
    recordsLoaded: 312,
    error: null,
  }
}

function mockListJobs(connectionId: string): AirbyteSyncJob[] {
  const now = Date.now()
  return [
    { jobId: `job-${now - 1}`, connectionId, status: 'succeeded', startedAt: new Date(now - 4 * 60_000).toISOString(), completedAt: new Date(now - 3.5 * 60_000).toISOString(), bytesLoaded: 47_200, recordsLoaded: 312, error: null },
    { jobId: `job-${now - 2}`, connectionId, status: 'succeeded', startedAt: new Date(now - 19 * 60_000).toISOString(), completedAt: new Date(now - 18.5 * 60_000).toISOString(), bytesLoaded: 45_800, recordsLoaded: 298, error: null },
    { jobId: `job-${now - 3}`, connectionId, status: 'succeeded', startedAt: new Date(now - 34 * 60_000).toISOString(), completedAt: new Date(now - 33 * 60_000).toISOString(), bytesLoaded: 44_100, recordsLoaded: 287, error: null },
  ]
}

const THREAT_INTEL_RECORDS: Record<string, AirbyteSyncedRecord[]> = {
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

const CMDB_RECORDS: Record<string, AirbyteSyncedRecord[]> = {
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

const GITHUB_RECORDS: Record<string, AirbyteSyncedRecord[]> = {
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

function mockSyncedRecords(connectionId: string, missionId: string): AirbyteSyncedRecord[] {
  if (connectionId === 'conn-threat-intel') {
    return THREAT_INTEL_RECORDS[missionId] ?? []
  }
  if (connectionId === 'conn-infra-cmdb') {
    return CMDB_RECORDS[missionId] ?? []
  }
  if (connectionId === GITHUB_CONNECTOR_ID) {
    return GITHUB_RECORDS[missionId] ?? []
  }
  return []
}
