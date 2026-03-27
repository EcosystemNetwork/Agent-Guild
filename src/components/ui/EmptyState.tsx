import Icon from './Icon'
import { cn } from '../../lib/utils'

interface EmptyStateProps {
  icon: string
  title: string
  description: string
  className?: string
}

export default function EmptyState({ icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 gap-3 text-center', className)}>
      <div className="w-16 h-16 rounded-2xl bg-surface-container-high/50 flex items-center justify-center mb-2">
        <Icon name={icon} size="lg" className="text-on-surface-variant/50" />
      </div>
      <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-on-surface-variant">
        {title}
      </h3>
      <p className="text-xs text-on-surface-variant/60 max-w-xs">{description}</p>
    </div>
  )
}
