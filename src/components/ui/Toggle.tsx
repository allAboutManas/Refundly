import { cn } from '@/lib/cn'

export interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  id?: string
  'aria-label'?: string
  size?: 'sm' | 'md'
}

/** Accessible on/off switch with a smooth thumb transition. */
export function Toggle({
  checked,
  onChange,
  disabled,
  id,
  size = 'md',
  ...aria
}: ToggleProps) {
  const dims =
    size === 'sm'
      ? { track: 'h-5 w-9', thumb: 'size-4', shift: 'translate-x-4' }
      : { track: 'h-6 w-11', thumb: 'size-5', shift: 'translate-x-5' }

  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={aria['aria-label']}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex shrink-0 items-center rounded-pill p-0.5 transition-colors duration-200',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        'disabled:cursor-not-allowed disabled:opacity-50',
        dims.track,
        checked ? 'bg-primary' : 'bg-border-strong',
      )}
    >
      <span
        className={cn(
          'inline-block rounded-full bg-white shadow-sm transition-transform duration-200 ease-out',
          dims.thumb,
          checked ? dims.shift : 'translate-x-0',
        )}
      />
    </button>
  )
}
