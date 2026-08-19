// Scheduled reminder processor (PRD §39, §61).
//
// Runs on a daily cron. For every active order it computes which reminders are
// due today, creates notification rows idempotently (unique deduplication_key),
// and sends email / web-push for the channels the user enabled. Re-running is
// safe — duplicates are ignored, so the same reminder is never sent twice.
//
// Deploy:  supabase functions deploy process-reminders --no-verify-jwt
// Secrets: supabase secrets set CRON_SECRET=... \
//            SMTP_USER=you@gmail.com SMTP_PASS="<gmail app password>" \
//            [SMTP_HOST=smtp.gmail.com SMTP_PORT=465 SMTP_FROM="Refundly <you@gmail.com>"] \
//            [VAPID_PUBLIC=... VAPID_PRIVATE=... VAPID_SUBJECT=mailto:you@example.com]
// (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.)

import { createClient } from 'npm:@supabase/supabase-js@2'
import {
  buildContent,
  computeDueReminders,
  deduplicationKey,
  todayInTimeZone,
  type NotificationChannel,
  type OrderView,
  type ReminderPrefs,
} from '../_shared/reminders.ts'
import { renderNotificationEmail } from '../_shared/email.ts'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

interface RefundRow {
  refund_form_filled: boolean
  expected_refund_date: string | null
  refund_received: boolean
}
interface OrderRow {
  id: string
  user_id: string
  order_id: string
  product_name: string
  platform_id: string | null
  custom_platform_name: string | null
  refund_amount: number
  order_date: string | null
  delivery_date: string | null
  is_delivered: boolean
  return_window_close_date: string | null
  review_status: OrderView['reviewStatus']
  // PostgREST returns a single object for the 1:1 embed (order_id is unique),
  // but older data / array shapes are handled defensively below.
  refund_details: RefundRow | RefundRow[] | null
}

const DEFAULT_PREFS: ReminderPrefs = {
  reviewRemindersEnabled: true,
  returnWindowRemindersEnabled: true,
  refundRemindersEnabled: true,
  refundReminderFrequency: 'DAILY',
  reviewReminderDays: 3,
}

Deno.serve(async (req) => {
  // Simple shared-secret guard for the cron caller.
  const secret = Deno.env.get('CRON_SECRET')
  if (secret) {
    const provided =
      req.headers.get('x-cron-secret') ??
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (provided !== secret) {
      return json({ error: 'unauthorized' }, 401)
    }
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Load reference + user data.
  const [{ data: orders }, { data: profiles }, { data: prefsRows }, { data: platforms }] =
    await Promise.all([
      supabase
        .from('orders')
        .select(
          'id,user_id,order_id,product_name,platform_id,custom_platform_name,refund_amount,order_date,delivery_date,is_delivered,return_window_close_date,review_status,refund_details(refund_form_filled,expected_refund_date,refund_received)',
        ),
      supabase.from('profiles').select('id,email,timezone'),
      supabase.from('notification_preferences').select('*'),
      supabase.from('platforms').select('id,name,slug'),
    ])

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]))
  const prefsByUser = new Map((prefsRows ?? []).map((p) => [p.user_id, p]))
  const platformById = new Map((platforms ?? []).map((p) => [p.id, p]))

  // Email via SMTP (Gmail by default) — no domain / third-party API needed.
  const smtpUser = Deno.env.get('SMTP_USER') || ''
  const smtpPass = (Deno.env.get('SMTP_PASS') || '').replace(/\s+/g, '')
  const smtpHost = Deno.env.get('SMTP_HOST') || 'smtp.gmail.com'
  const smtpPort = Number(Deno.env.get('SMTP_PORT') || '465')
  const smtpFromRaw = Deno.env.get('SMTP_FROM') || smtpUser
  const smtpFrom = smtpFromRaw.includes('<') ? smtpFromRaw : `Refundly <${smtpFromRaw}>`
  const emailReady = Boolean(smtpUser && smtpPass)
  const pushReady = Boolean(Deno.env.get('VAPID_PUBLIC') && Deno.env.get('VAPID_PRIVATE'))
  const appUrl = Deno.env.get('APP_URL') || ''

  const smtp = emailReady
    ? new SMTPClient({
        connection: {
          hostname: smtpHost,
          port: smtpPort,
          tls: smtpPort === 465,
          auth: { username: smtpUser, password: smtpPass },
        },
      })
    : null

  let created = 0
  let emailsSent = 0
  let pushSent = 0

  for (const order of (orders ?? []) as OrderRow[]) {
    const profile = profileById.get(order.user_id)
    const timezone = profile?.timezone || 'Asia/Kolkata'
    const today = todayInTimeZone(timezone)

    const prefRow = prefsByUser.get(order.user_id)
    const prefs: ReminderPrefs = prefRow
      ? {
          reviewRemindersEnabled: prefRow.review_reminders_enabled,
          returnWindowRemindersEnabled: prefRow.return_window_reminders_enabled,
          refundRemindersEnabled: prefRow.refund_reminders_enabled,
          refundReminderFrequency: prefRow.refund_reminder_frequency,
          reviewReminderDays: prefRow.review_reminder_days,
        }
      : DEFAULT_PREFS

    const refund = Array.isArray(order.refund_details)
      ? (order.refund_details[0] ?? null)
      : (order.refund_details ?? null)
    const view: OrderView = {
      orderDate: order.order_date,
      isDelivered: order.is_delivered,
      deliveryDate: order.delivery_date,
      returnWindowCloseDate: order.return_window_close_date,
      reviewStatus: order.review_status,
      refund: refund
        ? {
            refundFormFilled: refund.refund_form_filled,
            expectedRefundDate: refund.expected_refund_date,
            refundReceived: refund.refund_received,
          }
        : null,
    }

    const due = computeDueReminders(view, today, prefs)
    if (due.length === 0) continue

    const platform = platformById.get(order.platform_id ?? '')
    const platformName =
      platform?.slug === 'other'
        ? order.custom_platform_name || 'Other'
        : platform?.name || order.custom_platform_name || 'Other'

    for (const reminder of due) {
      const content = buildContent(reminder.type, order.product_name, platformName, order.refund_amount)

      const channels: NotificationChannel[] = ['IN_APP']
      if (prefRow?.push_enabled && pushReady) channels.push('PUSH')
      if (prefRow?.email_enabled && emailReady) channels.push('EMAIL')

      for (const channel of channels) {
        const dedup = deduplicationKey(order.id, reminder.type, reminder.scheduledDate, channel)
        const { data: inserted } = await supabase
          .from('notifications')
          .upsert(
            {
              user_id: order.user_id,
              order_id: order.id,
              type: reminder.type,
              channel,
              title: content.title,
              body: content.body,
              scheduled_at: new Date().toISOString(),
              status: channel === 'IN_APP' ? 'SENT' : 'PENDING',
              sent_at: channel === 'IN_APP' ? new Date().toISOString() : null,
              deduplication_key: dedup,
            },
            { onConflict: 'deduplication_key', ignoreDuplicates: true },
          )
          .select('id,channel')

        const row = inserted?.[0]
        if (!row) continue // already existed → idempotent skip
        created++

        if (channel === 'EMAIL' && profile?.email) {
          const { subject, html } = renderNotificationEmail(reminder.type, {
            product: order.product_name,
            platform: platformName,
            orderId: order.order_id,
            amount: order.refund_amount,
            expectedDate: refund?.expected_refund_date ?? null,
            appUrl,
            orderPk: order.id,
          })
          const ok = await sendEmailSmtp(smtp, smtpFrom, profile.email, subject, html)
          await supabase
            .from('notifications')
            .update(ok ? { status: 'SENT', sent_at: new Date().toISOString() } : { status: 'FAILED', error_message: 'email send failed' })
            .eq('id', row.id)
          if (ok) emailsSent++
        }

        if (channel === 'PUSH') {
          const ok = await sendPush(supabase, order.user_id, content.title, content.body, order.id)
          await supabase
            .from('notifications')
            .update(ok ? { status: 'SENT', sent_at: new Date().toISOString() } : { status: 'FAILED', error_message: 'push send failed' })
            .eq('id', row.id)
          if (ok) pushSent++
        }
      }
    }
  }

  if (smtp) {
    try {
      await smtp.close()
    } catch {
      // ignore SMTP close errors
    }
  }

  return json({ ok: true, created, emailsSent, pushSent })
})

