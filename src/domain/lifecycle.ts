/**
 * Order lifecycle derivation.
 *
 * The database is the source of truth for facts (delivered? form filled?
 * expected date? received?). Status is *derived* from those facts rather than
 * stored as a duplicate mutable field (PRD §13, §69 Principle 2). This keeps the
 * PWA, Android and backend in agreement as long as they share this function.
 */
import {
  addCalendarDays,
  compareDates,
  diffCalendarDays,
} from './dates'
import { DEFAULT_REVIEW_REMINDER_DAYS } from './types'
import type { PlainDate, ReviewStatus, TimelineUnit } from './types'

/** Canonical refund-path status of an order. */
export type OrderStatus =
  | 'ORDERED'
  | 'DELIVERED'
  | 'RETURN_WINDOW_OPEN'
  | 'RETURN_WINDOW_CLOSED'
  | 'REFUND_PENDING'
  | 'REFUND_OVERDUE'
  | 'COMPLETED'

/** The single most relevant next action for an order. */
export type ActionType =
  | 'CONFIRM_DELIVERY'
  | 'CHECK_REVIEW'
  | 'FILL_REFUND_FORM'
  | 'FOLLOW_UP_REFUND'
  | 'MARK_RECEIVED'
  | 'NONE'

/** Visual urgency bucket (PRD §62): drives dashboard priority + colors. */
export type Urgency = 'overdue' | 'today' | 'upcoming' | 'none' | 'done'

export interface RefundView {
  refundFormFilled: boolean
  timelineValue: number | null
  timelineUnit: TimelineUnit | null
  expectedRefundDate: PlainDate | null
  refundRequested: boolean
  refundReceived: boolean
}

export interface OrderView {
  orderDate: PlainDate | null
  isDelivered: boolean
  deliveryDate: PlainDate | null
  returnWindowCloseDate: PlainDate | null
  reviewStatus: ReviewStatus
  refund: RefundView | null
}

export interface DeriveContext {
  /** Today's calendar date in the user's timezone. */
  today: PlainDate
  /** Calendar days after delivery to prompt a review check (default 3). */
  reviewReminderDays?: number
}

export interface DerivedState {
  status: OrderStatus
  /** 0..1 lifecycle completion, for the order-card progress bar. */
  progress: number
  action: ActionType
  urgency: Urgency
  /** Review is orthogonal to the refund path; surfaced separately. */
  reviewDue: boolean
  reviewReminderDate: PlainDate | null
  /** The date the user should care about right now (or null). */
  focusDate: PlainDate | null
  /** Days from today to focusDate; negative means overdue. */
  daysToFocus: number | null
}

const PROGRESS: Record<OrderStatus, number> = {
  ORDERED: 0.15,
  DELIVERED: 0.35,
  RETURN_WINDOW_OPEN: 0.5,
  RETURN_WINDOW_CLOSED: 0.65,
  REFUND_PENDING: 0.82,
  REFUND_OVERDUE: 0.88,
  COMPLETED: 1,
}

/**
 * Derive the full lifecycle state of an order as of `ctx.today`.
 * Evaluated most-advanced-stage first so each branch can assume earlier stages
 * are complete.
 */
