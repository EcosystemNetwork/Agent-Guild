import GlassPanel from './GlassPanel'
import Icon from './Icon'
import Sparkline from './Sparkline'

interface StatCardProps {
  label: string
  value: string
  icon: string
  iconColor?: string
  trend?: { value: number; label: string }
  sparkline?: number[]
  accentBar?: { percent: number; color: string }
}

export default function StatCard({
  label,
  value,
  icon,
  iconColor = 'text-primary',
  trend,
  sparkline,
  accentBar,
}: StatCardProps) {
  return (
    <GlassPanel scanline className="p-6">
      <div className="flex justify-between items-start mb-4">
        <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">
          {label}
        </p>
        <Icon name={icon} size="sm" className={iconColor} />
      </div>
      <h3 className="text-2xl font-bold font-headline tracking-tight text-white mb-2">
        {value}
      </h3>
      {sparkline && (
        <div className="mb-3">
          <Sparkline data={sparkline} />
        </div>
      )}
      {trend && (
        <div className="flex items-center gap-2 text-xs font-label">
          <Icon
            name={trend.value >= 0 ? 'trending_up' : 'trending_down'}
            size="sm"
            className={trend.value >= 0 ? 'text-status-online' : 'text-status-offline'}
          />
          <span className={trend.value >= 0 ? 'text-status-online' : 'text-status-offline'}>
            {trend.value >= 0 ? '+' : ''}{trend.value}% {trend.label}
          </span>
        </div>
      )}
      {accentBar && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
          <div
            className="h-full transition-all duration-500"
            style={{
              width: `${accentBar.percent}%`,
              backgroundColor: accentBar.color,
              boxShadow: `0 0 12px ${accentBar.color}40`,
            }}
          />
        </div>
      )}
    </GlassPanel>
  )
}
