import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface EmptyStateProps {
  /** An emoji or icon node shown in the illustration bubble. */
  icon?: ReactNode
  title: string
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border px-6 py-14 text-center',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 grid size-16 place-items-center rounded-full bg-surface-2 text-3xl">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-text">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-[15px] text-text-2">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  )
}
