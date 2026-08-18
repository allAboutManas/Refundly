import { Link } from 'react-router-dom'
import { Package } from 'lucide-react'
import { Badge, Card, ProgressBar } from '@/components/ui'
import { statusVisual, urgencyTone } from '@/lib/statusStyles'
import { toOrderView } from '@/lib/orderView'
import { platformName } from '@/api/platforms'
import type { OrderWithRefund } from '@/api/orders'
import type { PlatformRow } from '@/lib/database.types'
import {
  deriveState,
  dueLabel,
  formatDateShort,
  formatINR,
  type PlainDate,
  type DerivedState,
} from '@/domain'

function ProductIcon() {
  return (
    <div className="grid size-16 shrink-0 place-items-center rounded-md border border-border bg-surface-2 text-text-3">
      <Package className="size-6" />
    </div>
  )
}

/** Short "what's next" line derived from lifecycle state. */
export function nextStepText(
  state: DerivedState,
  order: OrderWithRefund,
  today: PlainDate,
): string {
  switch (state.status) {
    case 'COMPLETED':
      return order.refund?.refund_received_date
        ? `Received ${formatDateShort(order.refund.refund_received_date)}`
        : 'Refund received'
    case 'REFUND_OVERDUE':
      return state.focusDate ? dueLabel(state.focusDate, today) : 'Refund overdue'
    case 'REFUND_PENDING':
      return state.focusDate ? `Expected ${formatDateShort(state.focusDate)}` : 'Refund pending'
    case 'RETURN_WINDOW_CLOSED':
      return 'Refund form ready'
    case 'RETURN_WINDOW_OPEN':
      return state.reviewDue
        ? 'Review check due'
        : state.focusDate
          ? `Return window closes ${formatDateShort(state.focusDate)}`
          : 'In return window'
    case 'DELIVERED':
      return state.reviewDue ? 'Review check due' : 'Delivered'
    case 'ORDERED':
      return 'Awaiting delivery'
  }
}

export function OrderCard({
  order,
  today,
  platforms,
}: {
  order: OrderWithRefund
  today: PlainDate
  platforms?: PlatformRow[]
}) {
  const state = deriveState(toOrderView(order), { today })
  const visual = statusVisual(state.status)
  const platform = platformName(platforms, order.platform_id, order.custom_platform_name)

  return (
    <Link to={`/app/orders/${order.id}`} className="block">
      <Card interactive className="flex gap-4">
        <ProductIcon />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold text-text">{order.product_name}</p>
              <p className="truncate text-sm text-text-3">
                {platform} · #{order.order_id}
              </p>
            </div>
            <Badge tone={visual.tone} dot>
              {visual.label}
            </Badge>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="text-[15px] font-bold text-text">
              {formatINR(order.refund_amount)}
            </span>
            <span
              className={cnTone(urgencyTone(state.urgency))}
            >
              {nextStepText(state, order, today)}
            </span>
          </div>

          <ProgressBar value={state.progress} tone={visual.tone} className="mt-2.5" />
        </div>
      </Card>
    </Link>
  )
}

function cnTone(tone: ReturnType<typeof urgencyTone>): string {
  const map: Record<string, string> = {
    danger: 'text-danger',
    warning: 'text-warning',
    info: 'text-text-2',
    success: 'text-success',
    neutral: 'text-text-3',
  }
  return `text-sm font-semibold ${map[tone] ?? 'text-text-3'}`
}
