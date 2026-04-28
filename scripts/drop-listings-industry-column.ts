#!/usr/bin/env tsx
export {} // make this a module so top-level const names don't clash with sibling scripts
/**
 * Migration (Cycle 65): drop the deprecated `listings.industry` singleton column.
 *
 *   SUPABASE_ACCESS_TOKEN=... npx tsx scripts/drop-listings-industry-column.ts            # execute
 *   SUPABASE_ACCESS_TOKEN=... npx tsx scripts/drop-listings-industry-column.ts --dry-run  # plan only
 *
 * Pre-flight grep gate: aborts loud if any source file still references
 * `listing.industry` / `listings.industry` (singleton accessor). Run after
 * `scripts/migrate-listings-industries-array.ts` (Cycle 64) has been executed
 * and after every consumer has been migrated to read `listings.industries[]`.
 *
 * Idempotent: `DROP COLUMN IF EXISTS` makes re-runs no-ops once the column
 * is gone; verification confirms the column no longer exists.
 */

import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const SUPABASE_PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ?? 'fkcyfpdkcrhjieauhchn'
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const DRY_RUN = process.argv.includes('--dry-run')

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('ERROR: SUPABASE_ACCESS_TOKEN env var is required.')
  process.exit(1)
}

const REPO_ROOT = resolve(__dirname, '..')

// ─── Pre-flight grep gate ────────────────────────────────────────────────────
//
// Fails loud if any source file still references the singleton accessor.
// Excludes:
//   - the `industries` array form
//   - explicit DEPRECATED comments
//   - node_modules
//   - markdown docs (CHANGELOG / CLAUDE.md / *.md)
//   - this script itself

function preflightGrep(): { offending: string[] } {
  const cmd = [
    'grep -rn',
    `"listing\\.industry\\b\\|listings\\.industry\\b\\|\\.industry === \\|\\.industry !== "`,
    'src/',
  ].join(' ')
  let raw = ''
  try {
    raw = execSync(cmd, { cwd: REPO_ROOT, encoding: 'utf8' })
  } catch (err: unknown) {
    // grep exits 1 when no matches — that's the success path.
    const e = err as { status?: number; stdout?: string }
    if (e.status === 1) return { offending: [] }
    throw err
  }
  const offending = raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => !l.includes('industries'))
    .filter((l) => !l.includes('// DEPRECATED'))
    .filter((l) => !l.includes('node_modules'))
    .filter((l) => !l.endsWith('.md'))
  return { offending }
}

// ─── DDL ──────────────────────────────────────────────────────────────────────

const STATEMENTS: Array<{ name: string; sql: string }> = [
  {
    name: 'drop legacy industry column',
    sql: `ALTER TABLE listings DROP COLUMN IF EXISTS industry;`,
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

async function verify(): Promise<boolean> {
  // industry column must be gone
  const dropped = unwrapRows<{ exists: boolean }>(
    await runQuery(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'listings'
           AND column_name = 'industry'
      ) AS exists;
    `),
  )
  if (dropped[0]?.exists === true) {
    console.error('Verification failed: listings.industry column still exists')
    return false
  }

  // industries[] column must still exist
  const remaining = unwrapRows<{ exists: boolean }>(
    await runQuery(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'listings'
           AND column_name = 'industries'
      ) AS exists;
    `),
  )
  if (remaining[0]?.exists !== true) {
    console.error('Verification failed: listings.industries column missing (wrong column dropped?)')
    return false
  }

  // No leftover index on the singleton column
  const leftoverIdx = unwrapRows<{ indexname: string }>(
    await runQuery(`
      SELECT indexname FROM pg_indexes
       WHERE schemaname = 'public'
         AND tablename = 'listings'
         AND indexdef ILIKE '%industry%'
         AND indexdef NOT ILIKE '%industries%';
    `),
  )
  if (leftoverIdx.length > 0) {
    console.error(
      `Verification failed: leftover indexes referencing listings.industry singleton: ${leftoverIdx.map((i) => i.indexname).join(', ')}`,
    )
    return false
  }

  return true
}

async function rowCount(): Promise<number> {
  const rows = unwrapRows<{ count: number }>(
    await runQuery(`SELECT COUNT(*)::int AS count FROM listings;`),
  )
  return rows[0]?.count ?? 0
}

async function run() {
  console.log(`Dropping listings.industry on project: ${SUPABASE_PROJECT_REF}`)
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (no changes)' : 'EXECUTE'}`)

  console.log('\nRunning pre-flight grep gate…')
  const { offending } = preflightGrep()
  if (offending.length > 0) {
    console.error('\nABORT: source still references the listings.industry singleton:\n')
    for (const line of offending) console.error(`  ${line}`)
    console.error('\nMigrate every reference to listings.industries (TEXT[]) and re-run.')
    process.exit(1)
  }
  console.log('  ✓ no source references found')

  const before = await rowCount()
  console.log(`\nlistings rows before drop: ${before}`)

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

  const after = await rowCount()
  if (after !== before) {
    console.error(`Verification failed: row count changed (${before} → ${after}). Aborting.`)
    process.exit(1)
  }

  console.log('\nVerification passed:')
  console.log('  • listings.industry column dropped')
  console.log('  • listings.industries column intact')
  console.log('  • no leftover indexes referencing the singleton')
  console.log(`  • row count unchanged: ${after}`)
  console.log('Migration complete.')
}

run().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
