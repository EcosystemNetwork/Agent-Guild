/**
 * REST API routes for all persisted entities.
 * All routes are mounted under /api/data/* in the Express server.
 */
import { Router } from 'express'
import type { Request, Response } from 'express'
import db from './db.js'

const router = Router()

// ─── Helpers ───

function jsonCol(val: unknown): unknown {
  if (typeof val === 'string') {
    try { return JSON.parse(val) } catch { return val }
  }
  return val
}

/** Map a DB row (snake_case) to a camelCase object with JSON parsing */
function mapAgent(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    specialty: jsonCol(row.specialty),
    trustScore: row.trust_score,
    status: row.status,
    missionClock: row.mission_clock,
    avatar: row.avatar,
    missionsCompleted: row.missions_completed,
  }
}

function mapMission(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    assignedAgent: row.assigned_agent,
    progress: row.progress,
    priority: row.priority,
    startedAt: row.started_at,
    description: row.description,
  }
}

function mapActivityEvent(row: Record<string, unknown>) {
  return {
    id: row.id,
    timestamp: row.timestamp,
    type: row.type,
    icon: row.icon,
    description: row.description,
    color: row.color,
  }
}

function mapGuildMetrics(row: Record<string, unknown>) {
  return {
    status: row.status,
    activeMissions: row.active_missions,
    totalMissionCapacity: row.total_mission_capacity,
    missionBreakdown: jsonCol(row.mission_breakdown),
    trustScore: row.trust_score,
    trustTrend: row.trust_trend,
    agentsDeployed: row.agents_deployed,
    uptime: row.uptime,
    verifiedLogs: row.verified_logs,
    sparkline: jsonCol(row.sparkline),
  }
}

function mapTrustMetric(row: Record<string, unknown>) {
  return {
    agentId: row.agent_id,
    agentName: row.agent_name,
    trustScore: row.trust_score,
    trend: row.trend,
    successRate: row.success_rate,
    missionsAudited: row.missions_audited,
    lastAudit: row.last_audit,
    riskLevel: row.risk_level,
    verifiedLogs: row.verified_logs,
  }
}

function mapTrustEvent(row: Record<string, unknown>) {
  return {
    id: row.id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    delta: row.delta,
    reason: row.reason,
    timestamp: row.timestamp,
    missionId: row.mission_id ?? undefined,
  }
}

function mapBadge(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    description: row.description,
    color: row.color,
    earnedBy: jsonCol(row.earned_by),
  }
}

function mapChannel(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    unread: row.unread,
    missionId: row.mission_id ?? undefined,
  }
}

function mapChatMessage(row: Record<string, unknown>) {
  return {
    id: row.id,
    from: row.from,
    fromAvatar: row.from_avatar,
    to: row.to,
    content: row.content,
    timestamp: row.timestamp,
    channel: row.channel,
    pinned: row.pinned === 1 ? true : undefined,
    type: row.type,
  }
}

function mapMissionContext(row: Record<string, unknown>) {
  return {
    missionId: row.mission_id,
    objective: row.objective,
    status: row.status,
    agents: jsonCol(row.agents),
    progress: row.progress,
    threats: jsonCol(row.threats),
  }
}

function mapApproval(row: Record<string, unknown>) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    description: row.description,
    requestedBy: row.requested_by,
    priority: row.priority,
    timestamp: row.timestamp,
    status: row.status,
  }
}

function mapIncident(row: Record<string, unknown>) {
  return {
    id: row.id,
    severity: row.severity,
    title: row.title,
    description: row.description,
    detectedAt: row.detected_at,
    resolvedAt: row.resolved_at ?? undefined,
    assignedAgent: row.assigned_agent,
    status: row.status,
  }
}

function mapHealthCard(row: Record<string, unknown>) {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    metric: row.metric,
    value: row.value,
    max: row.max,
    unit: row.unit,
    trend: row.trend,
    icon: row.icon,
  }
}

