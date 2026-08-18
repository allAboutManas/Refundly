import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface SettingsRowProps {
  icon: LucideIcon
  label: string
  description?: string
  to?: string
  onClick?: () => void
  danger?: boolean
  trailing?: ReactNode
}

export function SettingsRow({
  icon: Icon,
  label,
  description,
  to,
  onClick,
  danger,
  trailing,
}: SettingsRowProps) {
  const inner = (
    <>
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-full',
          danger ? 'bg-danger-soft text-danger' : 'bg-surface-2 text-text-2',
        )}
      >
        <Icon className="size-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn('block text-[15px] font-semibold', danger ? 'text-danger' : 'text-text')}>
          {label}
        </span>
        {description && <span className="block truncate text-sm text-text-3">{description}</span>}
      </span>
      {trailing ?? (to || onClick ? <ChevronRight className="size-4 shrink-0 text-text-3" /> : null)}
    </>
  )

  const className =
    'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-2'

  if (to) {
    return (
      <Link to={to} className={className}>
        {inner}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button onClick={onClick} className={className}>
        {inner}
      </button>
    )
  }
  return <div className={cn(className, 'cursor-default hover:bg-transparent')}>{inner}</div>
}
