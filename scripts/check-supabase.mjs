// One-off connectivity check. Reads .env.local, never prints the key.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter((l) => l && !l.trimStart().startsWith('#') && l.includes('='))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const url = env.VITE_SUPABASE_URL
const key = env.VITE_SUPABASE_ANON_KEY
console.log('URL host:', url ? new URL(url).host : '(missing)')
console.log('anon key present:', Boolean(key), key ? `(len ${key.length})` : '')

const supabase = createClient(url, key)

async function check(table) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
  if (error) return { table, ok: false, msg: error.message }
  return { table, ok: true, count }
}

for (const t of ['platforms', 'holidays', 'orders']) {
  const r = await check(t)
  console.log(
    r.ok ? `✓ ${r.table}: reachable (count: ${r.count})` : `✗ ${r.table}: ${r.msg}`,
  )
}

// Fetch actual seed rows to confirm the migrations ran.
const { data: platforms, error: pErr } = await supabase
  .from('platforms')
  .select('name, slug')
  .order('sort_order')
console.log('\nplatforms rows:', pErr ? `ERROR ${pErr.message}` : platforms?.length)
if (platforms?.length) console.log('  ->', platforms.map((p) => p.name).join(', '))

const { data: holidays, error: hErr } = await supabase
  .from('holidays')
  .select('holiday_date, holiday_name')
  .order('holiday_date')
console.log('holidays rows:', hErr ? `ERROR ${hErr.message}` : holidays?.length)
