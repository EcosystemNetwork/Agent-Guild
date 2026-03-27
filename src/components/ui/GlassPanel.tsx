import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface GlassPanelProps {
  children: ReactNode
  className?: string
  scanline?: boolean
  hover?: boolean
}

export default function GlassPanel({ children, className, scanline, hover }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'glass-panel rounded-xl relative overflow-hidden',
        hover && 'agent-card-glow transition-all duration-200 hover:bg-surface-bright/20',
        className,
      )}
    >
      {scanline && <div className="scanline absolute inset-0 pointer-events-none" />}
      {children}
    </div>
  )
}
