import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface RadioOption<T extends string> {
  value: T
  label: ReactNode
  description?: ReactNode
}

export interface RadioGroupProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: RadioOption<T>[]
  name?: string
  className?: string
}

/** Vertical list of selectable rows with an animated radio dot. */
export function RadioGroup<T extends string>({
  value,
  onChange,
  options,
  name,
  className,
}: RadioGroupProps<T>) {
  return (
    <div role="radiogroup" className={cn('flex flex-col gap-2', className)}>
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            name={name}
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center gap-3 rounded-md border px-3.5 py-3 text-left transition-all duration-150',
              'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
              selected
                ? 'border-primary bg-primary-soft'
                : 'border-border bg-surface hover:bg-surface-2',
            )}
          >
            <span
              className={cn(
                'grid size-5 shrink-0 place-items-center rounded-full border-2 transition-colors',
                selected ? 'border-primary' : 'border-border-strong',
              )}
            >
              <span
                className={cn(
                  'size-2.5 rounded-full bg-primary transition-transform duration-150',
                  selected ? 'scale-100' : 'scale-0',
                )}
              />
            </span>
            <span className="flex flex-col">
              <span className="text-[15px] font-medium text-text">{opt.label}</span>
              {opt.description && (
                <span className="text-sm text-text-3">{opt.description}</span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
