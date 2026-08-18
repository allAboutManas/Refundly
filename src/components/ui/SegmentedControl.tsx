import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface Segment<T extends string> {
  value: T
  label: ReactNode
}

export interface SegmentedControlProps<T extends string> {
  value: T
  onChange: (value: T) => void
  segments: Segment<T>[]
  className?: string
  size?: 'sm' | 'md'
}

/** Pill segmented control with a sliding active indicator. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  segments,
  className,
  size = 'md',
}: SegmentedControlProps<T>) {
  const activeIndex = Math.max(0, segments.findIndex((s) => s.value === value))
  const pad = size === 'sm' ? 'p-0.5' : 'p-1'
  const height = size === 'sm' ? 'h-9' : 'h-11'

  return (
    <div
      role="tablist"
      className={cn(
        'relative inline-grid w-full rounded-md border border-border bg-surface-2',
        pad,
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${segments.length}, 1fr)` }}
    >
      {/* sliding thumb */}
      <span
        aria-hidden
        className={cn(
          'absolute rounded-[9px] bg-surface shadow-sm transition-transform duration-200 ease-out',
          size === 'sm' ? 'top-0.5 bottom-0.5' : 'top-1 bottom-1',
        )}
        style={{
          width: `calc((100% - ${size === 'sm' ? '4px' : '8px'}) / ${segments.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
          left: size === 'sm' ? '2px' : '4px',
        }}
      />
      {segments.map((seg) => {
        const selected = seg.value === value
        return (
          <button
            key={seg.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(seg.value)}
            className={cn(
              'relative z-10 flex items-center justify-center rounded-[9px] px-3 text-sm font-semibold transition-colors',
              height,
              selected ? 'text-text' : 'text-text-3 hover:text-text-2',
            )}
          >
            {seg.label}
          </button>
        )
      })}
    </div>
  )
}
