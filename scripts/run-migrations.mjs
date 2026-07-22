/**
 * Applies all Supabase migrations in order via the REST SQL API.
 * Usage: node scripts/run-migrations.mjs
 */
import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dir, '..', 'supabase', 'migrations')

const SUPABASE_URL         = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars first.')
  process.exit(1)
}

const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort()
console.log(`\n📦  Found ${files.length} migration files\n`)

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8')
  process.stdout.write(`  ▶  ${file} … `)

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  })

  // Supabase doesn't expose a raw SQL exec endpoint in the anon API.
  // We use the pg REST management approach instead.
  if (!res.ok) {
    // Try the alternative: direct DB via pg connection string
    console.log('⚠  REST exec not available — see instructions below')
    break
  }
  console.log('✅')
}
