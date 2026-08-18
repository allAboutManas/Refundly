import { describe, it, expect } from 'vitest'
import { deriveState } from './lifecycle'
import type { OrderView } from './lifecycle'

const TODAY = '2026-08-16'

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

describe('deriveState', () => {
  it('is ORDERED and asks to confirm delivery when not delivered', () => {
    const s = deriveState(makeOrder(), { today: TODAY })
    expect(s.status).toBe('ORDERED')
    expect(s.action).toBe('CONFIRM_DELIVERY')
  })

  it('flags a review check when delivered and review is pending', () => {
    const s = deriveState(
      makeOrder({ isDelivered: true, deliveryDate: '2026-08-10', reviewStatus: 'PENDING' }),
      { today: TODAY },
    )
    expect(s.status).toBe('DELIVERED')
    expect(s.reviewDue).toBe(true)
    expect(s.reviewReminderDate).toBe('2026-08-13')
    expect(s.action).toBe('CHECK_REVIEW')
  })

  it('is RETURN_WINDOW_OPEN while the window is in the future', () => {
    const s = deriveState(
      makeOrder({
        isDelivered: true,
        deliveryDate: '2026-08-10',
        returnWindowCloseDate: '2026-08-20',
        reviewStatus: 'NOT_REQUIRED',
      }),
      { today: TODAY },
    )
    expect(s.status).toBe('RETURN_WINDOW_OPEN')
    expect(s.action).toBe('NONE')
  })

  it('opens the refund form once the return window has closed', () => {
    const s = deriveState(
      makeOrder({
        isDelivered: true,
        deliveryDate: '2026-08-05',
        returnWindowCloseDate: '2026-08-14',
      }),
      { today: TODAY },
    )
    expect(s.status).toBe('RETURN_WINDOW_CLOSED')
    expect(s.action).toBe('FILL_REFUND_FORM')
    expect(s.urgency).toBe('today')
  })

  it('is REFUND_PENDING when the expected date is in the future', () => {
    const s = deriveState(
      makeOrder({
        isDelivered: true,
        deliveryDate: '2026-08-05',
        returnWindowCloseDate: '2026-08-14',
        refund: {
          refundFormFilled: true,
          timelineValue: 30,
          timelineUnit: 'WORKING_DAYS',
          expectedRefundDate: '2026-09-15',
          refundRequested: true,
          refundReceived: false,
        },
      }),
      { today: TODAY },
    )
    expect(s.status).toBe('REFUND_PENDING')
    expect(s.urgency).toBe('upcoming')
    expect(s.focusDate).toBe('2026-09-15')
  })

  it('is REFUND_PENDING with a follow-up on the exact expected date', () => {
    const s = deriveState(
      makeOrder({
        isDelivered: true,
        deliveryDate: '2026-08-05',
        refund: {
          refundFormFilled: true,
          timelineValue: 30,
          timelineUnit: 'CALENDAR_DAYS',
          expectedRefundDate: TODAY,
          refundRequested: true,
          refundReceived: false,
        },
      }),
      { today: TODAY },
    )
    expect(s.status).toBe('REFUND_PENDING')
    expect(s.urgency).toBe('today')
    expect(s.action).toBe('FOLLOW_UP_REFUND')
  })

  it('is REFUND_OVERDUE past the expected date', () => {
    const s = deriveState(
      makeOrder({
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
      }),
      { today: TODAY },
    )
    expect(s.status).toBe('REFUND_OVERDUE')
    expect(s.action).toBe('FOLLOW_UP_REFUND')
    expect(s.urgency).toBe('overdue')
    expect(s.daysToFocus).toBe(-6)
  })

  it('is COMPLETED once the refund is received', () => {
    const s = deriveState(
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
      { today: TODAY },
    )
    expect(s.status).toBe('COMPLETED')
    expect(s.progress).toBe(1)
    expect(s.urgency).toBe('done')
  })
})
