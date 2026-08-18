-- =============================================================================
-- Refund Reminder — schema
-- Tables, constraints, indexes and grants. RLS is enabled in a later migration.
-- Safe to re-run: uses IF NOT EXISTS throughout.
-- =============================================================================

create extension if not exists pgcrypto; -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- profiles: one row per auth user (bootstrapped by a trigger on auth.users)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  email                 text,
  full_name             text,
  timezone              text not null default 'Asia/Kolkata',
  country_code          text not null default 'IN',
  state_code            text,
  onboarding_completed  boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- platforms: global, reference data (data-driven per PRD §5, §69/10)
-- ----------------------------------------------------------------------------
create table if not exists public.platforms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- user_platform_accounts: reusable e-commerce accounts (never a password)
-- ----------------------------------------------------------------------------
create table if not exists public.user_platform_accounts (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  platform_id           uuid references public.platforms (id) on delete set null,
  custom_platform_name  text, -- used when platform slug = 'other'
  account_name          text not null,
  account_identifier    text, -- e.g. the email used on that platform
  profile_name          text,
  is_active             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- orders: the complete lifecycle of one product (PRD §12 — one order record)
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users (id) on delete cascade,
  platform_id               uuid references public.platforms (id) on delete set null,
  account_id                uuid references public.user_platform_accounts (id) on delete set null,
  custom_platform_name      text,

  order_id                  text not null,
  product_name              text not null,
  product_image_path        text, -- storage path only, never the binary (PRD §44)

  refund_amount             numeric(12, 2) not null default 0 check (refund_amount >= 0),
  currency                  text not null default 'INR',

  order_date                date,
  delivery_date             date,

  is_delivered              boolean not null default false,
  return_window_close_date  date,

  review_status             text not null default 'PENDING'
                              check (review_status in
                                ('PENDING', 'SUBMITTED', 'LIVE', 'NOT_LIVE', 'NOT_REQUIRED')),

  notes                     text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),

  constraint delivery_after_order
    check (delivery_date is null or order_date is null or delivery_date >= order_date),
  constraint return_after_delivery
    check (return_window_close_date is null or delivery_date is null
           or return_window_close_date >= delivery_date)
);