function mapOperatorAlert(row: Record<string, unknown>) {
  return {
    id: row.id,
    timestamp: row.timestamp,
    severity: row.severity,
    title: row.title,
    description: row.description,
    source: row.source,
    status: row.status,
  }
}

function mapRegistryEntry(row: Record<string, unknown>) {
  return {
    guildAgentId: row.guild_agent_id,
    agentRecordId: row.agent_record_id,
    displayName: row.display_name,
    role: row.role,
    defaultSessionMode: row.default_session_mode,
    toolPolicy: row.tool_policy,
    connectionStatus: row.connection_status,
    currentSessionId: row.current_session_id ?? null,
    lastActivity: row.last_activity,
  }
}

function mapRoutingRule(row: Record<string, unknown>) {
  return {
    role: row.role,
    label: row.label,
    description: row.description,
    preferredAgentTypes: jsonCol(row.preferred_agent_types),
    icon: row.icon,
    color: row.color,
  }
}

function mapTool(row: Record<string, unknown>) {
  return {
    name: row.name,
    label: row.label,
    description: row.description,
    icon: row.icon,
    category: row.category,
    parameters: jsonCol(row.parameters),
  }
}

function mapMissionExecution(row: Record<string, unknown>) {
  // Fetch associated transcript and tool actions
  const transcriptRows = db.prepare('SELECT * FROM mission_transcript_entries WHERE execution_id = ? ORDER BY created_at').all(row.id as string) as Record<string, unknown>[]
  const toolRows = db.prepare('SELECT * FROM tool_actions WHERE execution_id = ? ORDER BY started_at').all(row.id as string) as Record<string, unknown>[]

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    status: row.status,
    assignedAgentId: row.assigned_agent_id,
    agentRecordId: row.agent_record_id,
    sessionKey: row.session_key,
    prompt: row.prompt,
    context: row.context,
    priority: row.priority,
    requiresApproval: row.requires_approval === 1,
    createdAt: row.created_at,
    startedAt: row.started_at ?? null,
    completedAt: row.completed_at ?? null,
    progress: row.progress,
    transcript: transcriptRows.map(t => ({
      id: t.id,
      timestamp: t.timestamp,
      role: t.role,
      agentName: t.agent_name,
      content: t.content,
      tokenCount: t.token_count ?? undefined,
    })),
    toolActions: toolRows.map(t => ({
      id: t.id,
      toolName: t.tool_name,
      input: jsonCol(t.input),
      output: t.output ?? null,
      status: t.status,
      startedAt: t.started_at,
      completedAt: t.completed_at ?? null,
      error: t.error ?? null,
    })),
    error: row.error ?? null,
  }
}

// ─── AGENTS ───

router.get('/agents', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM agents ORDER BY trust_score DESC').all() as Record<string, unknown>[]
  res.json(rows.map(mapAgent))
})

router.get('/agents/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
  if (!row) { res.status(404).json({ error: 'Agent not found' }); return }
  res.json(mapAgent(row))
})

