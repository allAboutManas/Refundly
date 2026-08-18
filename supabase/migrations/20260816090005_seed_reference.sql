-- =============================================================================
-- Refund Reminder — reference seed data
-- Platforms (PRD §5) + reliable fixed-date Indian national holidays (PRD §25).
-- Festival holidays vary year to year; users add the rest via custom holidays.
-- Re-runnable.
-- =============================================================================

insert into public.platforms (name, slug, sort_order) values
  ('Amazon',   'amazon',   10),
  ('Flipkart', 'flipkart', 20),
  ('Myntra',   'myntra',   30),
  ('AJIO',     'ajio',     40),
  ('Blinkit',  'blinkit',  50),
  ('Zepto',    'zepto',    60),
  ('Meesho',   'meesho',   70),
  ('FirstCry', 'firstcry', 80),
  ('Other',    'other',    999)
on conflict (slug) do update
  set name = excluded.name,
      sort_order = excluded.sort_order,
      is_active = true;

-- National public holidays (country-wide, fixed Gregorian dates).
insert into public.holidays (country_code, state_code, holiday_date, holiday_name) values
  ('IN', null, '2026-01-26', 'Republic Day'),
  ('IN', null, '2026-08-15', 'Independence Day'),
  ('IN', null, '2026-10-02', 'Gandhi Jayanti'),
  ('IN', null, '2027-01-26', 'Republic Day'),
  ('IN', null, '2027-08-15', 'Independence Day'),
  ('IN', null, '2027-10-02', 'Gandhi Jayanti')
on conflict do nothing;
