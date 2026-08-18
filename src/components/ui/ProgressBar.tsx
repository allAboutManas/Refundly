import { cn } from '@/lib/cn'
import type { BadgeTone } from './Badge'

const FILL: Record<BadgeTone, string> = {
  neutral: 'bg-text-3',
  primary: 'bg-primary',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
  info: 'bg-info',
}

export interface ProgressBarProps {
  /** 0..1 */
  value: number
  tone?: BadgeTone
  className?: string
}

export function ProgressBar({ value, tone = 'primary', className }: ProgressBarProps) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100)
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-pill bg-surface-2', className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-pill transition-[width] duration-500 ease-out', FILL[tone])}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