export function deriveState(order: OrderView, ctx: DeriveContext): DerivedState {
  const today = ctx.today
  const reviewDays = ctx.reviewReminderDays ?? DEFAULT_REVIEW_REMINDER_DAYS
  const refund = order.refund

  // Review reminder — an orthogonal concern that can co-exist with any
  // post-delivery refund stage.
  let reviewReminderDate: PlainDate | null = null
  let reviewDue = false
  if (
    order.isDelivered &&
    order.deliveryDate &&
    order.reviewStatus === 'PENDING'
  ) {
    reviewReminderDate = addCalendarDays(order.deliveryDate, reviewDays)
    reviewDue = compareDates(today, reviewReminderDate) >= 0
  }

  const withReview = (state: Omit<DerivedState, 'reviewDue' | 'reviewReminderDate'>): DerivedState => ({
    ...state,
    reviewDue,
    reviewReminderDate,
  })

  // 1. Refund received → completed. All reminders stop.
  if (refund?.refundReceived) {
    return withReview({
      status: 'COMPLETED',
      progress: PROGRESS.COMPLETED,
      action: 'NONE',
      urgency: 'done',
      focusDate: null,
      daysToFocus: null,
    })
  }

  // 2. Not delivered yet → confirm delivery.
  if (!order.isDelivered) {
    return withReview({
      status: 'ORDERED',
      progress: PROGRESS.ORDERED,
      action: 'CONFIRM_DELIVERY',
      urgency: 'upcoming',
      focusDate: null,
      daysToFocus: null,
    })
  }

  // 3. Delivered + refund form filled → pending or overdue.
  if (refund?.refundFormFilled && refund.expectedRefundDate) {
    const cmp = compareDates(today, refund.expectedRefundDate)
    const days = diffCalendarDays(today, refund.expectedRefundDate)
    if (cmp > 0) {
      return withReview({
        status: 'REFUND_OVERDUE',
        progress: PROGRESS.REFUND_OVERDUE,
        action: 'FOLLOW_UP_REFUND',
        urgency: 'overdue',
        focusDate: refund.expectedRefundDate,
        daysToFocus: days,
      })
    }
    return withReview({
      status: 'REFUND_PENDING',
      progress: PROGRESS.REFUND_PENDING,
      action: cmp === 0 ? 'FOLLOW_UP_REFUND' : 'MARK_RECEIVED',
      urgency: cmp === 0 ? 'today' : 'upcoming',
      focusDate: refund.expectedRefundDate,
      daysToFocus: days,
    })
  }

  // 4. Delivered, form not filled → gate on the return window.
  if (order.returnWindowCloseDate) {
    const cmp = compareDates(today, order.returnWindowCloseDate)
    if (cmp >= 0) {
      // Window has closed → the refund form is now available.
      return withReview({
        status: 'RETURN_WINDOW_CLOSED',
        progress: PROGRESS.RETURN_WINDOW_CLOSED,
        action: 'FILL_REFUND_FORM',
        urgency: 'today',
        focusDate: order.returnWindowCloseDate,
        daysToFocus: diffCalendarDays(today, order.returnWindowCloseDate),
      })
    }
    // Window still open → mostly waiting, unless a review check is due.
    return withReview({
      status: 'RETURN_WINDOW_OPEN',
      progress: PROGRESS.RETURN_WINDOW_OPEN,
      action: reviewDue ? 'CHECK_REVIEW' : 'NONE',
      urgency: reviewDue ? 'today' : 'upcoming',
      focusDate: order.returnWindowCloseDate,
      daysToFocus: diffCalendarDays(today, order.returnWindowCloseDate),
    })
  }

  // 5. Delivered but no return-window date captured yet.
  return withReview({
    status: 'DELIVERED',
    progress: PROGRESS.DELIVERED,
    action: reviewDue ? 'CHECK_REVIEW' : 'NONE',
    urgency: reviewDue ? 'today' : 'upcoming',
    focusDate: reviewReminderDate,
    daysToFocus: reviewReminderDate
      ? diffCalendarDays(today, reviewReminderDate)
      : null,
  })
}

/** Whether all reminders for this order should be suppressed. */
export function isTerminal(status: OrderStatus): boolean {
  return status === 'COMPLETED'
}

/** Ordering weight for dashboard sorting (higher = more urgent). */
export function urgencyWeight(urgency: Urgency): number {
  switch (urgency) {
    case 'overdue':
      return 4
    case 'today':
      return 3
    case 'upcoming':
      return 2
    case 'none':
      return 1
    case 'done':
      return 0
  }
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  ORDERED: 'Ordered',
  DELIVERED: 'Delivered',
  RETURN_WINDOW_OPEN: 'Return window open',
  RETURN_WINDOW_CLOSED: 'Refund form ready',
  REFUND_PENDING: 'Refund pending',
  REFUND_OVERDUE: 'Refund overdue',
  COMPLETED: 'Completed',
}

export function statusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status]
}

const ACTION_LABELS: Record<ActionType, string> = {
  CONFIRM_DELIVERY: 'Confirm delivery',
  CHECK_REVIEW: 'Check review',
  FILL_REFUND_FORM: 'Fill refund form',
  FOLLOW_UP_REFUND: 'Follow up',
  MARK_RECEIVED: 'Mark received',
  NONE: '',
}

export function actionLabel(action: ActionType): string {
  return ACTION_LABELS[action]
}
