import type { OperatorAlert } from '../types'

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

export const approvalQueue: ApprovalItem[] = [
  { id: 'apv-1', type: 'mission-launch', title: 'Launch Mission: Deep Veil', description: 'Full-spectrum recon of Syndicate Omega relay infrastructure. Requires 3 agents, 48h estimated runtime.', requestedBy: 'ORACLE-1', priority: 'high', timestamp: '3 min ago', status: 'pending' },
  { id: 'apv-2', type: 'agent-deploy', title: 'Deploy ECHO-9 to Sector 4-B', description: 'Signal interception support for ongoing Operation Nightfall. Cross-mission resource allocation.', requestedBy: 'CIPHER-7', priority: 'medium', timestamp: '15 min ago', status: 'pending' },
  { id: 'apv-3', type: 'escalation', title: 'Escalate: Perimeter Lockdown', description: 'SENTINEL-12 requests elevation to Guild-wide alert. Evidence of coordinated multi-vector attack.', requestedBy: 'SENTINEL-12', priority: 'critical', timestamp: '22 min ago', status: 'pending' },
  { id: 'apv-4', type: 'access-request', title: 'VEX-4 Re-Activation', description: 'Maintenance cycle complete. Request to bring VEX-4 back online and assign to Patch Deployment Review.', requestedBy: 'SYSTEM', priority: 'low', timestamp: '1h ago', status: 'pending' },
  { id: 'apv-5', type: 'mission-launch', title: 'Launch Mission: Crimson Tide', description: 'Offensive counter-intelligence operation targeting identified Syndicate relay. High risk classification.', requestedBy: 'WRAITH-5', priority: 'critical', timestamp: '2h ago', status: 'pending' },
]

export const recentIncidents: Incident[] = [
  { id: 'inc-1', severity: 'critical', title: 'Unauthorized Access — Node 4-Alpha', description: 'Compromised service account used to attempt perimeter breach. Contained by SENTINEL-12.', detectedAt: '1h ago', assignedAgent: 'SENTINEL-12', status: 'investigating' },
  { id: 'inc-2', severity: 'high', title: 'Anomalous Traffic Spike — Node 7.2.1', description: 'Traffic 340% above baseline. Source under investigation.', detectedAt: '12 min ago', assignedAgent: 'CIPHER-7', status: 'active' },
  { id: 'inc-3', severity: 'medium', title: 'Trust Score Anomaly — ECHO-9', description: 'Unexpected fluctuation in trust metrics following Signal Trace completion.', detectedAt: '30 min ago', assignedAgent: 'ORACLE-1', status: 'investigating' },
  { id: 'inc-4', severity: 'low', title: 'Agent VEX-4 Unscheduled Offline', description: 'VEX-4 went offline outside of planned maintenance window.', detectedAt: '1h ago', resolvedAt: '45 min ago', assignedAgent: 'SYSTEM', status: 'resolved' },
  { id: 'inc-5', severity: 'high', title: 'Deprecated Firewall Rules Active', description: 'Two legacy firewall rules found active during audit. Potential security gap.', detectedAt: '2h ago', assignedAgent: 'PULSE', status: 'investigating' },
]

export const healthCards: HealthCard[] = [
  { id: 'hc-1', name: 'Runtime Cluster', status: 'healthy', metric: 'Nodes Active', value: 12, max: 16, unit: 'nodes', trend: 'up', icon: 'memory' },
  { id: 'hc-2', name: 'Trust Ledger', status: 'healthy', metric: 'Sync Status', value: 100, max: 100, unit: '%', trend: 'stable', icon: 'verified_user' },
  { id: 'hc-3', name: 'Agent Fleet', status: 'degraded', metric: 'Online', value: 7, max: 8, unit: 'agents', trend: 'down', icon: 'smart_toy' },
  { id: 'hc-4', name: 'Mission Engine', status: 'healthy', metric: 'Capacity', value: 12, max: 15, unit: 'missions', trend: 'stable', icon: 'rocket_launch' },
  { id: 'hc-5', name: 'Comm Network', status: 'healthy', metric: 'Latency', value: 12, max: 100, unit: 'ms', trend: 'down', icon: 'cell_tower' },
  { id: 'hc-6', name: 'Perimeter Shield', status: 'degraded', metric: 'Coverage', value: 94, max: 100, unit: '%', trend: 'down', icon: 'shield' },
]

export const approvalTypeIcon: Record<ApprovalItem['type'], string> = {
  'mission-launch': 'rocket_launch',
  'agent-deploy': 'smart_toy',
  'escalation': 'priority_high',
  'access-request': 'key',
}

export const severityColor: Record<Incident['severity'], string> = {
  low: '#94A3B8',
  medium: '#4cd7f6',
  high: '#F59E0B',
  critical: '#F43F5E',
}

export const healthStatusColor: Record<HealthCard['status'], string> = {
  healthy: '#10B981',
  degraded: '#F59E0B',
  critical: '#F43F5E',
}

export const operatorAlerts: OperatorAlert[] = [
  {
    id: 'ALR-0091',
    timestamp: '2 min ago',
    severity: 'critical',
    title: 'Unauthorized Access Attempt',
    description: 'Multiple failed authentication attempts detected on Node 7.2.1. Source IP flagged for geofence violation.',
    source: 'Perimeter Defense',
    status: 'active',
  },
  {
    id: 'ALR-0090',
    timestamp: '12 min ago',
    severity: 'warning',
    title: 'Anomalous Traffic Spike',
    description: 'Outbound traffic from Sector 4-B exceeded baseline by 340%. NOVA-3 dispatched for analysis.',
    source: 'Network Monitor',
    status: 'acknowledged',
  },
  {
    id: 'ALR-0089',
    timestamp: '31 min ago',
    severity: 'info',
    title: 'Cluster Auto-Scale Event',
    description: 'Guild runtime cluster scaled from 10 to 12 nodes to meet mission processing demand.',
    source: 'Infrastructure',
    status: 'resolved',
  },
  {
    id: 'ALR-0088',
    timestamp: '45 min ago',
    severity: 'warning',
    title: 'Trust Score Degradation',
    description: 'VEX-4 trust score dropped below 86.0 threshold. Automatic mission restriction applied.',
    source: 'Trust Ledger',
    status: 'acknowledged',
  },
  {
    id: 'ALR-0087',
    timestamp: '1h ago',
    severity: 'critical',
    title: 'Agent Offline — Unexpected',
    description: 'VEX-4 went offline outside of scheduled maintenance window. Diagnostics initiated.',
    source: 'Agent Monitor',
    status: 'acknowledged',
  },
  {
    id: 'ALR-0086',
    timestamp: '1.5h ago',
    severity: 'info',
    title: 'Mission Completed Successfully',
    description: 'Signal Trace Alpha (MSN-2843) completed with 100% accuracy. ECHO-9 returned to standby.',
    source: 'Mission Control',
    status: 'resolved',
  },
  {
    id: 'ALR-0085',
    timestamp: '2h ago',
    severity: 'info',
    title: 'Ledger Synchronization Complete',
    description: 'Trust ledger synchronized across all 12 cluster nodes. 48,290 verified log entries.',
    source: 'Trust Ledger',
    status: 'resolved',
  },
  {
    id: 'ALR-0084',
    timestamp: '3h ago',
    severity: 'warning',
    title: 'Encryption Key Rotation Due',
    description: 'Sector 7-G encryption keys approaching 72h rotation deadline. CIPHER-7 scheduled for rotation.',
    source: 'Security Protocol',
    status: 'active',
  },
]
