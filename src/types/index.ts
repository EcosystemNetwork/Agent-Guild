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

// ── Agent Registry Types ──

export type SessionMode = 'autonomous' | 'supervised' | 'manual'
export type ToolPolicy = 'unrestricted' | 'sandboxed' | 'restricted' | 'read-only'
export type ConnectionStatus = 'connected' | 'disconnected' | 'error'
export type AgentRoutingRole = 'scout' | 'negotiator' | 'operator' | 'analyst' | 'general'

export interface AgentRegistryEntry {
  guildAgentId: string
  agentRecordId: string
  displayName: string
  role: AgentRoutingRole
  defaultSessionMode: SessionMode
  toolPolicy: ToolPolicy
  connectionStatus: ConnectionStatus
  currentSessionId: string | null
  lastActivity: string
}

export interface RoutingRule {
  role: AgentRoutingRole
  label: string
  description: string
  preferredAgentTypes: string[]
  icon: string
  color: string
}

// ── Mission Execution Types ──

export type ExecutionMissionType = 'research' | 'summarize' | 'plan' | 'execute-tool'
export type ExecutionStatus = 'awaiting-approval' | 'approved' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled'

export interface MissionExecution {
  id: string
  name: string
  type: ExecutionMissionType
  status: ExecutionStatus
  assignedAgentId: string
  agentRecordId: string
  sessionKey: string
  prompt: string
  context: string
  priority: Priority
  requiresApproval: boolean
  createdAt: string
  startedAt: string | null
  completedAt: string | null
  progress: number
  transcript: MissionTranscriptEntry[]
  toolActions: ToolAction[]
  error: string | null
}

export interface MissionTranscriptEntry {
  id: string
  timestamp: string
  role: 'system' | 'operator' | 'agent' | 'tool'
  agentName: string
  content: string
  tokenCount?: number
}

export interface ToolAction {
  id: string
  toolName: string
  input: Record<string, unknown>
  output: string | null
  status: 'pending' | 'running' | 'success' | 'failure'
  startedAt: string
  completedAt: string | null
  error: string | null
}

export type OperatorAction = 'retry' | 'stop' | 'fork' | 'escalate' | 'call'

// ── Voice Call Types (Bland.ai) ──

export type CallStatus = 'queued' | 'ringing' | 'in-progress' | 'completed' | 'failed' | 'no-answer'

export interface VoiceCall {
  id: string
  callId: string | null
  phoneNumber: string
  status: CallStatus
  missionId: string | null
  channelId: string
  launchedBy: string
  launchedAt: string
  completedAt: string | null
  duration: number | null
  summary: string | null
  transcript: string | null
  recordingUrl: string | null
  pathwayId: string | null
  requestData: Record<string, unknown>
  error: string | null
}

export interface VoiceCallLaunchRequest {
  phoneNumber: string
  missionId?: string
  channelId: string
  pathwayId?: string
  requestData?: Record<string, unknown>
}

export interface MissionLaunchRequest {
  name: string
  type: ExecutionMissionType
  agentId: string
  prompt: string
  context: string
  priority: Priority
  requiresApproval: boolean
}

// ── Airbyte Integration Types ──

export type AirbyteSyncStatus = 'pending' | 'running' | 'succeeded' | 'failed' | 'cancelled'

export interface AirbyteConnection {
  connectionId: string
  name: string
  sourceId: string
  sourceName: string
  status: 'active' | 'inactive' | 'deprecated'
  schedule: string
  lastSyncAt: string | null
  lastSyncStatus: AirbyteSyncStatus | null
}

export interface AirbyteSyncJob {
  jobId: string
  connectionId: string
  status: AirbyteSyncStatus
  startedAt: string
  completedAt: string | null
  bytesLoaded: number
  recordsLoaded: number
  error: string | null
}

export interface AirbyteSyncedRecord {
  stream: string
  data: Record<string, unknown>
  syncedAt: string
}

export interface AirbyteMissionContext {
  missionId: string
  connectionId: string
  sourceName: string
  syncStatus: AirbyteSyncStatus
  lastSyncAt: string | null
  records: AirbyteSyncedRecord[]
  freshnessMs: number
}

// ── Connected Account Types ──

export type ConnectionProvider = 'google' | 'github' | 'slack'

export interface ConnectedAccountConfig {
  provider: ConnectionProvider
  label: string
  icon: string
  description: string
  color: string
  scopes: string[]
  auth0Connection: string // Auth0 connection identifier (e.g. 'google-oauth2')
}

export type ConnectionLinkStatus = 'linked' | 'unlinked' | 'expired' | 'error'

export interface ConnectedAccountState {
  provider: ConnectionProvider
  status: ConnectionLinkStatus
  linkedAt: string | null
  lastUsedAt: string | null
  scopes: string[]
  error: string | null
}

/** @deprecated Use ConnectedAccountConfig instead */
export interface ConnectedAccount {
  provider: string
  label: string
  icon: string
  description: string
  color: string
  scopes: string[]
  connected?: boolean
  connectedAt?: string
}

// ── Chat Types ──

export interface ChatMessage {
  id: string
  from: string
  fromAvatar: string
  to: string
  content: string
  timestamp: string
  channel: string
  pinned?: boolean
  type: 'message' | 'system' | 'alert'
}

export interface ChatChannel {
  id: string
  name: string
  icon: string
  unread: number
  missionId?: string
}

// ── Trust Analytics Types ──

export interface TrustEvent {
  id: string
  agentId: string
  agentName: string
  delta: number
  reason: string
  timestamp: string
  missionId?: string
}

export interface Badge {
  id: string
  name: string
  icon: string
  description: string
  color: string
  earnedBy: string[]
}

// ── Operator Extended Types ──

export interface ApprovalItem {
  id: string
  type: 'mission-launch' | 'agent-deploy' | 'escalation' | 'access-request'
  title: string
  description: string
  requestedBy: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  timestamp: string
  status: 'pending' | 'approved' | 'denied'
}

export interface Incident {
  id: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  detectedAt: string
  resolvedAt?: string
  assignedAgent: string
  status: 'active' | 'investigating' | 'resolved' | 'escalated'
}

export interface HealthCard {
  id: string
  name: string
  status: 'healthy' | 'degraded' | 'critical'
  metric: string
  value: number
  max: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  icon: string
}

// ── Tool Types ──

export interface AvailableTool {
  name: string
  label: string
  description: string
  icon: string
  category: 'recon' | 'defense' | 'intel' | 'admin'
  parameters: { key: string; label: string; type: 'text' | 'select'; options?: string[] }[]
}

// ── Async Data State ──

export interface AsyncState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
}
