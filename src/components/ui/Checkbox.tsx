import type { ReactNode } from 'react'
import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
  label?: ReactNode
  className?: string
}

export function Checkbox({ checked, onChange, disabled, id, label, className }: CheckboxProps) {
  const box = (
    <button
      id={id}
      type="button"
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'grid size-5 shrink-0 place-items-center rounded-[6px] border transition-all duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        checked ? 'border-primary bg-primary text-white' : 'border-border-strong bg-surface',
      )}
    >
      <Check className={cn('size-3.5 transition-transform', checked ? 'scale-100' : 'scale-0')} strokeWidth={3} />
    </button>
  )

  if (!label) return box
  return (
    <label className={cn('flex cursor-pointer items-center gap-2.5 text-[15px] text-text', className)}>
      {box}
      {label}
    </label>
  )
}
