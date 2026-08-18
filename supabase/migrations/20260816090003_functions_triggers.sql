-- =============================================================================
-- Refund Reminder — functions & triggers
-- Re-runnable: functions use CREATE OR REPLACE; triggers are dropped first.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Keep updated_at fresh on mutation.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare
  t text;
  tables text[] := array[
    'profiles', 'platforms', 'user_platform_accounts', 'orders',
    'refund_details', 'notification_preferences', 'device_tokens'
  ];
begin
  foreach t in array tables loop
    execute format('drop trigger if exists set_updated_at on public.%I;', t);
    execute format(
      'create trigger set_updated_at before update on public.%I
         for each row execute function public.set_updated_at();', t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Bootstrap a profile + notification preferences when an auth user is created.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
  )
  on conflict (id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Guarantee a 1:1 refund_details row exists for every order (PRD §12).
-- ---------------------------------------------------------------------------
create or replace function public.create_refund_details_for_order()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.refund_details (order_id)
  values (new.id)
  on conflict (order_id) do nothing;
  return new;
end;
$$;

drop trigger if exists orders_create_refund_details on public.orders;
create trigger orders_create_refund_details
  after insert on public.orders
  for each row execute function public.create_refund_details_for_order();
