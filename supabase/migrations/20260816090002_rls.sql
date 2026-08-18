-- =============================================================================
-- Refund Reminder — Row Level Security (PRD §42, §69/3)
-- RLS is mandatory. Security must never depend on frontend filtering.
-- Re-runnable: policies are dropped and recreated.
-- =============================================================================

alter table public.profiles                enable row level security;
alter table public.platforms               enable row level security;
alter table public.user_platform_accounts  enable row level security;
alter table public.orders                  enable row level security;
alter table public.refund_details          enable row level security;
alter table public.order_events            enable row level security;
alter table public.notifications           enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.device_tokens           enable row level security;
alter table public.holidays                enable row level security;
alter table public.user_holidays           enable row level security;

-- ---------------------------------------------------------------------------
-- profiles: a user reads/updates only their own profile
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- platforms / holidays: global read-only reference data
-- ---------------------------------------------------------------------------
drop policy if exists platforms_read on public.platforms;
create policy platforms_read on public.platforms
  for select to anon, authenticated using (true);

drop policy if exists holidays_read on public.holidays;
create policy holidays_read on public.holidays
  for select to anon, authenticated using (true);

-- ---------------------------------------------------------------------------
-- user_platform_accounts: owner-only
-- ---------------------------------------------------------------------------
drop policy if exists accounts_all on public.user_platform_accounts;
create policy accounts_all on public.user_platform_accounts
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- orders: owner-only
-- ---------------------------------------------------------------------------
drop policy if exists orders_all on public.orders;
create policy orders_all on public.orders
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- refund_details / order_events: gated through the parent order's ownership.
-- The EXISTS subquery is itself filtered by orders' RLS, so it only matches
-- orders the caller owns — no separate user_id column needed.
-- ---------------------------------------------------------------------------
drop policy if exists refund_details_all on public.refund_details;
create policy refund_details_all on public.refund_details
  for all to authenticated
  using (exists (select 1 from public.orders o
                 where o.id = refund_details.order_id and o.user_id = auth.uid()))
  with check (exists (select 1 from public.orders o
                      where o.id = refund_details.order_id and o.user_id = auth.uid()));

drop policy if exists order_events_all on public.order_events;
create policy order_events_all on public.order_events
  for all to authenticated
  using (exists (select 1 from public.orders o
                 where o.id = order_events.order_id and o.user_id = auth.uid()))
  with check (exists (select 1 from public.orders o
                      where o.id = order_events.order_id and o.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- notifications: users can read and mark their own; inserts/sends are done by
-- the backend using the service role (which bypasses RLS).
-- ---------------------------------------------------------------------------
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- notification_preferences: owner-only
-- ---------------------------------------------------------------------------
drop policy if exists notification_prefs_all on public.notification_preferences;
create policy notification_prefs_all on public.notification_preferences
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- device_tokens: owner-only
-- ---------------------------------------------------------------------------
drop policy if exists device_tokens_all on public.device_tokens;
create policy device_tokens_all on public.device_tokens
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- user_holidays: owner-only
-- ---------------------------------------------------------------------------
drop policy if exists user_holidays_all on public.user_holidays;
create policy user_holidays_all on public.user_holidays
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
