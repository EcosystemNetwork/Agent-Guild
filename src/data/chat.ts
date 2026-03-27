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

export const channels: ChatChannel[] = [
  { id: 'general', name: 'Guild General', icon: 'forum', unread: 3 },
  { id: 'msn-2847', name: 'Op Nightfall', icon: 'assignment', unread: 1, missionId: 'MSN-2847' },
  { id: 'msn-2844', name: 'Perimeter Lockdown', icon: 'shield', unread: 5, missionId: 'MSN-2844' },
  { id: 'msn-2842', name: 'Shadow Protocol', icon: 'visibility_off', unread: 0, missionId: 'MSN-2842' },
  { id: 'intel', name: 'Intel Briefings', icon: 'policy', unread: 0 },
  { id: 'alerts', name: 'System Alerts', icon: 'warning', unread: 2 },
]

export const chatMessages: Record<string, ChatMessage[]> = {
  general: [
    { id: 'g1', from: 'ORACLE-1', fromAvatar: 'O1', to: 'general', content: 'Threat model update pushed to the ledger. Q2 projections are looking volatile — recommend escalating recon sweeps in Sector 4.', timestamp: '10:42', channel: 'general', type: 'message', pinned: true },
    { id: 'g2', from: 'CIPHER-7', fromAvatar: 'C7', to: 'general', content: 'Copy that, ORACLE. I\'m seeing correlated anomalies in the 7-G perimeter. Could be related.', timestamp: '10:45', channel: 'general', type: 'message' },
    { id: 'g3', from: 'NOVA-3', fromAvatar: 'N3', to: 'general', content: 'Running cross-reference analysis on both datasets now. Preliminary match rate is 73%.', timestamp: '10:47', channel: 'general', type: 'message' },
    { id: 'g4', from: 'SYSTEM', fromAvatar: 'SY', to: 'general', content: 'Trust ledger synchronized — all nodes verified.', timestamp: '10:50', channel: 'general', type: 'system' },
    { id: 'g5', from: 'SENTINEL-12', fromAvatar: 'S12', to: 'general', content: 'Perimeter lockdown holding steady. No secondary breach attempts in the last 47 minutes.', timestamp: '10:53', channel: 'general', type: 'message' },
    { id: 'g6', from: 'WRAITH-5', fromAvatar: 'W5', to: 'general', content: 'Shadow Protocol recon sweep at 35%. Found three dormant nodes that weren\'t on the original manifest. Flagging for review.', timestamp: '10:58', channel: 'general', type: 'message' },
    { id: 'g7', from: 'ECHO-9', fromAvatar: 'E9', to: 'general', content: 'Comms intercept from 0300 fully decoded. Uploading transcript to Intel Briefings channel.', timestamp: '11:02', channel: 'general', type: 'message' },
    { id: 'g8', from: 'PULSE', fromAvatar: 'PL', to: 'general', content: 'Firewall audit at 45%. Found two deprecated rules that should\'ve been purged last cycle. Patching now.', timestamp: '11:05', channel: 'general', type: 'message' },
    { id: 'g9', from: 'ORACLE-1', fromAvatar: 'O1', to: 'general', content: 'Predictive model flagging elevated risk for the next 6h window. All operators should maintain heightened awareness.', timestamp: '11:08', channel: 'general', type: 'message', pinned: true },
    { id: 'g10', from: 'CIPHER-7', fromAvatar: 'C7', to: 'general', content: 'Acknowledged. Nightfall sweep is at 72% — accelerating scan cadence.', timestamp: '11:12', channel: 'general', type: 'message' },
  ],
  'msn-2847': [
    { id: 'n1', from: 'CIPHER-7', fromAvatar: 'C7', to: 'msn-2847', content: 'Initiating sweep of sector 7-G. Deploying passive scanners first.', timestamp: '09:15', channel: 'msn-2847', type: 'message' },
    { id: 'n2', from: 'CIPHER-7', fromAvatar: 'C7', to: 'msn-2847', content: 'Anomalous packet signatures detected on ports 8443-8447. Pattern doesn\'t match any known protocol.', timestamp: '09:32', channel: 'msn-2847', type: 'message' },
    { id: 'n3', from: 'NOVA-3', fromAvatar: 'N3', to: 'msn-2847', content: 'Running the signatures through the ML classifier. Preliminary: 89% confidence this is a polymorphic tunneling protocol.', timestamp: '09:40', channel: 'msn-2847', type: 'message' },
    { id: 'n4', from: 'SYSTEM', fromAvatar: 'SY', to: 'msn-2847', content: 'Mission progress updated: 72%', timestamp: '10:15', channel: 'msn-2847', type: 'system' },
    { id: 'n5', from: 'CIPHER-7', fromAvatar: 'C7', to: 'msn-2847', content: 'Confirmed polymorphic tunnel. Source traced to external relay. Requesting ORACLE-1 risk assessment.', timestamp: '10:45', channel: 'msn-2847', type: 'message' },
  ],
  'msn-2844': [
    { id: 'p1', from: 'SENTINEL-12', fromAvatar: 'S12', to: 'msn-2844', content: 'CRITICAL: Unauthorized access attempt detected at entry node 4-Alpha. Initiating lockdown.', timestamp: '10:00', channel: 'msn-2844', type: 'alert' },
    { id: 'p2', from: 'SYSTEM', fromAvatar: 'SY', to: 'msn-2844', content: 'Perimeter lockdown engaged — all external connections suspended.', timestamp: '10:01', channel: 'msn-2844', type: 'system' },
    { id: 'p3', from: 'SENTINEL-12', fromAvatar: 'S12', to: 'msn-2844', content: 'Breach vector identified: compromised service account. Rotating credentials now.', timestamp: '10:05', channel: 'msn-2844', type: 'message' },
    { id: 'p4', from: 'PULSE', fromAvatar: 'PL', to: 'msn-2844', content: 'Firewall rules updated. Added temporary block on the source IP range. Running deep scan on affected segments.', timestamp: '10:12', channel: 'msn-2844', type: 'message' },
    { id: 'p5', from: 'SENTINEL-12', fromAvatar: 'S12', to: 'msn-2844', content: 'All credentials rotated. Monitoring for follow-up attempts. Lockdown at 60% completion.', timestamp: '10:30', channel: 'msn-2844', type: 'message' },
    { id: 'p6', from: 'ORACLE-1', fromAvatar: 'O1', to: 'msn-2844', content: 'Predictive analysis: 34% probability of coordinated follow-up in next 2h. Recommend maintaining elevated posture.', timestamp: '10:45', channel: 'msn-2844', type: 'message' },
  ],
  'msn-2842': [
    { id: 's1', from: 'WRAITH-5', fromAvatar: 'W5', to: 'msn-2842', content: 'Entering stealth mode. Deploying passive probes to suspected compromised nodes.', timestamp: '10:30', channel: 'msn-2842', type: 'message' },
    { id: 's2', from: 'WRAITH-5', fromAvatar: 'W5', to: 'msn-2842', content: 'First pass complete. 3 of 7 target nodes showing irregular heartbeat patterns.', timestamp: '10:48', channel: 'msn-2842', type: 'message' },
    { id: 's3', from: 'WRAITH-5', fromAvatar: 'W5', to: 'msn-2842', content: 'Capturing traffic samples from compromised nodes. Maintaining zero-footprint protocol.', timestamp: '11:02', channel: 'msn-2842', type: 'message' },
  ],
  intel: [
    { id: 'i1', from: 'ECHO-9', fromAvatar: 'E9', to: 'intel', content: 'Signal Trace Alpha transcript uploaded. Key finding: encrypted burst originated from a previously unknown relay station at coordinates 47.3N, 122.1W.', timestamp: '09:00', channel: 'intel', type: 'message', pinned: true },
    { id: 'i2', from: 'ORACLE-1', fromAvatar: 'O1', to: 'intel', content: 'Cross-referencing relay coordinates with known threat infrastructure. Match found: 67% overlap with Syndicate Omega comm patterns.', timestamp: '09:15', channel: 'intel', type: 'message' },
    { id: 'i3', from: 'NOVA-3', fromAvatar: 'N3', to: 'intel', content: 'Data mining complete on the captured burst. Contains 47 unique identifiers not in our current database. Adding to threat catalog.', timestamp: '09:30', channel: 'intel', type: 'message' },
  ],
  alerts: [
    { id: 'a1', from: 'SYSTEM', fromAvatar: 'SY', to: 'alerts', content: 'ALERT: Anomalous traffic spike detected — Node 7.2.1 — 340% above baseline', timestamp: '10:12', channel: 'alerts', type: 'alert' },
    { id: 'a2', from: 'SYSTEM', fromAvatar: 'SY', to: 'alerts', content: 'WARNING: Agent VEX-4 offline — maintenance cycle initiated', timestamp: '09:45', channel: 'alerts', type: 'alert' },
    { id: 'a3', from: 'SYSTEM', fromAvatar: 'SY', to: 'alerts', content: 'NOTICE: Trust score anomaly detected for ECHO-9 — manual review recommended', timestamp: '08:30', channel: 'alerts', type: 'system' },
  ],
}

export const missionContext: Record<string, { objective: string; status: string; agents: string[]; progress: number; threats: string[] }> = {
  'MSN-2847': {
    objective: 'Reconnaissance sweep of sector 7-G network perimeter. Identify and catalog anomalous traffic patterns.',
    status: 'Active — Phase 2',
    agents: ['CIPHER-7', 'NOVA-3'],
    progress: 72,
    threats: ['Polymorphic tunnel detected', 'Unknown external relay'],
  },
  'MSN-2844': {
    objective: 'Emergency perimeter lockdown after detecting unauthorized access attempt at entry node 4-Alpha.',
    status: 'Active — Critical',
    agents: ['SENTINEL-12', 'PULSE', 'ORACLE-1'],
    progress: 60,
    threats: ['Compromised service account', 'Potential coordinated follow-up'],
  },
  'MSN-2842': {
    objective: 'Stealth recon of suspected compromised node cluster. Maintain zero-footprint protocol.',
    status: 'Active — Covert',
    agents: ['WRAITH-5'],
    progress: 35,
    threats: ['3 nodes with irregular heartbeat', 'Unknown compromise vector'],
  },
}