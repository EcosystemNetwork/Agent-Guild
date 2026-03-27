import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

export interface GlassPanelProps {
  children: ReactNode
  className?: string
  scanline?: boolean
  hover?: boolean
  onClick?: () => void
}

export default function GlassPanel({ children, className, scanline, hover, onClick }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'glass-panel rounded-xl relative overflow-hidden',
        hover && 'agent-card-glow transition-all duration-200 hover:bg-surface-bright/20',
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      {scanline && <div className="scanline absolute inset-0 pointer-events-none" />}
      {children}
    </div>
  )
}
