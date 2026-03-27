/** Merge class names, filtering out falsy values */
export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}

/** Format a number as a percentage string */
export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`
}

/** Format a number with commas */
export function formatNumber(value: number): string {
  return value.toLocaleString()
}

/** Truncate text to a max length */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

/** Color maps for statuses */
export const agentStatusColor: Record<string, string> = {
  active: 'var(--color-status-online)',
  'in-mission': 'var(--color-status-busy)',
  standby: 'var(--color-secondary)',
  offline: 'var(--color-status-offline)',
}

export const agentStatusLabel: Record<string, string> = {
  active: 'ACTIVE',
  'in-mission': 'IN MISSION',
  standby: 'STANDBY',
  offline: 'OFFLINE',
}

export const missionTypeColor: Record<string, string> = {
  recon: '#4cd7f6',
  analysis: '#d2bbff',
  critical: '#F43F5E',
  defense: '#10B981',
  intel: '#F59E0B',
}

export const priorityColor: Record<string, string> = {
  low: '#94A3B8',
  medium: '#4cd7f6',
  high: '#F59E0B',
  critical: '#F43F5E',
}

export const severityColor: Record<string, string> = {
  info: '#4cd7f6',
  warning: '#F59E0B',
  critical: '#F43F5E',
}

export const severityIcon: Record<string, string> = {
  info: 'info',
  warning: 'warning',
  critical: 'error',
}
