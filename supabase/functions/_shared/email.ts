// Branded, client-robust HTML email templates.
// Table-based layout + inline styles for broad email-client support
// (Gmail, Apple Mail, Outlook). Shared by every reminder email.
import { formatINR, type NotificationType, type PlainDate } from './reminders.ts'

const BRAND = {
  primary: '#6355F6',
  bg: '#eef1f5',
  surface: '#ffffff',
  border: '#e6e8ef',
  text: '#14161d',
  text2: '#565d70',
  text3: '#8b90a3',
  success: '#16a34a',
  danger: '#e2464b',
  warning: '#c2740a',
  font:
    "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif,'Apple Color Emoji','Segoe UI Emoji'",
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function fmtDate(date: PlainDate): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${d} ${MONTHS_SHORT[(m ?? 1) - 1]} ${y}`
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export interface EmailDetailRow {
  label: string
  value: string
  strong?: boolean
}

export interface EmailOptions {
  preheader?: string
  accent?: string
  emoji?: string
  heading: string
  intro: string
  detailTitle?: string
  detailRows?: EmailDetailRow[]
  buttonText?: string
  buttonUrl?: string
  footerNote?: string
}

/** Render a full, standalone branded HTML email. */
export function renderEmail(o: EmailOptions): string {
  const accent = o.accent ?? BRAND.primary
  const preheader = o.preheader ?? o.intro

  const detail =
    o.detailRows && o.detailRows.length
      ? `
      <tr><td style="padding:4px 32px 0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};border:1px solid ${BRAND.border};border-radius:12px;">
          <tr><td style="padding:14px 18px;">
            ${o.detailTitle ? `<div style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:${BRAND.text3};margin-bottom:10px;">${esc(o.detailTitle)}</div>` : ''}
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${o.detailRows
                .map(
                  (r) => `
              <tr>
                <td style="padding:5px 0;font-size:14px;color:${BRAND.text3};">${esc(r.label)}</td>
                <td align="right" style="padding:5px 0;font-size:14px;font-weight:${r.strong ? 800 : 600};color:${BRAND.text};">${esc(r.value)}</td>
              </tr>`,
                )
                .join('')}
            </table>
          </td></tr>
        </table>
      </td></tr>`
      : ''

  const button =
    o.buttonText && o.buttonUrl
      ? `
      <tr><td align="center" style="padding:24px 32px 4px;">
        <table role="presentation" cellpadding="0" cellspacing="0">
          <tr><td align="center" bgcolor="${accent}" style="border-radius:10px;">
            <a href="${o.buttonUrl}" target="_blank"
               style="display:inline-block;padding:13px 28px;font-family:${BRAND.font};font-size:15px;font-weight:700;line-height:1;color:#ffffff;text-decoration:none;border-radius:10px;">
              ${esc(o.buttonText)}
            </a>
          </td></tr>
        </table>
      </td></tr>`
      : ''

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${esc(o.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};">
    <tr><td align="center" style="padding:28px 16px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0"
             style="width:600px;max-width:100%;background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:16px;overflow:hidden;">
        <!-- accent bar -->
        <tr><td style="height:4px;background:${accent};line-height:4px;font-size:0;">&nbsp;</td></tr>

        <!-- brand -->
        <tr><td style="padding:24px 32px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="width:40px;height:40px;background:${BRAND.primary};border-radius:10px;text-align:center;vertical-align:middle;color:#ffffff;font-family:${BRAND.font};font-size:22px;font-weight:800;">&#8377;</td>
              <td style="padding-left:12px;font-family:${BRAND.font};font-size:17px;font-weight:800;color:${BRAND.text};">Refundly</td>
            </tr>
          </table>
        </td></tr>

        <!-- hero -->
        <tr><td style="padding:12px 32px 0;">
          ${o.emoji ? `<div style="font-size:40px;line-height:1;margin-bottom:10px;">${o.emoji}</div>` : ''}
          <h1 style="margin:0;font-family:${BRAND.font};font-size:22px;font-weight:800;color:${BRAND.text};">${esc(o.heading)}</h1>
          <p style="margin:10px 0 0;font-family:${BRAND.font};font-size:15px;line-height:1.6;color:${BRAND.text2};">${o.intro}</p>
        </td></tr>

        ${detail}
        ${button}

        <!-- footer -->
        <tr><td style="padding:28px 32px 24px;">
          <div style="border-top:1px solid ${BRAND.border};padding-top:16px;">
            <p style="margin:0;font-family:${BRAND.font};font-size:13px;line-height:1.6;color:${BRAND.text3};">
              ${o.footerNote ? esc(o.footerNote) + '<br>' : ''}
              You're receiving this from <strong style="color:${BRAND.text2};">Refundly</strong> — add it once, get reminded at the right time, never forget your refund.
            </p>
          </div>
        </td></tr>
      </table>
      <div style="font-family:${BRAND.font};font-size:12px;color:${BRAND.text3};padding:14px 0;">Manage reminders in Settings → Notifications.</div>
    </td></tr>
  </table>
</body>
</html>`
}

