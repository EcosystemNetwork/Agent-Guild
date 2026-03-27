import { cn } from '../../lib/utils'

interface StatusChipProps {
  label: string
  color: string
  pulse?: boolean
  className?: string
}

export default function StatusChip({ label, color, pulse, className }: StatusChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold font-label uppercase tracking-wider border',
        className,
      )}
      style={{
        color,
        borderColor: `${color}33`,
        backgroundColor: `${color}10`,
      }}
    >
      <span
        className={cn('w-1.5 h-1.5 rounded-full', pulse && 'animate-pulse')}
        style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }}
      />
      {label}
    </span>
  )
}
