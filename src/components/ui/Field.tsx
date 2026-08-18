import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export interface FieldProps {
  label?: ReactNode
  htmlFor?: string
  hint?: ReactNode
  error?: string | null
  required?: boolean
  className?: string
  children: ReactNode
}

/** Labelled form-field wrapper with hint + error slots. */
export function Field({ label, htmlFor, hint, error, required, className, children }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-semibold text-text">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-sm font-medium text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-text-3">{hint}</p>
      ) : null}
    </div>
  )
}
