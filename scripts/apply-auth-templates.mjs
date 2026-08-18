// Pushes the branded auth email templates in email-templates/ to your Supabase
// project via the Management API. Run once (and again whenever you edit them):
//
//   1. Create a Supabase personal access token:
//      https://supabase.com/dashboard/account/tokens
//   2. Add it to .env.local:   SUPABASE_ACCESS_TOKEN=sbp_xxx
//   3. node scripts/apply-auth-templates.mjs
//
// The token is read from .env.local (git-ignored) and never printed.
import { readFileSync } from 'node:fs'

const root = new URL('..', import.meta.url)
const env = Object.fromEntries(
  readFileSync(new URL('.env.local', root), 'utf8')
    .split('\n')
    .filter((l) => l && !l.trimStart().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const token = env.SUPABASE_ACCESS_TOKEN
const url = env.VITE_SUPABASE_URL
if (!token) {
  console.error('Missing SUPABASE_ACCESS_TOKEN in .env.local (create one at https://supabase.com/dashboard/account/tokens)')
  process.exit(1)
}
const ref = url ? new URL(url).host.split('.')[0] : null
if (!ref) {
  console.error('Could not derive project ref from VITE_SUPABASE_URL')
  process.exit(1)
}

const read = (file) => readFileSync(new URL(`email-templates/${file}`, root), 'utf8')

// Map: Supabase auth-config field <- our template file + subject.
const body = {
  mailer_subjects_confirmation: 'Confirm your email — Refundly',
  mailer_templates_confirmation_content: read('confirm-signup.html'),
  mailer_subjects_magic_link: 'Your sign-in link — Refundly',
  mailer_templates_magic_link_content: read('magic-link.html'),
  mailer_subjects_recovery: 'Reset your password — Refundly',
  mailer_templates_recovery_content: read('reset-password.html'),
  mailer_subjects_email_change: 'Confirm your new email — Refundly',
  mailer_templates_email_change_content: read('change-email.html'),
  mailer_subjects_reauthentication: 'Your verification code — Refundly',
  mailer_templates_reauthentication_content: read('reauthentication.html'),
}

const endpoint = `https://api.supabase.com/v1/projects/${ref}/config/auth`
console.log(`Project: ${ref}`)
console.log('Pushing 5 branded auth email templates…')

const res = await fetch(endpoint, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
})

if (res.ok) {
  console.log('✓ Done. Send yourself a password reset to see the branded email.')
} else {
  console.error(`✗ Failed (${res.status}): ${await res.text()}`)
  console.error('Check that the token is valid and has access to this project.')
  process.exit(1)
}