export interface NotificationEmailContext {
  product: string
  platform: string
  orderId: string
  amount: number
  expectedDate: PlainDate | null
  appUrl: string
  orderPk: string
}

/** Build the subject + HTML for a reminder email of the given type. */
export function renderNotificationEmail(
  type: NotificationType,
  ctx: NotificationEmailContext,
): { subject: string; html: string } {
  const link = ctx.appUrl ? `${ctx.appUrl}/app/orders/${ctx.orderPk}` : ''
  const rows: EmailDetailRow[] = [
    { label: 'Product', value: ctx.product },
    { label: 'Platform', value: ctx.platform },
    { label: 'Order ID', value: `#${ctx.orderId}` },
    { label: 'Refund amount', value: formatINR(ctx.amount), strong: true },
  ]
  if (ctx.expectedDate) rows.push({ label: 'Expected refund date', value: fmtDate(ctx.expectedDate) })

  const base = {
    detailTitle: 'Order',
    detailRows: rows,
    buttonText: link ? 'Open order' : undefined,
    buttonUrl: link || undefined,
  }

  switch (type) {
    case 'DELIVERY_CONFIRM':
      return {
        subject: `📦 Was your ${ctx.product} delivered?`,
        html: renderEmail({
          ...base,
          emoji: '📦',
          heading: 'Has your order arrived?',
          intro: `If your <strong>${esc(ctx.product)}</strong> from ${esc(ctx.platform)} has arrived, mark it delivered so we can track your review and return window.`,
          buttonText: link ? 'Mark as delivered' : undefined,
        }),
      }
    case 'REVIEW_REMINDER':
      return {
        subject: `⭐ Time to review your ${ctx.product}`,
        html: renderEmail({
          ...base,
          accent: BRAND.warning,
          emoji: '⭐',
          heading: 'Check your review',
          intro: `Have you reviewed or rated <strong>${esc(ctx.product)}</strong> yet? A quick check keeps everything on track.`,
          buttonText: link ? 'Check review' : undefined,
        }),
      }
    case 'RETURN_WINDOW_CLOSED':
      return {
        subject: `🔒 Return window closed — fill your refund form`,
        html: renderEmail({
          ...base,
          emoji: '🔒',
          heading: 'Your return window has closed',
          intro: `You can now fill the refund form for <strong>${esc(ctx.product)}</strong> and we'll calculate your expected refund date.`,
          buttonText: link ? 'Fill refund form' : undefined,
        }),
      }
    case 'REFUND_DUE':
      return {
        subject: `💰 Refund due — ${formatINR(ctx.amount)}`,
        html: renderEmail({
          ...base,
          emoji: '💰',
          heading: 'Your refund is due today',
          intro: `Your <strong>${formatINR(ctx.amount)}</strong> refund for ${esc(ctx.product)} is expected today. If it hasn't arrived, it's a good time to follow up.`,
        }),
      }
    case 'REFUND_OVERDUE':
      return {
        subject: `🚨 Refund follow-up required — ${formatINR(ctx.amount)}`,
        html: renderEmail({
          ...base,
          accent: BRAND.danger,
          emoji: '🚨',
          heading: 'Your refund is overdue',
          intro: `Your expected refund date has passed and your <strong>${formatINR(ctx.amount)}</strong> refund for ${esc(ctx.product)} hasn't been marked received. Please follow up with ${esc(ctx.platform)}.`,
          footerNote: 'We\'ll keep reminding you until you mark this refund as received.',
        }),
      }
  }
}
