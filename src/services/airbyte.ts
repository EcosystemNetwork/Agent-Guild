/**
 * Airbyte Service — Server-Side Data Plane Client
 *
 * All Airbyte API calls and credential handling happen on the Express backend.
 * This module is a thin client that calls /api/airbyte/* endpoints. No tokens
 * or warehouse credentials ever reach the browser.
 */

import type {
  AirbyteConnection,
  AirbyteSyncJob,
  AirbyteMissionContext,
  AirbyteSyncStatus,
} from '../types'

// ── Helpers ──

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

// ── Public API — all calls go through the backend ──

export async function listConnections(): Promise<AirbyteConnection[]> {
  const res = await fetch('/api/airbyte/connections')
  if (!res.ok) throw new Error(`listConnections: ${res.status} ${res.statusText}`)
  const { data } = await res.json() as { data: Array<Record<string, unknown>> }
  return data.map(c => ({
    connectionId: c.connectionId as string,
    name: c.name as string,
    sourceId: c.sourceId as string,
    sourceName: c.sourceName as string,
    status: mapConnectionStatus(c.status as string),
    schedule: c.schedule as string,
    lastSyncAt: (c.lastSyncAt as string) ?? null,
    lastSyncStatus: mapSyncStatus((c.lastSyncStatus as string) ?? ''),
  }))
}

export async function triggerSync(connectionId: string): Promise<AirbyteSyncJob> {
  const res = await fetch('/api/airbyte/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ connectionId }),
  })
  if (!res.ok) throw new Error(`triggerSync: ${res.status} ${res.statusText}`)
  const j = await res.json() as Record<string, unknown>
  return {
    jobId: j.jobId as string,
    connectionId: j.connectionId as string,
    status: mapSyncStatus(j.status as string) ?? 'pending',
    startedAt: j.startedAt as string,
    completedAt: (j.completedAt as string) ?? null,
    bytesLoaded: (j.bytesLoaded as number) ?? 0,
    recordsLoaded: (j.recordsLoaded as number) ?? 0,
    error: (j.error as string) ?? null,
  }
}

export async function getJobStatus(jobId: string): Promise<AirbyteSyncJob> {
  const res = await fetch(`/api/airbyte/jobs/${encodeURIComponent(jobId)}`)
  if (!res.ok) throw new Error(`getJobStatus: ${res.status} ${res.statusText}`)
  const j = await res.json() as Record<string, unknown>
  return {
    jobId: j.jobId as string,
    connectionId: j.connectionId as string,
    status: mapSyncStatus(j.status as string) ?? 'pending',
    startedAt: j.startedAt as string,
    completedAt: (j.completedAt as string) ?? null,
    bytesLoaded: (j.bytesLoaded as number) ?? 0,
    recordsLoaded: (j.recordsLoaded as number) ?? 0,
    error: (j.error as string) ?? null,
  }
}

export async function listJobs(connectionId: string): Promise<AirbyteSyncJob[]> {
  const res = await fetch(`/api/airbyte/jobs?connectionId=${encodeURIComponent(connectionId)}`)
  if (!res.ok) throw new Error(`listJobs: ${res.status} ${res.statusText}`)
  const { data } = await res.json() as { data: Array<Record<string, unknown>> }
  return data.map(j => ({
    jobId: j.jobId as string,
    connectionId: j.connectionId as string,
    status: mapSyncStatus(j.status as string) ?? 'pending',
    startedAt: j.startedAt as string,
    completedAt: (j.completedAt as string) ?? null,
    bytesLoaded: (j.bytesLoaded as number) ?? 0,
    recordsLoaded: (j.recordsLoaded as number) ?? 0,
    error: (j.error as string) ?? null,
  }))
}

/**
 * Fetch full mission context from the server. The backend reads actual
 * synced records from the Airbyte destination warehouse and maps them
 * to mission context with real timestamps.
 */
export async function fetchMissionContext(missionId: string): Promise<AirbyteMissionContext[]> {
  const res = await fetch(`/api/airbyte/context/${encodeURIComponent(missionId)}`)
  if (!res.ok) throw new Error(`fetchMissionContext: ${res.status} ${res.statusText}`)
  const body = await res.json() as {
    missionId: string
    contexts: Array<{
      missionId: string
      connectionId: string
      sourceName: string
      syncStatus: string
      lastSyncAt: string | null
      records: Array<{ stream: string; data: Record<string, unknown>; syncedAt: string }>
      freshnessMs: number
    }>
    fetchedAt: string
  }
  return body.contexts.map(ctx => ({
    missionId: ctx.missionId,
    connectionId: ctx.connectionId,
    sourceName: ctx.sourceName,
    syncStatus: mapSyncStatus(ctx.syncStatus) ?? 'pending',
    lastSyncAt: ctx.lastSyncAt,
    records: ctx.records,
    freshnessMs: ctx.freshnessMs,
  }))
}