router.post('/agents', (req: Request, res: Response) => {
  const { id, name, role, specialty, trustScore, status, missionClock, avatar, missionsCompleted } = req.body
  db.prepare(`
    INSERT INTO agents (id, name, role, specialty, trust_score, status, mission_clock, avatar, missions_completed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, role, JSON.stringify(specialty ?? []), trustScore ?? 50, status ?? 'standby', missionClock ?? '0h', avatar ?? '', missionsCompleted ?? 0)
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as Record<string, unknown>
  res.status(201).json(mapAgent(row))
})

router.patch('/agents/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id)
  if (!existing) { res.status(404).json({ error: 'Agent not found' }); return }
  const fields: string[] = []
  const values: unknown[] = []
  const allowed = { name: 'name', role: 'role', specialty: 'specialty', trustScore: 'trust_score', status: 'status', missionClock: 'mission_clock', avatar: 'avatar', missionsCompleted: 'missions_completed' } as Record<string, string>
  for (const [key, col] of Object.entries(allowed)) {
    if (req.body[key] !== undefined) {
      fields.push(`${col} = ?`)
      values.push(key === 'specialty' ? JSON.stringify(req.body[key]) : req.body[key])
    }
  }
  if (fields.length === 0) { res.status(400).json({ error: 'No fields to update' }); return }
  fields.push("updated_at = datetime('now')")
  values.push(req.params.id)
  db.prepare(`UPDATE agents SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(req.params.id) as Record<string, unknown>
  res.json(mapAgent(row))
})

// ─── MISSIONS ───

router.get('/missions', (req: Request, res: Response) => {
  let query = 'SELECT * FROM missions'
  const params: unknown[] = []
  const conditions: string[] = []
  if (req.query.status) { conditions.push('status = ?'); params.push(req.query.status) }
  if (req.query.type) { conditions.push('type = ?'); params.push(req.query.type) }
  if (conditions.length) query += ' WHERE ' + conditions.join(' AND ')
  query += ' ORDER BY rowid DESC'
  const rows = db.prepare(query).all(...params) as Record<string, unknown>[]
  res.json(rows.map(mapMission))
})

router.get('/missions/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM missions WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
  if (!row) { res.status(404).json({ error: 'Mission not found' }); return }
  res.json(mapMission(row))
})

router.post('/missions', (req: Request, res: Response) => {
  const { id, name, type, status, assignedAgent, progress, priority, startedAt, description } = req.body
  db.prepare(`
    INSERT INTO missions (id, name, type, status, assigned_agent, progress, priority, started_at, description)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, type, status ?? 'pending', assignedAgent ?? '', progress ?? 0, priority ?? 'medium', startedAt ?? '', description ?? '')
  const row = db.prepare('SELECT * FROM missions WHERE id = ?').get(id) as Record<string, unknown>
  res.status(201).json(mapMission(row))
})

router.patch('/missions/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM missions WHERE id = ?').get(req.params.id)
  if (!existing) { res.status(404).json({ error: 'Mission not found' }); return }
  const fields: string[] = []
  const values: unknown[] = []
  const allowed = { name: 'name', type: 'type', status: 'status', assignedAgent: 'assigned_agent', progress: 'progress', priority: 'priority', startedAt: 'started_at', description: 'description' } as Record<string, string>
  for (const [key, col] of Object.entries(allowed)) {
    if (req.body[key] !== undefined) { fields.push(`${col} = ?`); values.push(req.body[key]) }
  }
  if (fields.length === 0) { res.status(400).json({ error: 'No fields to update' }); return }
  fields.push("updated_at = datetime('now')")
  values.push(req.params.id)
  db.prepare(`UPDATE missions SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  const row = db.prepare('SELECT * FROM missions WHERE id = ?').get(req.params.id) as Record<string, unknown>
  res.json(mapMission(row))
})

// ─── MISSION CONTEXT ───

router.get('/mission-context', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM mission_context').all() as Record<string, unknown>[]
  const result: Record<string, unknown> = {}
  for (const row of rows) {
    const mapped = mapMissionContext(row)
    result[mapped.missionId as string] = { objective: mapped.objective, status: mapped.status, agents: mapped.agents, progress: mapped.progress, threats: mapped.threats }
  }
  res.json(result)
})

router.get('/mission-context/:missionId', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM mission_context WHERE mission_id = ?').get(req.params.missionId) as Record<string, unknown> | undefined
  if (!row) { res.status(404).json({ error: 'Mission context not found' }); return }
  res.json(mapMissionContext(row))
})

// ─── ACTIVITY ───

router.get('/activity', (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 50
  const rows = db.prepare('SELECT * FROM activity_events ORDER BY rowid DESC LIMIT ?').all(limit) as Record<string, unknown>[]
  res.json(rows.map(mapActivityEvent))
})

