import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface StepperProps {
  total: number
  /** 1-based index of the current step. */
  current: number
  className?: string
}

export function Stepper({ total, current, className }: StepperProps) {
  return (
    <div className={cn('flex items-center', className)} aria-label={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1
        const done = n < current
        const active = n === current
        return (
          <div key={n} className="flex flex-1 items-center last:flex-none">
            <span
              className={cn(
                'grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors',
                done && 'bg-primary text-primary-foreground',
                active && 'bg-primary-soft text-primary ring-2 ring-primary',
                !done && !active && 'bg-surface-2 text-text-3',
              )}
            >
              {done ? <Check className="size-4" strokeWidth={3} /> : n}
            </span>
            {n < total && (
              <span
                className={cn(
                  'mx-1.5 h-0.5 flex-1 rounded-full transition-colors',
                  done ? 'bg-primary' : 'bg-surface-2',
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
