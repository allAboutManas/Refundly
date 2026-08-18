# Email templates

Two kinds of email, both branded to match the app:

| Email | Sent by | Template |
|---|---|---|
| Auth (confirm, magic link, reset, change email, code) | **Supabase** (native) | the HTML files here → paste in dashboard |
| Refund reminders (due, overdue, review, return window) | **Edge Function** `process-reminders` (via Resend) | `supabase/functions/_shared/email.ts` (already wired) |

---

## Auth emails — apply in the Supabase dashboard

Go to **Authentication → Emails → Templates**. For each template, switch to the
HTML/source view and paste the matching file:

| Dashboard template | File |
|---|---|
| Confirm signup | `confirm-signup.html` |
| Magic Link | `magic-link.html` |
| Reset Password | `reset-password.html` |
| Change Email Address | `change-email.html` |
| Reauthentication | `reauthentication.html` |

These use Supabase's built-in template variables — `{{ .ConfirmationURL }}`,
`{{ .NewEmail }}`, `{{ .Token }}` — so the links/codes are filled in automatically.
Don't remove those placeholders.

### Make the links point at your app

In **Authentication → URL Configuration**, set the **Site URL** and add your app
origins (e.g. `http://localhost:5173` and your deployed URL) to **Redirect URLs**,
so `{{ .ConfirmationURL }}` opens the right place.

### Brand the sender (recommended)

By default the sender shows as **Supabase Auth &lt;noreply@mail.app.supabase.io&gt;**
(what you saw in the screenshot) and has a low daily limit. To send from your own
address, set **Custom SMTP** under **Authentication → SMTP Settings** using any
mailbox you control (your domain host, Gmail app password, Zoho, etc.). That:

- changes the "From" name/address to your own, and
- raises the sending limit for production.

This is optional — the templates above already look branded regardless of sender.

---

## Reminder emails

Already branded and wired in the `process-reminders` Edge Function. The Resend API
key lives in Edge Function **secrets** (server-side only, never in the browser) —
see `supabase/functions/README.md` for deploy + secrets. To preview/change their
look, edit `supabase/functions/_shared/email.ts`.
