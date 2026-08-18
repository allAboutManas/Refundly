import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning' | 'danger' | 'info'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-text-2',
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
}

const DOT_TONES: Record<BadgeTone, string> = {
  neutral: 'bg-text-3',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

export interface BadgeProps {
  tone?: BadgeTone
  /** Show a leading status dot. Accessibility: never rely on color alone. */
  dot?: boolean
  icon?: ReactNode
  className?: string
  children: ReactNode
}

export function Badge({ tone = 'neutral', dot, icon, className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-1 text-xs font-semibold',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className={cn('size-1.5 rounded-full', DOT_TONES[tone])} />}
      {icon}
      {children}
    </span>
  )
}
