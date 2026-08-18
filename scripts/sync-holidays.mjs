// Syncs India's public (gazetted) holidays for the CURRENT year into the
// `holidays` table via API Ninjas. The app reads that table, so this is what
// makes "this year's holidays" show up automatically.
//
// The free API Ninjas tier only returns the current year, so run this once a
// year to roll forward. Automate it by scheduling the command — e.g. a GitHub
// Action or any cron on `0 3 2 1 *` (03:00 on Jan 2):
//
//     node scripts/sync-holidays.mjs
//
// Reads from .env.local (git-ignored, never printed):
//   API_NINJAS=...              (https://api-ninjas.com — free tier is fine)
//   SUPABASE_ACCESS_TOKEN=sbp_… (https://supabase.com/dashboard/account/tokens)
//   VITE_SUPABASE_URL=https://<ref>.supabase.co
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

const COUNTRY = 'IN'
const apiKey = env.API_NINJAS
const token = env.SUPABASE_ACCESS_TOKEN
const ref = env.VITE_SUPABASE_URL ? new URL(env.VITE_SUPABASE_URL).host.split('.')[0] : null

if (!apiKey) { console.error('Missing API_NINJAS in .env.local'); process.exit(1) }
if (!token) { console.error('Missing SUPABASE_ACCESS_TOKEN in .env.local (create one at https://supabase.com/dashboard/account/tokens)'); process.exit(1) }
if (!ref) { console.error('Could not derive project ref from VITE_SUPABASE_URL'); process.exit(1) }

// 1. Fetch the current year's holidays (free tier disallows the `year` param).
const apiRes = await fetch(`https://api.api-ninjas.com/v1/holidays?country=${COUNTRY}`, {
  headers: { 'X-Api-Key': apiKey },
})
if (!apiRes.ok) {
  console.error(`✗ API Ninjas failed (${apiRes.status}): ${await apiRes.text()}`)
  process.exit(1)
}
const all = await apiRes.json()

// Gazetted holidays are the official national days institutions close for.
// Restricted holidays are optional; observances/seasons aren't days off.
const gazetted = all
  .filter((h) => h.type === 'GAZETTED_HOLIDAY')
  .sort((a, b) => a.date.localeCompare(b.date))

if (gazetted.length === 0) { console.error('✗ No gazetted holidays returned; aborting.'); process.exit(1) }
const year = gazetted[0].date.slice(0, 4)

// 2. Atomically replace this country+year's rows.
const esc = (s) => s.replace(/'/g, "''")
const values = gazetted.map((h) => `('${COUNTRY}', NULL, '${h.date}', '${esc(h.name)}')`).join(',\n')
const sql =
  `delete from public.holidays where country_code='${COUNTRY}' and year=${year};\n` +
  `insert into public.holidays (country_code, state_code, holiday_date, holiday_name) values\n${values};`

const dbRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
})

if (dbRes.ok) {
  console.log(`✓ Synced ${gazetted.length} ${COUNTRY} public holidays for ${year}.`)
} else {
  console.error(`✗ DB write failed (${dbRes.status}): ${await dbRes.text()}`)
  process.exit(1)
}