router.post('/activity', (req: Request, res: Response) => {
  const { id, timestamp, type, icon, description, color } = req.body
  db.prepare('INSERT INTO activity_events (id, timestamp, type, icon, description, color) VALUES (?, ?, ?, ?, ?, ?)').run(id, timestamp, type, icon ?? '', description ?? '', color ?? '')
  res.status(201).json({ id })
})

// ─── GUILD METRICS ───

router.get('/guild-metrics', (_req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM guild_metrics WHERE id = 1').get() as Record<string, unknown> | undefined
  if (!row) { res.json(null); return }
  res.json(mapGuildMetrics(row))
})

router.patch('/guild-metrics', (req: Request, res: Response) => {
  const fields: string[] = []
  const values: unknown[] = []
  const allowed = { status: 'status', activeMissions: 'active_missions', totalMissionCapacity: 'total_mission_capacity', missionBreakdown: 'mission_breakdown', trustScore: 'trust_score', trustTrend: 'trust_trend', agentsDeployed: 'agents_deployed', uptime: 'uptime', verifiedLogs: 'verified_logs', sparkline: 'sparkline' } as Record<string, string>
  for (const [key, col] of Object.entries(allowed)) {
    if (req.body[key] !== undefined) {
      fields.push(`${col} = ?`)
      values.push(['missionBreakdown', 'sparkline'].includes(key) ? JSON.stringify(req.body[key]) : req.body[key])
    }
  }
  if (fields.length === 0) { res.status(400).json({ error: 'No fields to update' }); return }
  fields.push("updated_at = datetime('now')")
  db.prepare(`UPDATE guild_metrics SET ${fields.join(', ')} WHERE id = 1`).run(...values)
  const row = db.prepare('SELECT * FROM guild_metrics WHERE id = 1').get() as Record<string, unknown>
  res.json(mapGuildMetrics(row))
})

// ─── TRUST ───

router.get('/trust-metrics', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM trust_metrics ORDER BY trust_score DESC').all() as Record<string, unknown>[]
  res.json(rows.map(mapTrustMetric))
})

router.get('/trust-history', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT date, score FROM trust_history ORDER BY id').all() as Record<string, unknown>[]
  res.json(rows)
})

router.get('/trust-events', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM trust_events ORDER BY rowid DESC').all() as Record<string, unknown>[]
  res.json(rows.map(mapTrustEvent))
})

router.post('/trust-events', (req: Request, res: Response) => {
  const { id, agentId, agentName, delta, reason, timestamp, missionId } = req.body
  db.prepare('INSERT INTO trust_events (id, agent_id, agent_name, delta, reason, timestamp, mission_id) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, agentId, agentName, delta, reason, timestamp, missionId ?? null)
  res.status(201).json({ id })
})

router.get('/badges', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM badges').all() as Record<string, unknown>[]
  res.json(rows.map(mapBadge))
})

// ─── CHAT ───

router.get('/channels', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM chat_channels ORDER BY rowid').all() as Record<string, unknown>[]
  res.json(rows.map(mapChannel))
})

router.get('/channels/:id/messages', (req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM chat_messages WHERE channel = ? ORDER BY rowid').all(req.params.id) as Record<string, unknown>[]
  res.json(rows.map(mapChatMessage))
})

router.get('/messages', (_req: Request, res: Response) => {
  const channels = db.prepare('SELECT DISTINCT channel FROM chat_messages').all() as { channel: string }[]
  const result: Record<string, unknown[]> = {}
  for (const { channel } of channels) {
    const rows = db.prepare('SELECT * FROM chat_messages WHERE channel = ? ORDER BY rowid').all(channel) as Record<string, unknown>[]
    result[channel] = rows.map(mapChatMessage)
  }
  res.json(result)
})

