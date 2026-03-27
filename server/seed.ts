/**
 * Seed the SQLite database from src/data/* fixture files.
 * Safe to run multiple times — uses INSERT OR IGNORE.
 */
import db from './db.js'

// ── Import seed data ──
// We use dynamic path resolution because these are frontend modules.
// The server runs via tsx which handles .ts imports from src/.

import { agents } from '../src/data/agents.js'
import { missions } from '../src/data/missions.js'
import { activityFeed, guildMetrics } from '../src/data/activity.js'
import { channels, chatMessages, missionContext } from '../src/data/chat.js'
import { trustMetrics } from '../src/data/trust.js'
import { trustHistory, trustEvents, badges } from '../src/data/trustAnalytics.js'
import {
  approvalQueue,
  recentIncidents,
  healthCards,
  operatorAlerts,
} from '../src/data/operator.js'
import {
  agentRegistry,
  routingRules,
} from '../src/data/registry.js'
import { availableTools } from '../src/data/tools.js'

export function seed() {
  const hasData = db.prepare('SELECT COUNT(*) as n FROM agents').get() as { n: number }
  if (hasData.n > 0) {
    console.log('[seed] Database already seeded — skipping')
    return
  }

  console.log('[seed] Seeding database from fixtures...')

  const tx = db.transaction(() => {
    // ── Agents ──
    const insertAgent = db.prepare(`
      INSERT OR IGNORE INTO agents (id, name, role, specialty, trust_score, status, mission_clock, avatar, missions_completed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const a of agents) {
      insertAgent.run(a.id, a.name, a.role, JSON.stringify(a.specialty), a.trustScore, a.status, a.missionClock, a.avatar, a.missionsCompleted)
    }

    // ── Missions ──
    const insertMission = db.prepare(`
      INSERT OR IGNORE INTO missions (id, name, type, status, assigned_agent, progress, priority, started_at, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const m of missions) {
      insertMission.run(m.id, m.name, m.type, m.status, m.assignedAgent, m.progress, m.priority, m.startedAt, m.description)
    }

    // ── Mission context ──
    const insertMissionCtx = db.prepare(`
      INSERT OR IGNORE INTO mission_context (mission_id, objective, status, agents, progress, threats)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    for (const [missionId, ctx] of Object.entries(missionContext)) {
      insertMissionCtx.run(missionId, ctx.objective, ctx.status, JSON.stringify(ctx.agents), ctx.progress, JSON.stringify(ctx.threats))
    }

    // ── Activity events ──
    const insertActivity = db.prepare(`
      INSERT OR IGNORE INTO activity_events (id, timestamp, type, icon, description, color)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    for (const e of activityFeed) {
      insertActivity.run(e.id, e.timestamp, e.type, e.icon, e.description, e.color)
    }

    // ── Guild metrics ──
    db.prepare(`
      INSERT OR IGNORE INTO guild_metrics (id, status, active_missions, total_mission_capacity, mission_breakdown, trust_score, trust_trend, agents_deployed, uptime, verified_logs, sparkline)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      guildMetrics.status,
      guildMetrics.activeMissions,
      guildMetrics.totalMissionCapacity,
      JSON.stringify(guildMetrics.missionBreakdown),
      guildMetrics.trustScore,
      guildMetrics.trustTrend,
      guildMetrics.agentsDeployed,
      guildMetrics.uptime,
      guildMetrics.verifiedLogs,
      JSON.stringify(guildMetrics.sparkline),
    )

    // ── Trust metrics ──
    const insertTrustMetric = db.prepare(`
      INSERT OR IGNORE INTO trust_metrics (agent_id, agent_name, trust_score, trend, success_rate, missions_audited, last_audit, risk_level, verified_logs)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const t of trustMetrics) {
      insertTrustMetric.run(t.agentId, t.agentName, t.trustScore, t.trend, t.successRate, t.missionsAudited, t.lastAudit, t.riskLevel, t.verifiedLogs)
    }

    // ── Trust history ──
    const insertTrustHistory = db.prepare(`
      INSERT INTO trust_history (date, score) VALUES (?, ?)
    `)
    for (const h of trustHistory) {
      insertTrustHistory.run(h.date, h.score)
    }

    // ── Trust events ──
    const insertTrustEvent = db.prepare(`
      INSERT OR IGNORE INTO trust_events (id, agent_id, agent_name, delta, reason, timestamp, mission_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    for (const e of trustEvents) {
      insertTrustEvent.run(e.id, e.agentId, e.agentName, e.delta, e.reason, e.timestamp, e.missionId ?? null)
    }

    // ── Badges ──
    const insertBadge = db.prepare(`
      INSERT OR IGNORE INTO badges (id, name, icon, description, color, earned_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    for (const b of badges) {
      insertBadge.run(b.id, b.name, b.icon, b.description, b.color, JSON.stringify(b.earnedBy))
    }

    // ── Chat channels ──
    const insertChannel = db.prepare(`
      INSERT OR IGNORE INTO chat_channels (id, name, icon, unread, mission_id)
      VALUES (?, ?, ?, ?, ?)
    `)
    for (const c of channels) {
      insertChannel.run(c.id, c.name, c.icon, c.unread, c.missionId ?? null)
    }

    // ── Chat messages ──
    const insertMessage = db.prepare(`
      INSERT OR IGNORE INTO chat_messages (id, "from", from_avatar, "to", content, timestamp, channel, pinned, type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const [, msgs] of Object.entries(chatMessages)) {
      for (const m of msgs) {
        insertMessage.run(m.id, m.from, m.fromAvatar, m.to, m.content, m.timestamp, m.channel, m.pinned ? 1 : 0, m.type)
      }
    }

    // ── Approval queue ──
    const insertApproval = db.prepare(`
      INSERT OR IGNORE INTO approval_queue (id, type, title, description, requested_by, priority, timestamp, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const a of approvalQueue) {
      insertApproval.run(a.id, a.type, a.title, a.description, a.requestedBy, a.priority, a.timestamp, a.status)
    }

    // ── Incidents ──
    const insertIncident = db.prepare(`
      INSERT OR IGNORE INTO incidents (id, severity, title, description, detected_at, resolved_at, assigned_agent, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const i of recentIncidents) {
      insertIncident.run(i.id, i.severity, i.title, i.description, i.detectedAt, i.resolvedAt ?? null, i.assignedAgent, i.status)
    }

    // ── Health cards ──
    const insertHealth = db.prepare(`
      INSERT OR IGNORE INTO health_cards (id, name, status, metric, value, max, unit, trend, icon)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const h of healthCards) {
      insertHealth.run(h.id, h.name, h.status, h.metric, h.value, h.max, h.unit, h.trend, h.icon)
    }

    // ── Operator alerts ──
    const insertAlert = db.prepare(`
      INSERT OR IGNORE INTO operator_alerts (id, timestamp, severity, title, description, source, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)
    for (const a of operatorAlerts) {
      insertAlert.run(a.id, a.timestamp, a.severity, a.title, a.description, a.source, a.status)
    }

    // ── Agent registry ──
    const insertRegistry = db.prepare(`
      INSERT OR IGNORE INTO agent_registry (guild_agent_id, agent_record_id, display_name, role, default_session_mode, tool_policy, connection_status, current_session_id, last_activity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    for (const r of agentRegistry) {
      insertRegistry.run(r.guildAgentId, r.agentRecordId, r.displayName, r.role, r.defaultSessionMode, r.toolPolicy, r.connectionStatus, r.currentSessionId, r.lastActivity)
    }

    // ── Routing rules ──
    const insertRouting = db.prepare(`
      INSERT OR IGNORE INTO routing_rules (role, label, description, preferred_agent_types, icon, color)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    for (const r of routingRules) {
      insertRouting.run(r.role, r.label, r.description, JSON.stringify(r.preferredAgentTypes), r.icon, r.color)
    }

    // ── Tools ──
    const insertTool = db.prepare(`
      INSERT OR IGNORE INTO tools (name, label, description, icon, category, parameters)
      VALUES (?, ?, ?, ?, ?, ?)
    `)
    for (const t of availableTools) {
      insertTool.run(t.name, t.label, t.description, t.icon, t.category, JSON.stringify(t.parameters))
    }
  })

  tx()
  console.log('[seed] Database seeded successfully')
}
