// ── Agent Types ──

export type AgentStatus = 'active' | 'in-mission' | 'standby' | 'offline'

export interface Agent {
  id: string
  name: string
  role: string
  specialty: string[]
  trustScore: number
  status: AgentStatus
  missionClock: string
  avatar: string
  missionsCompleted: number
}

// ── Mission Types ──

export type MissionType = 'recon' | 'analysis' | 'critical' | 'defense' | 'intel'
export type MissionStatus = 'active' | 'completed' | 'pending' | 'failed'
export type Priority = 'low' | 'medium' | 'high' | 'critical'

export interface Mission {
  id: string
  name: string
  type: MissionType
  status: MissionStatus
  assignedAgent: string
  progress: number
  priority: Priority
  startedAt: string
  description: string
}

// ── Activity Types ──

export type ActivityType = 'mission' | 'agent' | 'alert' | 'system'

export interface ActivityEvent {
  id: string
  timestamp: string
  type: ActivityType
  icon: string
  description: string
  color: string
}

// ── Trust Types ──

export interface TrustMetric {
  agentId: string
  agentName: string
  trustScore: number
  trend: number
  successRate: number
  missionsAudited: number
  lastAudit: string
  riskLevel: 'low' | 'medium' | 'high'
  verifiedLogs: number
}

// ── Operator Types ──

export type AlertSeverity = 'info' | 'warning' | 'critical'
export type AlertStatus = 'active' | 'acknowledged' | 'resolved'

export interface OperatorAlert {
  id: string
  timestamp: string
  severity: AlertSeverity
  title: string
  description: string
  source: string
  status: AlertStatus
}

// ── Guild Metrics ──

export interface GuildMetrics {
  status: string
  activeMissions: number
  totalMissionCapacity: number
  missionBreakdown: Record<string, number>
  trustScore: number
  trustTrend: number
  agentsDeployed: number
  uptime: number
  verifiedLogs: number
  sparkline: number[]
}

// ── Async Data State ──

export interface AsyncState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
}
