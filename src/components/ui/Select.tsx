import { forwardRef, type SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, error, children, ...props },
  ref,
) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'h-11 w-full appearance-none rounded-md border bg-surface px-3 pr-9 text-[15px] text-text outline-none',
          'transition-[border-color,box-shadow] focus:border-primary focus:ring-4 focus:ring-primary/15',
          'disabled:cursor-not-allowed disabled:opacity-60',
          error ? 'border-danger focus:border-danger focus:ring-danger/15' : 'border-border',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-text-3" />
    </div>
  )
})
