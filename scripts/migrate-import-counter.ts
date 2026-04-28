#!/usr/bin/env tsx
export {} // Mark as ES module so top-level identifiers don't collide with sibling scripts.
/**
 * Migration: create increment_import_counter Postgres function
 *
 * Run once before the first multi-image import:
 *   SUPABASE_ACCESS_TOKEN=your_token npx tsx scripts/migrate-import-counter.ts
 *
 * Safe to re-run — uses CREATE OR REPLACE.
 */

const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? 'fkcyfpdkcrhjieauhchn'
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('ERROR: SUPABASE_ACCESS_TOKEN env var is required.')
  console.error('Get it from: https://supabase.com/dashboard/account/tokens')
  process.exit(1)
}

const SQL = `
CREATE OR REPLACE FUNCTION increment_import_counter(
  import_id   uuid,
  column_name text,
  amount      int DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
  -- Hard allowlist: only the three counter columns may be incremented.
  -- Any other value raises an exception before any UPDATE is attempted.
  IF column_name NOT IN (
    'image_fetch_attempted',
    'image_fetch_succeeded',
    'image_fetch_failed'
  ) THEN
    RAISE EXCEPTION
      'increment_import_counter: invalid column_name "%". '
      'Allowed: image_fetch_attempted, image_fetch_succeeded, image_fetch_failed',
      column_name;
  END IF;

  EXECUTE format(
    'UPDATE listing_imports SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
    column_name,
    column_name
  ) USING amount, import_id;
END;
$$;

GRANT EXECUTE ON FUNCTION increment_import_counter(uuid, text, int) TO service_role;
`

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

async function run() {
  console.log(`Running migration on project: ${SUPABASE_PROJECT_REF}`)

  // 1. Create (or replace) the function
  await runQuery(SQL)
  console.log('Function created/updated.')

  // 2. Verify it exists in pg_proc and has SECURITY INVOKER (prosecdef = false)
  const result = await runQuery(`
    SELECT proname, prosecdef
    FROM pg_proc
    WHERE proname = 'increment_import_counter'
    LIMIT 1;
  `) as { data?: Array<{ proname: string; prosecdef: boolean }> }
    | Array<{ proname: string; prosecdef: boolean }>

  // Handle both { data: [...] } and [...] response shapes
  const rows = Array.isArray(result) ? result : (result as { data?: unknown[] }).data ?? []
  const row = rows[0] as { proname: string; prosecdef: boolean } | undefined

  if (!row) {
    console.error('Verification failed: function not found in pg_proc after migration.')
    process.exit(1)
  }

  if (row.prosecdef === true) {
    // prosecdef = true means SECURITY DEFINER — must be false for INVOKER
    console.error('ERROR: function has SECURITY DEFINER set. Expected SECURITY INVOKER.')
    console.error('Drop the function manually and re-run this script.')
    process.exit(1)
  }

  console.log('Verification passed: function exists with SECURITY INVOKER.')
  console.log('Migration complete — you may now run bulk imports with multi-image support.')
}

run().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
