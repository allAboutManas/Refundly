/**
 * Typed database schema for supabase-js. Hand-written to match
 * supabase/migrations exactly. Regenerate later with:
 *   supabase gen types typescript --project-id <id> > src/lib/database.types.ts
 *
 * NOTE: Row/Insert/Update are `type` aliases (object literals), not
 * `interface`s — postgrest-js requires them to satisfy Record<string, unknown>,
 * which named interfaces do not (no implicit index signature).
 */
import type {
  NotificationChannel,
  NotificationStatus,
  NotificationType,
  OrderEventType,
  RefundReminderFrequency,
  ReviewStatus,
  TimelineUnit,
} from '@/domain'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Timestamps = { created_at: string; updated_at: string }

// --- profiles ----------------------------------------------------------------
export type ProfileRow = Timestamps & {
  id: string
  email: string | null
  full_name: string | null
  timezone: string
  country_code: string
  state_code: string | null
  onboarding_completed: boolean
}
type ProfileInsert = { id: string } & Partial<ProfileRow>
type ProfileUpdate = Partial<ProfileRow>

// --- platforms ---------------------------------------------------------------
export type PlatformRow = Timestamps & {
  id: string
  name: string
  slug: string
  logo_url: string | null
  is_active: boolean
  sort_order: number
}

// --- user_platform_accounts --------------------------------------------------
export type AccountRow = Timestamps & {
  id: string
  user_id: string
  platform_id: string | null
  custom_platform_name: string | null
  account_name: string
  account_identifier: string | null
  profile_name: string | null
  is_active: boolean
}
type AccountInsert = { user_id: string; account_name: string } & Partial<AccountRow>
type AccountUpdate = Partial<AccountRow>

// --- orders ------------------------------------------------------------------
export type OrderRow = Timestamps & {
  id: string
  user_id: string
  platform_id: string | null
  account_id: string | null
  custom_platform_name: string | null
  order_id: string
  product_name: string
  product_image_path: string | null
  refund_amount: number
  currency: string
  order_date: string | null
  delivery_date: string | null
  is_delivered: boolean
  return_window_close_date: string | null
  review_status: ReviewStatus
  notes: string | null
}
type OrderInsert = {
  user_id: string
  order_id: string
  product_name: string
} & Partial<OrderRow>
type OrderUpdate = Partial<OrderRow>

// --- refund_details ----------------------------------------------------------
export type RefundDetailRow = Timestamps & {
  id: string
  order_id: string
  refund_form_filled: boolean
  refund_form_filled_at: string | null
  refund_form_filled_date: string | null
  timeline_value: number | null
  timeline_unit: TimelineUnit | null
  refund_requested: boolean
  refund_requested_at: string | null
  expected_refund_date: string | null
  refund_received: boolean
  refund_received_at: string | null
  refund_received_date: string | null
  actual_refund_amount: number | null
  payment_reference: string | null
  notes: string | null
}
type RefundDetailInsert = { order_id: string } & Partial<RefundDetailRow>
type RefundDetailUpdate = Partial<RefundDetailRow>

// --- order_events ------------------------------------------------------------
export type OrderEventRow = {
  id: string
  order_id: string
  event_type: OrderEventType
  event_date: string | null
  metadata: Json
  created_at: string
}
type OrderEventInsert = {
  order_id: string
  event_type: OrderEventType
} & Partial<OrderEventRow>

// --- notifications -----------------------------------------------------------
export type NotificationRow = {
  id: string
  user_id: string
  order_id: string | null
  type: NotificationType
  channel: NotificationChannel
  title: string | null
  body: string | null
  scheduled_at: string | null
  sent_at: string | null
  read_at: string | null
  status: NotificationStatus
  deduplication_key: string
  error_message: string | null
  created_at: string
}
type NotificationInsert = {
  user_id: string
  type: NotificationType
  channel: NotificationChannel
  deduplication_key: string
} & Partial<NotificationRow>
type NotificationUpdate = Partial<NotificationRow>

// --- notification_preferences ------------------------------------------------
export type NotificationPrefsRow = Timestamps & {
  id: string
  user_id: string
  email_enabled: boolean
  push_enabled: boolean
  review_reminders_enabled: boolean
  return_window_reminders_enabled: boolean
  refund_reminders_enabled: boolean
  refund_reminder_frequency: RefundReminderFrequency
  review_reminder_days: number
  preferred_reminder_time: string
}
type NotificationPrefsInsert = { user_id: string } & Partial<NotificationPrefsRow>
type NotificationPrefsUpdate = Partial<NotificationPrefsRow>

// --- device_tokens -----------------------------------------------------------
export type DeviceTokenRow = Timestamps & {
  id: string
  user_id: string
  device_type: 'web' | 'android' | 'ios'
  token: string
  is_active: boolean
  last_seen_at: string
}
type DeviceTokenInsert = { user_id: string; token: string } & Partial<DeviceTokenRow>
type DeviceTokenUpdate = Partial<DeviceTokenRow>

// --- holidays ----------------------------------------------------------------
export type HolidayRow = {
  id: string
  country_code: string
  state_code: string | null
  holiday_date: string
  holiday_name: string
  year: number
  created_at: string
}

// --- user_holidays -----------------------------------------------------------
export type UserHolidayRow = {
  id: string
  user_id: string
  holiday_date: string
  holiday_name: string
  created_at: string
}
type UserHolidayInsert = {
  user_id: string
  holiday_date: string
  holiday_name: string
} & Partial<UserHolidayRow>

type TableDef<Row, Insert = Row, Update = Partial<Row>> = {
  Row: Row
  Insert: Insert
  Update: Update
  Relationships: []
}

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow, ProfileInsert, ProfileUpdate>
      platforms: TableDef<PlatformRow, Partial<PlatformRow>, Partial<PlatformRow>>
      user_platform_accounts: TableDef<AccountRow, AccountInsert, AccountUpdate>
      orders: TableDef<OrderRow, OrderInsert, OrderUpdate>
      refund_details: TableDef<RefundDetailRow, RefundDetailInsert, RefundDetailUpdate>
      order_events: TableDef<OrderEventRow, OrderEventInsert, Partial<OrderEventRow>>
      notifications: TableDef<NotificationRow, NotificationInsert, NotificationUpdate>
      notification_preferences: TableDef<
        NotificationPrefsRow,
        NotificationPrefsInsert,
        NotificationPrefsUpdate
      >
      device_tokens: TableDef<DeviceTokenRow, DeviceTokenInsert, DeviceTokenUpdate>
      holidays: TableDef<HolidayRow, Partial<HolidayRow>, Partial<HolidayRow>>
      user_holidays: TableDef<UserHolidayRow, UserHolidayInsert, Partial<UserHolidayRow>>
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
