// Fixes the Supabase SMTP sender so Resend accepts it:
//  - sets username to lowercase "resend"
//  - sets the From address to an address on a VERIFIED Resend domain
// Needs SUPABASE_ACCESS_TOKEN + RESEND_API_KEY in .env.local. Never prints secrets.
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
const resendKey = env.RESEND_API_KEY
if (!token || !ref) throw new Error('Missing SUPABASE_ACCESS_TOKEN / project URL in .env.local')
if (!resendKey) throw new Error('Add RESEND_API_KEY=re_... to .env.local first')

// Find a verified Resend domain.
const dRes = await fetch('https://api.resend.com/domains', {
  headers: { Authorization: `Bearer ${resendKey}` },
})
if (!dRes.ok) throw new Error(`Resend domains error (${dRes.status}): ${await dRes.text()}`)
const domains = (await dRes.json()).data ?? []
domains.forEach((d) => console.log(`Resend domain: ${d.name} → ${d.status}`))

const verified = domains.find((d) => d.status === 'verified')
const sender = verified ? `reminders@${verified.name}` : 'onboarding@resend.dev'
if (!verified) {
  console.log('\n⚠  No verified domain found. Falling back to onboarding@resend.dev,')
  console.log('   which can ONLY deliver to the email you signed up to Resend with.')
  console.log('   Verify graphketing.com in Resend to send to any address.')
}

// Patch Supabase SMTP sender + username.
const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ smtp_user: 'resend', smtp_admin_email: sender }),
})
if (res.ok) {
  console.log(`\n✓ SMTP sender set to: ${sender}`)
  console.log('  Username set to: resend')
  console.log('  Try the password reset again.')
} else {
  console.error(`✗ Failed (${res.status}): ${await res.text()}`)
  process.exit(1)
}
