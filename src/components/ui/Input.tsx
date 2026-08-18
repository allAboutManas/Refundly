import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'

const FIELD_BASE =
  'w-full rounded-md border bg-surface text-text placeholder:text-text-3 ' +
  'transition-[border-color,box-shadow] outline-none ' +
  'focus:border-primary focus:ring-4 focus:ring-primary/15 ' +
  'disabled:cursor-not-allowed disabled:opacity-60'

function borderClass(error?: boolean) {
  return error ? 'border-danger focus:border-danger focus:ring-danger/15' : 'border-border'
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  /** Adornment shown inside the field on the left, e.g. an icon or "₹". */
  leading?: ReactNode
  trailing?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, leading, trailing, ...props },
  ref,
) {
  if (leading || trailing) {
    return (
      <div
        className={cn(
          'flex h-11 items-center rounded-md border bg-surface transition-[border-color,box-shadow]',
          'focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15',
          borderClass(error),
          props.disabled && 'opacity-60',
        )}
      >
        {leading && <span className="pl-3 text-sm font-medium text-text-3">{leading}</span>}
        <input
          ref={ref}
          className={cn(
            'h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] text-text outline-none placeholder:text-text-3',
            className,
          )}
          {...props}
        />
        {trailing && <span className="pr-3 text-sm font-medium text-text-3">{trailing}</span>}
      </div>
    )
  }

  return (
    <input
      ref={ref}
      className={cn(FIELD_BASE, borderClass(error), 'h-11 px-3 text-[15px]', className)}
      {...props}
    />
  )
})

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }
>(function Textarea({ className, error, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(FIELD_BASE, borderClass(error), 'resize-none px-3 py-2.5 text-[15px]', className)}
      {...props}
    />
  )
})
