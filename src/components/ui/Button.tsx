import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { Spinner } from './Spinner'

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'destructive'
  | 'subtle'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const BASE =
  'relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold ' +
  'rounded-md transition-[background-color,box-shadow,transform,color] duration-150 ease-out ' +
  'select-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 ' +
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover',
  secondary: 'border border-border bg-surface text-text hover:bg-surface-2',
  ghost: 'text-text-2 hover:bg-surface-2 hover:text-text',
  destructive: 'bg-danger text-white shadow-sm hover:brightness-105',
  subtle: 'bg-primary-soft text-primary hover:brightness-105',
}

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-11 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
  icon: 'size-10 shrink-0',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    leftIcon,
    rightIcon,
    fullWidth,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...props}
    >
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner />
        </span>
      )}
      <span className={cn('contents', loading && 'invisible')}>
        {leftIcon}
        {children}
        {rightIcon}
      </span>
    </button>
  )
})
