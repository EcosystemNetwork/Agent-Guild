import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface PageHeaderProps {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export default function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8', className)}>
      <div>
        <h1 className="text-xl font-headline font-black uppercase tracking-wider text-white">
          {title}
        </h1>
        {description && (
          <p className="text-sm text-on-surface-variant mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}
