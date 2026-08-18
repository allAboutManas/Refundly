/**
 * Core business enums and shared domain types.
 *
 * This module is framework-agnostic (no React, no Supabase, no DOM). It is the
 * single source of truth for lifecycle vocabulary and is designed to be lifted
 * into a shared package when the React Native Android app is built.
 */

/** A timezone-safe calendar date in `YYYY-MM-DD` form (no time, no zone). */
export type PlainDate = string

/** How a refund timeline duration is counted. */
export type TimelineUnit = 'CALENDAR_DAYS' | 'WORKING_DAYS'

/** Manual review/rating status for an order (MVP: user-confirmed). */
export type ReviewStatus =
  | 'PENDING'
  | 'SUBMITTED'
  | 'LIVE'
  | 'NOT_LIVE'
  | 'NOT_REQUIRED'

/** How often to re-remind about an overdue refund. */
export type RefundReminderFrequency =
  | 'DAILY'
  | 'EVERY_2_DAYS'
  | 'EVERY_3_DAYS'
  | 'WEEKLY'

/** Immutable audit events appended to an order's history. */
export type OrderEventType =
  | 'ORDER_CREATED'
  | 'DELIVERED'
  | 'REVIEW_CHECKED'
  | 'RETURN_WINDOW_CLOSED'
  | 'REFUND_FORM_FILLED'
  | 'REFUND_REQUESTED'
  | 'REFUND_RECEIVED'
  | 'COMPLETED'

/** Kinds of reminder the system can raise. */
export type NotificationType =
  | 'DELIVERY_CONFIRM'
  | 'REVIEW_REMINDER'
  | 'RETURN_WINDOW_CLOSED'
  | 'REFUND_DUE'
  | 'REFUND_OVERDUE'

/** Delivery channel for a notification. */
export type NotificationChannel = 'PUSH' | 'EMAIL' | 'IN_APP'

/** Lifecycle state of a queued notification. */
export type NotificationStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELLED'

/** Number of days a `RefundReminderFrequency` maps to. */
export const REMINDER_FREQUENCY_DAYS: Record<RefundReminderFrequency, number> = {
  DAILY: 1,
  EVERY_2_DAYS: 2,
  EVERY_3_DAYS: 3,
  WEEKLY: 7,
}

/** Default number of calendar days after delivery to prompt a review check. */
export const DEFAULT_REVIEW_REMINDER_DAYS = 3

/** Preset refund timeline durations offered in the UI (plus "Custom"). */
export const TIMELINE_PRESETS = [7, 15, 30, 45, 60] as const

/** Currency used across the app (India-first MVP). */
export const DEFAULT_CURRENCY = 'INR'

/** IANA timezone default for new profiles. */
export const DEFAULT_TIMEZONE = 'Asia/Kolkata'
