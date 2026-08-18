import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, Info, TriangleAlert, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/cn'

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

interface ToastItem {
  id: number
  tone: ToastTone
  title: string
  description?: string
}

interface ToastOptions {
  tone?: ToastTone
  title: string
  description?: string
  duration?: number
}

interface ToastContextValue {
  toast: (opts: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const TONE_META: Record<ToastTone, { icon: ReactNode; ring: string }> = {
  success: { icon: <CheckCircle2 className="size-5 text-success" />, ring: 'border-l-success' },
  error: { icon: <XCircle className="size-5 text-danger" />, ring: 'border-l-danger' },
  warning: { icon: <TriangleAlert className="size-5 text-warning" />, ring: 'border-l-warning' },
  info: { icon: <Info className="size-5 text-info" />, ring: 'border-l-info' },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const idRef = useRef(0)

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    ({ tone = 'info', title, description, duration = 4000 }: ToastOptions) => {
      const id = ++idRef.current
      setItems((prev) => [...prev, { id, tone, title, description }])
      window.setTimeout(() => remove(id), duration)
    },
    [remove],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:right-4 sm:items-end">
          {items.map((t) => (
            <div
              key={t.id}
              role="status"
              className={cn(
                'pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-lg border border-l-4 border-border bg-elevated p-3.5 shadow-lg',
                TONE_META[t.tone].ring,
              )}
            >
              <span className="mt-0.5 shrink-0">{TONE_META[t.tone].icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-text">{t.title}</p>
                {t.description && <p className="mt-0.5 text-sm text-text-2">{t.description}</p>}
              </div>
              <button
                type="button"
                onClick={() => remove(t.id)}
                aria-label="Dismiss"
                className="-m-1 grid size-6 shrink-0 place-items-center rounded text-text-3 hover:text-text"
              >
                <X className="size-4" />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within a ToastProvider')
  return ctx
}
