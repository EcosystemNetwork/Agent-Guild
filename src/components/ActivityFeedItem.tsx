import type { ActivityEvent } from '../types'
import Icon from './ui/Icon'

interface ActivityFeedItemProps {
  event: ActivityEvent
}

export default function ActivityFeedItem({ event }: ActivityFeedItemProps) {
  return (
    <div className="flex items-start gap-3 py-3 group hover:bg-white/[0.02] -mx-2 px-2 rounded-lg transition-colors">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{
          backgroundColor: `${event.color}15`,
          border: `1px solid ${event.color}25`,
        }}
      >
        <Icon name={event.icon} size="sm" className="" style={{ color: event.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-on-surface leading-snug">{event.description}</p>
        <p className="text-[10px] font-label text-on-surface-variant/50 uppercase tracking-wider mt-1">
          {event.timestamp}
        </p>
      </div>
    </div>
  )
}
