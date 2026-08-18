import {
  deriveState,
  diffCalendarDays,
  urgencyWeight,
  type DerivedState,
  type PlainDate,
} from '@/domain'
import { toOrderView } from '@/lib/orderView'
import type { OrderWithRefund } from '@/api/orders'

export interface OrderWithState {
  order: OrderWithRefund
  state: DerivedState
}

export type UpcomingType = 'REVIEW' | 'RETURN' | 'REFUND'

export interface UpcomingItem {
  order: OrderWithRefund
  type: UpcomingType
  date: PlainDate
  overdue: boolean
}

/** Derive lifecycle state for every order once. */
export function withStates(orders: OrderWithRefund[], today: PlainDate): OrderWithState[] {
  return orders.map((order) => ({ order, state: deriveState(toOrderView(order), { today }) }))
}

/** Orders that need action now (overdue or due today), most urgent first. */
export function actionItems(items: OrderWithState[]): OrderWithState[] {
  return items
    .filter((i) => i.state.urgency === 'overdue' || i.state.urgency === 'today')
    .filter((i) => i.state.action !== 'NONE')
    .sort(
      (a, b) =>
        urgencyWeight(b.state.urgency) - urgencyWeight(a.state.urgency) ||
        (a.state.daysToFocus ?? 0) - (b.state.daysToFocus ?? 0),
    )
}

/** Money + counts summary for the dashboard stats row. */
export function computeStats(items: OrderWithState[], today: PlainDate) {
  let pendingAmount = 0
  let dueThisWeekAmount = 0
  let completedAmount = 0
  let activeCount = 0

  for (const { order, state } of items) {
    if (state.status === 'COMPLETED') {
      completedAmount += order.refund?.actual_refund_amount ?? order.refund_amount
      continue
    }
    activeCount++
    if (state.status === 'REFUND_PENDING' || state.status === 'REFUND_OVERDUE') {
      pendingAmount += order.refund_amount
      const expected = order.refund?.expected_refund_date
      if (expected) {
        const d = diffCalendarDays(today, expected)
        if (d >= 0 && d <= 7) dueThisWeekAmount += order.refund_amount
      }
    }
  }

  return { pendingAmount, dueThisWeekAmount, completedAmount, activeCount }
}

/** Upcoming (and overdue) key dates across all active orders, sorted by date. */
export function buildUpcoming(items: OrderWithState[], today: PlainDate): UpcomingItem[] {
  const out: UpcomingItem[] = []
  for (const { order, state } of items) {
    if (state.status === 'COMPLETED') continue
    const refund = order.refund

    if (order.is_delivered && order.review_status === 'PENDING' && state.reviewReminderDate) {
      out.push({
        order,
        type: 'REVIEW',
        date: state.reviewReminderDate,
        overdue: diffCalendarDays(today, state.reviewReminderDate) < 0,
      })
    }
    if (order.return_window_close_date && !refund?.refund_form_filled) {
      out.push({
        order,
        type: 'RETURN',
        date: order.return_window_close_date,
        overdue: diffCalendarDays(today, order.return_window_close_date) < 0,
      })
    }
    if (refund?.refund_form_filled && refund.expected_refund_date && !refund.refund_received) {
      out.push({
        order,
        type: 'REFUND',
        date: refund.expected_refund_date,
        overdue: diffCalendarDays(today, refund.expected_refund_date) < 0,
      })
    }
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}
