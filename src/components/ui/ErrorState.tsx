import Icon from './Icon'
import { cn } from '../../lib/utils'

interface ErrorStateProps {
  message: string
  onRetry?: () => void
  className?: string
}

export default function ErrorState({ message, onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 gap-3 text-center', className)}>
      <div className="w-16 h-16 rounded-2xl bg-error-container/20 flex items-center justify-center mb-2">
        <Icon name="error" size="lg" className="text-error" />
      </div>
      <h3 className="font-headline text-sm font-bold uppercase tracking-wider text-error">
        System Error
      </h3>
      <p className="text-xs text-on-surface-variant/60 max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 bg-surface-container-high rounded-lg font-label text-xs uppercase tracking-wider text-on-surface-variant hover:bg-surface-bright transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  )
}
