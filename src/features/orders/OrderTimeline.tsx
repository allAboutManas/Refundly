import { Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { compareDates, formatDateShort, type PlainDate } from '@/domain'
import type { OrderWithRefund } from '@/api/orders'

type NodeState = 'done' | 'current' | 'pending'

interface Entry {
  key: string
  title: string
  date: PlainDate | null
  done: boolean
  side?: boolean
}

function buildEntries(order: OrderWithRefund, today: PlainDate): Entry[] {
  const r = order.refund
  const entries: Entry[] = [
    { key: 'created', title: 'Order added', date: order.order_date, done: true },
    { key: 'delivered', title: 'Delivered', date: order.delivery_date, done: order.is_delivered },
  ]
  if (order.is_delivered) {
    entries.push({
      key: 'review',
      title: order.review_status === 'NOT_REQUIRED' ? 'Review — not required' : 'Review checked',
      date: null,
      done: order.review_status !== 'PENDING',
      side: true,
    })
  }
  entries.push({
    key: 'return',
    title: 'Return window closed',
    date: order.return_window_close_date,
    done:
      Boolean(order.return_window_close_date) &&
      compareDates(today, order.return_window_close_date!) >= 0,
  })
  entries.push({
    key: 'form',
    title: 'Refund form filled',
    date: r?.refund_form_filled_date ?? null,
    done: Boolean(r?.refund_form_filled),
  })
  entries.push({
    key: 'expected',
    title: 'Refund expected',
    date: r?.expected_refund_date ?? null,
    done: Boolean(r?.refund_received),
  })
  entries.push({
    key: 'received',
    title: 'Refund received',
    date: r?.refund_received_date ?? null,
    done: Boolean(r?.refund_received),
  })
  return entries
}

export function OrderTimeline({ order, today }: { order: OrderWithRefund; today: PlainDate }) {
  const entries = buildEntries(order, today)
  const currentKey = entries.find((e) => !e.side && !e.done)?.key

  return (
    <ol className="relative ml-1 space-y-5 border-l-2 border-border pl-6">
      {entries.map((e) => {
        const state: NodeState = e.done ? 'done' : e.key === currentKey ? 'current' : 'pending'
        return (
          <li key={e.key} className="relative">
            <span
              className={cn(
                'absolute -left-[31px] grid size-6 place-items-center rounded-full ring-4 ring-bg transition-colors',
                state === 'done' && 'bg-primary text-primary-foreground',
                state === 'current' && 'border-2 border-primary bg-surface',
                state === 'pending' && 'border-2 border-border bg-surface',
              )}
            >
              {state === 'done' ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : state === 'current' ? (
                <span className="size-2 rounded-full bg-primary" />
              ) : null}
            </span>
            <div className="flex items-baseline justify-between gap-3">
              <p
                className={cn(
                  'text-[15px] font-semibold',
                  state === 'pending' ? 'text-text-3' : 'text-text',
                )}
              >
                {e.title}
              </p>
              <p
                className={cn(
                  'shrink-0 text-sm',
                  state === 'current' ? 'font-semibold text-primary' : 'text-text-3',
                )}
              >
                {e.date ? formatDateShort(e.date, { withYear: true }) : e.done ? '✓' : 'Pending'}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
