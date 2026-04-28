#!/usr/bin/env tsx
export {} // make this a module so top-level const names don't clash with sibling scripts
/**
 * Migration (Cycle 62): create ai_usage_events ledger.
 *
 * Run once before the new telemetry layer ships:
 *   SUPABASE_ACCESS_TOKEN=... npx tsx scripts/migrate-ai-usage-events.ts
 *
 * Idempotent — uses IF NOT EXISTS / DO blocks. Safe to re-run.
 */

const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "fkcyfpdkcrhjieauhchn"
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

if (!SUPABASE_ACCESS_TOKEN) {
  console.error("ERROR: SUPABASE_ACCESS_TOKEN env var is required.")
  process.exit(1)
}

const STATEMENTS: Array<{ name: string; sql: string }> = [
  {
    name: "create ai_usage_events table",
    sql: `
CREATE TABLE IF NOT EXISTS ai_usage_events (
  id BIGSERIAL PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL,
  surface TEXT NOT NULL CHECK (surface IN (
    'photo_to_listing_analysis',
    'sos_analysis',
    'listing_analyzer_helper',
    'listing_freshness_cron',
    'weekly_brief_cron',
    'demand_insights_cron',
    'ask_metal_gear',
    'ai_search',
    'dispute_mediation',
    'churn_scoring_cron',
    'registry_seeding',
    'registry_disambiguation',
    'other'
  )),
  vendor TEXT NOT NULL CHECK (vendor IN ('anthropic','google_vision','other')),
  model TEXT,
  input_tokens INTEGER,
  output_tokens INTEGER,
  vision_units INTEGER,
  cost_cents NUMERIC(12, 4) NOT NULL DEFAULT 0,
  latency_ms INTEGER,
  success BOOLEAN NOT NULL DEFAULT TRUE,
  error_class TEXT,
  trace_id TEXT
);
`,
  },
  {
    name: "index occurred_at desc",
    sql: `CREATE INDEX IF NOT EXISTS idx_ai_usage_occurred_at ON ai_usage_events(occurred_at DESC);`,
  },
  {
    name: "index user / occurred_at",
    sql: `CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_events(user_id, occurred_at DESC);`,
  },
  {
    name: "index surface / occurred_at",
    sql: `CREATE INDEX IF NOT EXISTS idx_ai_usage_surface ON ai_usage_events(surface, occurred_at DESC);`,
  },
  {
    name: "index vendor / occurred_at",
    sql: `CREATE INDEX IF NOT EXISTS idx_ai_usage_vendor ON ai_usage_events(vendor, occurred_at DESC);`,
  },
  {
    name: "enable RLS",
    sql: `ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;`,
  },
]

async function runQuery(sql: string): Promise<unknown> {
  const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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

async function verifyTable(): Promise<boolean> {
  const result = (await runQuery(`
    SELECT
      (SELECT COUNT(*)::int FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'ai_usage_events') AS table_count,
      (SELECT COUNT(*)::int FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'ai_usage_events') AS column_count,
      (SELECT relrowsecurity FROM pg_class
        WHERE relname = 'ai_usage_events' AND relnamespace = 'public'::regnamespace) AS rls_enabled;
  `)) as
    | Array<{ table_count: number; column_count: number; rls_enabled: boolean }>
    | { data?: Array<{ table_count: number; column_count: number; rls_enabled: boolean }> }

  const rows = Array.isArray(result)
    ? result
    : (result as { data?: unknown[] }).data ?? []
  const row = rows[0] as
    | { table_count: number; column_count: number; rls_enabled: boolean }
    | undefined
  if (!row) return false
  if (row.table_count !== 1) {
    console.error(`Verification failed: expected 1 ai_usage_events table, found ${row.table_count}`)
    return false
  }
  if (row.column_count < 14) {
    console.error(`Verification failed: expected ≥14 columns, found ${row.column_count}`)
    return false
  }
  if (!row.rls_enabled) {
    console.error("Verification failed: RLS is not enabled on ai_usage_events.")
    return false
  }
  return true
}

async function run() {
  console.log(`Running migration on project: ${SUPABASE_PROJECT_REF}`)
  for (const stmt of STATEMENTS) {
    console.log(`  • ${stmt.name}`)
    await runQuery(stmt.sql)
  }

  const ok = await verifyTable()
  if (!ok) process.exit(1)

  console.log("Verification passed: ai_usage_events table + indexes + RLS in place.")
  console.log("Migration complete.")
}

run().catch((err) => {
  console.error("Unexpected error:", err)
  process.exit(1)
})
