/**
 * Reminder engine (PRD §38, §61).
 *
 * Pure function that, given an order and today's date, returns which reminders
 * are due *today*. The backend scheduled processor runs this once per day and
 * inserts a notification per due reminder × enabled channel, using the
 * deduplication key so re-running the job never double-sends (PRD §38, §69/4).
 *
 * The same logic is intended to be mirrored by the Supabase Edge Function so
 * scheduling stays consistent with what the UI shows.
 */
import { addCalendarDays, compareDates, diffCalendarDays } from './dates'
import { REMINDER_FREQUENCY_DAYS } from './types'
import type {
  NotificationChannel,
  NotificationType,
  PlainDate,
  RefundReminderFrequency,
} from './types'
import type { DeriveContext, OrderView } from './lifecycle'

/** Days after ordering (still not delivered) to nudge a delivery confirmation. */
export const DELIVERY_NUDGE_DAYS = 3

export interface ReminderPrefs {
  reviewRemindersEnabled: boolean
  returnWindowRemindersEnabled: boolean
  refundRemindersEnabled: boolean
  refundReminderFrequency: RefundReminderFrequency
  /** Calendar days after delivery to prompt a review check. */
  reviewReminderDays: number
}

export interface DueReminder {
  type: NotificationType
  /** Fixed date used for deduplication; stable across re-runs. */
  scheduledDate: PlainDate
  /** Human-readable audit explanation (PRD §64). */
  reason: string
}

export const DEFAULT_REMINDER_PREFS: ReminderPrefs = {
  reviewRemindersEnabled: true,
  returnWindowRemindersEnabled: true,
  refundRemindersEnabled: true,
  refundReminderFrequency: 'DAILY',
  reviewReminderDays: 3,
}

/**
 * Return the reminders that are due for `order` as of `ctx.today`.
 * Point reminders (delivery/review/return/due) use a fixed scheduledDate so
 * they fire once; overdue refund reminders recur on the configured cadence with
 * scheduledDate = today, making each day's send idempotent.
 */
export function computeDueReminders(
  order: OrderView,
  ctx: DeriveContext,
  prefs: ReminderPrefs,
): DueReminder[] {
  const today = ctx.today
  const out: DueReminder[] = []
  const refund = order.refund

  // Terminal: refund received → no reminders.
  if (refund?.refundReceived) return out

  // Not delivered → single delivery-confirmation nudge.
  if (!order.isDelivered) {
    if (order.orderDate) {
      const scheduledDate = addCalendarDays(order.orderDate, DELIVERY_NUDGE_DAYS)
      if (compareDates(today, scheduledDate) >= 0) {
        out.push({
          type: 'DELIVERY_CONFIRM',
          scheduledDate,
          reason: 'Order placed a few days ago and not marked delivered.',
        })
      }
    }
    return out
  }

  // Review reminder (orthogonal to refund path).
  if (
    prefs.reviewRemindersEnabled &&
    order.deliveryDate &&
    order.reviewStatus === 'PENDING'
  ) {
    const scheduledDate = addCalendarDays(order.deliveryDate, prefs.reviewReminderDays)
    if (compareDates(today, scheduledDate) >= 0) {
      out.push({
        type: 'REVIEW_REMINDER',
        scheduledDate,
        reason: 'Review check is due after delivery.',
      })
    }
  }

  // Refund path.
  if (refund?.refundFormFilled && refund.expectedRefundDate) {
    const diff = diffCalendarDays(refund.expectedRefundDate, today)
    if (prefs.refundRemindersEnabled) {
      if (diff === 0) {
        out.push({
          type: 'REFUND_DUE',
          scheduledDate: today,
          reason: 'Expected refund date reached.',
        })
      } else if (diff > 0) {
        const cadence = REMINDER_FREQUENCY_DAYS[prefs.refundReminderFrequency]
        if (diff % cadence === 0) {
          out.push({
            type: 'REFUND_OVERDUE',
            scheduledDate: today,
            reason: `Refund overdue by ${diff} day(s); follow-up reminder.`,
          })
        }
      }
    }
  } else if (order.returnWindowCloseDate && prefs.returnWindowRemindersEnabled) {
    // Return window closed but refund form not yet filled.
    if (compareDates(today, order.returnWindowCloseDate) >= 0) {
      out.push({
        type: 'RETURN_WINDOW_CLOSED',
        scheduledDate: order.returnWindowCloseDate,
        reason: 'Return window has closed; refund form is available.',
      })
    }
  }

  return out
}

/** Deduplication key (PRD §38): order + type + scheduled date + channel. */
export function deduplicationKey(
  orderId: string,
  type: NotificationType,
  scheduledDate: PlainDate,
  channel: NotificationChannel,
): string {
  return `${orderId}:${type}:${scheduledDate}:${channel}`
}
