import { cn } from '../../lib/utils'

interface ProgressBarProps {
  value: number
  color?: string
  height?: 'sm' | 'md'
  className?: string
  showLabel?: boolean
}

export default function ProgressBar({
  value,
  color = '#863bff',
  height = 'sm',
  className,
  showLabel,
}: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value))
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        className={cn(
          'flex-1 rounded-full bg-white/5 overflow-hidden',
          height === 'sm' ? 'h-1.5' : 'h-2.5',
        )}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${clamped}%`,
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}40`,
          }}
        />
      </div>
      {showLabel && (
        <span className="text-[10px] font-label font-bold tabular-nums" style={{ color }}>
          {clamped}%
        </span>
      )}
    </div>
  )
}
