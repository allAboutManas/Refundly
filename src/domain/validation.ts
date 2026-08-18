/**
 * Input validation rules (PRD §55).
 *
 * These are shared by the frontend (for UX) and must be mirrored on the backend
 * (for correctness) — PRD §69 Principle 9. Each validator returns a discriminated
 * result so callers can show a human-readable message.
 */
import { compareDates, isValidPlainDate } from './dates'
import type { PlainDate } from './types'

export type ValidationResult =
  | { valid: true }
  | { valid: false; error: string }

const ok: ValidationResult = { valid: true }
const fail = (error: string): ValidationResult => ({ valid: false, error })

export const ORDER_ID_MAX_LENGTH = 120
export const PRODUCT_NAME_MAX_LENGTH = 160
export const NOTES_MAX_LENGTH = 2000
export const MAX_REFUND_AMOUNT = 100_000_000 // ₹10 crore sanity cap
export const MIN_TIMELINE_VALUE = 1
export const MAX_TIMELINE_VALUE = 365

export function validateOrderId(raw: string): ValidationResult {
  const value = raw.trim()
  if (!value) return fail('Order ID is required.')
  if (value.length > ORDER_ID_MAX_LENGTH) {
    return fail(`Order ID must be ${ORDER_ID_MAX_LENGTH} characters or fewer.`)
  }
  return ok
}

export function validateProductName(raw: string): ValidationResult {
  const value = raw.trim()
  if (!value) return fail('Product name is required.')
  if (value.length > PRODUCT_NAME_MAX_LENGTH) {
    return fail(`Product name must be ${PRODUCT_NAME_MAX_LENGTH} characters or fewer.`)
  }
  return ok
}

export function validateRefundAmount(amount: number): ValidationResult {
  if (!Number.isFinite(amount)) return fail('Enter a valid refund amount.')
  if (amount < 0) return fail('Refund amount cannot be negative.')
  if (amount > MAX_REFUND_AMOUNT) return fail('Refund amount looks too large.')
  return ok
}

export function validateTimelineValue(value: number): ValidationResult {
  if (!Number.isInteger(value)) return fail('Timeline must be a whole number of days.')
  if (value < MIN_TIMELINE_VALUE) return fail('Timeline must be at least 1 day.')
  if (value > MAX_TIMELINE_VALUE) return fail('Timeline must be 365 days or fewer.')
  return ok
}

/** Delivery Date must be on/after Order Date (when an order date exists). */
export function validateDeliveryDate(
  deliveryDate: PlainDate,
  orderDate: PlainDate | null,
): ValidationResult {
  if (!isValidPlainDate(deliveryDate)) return fail('Enter a valid delivery date.')
  if (orderDate && compareDates(deliveryDate, orderDate) < 0) {
    return fail('Delivery date cannot be before the order date.')
  }
  return ok
}

/** Return-window close must be on/after Delivery Date. */
export function validateReturnWindowDate(
  returnWindowDate: PlainDate,
  deliveryDate: PlainDate | null,
): ValidationResult {
  if (!isValidPlainDate(returnWindowDate)) return fail('Enter a valid return-window date.')
  if (deliveryDate && compareDates(returnWindowDate, deliveryDate) < 0) {
    return fail('Return window cannot close before delivery.')
  }
  return ok
}

/** Refund received date must be on/after the refund-requested/filled date. */
export function validateRefundReceivedDate(
  receivedDate: PlainDate,
  requestedDate: PlainDate | null,
): ValidationResult {
  if (!isValidPlainDate(receivedDate)) return fail('Enter a valid received date.')
  if (requestedDate && compareDates(receivedDate, requestedDate) < 0) {
    return fail('Received date cannot be before the refund was requested.')
  }
  return ok
}

export function isValidEmail(raw: string): boolean {
  const value = raw.trim()
  // Pragmatic, not RFC-exhaustive.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export function validateEmail(raw: string): ValidationResult {
  return isValidEmail(raw) ? ok : fail('Enter a valid email address.')
}

export function validatePassword(raw: string): ValidationResult {
  if (raw.length < 8) return fail('Password must be at least 8 characters.')
  return ok
}
