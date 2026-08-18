import { useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { cn } from '@/lib/cn'

export interface OtpInputProps {
  /** Number of digit boxes to render. */
  length?: number
  /** The digits entered so far (kept contiguous from the left). */
  value: string
  onChange: (value: string) => void
  error?: boolean
  autoFocus?: boolean
  /** Accessible label for the group of boxes. */
  label?: string
}

/**
 * A segmented one-time-code input: `length` single-digit boxes with
 * type-to-advance, backspace, arrow-key navigation and paste-to-fill.
 * The value is stored as a plain digit string (e.g. "1234") — no gaps.
 */
export function OtpInput({
  length = 6,
  value,
  onChange,
  error,
  autoFocus,
  label = 'Verification code',
}: OtpInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digits = value.split('')

  function focusBox(i: number) {
    const el = refs.current[Math.max(0, Math.min(length - 1, i))]
    el?.focus()
    el?.select()
  }

  function commit(next: string) {
    onChange(next.replace(/\D/g, '').slice(0, length))
  }

  function handleChange(i: number, raw: string) {
    const typed = raw.replace(/\D/g, '')
    if (!typed) {
      // Native clear (e.g. select-all then delete) — drop from here on.
      commit(value.slice(0, i))
      return
    }
    // Write the typed digit(s) starting at this box, then advance.
    const chars = value.split('')
    for (let k = 0; k < typed.length && i + k < length; k++) {
      chars[i + k] = typed[k]
    }
    commit(chars.join('').slice(0, length))
    focusBox(Math.min(i + typed.length, length - 1))
  }

  function handleKeyDown(i: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      e.preventDefault()
      if (digits[i]) {
        commit(value.slice(0, i) + value.slice(i + 1))
      } else if (i > 0) {
        commit(value.slice(0, i - 1))
        focusBox(i - 1)
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      focusBox(i - 1)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      focusBox(i + 1)
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    if (!pasted) return
    commit(pasted)
    focusBox(Math.min(pasted.length, length - 1))
  }

  return (
    <div role="group" aria-label={label} className="flex gap-2">
      {Array.from({ length }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          aria-label={`Digit ${i + 1}`}
          value={digits[i] ?? ''}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => {
            // Keep entry contiguous: clicking a box past the next empty one
            // jumps focus back to the first unfilled box.
            if (i > value.length) focusBox(value.length)
            else e.currentTarget.select()
          }}
          className={cn(
            'h-12 w-full min-w-0 rounded-md border bg-surface text-center text-lg font-semibold text-text',
            'outline-none transition-[border-color,box-shadow]',
            'focus:border-primary focus:ring-4 focus:ring-primary/15',
            error ? 'border-danger focus:border-danger focus:ring-danger/15' : 'border-border',
          )}
        />
      ))}
    </div>
  )
}
