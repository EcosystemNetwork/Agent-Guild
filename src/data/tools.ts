export interface AvailableTool {
  name: string
  label: string
  description: string
  icon: string
  category: 'recon' | 'defense' | 'intel' | 'admin'
  parameters: { key: string; label: string; type: 'text' | 'select'; options?: string[] }[]
}

export const availableTools: AvailableTool[] = [
  {
    name: 'network-scan',
    label: 'Network Scan',
    description: 'Scan target hosts for active services and anomalies',
    icon: 'lan',
    category: 'recon',
    parameters: [
      { key: 'targets', label: 'Target IPs', type: 'text' },
      { key: 'depth', label: 'Scan Depth', type: 'select', options: ['shallow', 'standard', 'deep'] },
    ],
  },
  {
    name: 'threat-classify',
    label: 'Threat Classifier',
    description: 'Classify detected anomalies against known threat patterns',
    icon: 'bug_report',
    category: 'intel',
    parameters: [
      { key: 'signature', label: 'Signature Hash', type: 'text' },
    ],
  },
  {
    name: 'credential-rotate',
    label: 'Credential Rotation',
    description: 'Rotate service account credentials across specified nodes',
    icon: 'key',
    category: 'defense',
    parameters: [
      { key: 'scope', label: 'Scope', type: 'select', options: ['affected-only', 'sector', 'guild-wide'] },
    ],
  },
  {
    name: 'firewall-update',
    label: 'Firewall Update',
    description: 'Apply or purge firewall rules on perimeter nodes',
    icon: 'shield',
    category: 'defense',
    parameters: [
      { key: 'action', label: 'Action', type: 'select', options: ['add-block', 'purge-deprecated', 'reset'] },
      { key: 'targets', label: 'IP Range', type: 'text' },
    ],
  },
  {
    name: 'log-export',
    label: 'Log Export',
    description: 'Export and archive verified log entries for audit',
    icon: 'download',
    category: 'admin',
    parameters: [
      { key: 'range', label: 'Time Range', type: 'select', options: ['1h', '6h', '24h', '7d'] },
      { key: 'filter', label: 'Filter', type: 'text' },
    ],
  },
]

export const toolCategoryColor: Record<string, string> = {
  recon: '#4cd7f6',
  defense: '#10B981',
  intel: '#F59E0B',
  admin: '#d2bbff',
}
