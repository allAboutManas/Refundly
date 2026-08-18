import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export interface PageHeaderProps {
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  /** Show a back button (defaults to browser back). */
  back?: boolean | (() => void)
}

export function PageHeader({ title, description, action, back }: PageHeaderProps) {
  const navigate = useNavigate()
  const onBack = typeof back === 'function' ? back : () => navigate(-1)

  return (
    <div className="mb-6">
      {back && (
        <button
          onClick={onBack}
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-text-2 hover:text-text"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-text sm:text-[26px]">{title}</h1>
          {description && <p className="mt-1 text-[15px] text-text-2">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}