-- ----------------------------------------------------------------------------
-- refund_details: refund sub-record (1:1 with orders)
-- ----------------------------------------------------------------------------
create table if not exists public.refund_details (
  id                      uuid primary key default gen_random_uuid(),
  order_id                uuid not null unique references public.orders (id) on delete cascade,

  refund_form_filled      boolean not null default false,
  refund_form_filled_at   timestamptz,
  refund_form_filled_date date, -- the "request date" that starts the timeline

  timeline_value          int check (timeline_value > 0 and timeline_value <= 365),
  timeline_unit           text check (timeline_unit in ('CALENDAR_DAYS', 'WORKING_DAYS')),

  refund_requested        boolean not null default false,
  refund_requested_at     timestamptz,

  expected_refund_date    date,

  refund_received         boolean not null default false,
  refund_received_at      timestamptz,
  refund_received_date    date,
  actual_refund_amount    numeric(12, 2) check (actual_refund_amount >= 0),
  payment_reference       text,

  notes                   text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- order_events: immutable audit trail (PRD §63, §64)
-- ----------------------------------------------------------------------------
create table if not exists public.order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  event_type  text not null check (event_type in
                ('ORDER_CREATED', 'DELIVERED', 'REVIEW_CHECKED', 'RETURN_WINDOW_CLOSED',
                 'REFUND_FORM_FILLED', 'REFUND_REQUESTED', 'REFUND_RECEIVED', 'COMPLETED')),
  event_date  date,
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- notifications: queued/sent reminders, idempotent via deduplication_key
-- ----------------------------------------------------------------------------
create table if not exists public.notifications (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  order_id           uuid references public.orders (id) on delete cascade,

  type               text not null check (type in
                       ('DELIVERY_CONFIRM', 'REVIEW_REMINDER', 'RETURN_WINDOW_CLOSED',
                        'REFUND_DUE', 'REFUND_OVERDUE')),
  channel            text not null check (channel in ('PUSH', 'EMAIL', 'IN_APP')),

  title              text,
  body               text,

  scheduled_at       timestamptz,
  sent_at            timestamptz,
  read_at            timestamptz,

  status             text not null default 'PENDING'
                       check (status in ('PENDING', 'SENT', 'FAILED', 'CANCELLED')),

  deduplication_key  text not null unique, -- order:type:scheduled_date:channel (PRD §38)
  error_message      text,
  created_at         timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- notification_preferences: 1:1 with user (PRD §36)
-- ----------------------------------------------------------------------------
create table if not exists public.notification_preferences (
  id                               uuid primary key default gen_random_uuid(),
  user_id                          uuid not null unique references auth.users (id) on delete cascade,

  email_enabled                    boolean not null default true,
  push_enabled                     boolean not null default true,

  review_reminders_enabled         boolean not null default true,
  return_window_reminders_enabled  boolean not null default true,
  refund_reminders_enabled         boolean not null default true,

  refund_reminder_frequency        text not null default 'DAILY'
                                     check (refund_reminder_frequency in
                                       ('DAILY', 'EVERY_2_DAYS', 'EVERY_3_DAYS', 'WEEKLY')),
  review_reminder_days             int not null default 3 check (review_reminder_days between 0 and 60),
  preferred_reminder_time          time not null default '09:00',

  created_at                       timestamptz not null default now(),
  updated_at                       timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- device_tokens: push subscriptions per device
-- ----------------------------------------------------------------------------
create table if not exists public.device_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  device_type   text not null default 'web' check (device_type in ('web', 'android', 'ios')),
  token         text not null, -- web push: the JSON subscription; native: FCM token
  is_active     boolean not null default true,
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, token)
);

-- ----------------------------------------------------------------------------
-- holidays: centrally maintained calendar (PRD §25). Global reference data.
-- ----------------------------------------------------------------------------
create table if not exists public.holidays (
  id            uuid primary key default gen_random_uuid(),
  country_code  text not null default 'IN',
  state_code    text,
  holiday_date  date not null,
  holiday_name  text not null,
  year          int generated always as (extract(year from holiday_date)::int) stored,
  created_at    timestamptz not null default now()
);
create unique index if not exists holidays_unique_idx
  on public.holidays (country_code, coalesce(state_code, ''), holiday_date);

-- ----------------------------------------------------------------------------
-- user_holidays: per-user custom holidays (PRD §25)
-- ----------------------------------------------------------------------------
create table if not exists public.user_holidays (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  holiday_date  date not null,
  holiday_name  text not null,
  created_at    timestamptz not null default now(),
  unique (user_id, holiday_date)
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------
create index if not exists orders_user_idx            on public.orders (user_id);
create index if not exists orders_user_created_idx    on public.orders (user_id, created_at desc);
create index if not exists orders_user_delivered_idx  on public.orders (user_id, is_delivered);
create index if not exists orders_account_idx         on public.orders (account_id);
create index if not exists accounts_user_idx          on public.user_platform_accounts (user_id);
create index if not exists accounts_user_platform_idx on public.user_platform_accounts (user_id, platform_id);
create index if not exists order_events_order_idx     on public.order_events (order_id, created_at);
create index if not exists notifications_user_idx     on public.notifications (user_id, created_at desc);
create index if not exists notifications_status_idx   on public.notifications (status, scheduled_at);
create index if not exists notifications_order_idx    on public.notifications (order_id);
create index if not exists device_tokens_user_idx     on public.device_tokens (user_id);
create index if not exists holidays_lookup_idx        on public.holidays (country_code, holiday_date);
create index if not exists user_holidays_user_idx     on public.user_holidays (user_id, holiday_date);

-- ----------------------------------------------------------------------------
-- Grants: expose to Supabase API roles. RLS (next migration) gates every row.
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on public.platforms to anon;
grant select on public.holidays to anon;