// Base64-encode a UTF-8 string, wrapped at 76 chars per RFC 2045.
function toBase64Mime(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return (btoa(binary).match(/.{1,76}/g) ?? []).join('\r\n')
}

async function sendEmailSmtp(
  client: SMTPClient | null,
  from: string,
  to: string,
  subject: string,
  html: string,
): Promise<boolean> {
  if (!client) return false
  try {
    // Send both parts as base64. denomailer's default quoted-printable encoder
    // leaves literal "=20" artifacts in some clients (e.g. Gmail); base64 is
    // decoded reliably everywhere.
    await client.send({
      from,
      to,
      subject,
      mimeContent: [
        {
          mimeType: 'text/plain; charset=utf-8',
          content: toBase64Mime('Open this email in an HTML-capable client to view it.'),
          transferEncoding: 'base64',
        },
        {
          mimeType: 'text/html; charset=utf-8',
          content: toBase64Mime(html),
          transferEncoding: 'base64',
        },
      ],
    })
    return true
  } catch {
    return false
  }
}

// deno-lint-ignore no-explicit-any
async function sendPush(supabase: any, userId: string, title: string, body: string, orderId: string): Promise<boolean> {
  const publicKey = Deno.env.get('VAPID_PUBLIC')
  const privateKey = Deno.env.get('VAPID_PRIVATE')
  const subject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@example.com'
  if (!publicKey || !privateKey) return false

  const { data: tokens } = await supabase
    .from('device_tokens')
    .select('id,token')
    .eq('user_id', userId)
    .eq('is_active', true)
  if (!tokens?.length) return false

  try {
    const webpush = await import('npm:web-push@3')
    webpush.default.setVapidDetails(subject, publicKey, privateKey)
    const payload = JSON.stringify({ title, body, url: `/app/orders/${orderId}` })
    let any = false
    for (const t of tokens) {
      try {
        const subscription = JSON.parse(t.token)
        await webpush.default.sendNotification(subscription, payload)
        any = true
      } catch (err) {
        // 404/410 → subscription gone; deactivate it.
        const status = (err as { statusCode?: number })?.statusCode
        if (status === 404 || status === 410) {
          await supabase.from('device_tokens').update({ is_active: false }).eq('id', t.id)
        }
      }
    }
    return any
  } catch {
    return false
  }
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
