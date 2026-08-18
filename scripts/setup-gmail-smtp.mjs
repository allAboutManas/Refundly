// Repoints Supabase custom SMTP to Gmail (sends from your Gmail to any inbox,
// no domain needed). Reads SUPABASE_ACCESS_TOKEN, GMAIL_USER, GMAIL_APP_PASSWORD
// from .env.local. Never prints secrets.
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l && !l.trimStart().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const token = env.SUPABASE_ACCESS_TOKEN
const ref = env.VITE_SUPABASE_URL ? new URL(env.VITE_SUPABASE_URL).host.split('.')[0] : null
const user = env.GMAIL_USER
const pass = (env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '') // strip display spaces

if (!token || !ref) throw new Error('Missing SUPABASE_ACCESS_TOKEN / project URL in .env.local')
if (!user || !pass) throw new Error('Add GMAIL_USER and GMAIL_APP_PASSWORD to .env.local first')

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    external_email_enabled: true,
    smtp_host: 'smtp.gmail.com',
    smtp_port: '465',
    smtp_user: user,
    smtp_pass: pass,
    smtp_admin_email: user,
    smtp_sender_name: 'Refundly',
  }),
})

if (res.ok) {
  console.log(`✓ SMTP now uses Gmail (${user}). Try the password reset again.`)
} else {
  console.error(`✗ Failed (${res.status}): ${await res.text()}`)
  process.exit(1)
}