router.post('/messages', (req: Request, res: Response) => {
  const { id, from, fromAvatar, to, content, timestamp, channel, pinned, type } = req.body
  db.prepare(`
    INSERT INTO chat_messages (id, "from", from_avatar, "to", content, timestamp, channel, pinned, type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, from, fromAvatar ?? '', to, content, timestamp, channel, pinned ? 1 : 0, type ?? 'message')
  const row = db.prepare('SELECT * FROM chat_messages WHERE id = ?').get(id) as Record<string, unknown>
  res.status(201).json(mapChatMessage(row))
})

// ─── OPERATOR ───

router.get('/approvals', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM approval_queue ORDER BY rowid DESC').all() as Record<string, unknown>[]
  res.json(rows.map(mapApproval))
})

router.patch('/approvals/:id', (req: Request, res: Response) => {
  const { status } = req.body
  if (!status) { res.status(400).json({ error: 'status required' }); return }
  db.prepare('UPDATE approval_queue SET status = ? WHERE id = ?').run(status, req.params.id)
  const row = db.prepare('SELECT * FROM approval_queue WHERE id = ?').get(req.params.id) as Record<string, unknown>
  if (!row) { res.status(404).json({ error: 'Approval not found' }); return }
  res.json(mapApproval(row))
})

router.get('/incidents', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM incidents ORDER BY rowid DESC').all() as Record<string, unknown>[]
  res.json(rows.map(mapIncident))
})

router.patch('/incidents/:id', (req: Request, res: Response) => {
  const fields: string[] = []
  const values: unknown[] = []
  if (req.body.status) { fields.push('status = ?'); values.push(req.body.status) }
  if (req.body.resolvedAt) { fields.push('resolved_at = ?'); values.push(req.body.resolvedAt) }
  if (req.body.assignedAgent) { fields.push('assigned_agent = ?'); values.push(req.body.assignedAgent) }
  if (fields.length === 0) { res.status(400).json({ error: 'No fields to update' }); return }
  values.push(req.params.id)
  db.prepare(`UPDATE incidents SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  const row = db.prepare('SELECT * FROM incidents WHERE id = ?').get(req.params.id) as Record<string, unknown>
  if (!row) { res.status(404).json({ error: 'Incident not found' }); return }
  res.json(mapIncident(row))
})

router.get('/health-cards', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM health_cards ORDER BY rowid').all() as Record<string, unknown>[]
  res.json(rows.map(mapHealthCard))
})

router.get('/operator-alerts', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM operator_alerts ORDER BY rowid DESC').all() as Record<string, unknown>[]
  res.json(rows.map(mapOperatorAlert))
})

router.patch('/operator-alerts/:id', (req: Request, res: Response) => {
  const { status } = req.body
  if (!status) { res.status(400).json({ error: 'status required' }); return }
  db.prepare('UPDATE operator_alerts SET status = ? WHERE id = ?').run(status, req.params.id)
  const row = db.prepare('SELECT * FROM operator_alerts WHERE id = ?').get(req.params.id) as Record<string, unknown>
  if (!row) { res.status(404).json({ error: 'Alert not found' }); return }
  res.json(mapOperatorAlert(row))
})

// ─── REGISTRY ───

router.get('/registry', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM agent_registry ORDER BY rowid').all() as Record<string, unknown>[]
  res.json(rows.map(mapRegistryEntry))
})

router.patch('/registry/:guildAgentId', (req: Request, res: Response) => {
  const fields: string[] = []
  const values: unknown[] = []
  const allowed = { agentRecordId: 'agent_record_id', connectionStatus: 'connection_status', currentSessionId: 'current_session_id', lastActivity: 'last_activity', defaultSessionMode: 'default_session_mode', toolPolicy: 'tool_policy', role: 'role' } as Record<string, string>
  for (const [key, col] of Object.entries(allowed)) {
    if (req.body[key] !== undefined) { fields.push(`${col} = ?`); values.push(req.body[key]) }
  }
  if (fields.length === 0) { res.status(400).json({ error: 'No fields to update' }); return }
  values.push(req.params.guildAgentId)
  db.prepare(`UPDATE agent_registry SET ${fields.join(', ')} WHERE guild_agent_id = ?`).run(...values)
  const row = db.prepare('SELECT * FROM agent_registry WHERE guild_agent_id = ?').get(req.params.guildAgentId) as Record<string, unknown>
  if (!row) { res.status(404).json({ error: 'Registry entry not found' }); return }
  res.json(mapRegistryEntry(row))
})

