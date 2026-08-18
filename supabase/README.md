# Supabase setup

The frontend talks to a hosted Supabase project. These migrations create the
schema, RLS policies, triggers, storage bucket and reference seed data.

## 1. Client credentials

Copy `.env.example` to `.env.local` in the project root and fill in:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Both are safe to ship in the frontend — the anon key is public and protected by
Row Level Security. **Never** put the `service_role` key here.

## 2. Apply the schema

Pick one:

### Option A — SQL editor (quickest)

Open the Supabase dashboard → **SQL Editor** and run each file in
`supabase/migrations/` in filename order:

1. `…_schema.sql`
2. `…_rls.sql`
3. `…_functions_triggers.sql`
4. `…_storage.sql`
5. `…_seed_reference.sql`

They are idempotent — safe to re-run.

### Option B — Supabase CLI

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

## 3. Auth settings

In **Authentication → Providers**, enable **Email**. For magic links / OTP,
ensure email is enabled and configure the site URL + redirect URLs to include
your dev origin (e.g. `http://localhost:5173`).

## 4. Regenerating types (optional)

After schema changes you can regenerate `src/lib/database.types.ts`:

```bash
supabase gen types typescript --project-id <id> > src/lib/database.types.ts
```

## Notes

- Reminder scheduling runs in an Edge Function (see `supabase/functions/`, added
  in a later task) triggered on a cron — **not** per-order cron jobs and **not**
  frontend polling (PRD §39, §52).
- Product images live in the private `product-images` bucket under
  `<user-id>/orders/<order-id>/…` and are readable only by their owner.
