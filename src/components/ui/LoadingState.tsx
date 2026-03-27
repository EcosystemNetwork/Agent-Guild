import { cn } from '../../lib/utils'

interface LoadingStateProps {
  message?: string
  className?: string
}

export default function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 gap-4', className)}>
      <div className="relative w-12 h-12">
        <div className="absolute inset-0 rounded-full border-2 border-primary-container/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary-container animate-spin" />
      </div>
      <p className="font-label text-xs uppercase tracking-widest text-on-surface-variant">
        {message}
      </p>
    </div>
  )
}