router.get('/routing-rules', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM routing_rules ORDER BY rowid').all() as Record<string, unknown>[]
  res.json(rows.map(mapRoutingRule))
})

router.get('/agent-records', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM available_agent_records ORDER BY rowid').all() as Record<string, unknown>[]
  res.json(rows.map(r => ({ id: r.id, label: r.label, role: r.role })))
})

// ─── TOOLS ───

router.get('/tools', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM tools ORDER BY rowid').all() as Record<string, unknown>[]
  res.json(rows.map(mapTool))
})

// ─── MISSION EXECUTIONS ───

router.get('/executions', (_req: Request, res: Response) => {
  const rows = db.prepare('SELECT * FROM mission_executions ORDER BY created_at DESC').all() as Record<string, unknown>[]
  res.json(rows.map(mapMissionExecution))
})

router.get('/executions/:id', (req: Request, res: Response) => {
  const row = db.prepare('SELECT * FROM mission_executions WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined
  if (!row) { res.status(404).json({ error: 'Execution not found' }); return }
  res.json(mapMissionExecution(row))
})

router.post('/executions', (req: Request, res: Response) => {
  const { id, name, type, status, assignedAgentId, agentRecordId, sessionKey, prompt, context, priority, requiresApproval } = req.body
  db.prepare(`
    INSERT INTO mission_executions (id, name, type, status, assigned_agent_id, agent_record_id, session_key, prompt, context, priority, requires_approval)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, type ?? 'research', status ?? 'awaiting-approval', assignedAgentId ?? '', agentRecordId ?? '', sessionKey ?? '', prompt ?? '', context ?? '', priority ?? 'medium', requiresApproval ? 1 : 0)
  const row = db.prepare('SELECT * FROM mission_executions WHERE id = ?').get(id) as Record<string, unknown>
  res.status(201).json(mapMissionExecution(row))
})

router.patch('/executions/:id', (req: Request, res: Response) => {
  const fields: string[] = []
  const values: unknown[] = []
  const allowed = { status: 'status', progress: 'progress', startedAt: 'started_at', completedAt: 'completed_at', error: 'error' } as Record<string, string>
  for (const [key, col] of Object.entries(allowed)) {
    if (req.body[key] !== undefined) { fields.push(`${col} = ?`); values.push(req.body[key]) }
  }
  if (fields.length === 0) { res.status(400).json({ error: 'No fields to update' }); return }
  values.push(req.params.id)
  db.prepare(`UPDATE mission_executions SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  const row = db.prepare('SELECT * FROM mission_executions WHERE id = ?').get(req.params.id) as Record<string, unknown>
  if (!row) { res.status(404).json({ error: 'Execution not found' }); return }
  res.json(mapMissionExecution(row))
})

// ─── TRANSCRIPT ENTRIES ───

router.post('/executions/:id/transcript', (req: Request, res: Response) => {
  const { entryId, timestamp, role, agentName, content, tokenCount } = req.body
  db.prepare(`
    INSERT INTO mission_transcript_entries (id, execution_id, timestamp, role, agent_name, content, token_count)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(entryId, req.params.id, timestamp, role ?? 'system', agentName ?? '', content ?? '', tokenCount ?? null)
  res.status(201).json({ id: entryId })
})

// ─── TOOL ACTIONS ───

router.post('/executions/:id/tool-actions', (req: Request, res: Response) => {
  const { actionId, toolName, input, status, startedAt } = req.body
  db.prepare(`
    INSERT INTO tool_actions (id, execution_id, tool_name, input, status, started_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(actionId, req.params.id, toolName, JSON.stringify(input ?? {}), status ?? 'pending', startedAt ?? new Date().toISOString())
  res.status(201).json({ id: actionId })
})

router.patch('/tool-actions/:id', (req: Request, res: Response) => {
  const fields: string[] = []
  const values: unknown[] = []
  if (req.body.status) { fields.push('status = ?'); values.push(req.body.status) }
  if (req.body.output !== undefined) { fields.push('output = ?'); values.push(req.body.output) }
  if (req.body.completedAt) { fields.push('completed_at = ?'); values.push(req.body.completedAt) }
  if (req.body.error !== undefined) { fields.push('error = ?'); values.push(req.body.error) }
  if (fields.length === 0) { res.status(400).json({ error: 'No fields to update' }); return }
  values.push(req.params.id)
  db.prepare(`UPDATE tool_actions SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  res.json({ id: req.params.id })
})

// ─── CALLS (replaces JSON file store) ───

router.get('/calls', (req: Request, res: Response) => {
  let query = 'SELECT * FROM calls'
  const params: unknown[] = []
  if (req.query.channelId) { query += ' WHERE channel_id = ?'; params.push(req.query.channelId) }
  else if (req.query.missionId) { query += ' WHERE mission_id = ?'; params.push(req.query.missionId) }
  query += ' ORDER BY created_at DESC'
  const rows = db.prepare(query).all(...params) as Record<string, unknown>[]
  res.json(rows.map(r => ({
    id: r.id,
    blandCallId: r.bland_call_id,
    phoneNumber: r.phone_number,
    status: r.status,
    missionId: r.mission_id,
    channelId: r.channel_id,
    launchedAt: r.launched_at,
    completedAt: r.completed_at,
    duration: r.duration,
    summary: r.summary,
    transcript: r.transcript,
    recordingUrl: r.recording_url,
    pathwayId: r.pathway_id,
    requestData: jsonCol(r.request_data),
    error: r.error,
    webhookEvents: jsonCol(r.webhook_events),
    blandDetails: jsonCol(r.bland_details),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  })))
})

router.post('/calls', (req: Request, res: Response) => {
  const b = req.body
  db.prepare(`
    INSERT INTO calls (id, bland_call_id, phone_number, status, mission_id, channel_id, launched_at, pathway_id, request_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(b.id, b.blandCallId ?? null, b.phoneNumber ?? '', b.status ?? 'queued', b.missionId ?? null, b.channelId ?? '', b.launchedAt ?? new Date().toISOString(), b.pathwayId ?? null, JSON.stringify(b.requestData ?? {}))
  res.status(201).json({ id: b.id })
})

router.patch('/calls/:id', (req: Request, res: Response) => {
  const fields: string[] = []
  const values: unknown[] = []
  const allowed: Record<string, string> = { blandCallId: 'bland_call_id', status: 'status', completedAt: 'completed_at', duration: 'duration', summary: 'summary', transcript: 'transcript', recordingUrl: 'recording_url', error: 'error' }
  for (const [key, col] of Object.entries(allowed)) {
    if (req.body[key] !== undefined) { fields.push(`${col} = ?`); values.push(req.body[key]) }
  }
  if (req.body.webhookEvents) { fields.push('webhook_events = ?'); values.push(JSON.stringify(req.body.webhookEvents)) }
  if (req.body.blandDetails) { fields.push('bland_details = ?'); values.push(JSON.stringify(req.body.blandDetails)) }
  if (fields.length === 0) { res.status(400).json({ error: 'No fields to update' }); return }
  fields.push("updated_at = datetime('now')")
  values.push(req.params.id)
  db.prepare(`UPDATE calls SET ${fields.join(', ')} WHERE id = ?`).run(...values)
  res.json({ id: req.params.id })
})

export default router
