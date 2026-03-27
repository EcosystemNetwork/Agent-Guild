import { cn } from '../lib/utils'

interface TrustBadgeProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

function getScoreColor(score: number): string {
  if (score >= 95) return '#10B981'
  if (score >= 90) return '#4cd7f6'
  if (score >= 85) return '#F59E0B'
  return '#F43F5E'
}

export default function TrustBadge({ score, size = 'md' }: TrustBadgeProps) {
  const color = getScoreColor(score)
  const dims = { sm: 'w-10 h-10 text-xs', md: 'w-14 h-14 text-sm', lg: 'w-20 h-20 text-xl' }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-headline font-bold border-2',
        dims[size],
      )}
      style={{
        color,
        borderColor: `${color}40`,
        backgroundColor: `${color}10`,
        boxShadow: `0 0 12px ${color}20`,
      }}
    >
      {score.toFixed(1)}
    </div>
  )
}
