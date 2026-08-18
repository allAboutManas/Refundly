// Self-contained port of the frontend domain logic (src/domain) for Deno.
// Keep in sync with the PWA so scheduling matches what the UI shows.

export type PlainDate = string
export type TimelineUnit = 'CALENDAR_DAYS' | 'WORKING_DAYS'
export type ReviewStatus = 'PENDING' | 'SUBMITTED' | 'LIVE' | 'NOT_LIVE' | 'NOT_REQUIRED'
export type RefundReminderFrequency = 'DAILY' | 'EVERY_2_DAYS' | 'EVERY_3_DAYS' | 'WEEKLY'
export type NotificationType =
  | 'DELIVERY_CONFIRM'
  | 'REVIEW_REMINDER'
  | 'RETURN_WINDOW_CLOSED'
  | 'REFUND_DUE'
  | 'REFUND_OVERDUE'
export type NotificationChannel = 'PUSH' | 'EMAIL' | 'IN_APP'

const DAY_MS = 86_400_000
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/

const REMINDER_FREQUENCY_DAYS: Record<RefundReminderFrequency, number> = {
  DAILY: 1,
  EVERY_2_DAYS: 2,
  EVERY_3_DAYS: 3,
  WEEKLY: 7,
}
export const DELIVERY_NUDGE_DAYS = 3

function toUTCms(date: PlainDate): number {
  const m = DATE_RE.exec(date)
  if (!m) throw new RangeError(`Invalid PlainDate: ${date}`)
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
}
function fromUTCms(ms: number): PlainDate {
  const d = new Date(ms)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate(),
  ).padStart(2, '0')}`
}
export function addCalendarDays(date: PlainDate, days: number): PlainDate {
  return fromUTCms(toUTCms(date) + days * DAY_MS)
}
export function compareDates(a: PlainDate, b: PlainDate): number {
  const am = toUTCms(a)
  const bm = toUTCms(b)
  return am < bm ? -1 : am > bm ? 1 : 0
}
export function diffCalendarDays(from: PlainDate, to: PlainDate): number {
  return Math.round((toUTCms(to) - toUTCms(from)) / DAY_MS)
}
export function todayInTimeZone(timeZone: string, now: Date = new Date()): PlainDate {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '01'
  return `${get('year')}-${get('month')}-${get('day')}`
}

export interface RefundView {
  refundFormFilled: boolean
  expectedRefundDate: PlainDate | null
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
export interface ReminderPrefs {
  reviewRemindersEnabled: boolean
  returnWindowRemindersEnabled: boolean
  refundRemindersEnabled: boolean
  refundReminderFrequency: RefundReminderFrequency
  reviewReminderDays: number
}
export interface DueReminder {
  type: NotificationType
  scheduledDate: PlainDate
  reason: string
}

export function computeDueReminders(
  order: OrderView,
  today: PlainDate,
  prefs: ReminderPrefs,
): DueReminder[] {
  const out: DueReminder[] = []
  const refund = order.refund
  if (refund?.refundReceived) return out

  if (!order.isDelivered) {
    if (order.orderDate) {
      const scheduledDate = addCalendarDays(order.orderDate, DELIVERY_NUDGE_DAYS)
      if (compareDates(today, scheduledDate) >= 0) {
        out.push({ type: 'DELIVERY_CONFIRM', scheduledDate, reason: 'Order not marked delivered.' })
      }
    }
    return out
  }

  if (prefs.reviewRemindersEnabled && order.deliveryDate && order.reviewStatus === 'PENDING') {
    const scheduledDate = addCalendarDays(order.deliveryDate, prefs.reviewReminderDays)
    if (compareDates(today, scheduledDate) >= 0) {
      out.push({ type: 'REVIEW_REMINDER', scheduledDate, reason: 'Review check due.' })
    }
  }

  if (refund?.refundFormFilled && refund.expectedRefundDate) {
    if (prefs.refundRemindersEnabled) {
      const diff = diffCalendarDays(refund.expectedRefundDate, today)
      if (diff === 0) {
        out.push({ type: 'REFUND_DUE', scheduledDate: today, reason: 'Expected refund date reached.' })
      } else if (diff > 0) {
        const cadence = REMINDER_FREQUENCY_DAYS[prefs.refundReminderFrequency]
        if (diff % cadence === 0) {
          out.push({ type: 'REFUND_OVERDUE', scheduledDate: today, reason: `Refund overdue by ${diff} day(s).` })
        }
      }
    }
  } else if (order.returnWindowCloseDate && prefs.returnWindowRemindersEnabled) {
    if (compareDates(today, order.returnWindowCloseDate) >= 0) {
      out.push({
        type: 'RETURN_WINDOW_CLOSED',
        scheduledDate: order.returnWindowCloseDate,
        reason: 'Return window closed; refund form available.',
      })
    }
  }

  return out
}

export function deduplicationKey(
  orderId: string,
  type: NotificationType,
  scheduledDate: PlainDate,
  channel: NotificationChannel,
): string {
  return `${orderId}:${type}:${scheduledDate}:${channel}`
}

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export interface NotificationContent {
  title: string
  body: string
}

export function buildContent(
  type: NotificationType,
  product: string,
  platform: string,
  amount: number,
): NotificationContent {
  switch (type) {
    case 'DELIVERY_CONFIRM':
      return { title: '📦 Was your order delivered?', body: `${product} · ${platform}` }
    case 'REVIEW_REMINDER':
      return { title: '⭐ Check your review', body: `Have you reviewed ${product}?` }
    case 'RETURN_WINDOW_CLOSED':
      return {
        title: '🔒 Return window closed',
        body: `You can now fill the refund form for ${product}.`,
      }
    case 'REFUND_DUE':
      return {
        title: '💰 Your refund is due',
        body: `${formatINR(amount)} refund for ${product} (${platform}) is due today.`,
      }
    case 'REFUND_OVERDUE':
      return {
        title: '🚨 Your refund is overdue',
        body: `Follow up on your ${formatINR(amount)} refund for ${product} (${platform}).`,
      }
  }
}
