import { describe, it, expect } from 'vitest'
import {
  DEFAULT_REMINDER_PREFS,
  computeDueReminders,
  deduplicationKey,
} from './reminders'
import type { OrderView } from './lifecycle'

function makeOrder(overrides: Partial<OrderView> = {}): OrderView {
  return {
    orderDate: '2026-08-01',
    isDelivered: false,
    deliveryDate: null,
    returnWindowCloseDate: null,
    reviewStatus: 'NOT_REQUIRED',
    refund: null,
    ...overrides,
  }
}

describe('computeDueReminders', () => {
  it('nudges a delivery confirmation after the grace period', () => {
    const due = computeDueReminders(makeOrder(), { today: '2026-08-16' }, DEFAULT_REMINDER_PREFS)
    expect(due).toHaveLength(1)
    expect(due[0].type).toBe('DELIVERY_CONFIRM')
    expect(due[0].scheduledDate).toBe('2026-08-04')
  })

  it('raises a review reminder on/after delivery + review days', () => {
    const due = computeDueReminders(
      makeOrder({ isDelivered: true, deliveryDate: '2026-08-10', reviewStatus: 'PENDING' }),
      { today: '2026-08-13' },
      DEFAULT_REMINDER_PREFS,
    )
    expect(due.map((d) => d.type)).toContain('REVIEW_REMINDER')
    expect(due.find((d) => d.type === 'REVIEW_REMINDER')?.scheduledDate).toBe('2026-08-13')
  })

  it('raises a return-window-closed reminder when the form is not filled', () => {
    const due = computeDueReminders(
      makeOrder({
        isDelivered: true,
        deliveryDate: '2026-08-01',
        returnWindowCloseDate: '2026-08-14',
        reviewStatus: 'NOT_REQUIRED',
      }),
      { today: '2026-08-16' },
      DEFAULT_REMINDER_PREFS,
    )
    expect(due.map((d) => d.type)).toContain('RETURN_WINDOW_CLOSED')
  })

  it('fires REFUND_DUE exactly on the expected date', () => {
    const due = computeDueReminders(
      makeOrder({
        isDelivered: true,
        deliveryDate: '2026-08-01',
        refund: {
          refundFormFilled: true,
          timelineValue: 30,
          timelineUnit: 'CALENDAR_DAYS',
          expectedRefundDate: '2026-08-16',
          refundRequested: true,
          refundReceived: false,
        },
      }),
      { today: '2026-08-16' },
      DEFAULT_REMINDER_PREFS,
    )
    expect(due.map((d) => d.type)).toContain('REFUND_DUE')
  })

  it('recurs overdue reminders on the configured cadence', () => {
    const overdueOrder = makeOrder({
      isDelivered: true,
      deliveryDate: '2026-08-01',
      refund: {
        refundFormFilled: true,
        timelineValue: 30,
        timelineUnit: 'CALENDAR_DAYS',
        expectedRefundDate: '2026-08-10',
        refundRequested: true,
        refundReceived: false,
      },
    })
    // 3 days overdue, daily cadence → fires.
    const daily = computeDueReminders(overdueOrder, { today: '2026-08-13' }, DEFAULT_REMINDER_PREFS)
    expect(daily.map((d) => d.type)).toContain('REFUND_OVERDUE')
    // 3 days overdue, weekly cadence → does not fire (3 % 7 !== 0).
    const weekly = computeDueReminders(
      overdueOrder,
      { today: '2026-08-13' },
      { ...DEFAULT_REMINDER_PREFS, refundReminderFrequency: 'WEEKLY' },
    )
    expect(weekly.map((d) => d.type)).not.toContain('REFUND_OVERDUE')
  })

  it('stops all reminders once received', () => {
    const due = computeDueReminders(
      makeOrder({
        isDelivered: true,
        deliveryDate: '2026-08-01',
        refund: {
          refundFormFilled: true,
          timelineValue: 30,
          timelineUnit: 'CALENDAR_DAYS',
          expectedRefundDate: '2026-08-10',
          refundRequested: true,
          refundReceived: true,
        },
      }),
      { today: '2026-08-20' },
      DEFAULT_REMINDER_PREFS,
    )
    expect(due).toHaveLength(0)
  })
})

describe('deduplicationKey', () => {
  it('is stable and unique per (order, type, date, channel)', () => {
    expect(deduplicationKey('o1', 'REFUND_DUE', '2026-08-16', 'EMAIL')).toBe(
      'o1:REFUND_DUE:2026-08-16:EMAIL',
    )
    expect(deduplicationKey('o1', 'REFUND_DUE', '2026-08-16', 'PUSH')).not.toBe(
      deduplicationKey('o1', 'REFUND_DUE', '2026-08-16', 'EMAIL'),
    )
  })
})
