#!/usr/bin/env tsx
export {} // make this a module so top-level const names don't clash with sibling scripts
/**
 * Migration (Cycle 65): convert company_profiles.industry (TEXT) → company_profiles.industries (TEXT[]).
 *
 *   SUPABASE_ACCESS_TOKEN=... npx tsx scripts/migrate-companies-industries-array.ts            # execute
 *   SUPABASE_ACCESS_TOKEN=... npx tsx scripts/migrate-companies-industries-array.ts --dry-run  # plan only
 *
 * Idempotent — re-running after a successful run is a no-op (no DDL changes,
 * no row updates: the backfill predicate excludes rows already filled).
 *
 * Companies make broad reach claims (multi-vertical fabricators, MRO providers
 * serving all process industries) so the column has no count cap. Listings
 * remain capped at 5 (specific equipment fit). Legacy `industry` column is left
 * in place for one cycle as a deprecated read-only field; drop scheduled in
 * Cycle 66.
 */

const SUPABASE_PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ?? 'fkcyfpdkcrhjieauhchn'
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const DRY_RUN = process.argv.includes('--dry-run')

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('ERROR: SUPABASE_ACCESS_TOKEN env var is required.')
  process.exit(1)
}

const STATEMENTS: Array<{ name: string; sql: string }> = [
  {
    name: 'add industries TEXT[] column (idempotent)',
    sql: `
ALTER TABLE company_profiles
  ADD COLUMN IF NOT EXISTS industries TEXT[] DEFAULT '{}'::text[] NOT NULL;
`,
  },
  {
    name: 'backfill industries from legacy industry where empty',
    sql: `
UPDATE company_profiles
   SET industries = ARRAY[industry]
 WHERE (industries IS NULL OR cardinality(industries) = 0)
   AND industry IS NOT NULL
   AND length(trim(industry)) > 0;
`,
  },
  {
    name: 'GIN index for overlap queries',
    sql: `
CREATE INDEX IF NOT EXISTS idx_company_profiles_industries_gin
  ON company_profiles USING GIN (industries);
`,
  },
  {
    name: 'mark legacy industry column deprecated',
    sql: `
COMMENT ON COLUMN company_profiles.industry IS
  'DEPRECATED Cycle 65 — use industries TEXT[]. Drop scheduled Cycle 66.';
`,
  },
]

async function runQuery(sql: string): Promise<unknown> {
  const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Supabase API error (HTTP ${res.status}): ${body}`)
  }
  return res.json()
}

interface Row {
  [key: string]: unknown
}

function unwrapRows<T extends Row>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[]
  if (result && typeof result === 'object' && 'data' in result) {
    const data = (result as { data: unknown }).data
    if (Array.isArray(data)) return data as T[]
  }
  return []
}

async function columnExists(name: string): Promise<boolean> {
  const rows = unwrapRows<{ exists: boolean }>(
    await runQuery(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'company_profiles'
           AND column_name = '${name}'
      ) AS exists;
    `)
  )
  return rows[0]?.exists === true
}

async function expectedBackfillCount(): Promise<number> {
  const hasIndustries = await columnExists('industries')
  const sql = hasIndustries
    ? `
      SELECT COUNT(*)::int AS count
        FROM company_profiles
       WHERE (industries IS NULL OR cardinality(industries) = 0)
         AND industry IS NOT NULL
         AND length(trim(industry)) > 0;
    `
    : `
      SELECT COUNT(*)::int AS count
        FROM company_profiles
       WHERE industry IS NOT NULL
         AND length(trim(industry)) > 0;
    `
  const rows = unwrapRows<{ count: number }>(await runQuery(sql))
  return rows[0]?.count ?? 0
}

async function verify(): Promise<boolean> {
  const colRows = unwrapRows<{ data_type: string; udt_name: string; is_nullable: string; column_default: string | null }>(
    await runQuery(`
      SELECT data_type, udt_name, is_nullable, column_default
        FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'company_profiles'
         AND column_name = 'industries';
    `)
  )
  const col = colRows[0]
  if (!col) {
    console.error('Verification failed: industries column not found')
    return false
  }
  if (col.udt_name !== '_text') {
    console.error(`Verification failed: industries column has udt_name "${col.udt_name}", expected "_text"`)
    return false
  }
  if (col.is_nullable !== 'NO') {
    console.error(`Verification failed: industries column is nullable; expected NOT NULL`)
    return false
  }

  const idxRows = unwrapRows<{ indexname: string }>(
    await runQuery(`
      SELECT indexname FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'company_profiles'
         AND indexname = 'idx_company_profiles_industries_gin';
    `)
  )
  if (idxRows.length === 0) {
    console.error('Verification failed: idx_company_profiles_industries_gin missing')
    return false
  }

  const remaining = await expectedBackfillCount()
  if (remaining !== 0) {
    console.error(
      `Verification failed: ${remaining} row(s) still need backfill (industries empty + industry non-empty)`
    )
    return false
  }
  return true
}

async function run() {
  console.log(`Running company_profiles.industries migration on project: ${SUPABASE_PROJECT_REF}`)
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (no changes)' : 'EXECUTE'}`)

  const expected = await expectedBackfillCount()
  console.log(`Expected backfill rows: ${expected}`)

  if (DRY_RUN) {
    console.log('\nPlanned statements:\n')
    for (const stmt of STATEMENTS) {
      console.log(`-- ${stmt.name}`)
      console.log(stmt.sql.trim())
      console.log()
    }
    console.log('Re-run without --dry-run to apply.')
    return
  }

  for (const stmt of STATEMENTS) {
    console.log(`  • ${stmt.name}`)
    await runQuery(stmt.sql)
  }

  const ok = await verify()
  if (!ok) process.exit(1)

  console.log('\nVerification passed:')
  console.log('  • company_profiles.industries TEXT[] NOT NULL exists')
  console.log('  • idx_company_profiles_industries_gin in place')
  console.log(`  • backfilled ${expected} row(s)`)
  console.log('Migration complete.')
}

run().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
