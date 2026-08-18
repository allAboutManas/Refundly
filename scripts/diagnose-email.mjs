// Diagnoses why auth emails fail: checks Supabase SMTP config + Resend domain
// verification. Reads .env.local; never prints secrets.
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

console.log('=== Supabase Auth SMTP config ===')
if (token && ref) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.ok) {
    const c = await res.json()
    console.log('external_email_enabled:', c.external_email_enabled)
    console.log('smtp_host:', c.smtp_host || '(none)')
    console.log('smtp_port:', c.smtp_port || '(none)')
    console.log('smtp_user:', c.smtp_user || '(none)')
    console.log('smtp_admin_email (sender):', c.smtp_admin_email || '(none)')
    console.log('smtp_sender_name:', c.smtp_sender_name || '(none)')
    console.log('smtp_pass set:', Boolean(c.smtp_pass))
  } else {
    console.log(`Could not read auth config (${res.status})`)
  }
} else {
  console.log('Missing SUPABASE_ACCESS_TOKEN or project URL in .env.local')
}

console.log('\n=== Resend domains ===')
if (env.RESEND_API_KEY) {
  const res = await fetch('https://api.resend.com/domains', {
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
  })
  if (res.ok) {
    const body = await res.json()
    const domains = body.data ?? body
    if (!domains?.length) console.log('No domains added in Resend yet.')
    for (const d of domains) console.log(`- ${d.name}: ${d.status}`)
  } else {
    console.log(`Could not read Resend domains (${res.status}): ${await res.text()}`)
  }
} else {
  console.log('RESEND_API_KEY not in .env.local — add it (temporarily) to check domain status,')
  console.log('or check Resend dashboard → Domains for graphketing.com status.')
}
