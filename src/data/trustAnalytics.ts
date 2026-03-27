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

export const trustHistory: { date: string; score: number }[] = [
  { date: 'Mar 1', score: 94.2 },
  { date: 'Mar 4', score: 94.8 },
  { date: 'Mar 7', score: 95.1 },
  { date: 'Mar 10', score: 94.6 },
  { date: 'Mar 13', score: 95.4 },
  { date: 'Mar 16', score: 96.1 },
  { date: 'Mar 19', score: 96.8 },
  { date: 'Mar 22', score: 97.0 },
  { date: 'Mar 25', score: 97.4 },
  { date: 'Mar 27', score: 97.6 },
]

export const trustEvents: TrustEvent[] = [
  { id: 'te-1', agentId: 'cipher-7', agentName: 'CIPHER-7', delta: 0.3, reason: 'Completed Mission #2847 — zero anomalies', timestamp: '2 min ago', missionId: 'MSN-2847' },
  { id: 'te-2', agentId: 'oracle-1', agentName: 'ORACLE-1', delta: 0.7, reason: 'Predictive model accuracy exceeded 96% threshold', timestamp: '24 min ago' },
  { id: 'te-3', agentId: 'sentinel-12', agentName: 'SENTINEL-12', delta: 0.4, reason: 'Rapid breach containment under 60s response time', timestamp: '1h ago', missionId: 'MSN-2844' },
  { id: 'te-4', agentId: 'pulse', agentName: 'PULSE', delta: -0.2, reason: 'Deprecated firewall rules found during audit', timestamp: '2h ago' },
  { id: 'te-5', agentId: 'echo-9', agentName: 'ECHO-9', delta: 0.5, reason: 'Signal Trace Alpha completed with 100% accuracy', timestamp: '3h ago', missionId: 'MSN-2843' },
  { id: 'te-6', agentId: 'wraith-5', agentName: 'WRAITH-5', delta: 0.2, reason: 'Maintained zero-footprint protocol during recon', timestamp: '4h ago', missionId: 'MSN-2842' },
  { id: 'te-7', agentId: 'nova-3', agentName: 'NOVA-3', delta: 0.6, reason: 'ML classifier achieved 89% polymorphic detection rate', timestamp: '5h ago' },
  { id: 'te-8', agentId: 'vex-4', agentName: 'VEX-4', delta: -1.2, reason: 'Unexpected offline — missed scheduled maintenance window', timestamp: '6h ago' },
]

export const badges: Badge[] = [
  { id: 'b-1', name: 'Sentinel Shield', icon: 'shield', description: 'Zero breaches in 30+ consecutive missions', color: '#10B981', earnedBy: ['oracle-1', 'wraith-5'] },
  { id: 'b-2', name: 'Ghost Protocol', icon: 'visibility_off', description: 'Maintained stealth in 10+ covert operations', color: '#4cd7f6', earnedBy: ['wraith-5'] },
  { id: 'b-3', name: 'Oracle\'s Eye', icon: 'psychology', description: 'Predictive accuracy above 95% for 20+ forecasts', color: '#d2bbff', earnedBy: ['oracle-1', 'nova-3'] },
  { id: 'b-4', name: 'Iron Wall', icon: 'security', description: 'Contained 5+ critical breaches under 120s', color: '#F59E0B', earnedBy: ['sentinel-12', 'pulse'] },
  { id: 'b-5', name: 'Signal Master', icon: 'cell_tower', description: 'Decoded 50+ encrypted transmissions', color: '#F43F5E', earnedBy: ['echo-9', 'cipher-7'] },
  { id: 'b-6', name: 'First Light', icon: 'auto_awesome', description: 'Completed first mission with perfect score', color: '#863bff', earnedBy: ['cipher-7', 'pulse', 'nova-3', 'sentinel-12', 'echo-9', 'wraith-5', 'oracle-1', 'vex-4'] },
]

export const comparisonMetrics = [
  { label: 'Trust Score', key: 'trustScore' as const },
  { label: 'Missions Completed', key: 'missionsCompleted' as const },
  { label: 'Mission Clock', key: 'missionClock' as const },
] as const