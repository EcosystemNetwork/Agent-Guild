import { cn } from '../../lib/utils'

export interface IconProps {
  name: string
  filled?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  style?: React.CSSProperties
}

const sizeClass = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-2xl',
}

export default function Icon({ name, filled, className, size = 'md', style }: IconProps) {
  return (
    <span
      className={cn('material-symbols-outlined', sizeClass[size], className)}
      style={{ ...(filled ? { fontVariationSettings: "'FILL' 1" } : {}), ...style }}
    >
      {name}
    </span>
  )
}
