# Edge Functions

## `process-reminders`

The daily reminder processor. It scans active orders, computes which reminders
are due today (using the same logic as the PWA, in `_shared/reminders.ts`),
creates notification rows idempotently, and sends email / web-push for the
channels each user enabled.

It is **idempotent**: the `notifications.deduplication_key` unique constraint
means re-running never double-sends (PRD §38).

### 1. Deploy

```bash
supabase functions deploy process-reminders --no-verify-jwt
```

`--no-verify-jwt` lets the cron call it with a shared secret instead of a user JWT.

### 2. Secrets

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically.
Set the rest as needed:

```bash
# Protects the endpoint (recommended)
supabase secrets set CRON_SECRET="$(openssl rand -hex 24)"

# Email via SMTP (Gmail by default — no domain needed).
# SMTP_PASS is a Google App Password (https://myaccount.google.com/apppasswords).
supabase secrets set SMTP_USER="you@gmail.com" SMTP_PASS="<gmail app password>"
# Optional overrides (defaults: smtp.gmail.com / 465 / from = SMTP_USER):
#   supabase secrets set SMTP_HOST="smtp.gmail.com" SMTP_PORT="465" SMTP_FROM="Refund Reminder <you@gmail.com>"

# Deep-link base for email buttons (your deployed PWA URL)
supabase secrets set APP_URL="https://your-app.example.com"

# Web push (optional) — generate with: npx web-push generate-vapid-keys
supabase secrets set VAPID_PUBLIC="..." VAPID_PRIVATE="..." VAPID_SUBJECT="mailto:you@example.com"
```

The same Gmail account + app password you set for Supabase Auth SMTP works here.
Without `SMTP_*` the processor still creates in-app notifications (they power the
notifications center + unread badge); it just skips email. Same for push without
`VAPID_*`.

### 3. Test manually

```bash
curl -i -X POST \
  -H "x-cron-secret: <your CRON_SECRET>" \
  "https://<project-ref>.functions.supabase.co/process-reminders"
# → {"ok":true,"created":N,"emailsSent":N,"pushSent":N}
```

### 4. Schedule daily (pg_cron + pg_net)

Run once in the SQL editor, filling in your project ref + secret. Runs at
03:30 UTC (09:00 IST):

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'process-reminders-daily',
  '30 3 * * *',
  $$
  select net.http_post(
    url := 'https://<project-ref>.functions.supabase.co/process-reminders',
    headers := jsonb_build_object('x-cron-secret', '<your CRON_SECRET>')
  );
  $$
);
```

To reschedule, `select cron.unschedule('process-reminders-daily');` then re-run.

> Do **not** create one cron per order and do **not** poll from the frontend
> (PRD §39, §52). This single daily job handles everything in one batch.
