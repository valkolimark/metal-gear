#!/usr/bin/env tsx
export {} // Mark as ES module so top-level identifiers don't collide with sibling scripts.
/**
 * Migration: Cycle 61a — Equipment Registry tables.
 *
 * Creates: manufacturers, manufacturer_models, registry_match_feedback.
 * Extends: listings (manufacturer_id, manufacturer_model_id,
 *          registry_match_confidence, registry_match_method),
 *          sos_requests (manufacturer_id, manufacturer_model_id).
 * Enables: pg_trgm extension.
 *
 * Run once before running the seed script:
 *   SUPABASE_ACCESS_TOKEN=sbp_xxx npx tsx scripts/migrate-equipment-registry.ts
 *
 * Idempotent: every statement uses IF NOT EXISTS / CREATE OR REPLACE
 * where supported; ADD COLUMN IF NOT EXISTS guards listings/sos_requests.
 * Safe to re-run.
 */

const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "fkcyfpdkcrhjieauhchn"
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN

if (!SUPABASE_ACCESS_TOKEN) {
  console.error("ERROR: SUPABASE_ACCESS_TOKEN env var is required.")
  console.error("Get it from: https://supabase.com/dashboard/account/tokens")
  process.exit(1)
}

const STATEMENTS: Array<{ name: string; sql: string }> = [
  {
    name: "extension: pg_trgm",
    sql: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`,
  },
  {
    name: "table: manufacturers",
    sql: `
      CREATE TABLE IF NOT EXISTS manufacturers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        aliases TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        country TEXT,
        tier SMALLINT NOT NULL CHECK (tier IN (1, 2, 3)),
        equipment_categories TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
        parent_manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE SET NULL,
        source_file TEXT NOT NULL,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `,
  },
  {
    name: "indexes: manufacturers",
    sql: `
      CREATE INDEX IF NOT EXISTS idx_manufacturers_name_trgm
        ON manufacturers USING GIN (name gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_manufacturers_aliases
        ON manufacturers USING GIN (aliases);
      CREATE INDEX IF NOT EXISTS idx_manufacturers_tier
        ON manufacturers(tier);
      CREATE INDEX IF NOT EXISTS idx_manufacturers_categories
        ON manufacturers USING GIN (equipment_categories);
    `,
  },
  {
    name: "table: manufacturer_models",
    sql: `
      CREATE TABLE IF NOT EXISTS manufacturer_models (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        manufacturer_id UUID NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
        slug TEXT NOT NULL,
        name TEXT NOT NULL,
        series TEXT,
        equipment_type TEXT,
        notes TEXT,
        source_file TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(manufacturer_id, slug)
      );
    `,
  },
  {
    name: "indexes: manufacturer_models",
    sql: `
      CREATE INDEX IF NOT EXISTS idx_models_name_trgm
        ON manufacturer_models USING GIN (name gin_trgm_ops);
      CREATE INDEX IF NOT EXISTS idx_models_manufacturer
        ON manufacturer_models(manufacturer_id);
      CREATE INDEX IF NOT EXISTS idx_models_equipment_type
        ON manufacturer_models(equipment_type);
    `,
  },
  {
    name: "alter: listings + FK columns",
    sql: `
      ALTER TABLE listings
        ADD COLUMN IF NOT EXISTS manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS manufacturer_model_id UUID REFERENCES manufacturer_models(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS registry_match_confidence REAL,
        ADD COLUMN IF NOT EXISTS registry_match_method TEXT;
    `,
  },
  {
    name: "constraint: listings.registry_match_method",
    // Add the CHECK constraint separately and idempotently — if it already
    // exists, the second run silently no-ops via the DO-block guard.
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'listings_registry_match_method_check'
        ) THEN
          ALTER TABLE listings
            ADD CONSTRAINT listings_registry_match_method_check
            CHECK (registry_match_method IS NULL OR registry_match_method IN
              ('exact','alias','fuzzy','user_confirmed','admin_confirmed','none'));
        END IF;
      END $$;
    `,
  },
  {
    name: "indexes: listings FKs",
    sql: `
      CREATE INDEX IF NOT EXISTS idx_listings_manufacturer ON listings(manufacturer_id);
      CREATE INDEX IF NOT EXISTS idx_listings_model ON listings(manufacturer_model_id);
    `,
  },
  {
    name: "alter: sos_requests + FK columns",
    sql: `
      ALTER TABLE sos_requests
        ADD COLUMN IF NOT EXISTS manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS manufacturer_model_id UUID REFERENCES manufacturer_models(id) ON DELETE SET NULL;
    `,
  },
  {
    name: "indexes: sos_requests FKs",
    sql: `
      CREATE INDEX IF NOT EXISTS idx_sos_manufacturer ON sos_requests(manufacturer_id);
      CREATE INDEX IF NOT EXISTS idx_sos_model ON sos_requests(manufacturer_model_id);
    `,
  },
  {
    name: "table: registry_match_feedback",
    sql: `
      CREATE TABLE IF NOT EXISTS registry_match_feedback (
        id BIGSERIAL PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
        source_table TEXT NOT NULL CHECK (source_table IN ('listings','sos_requests','snap_list_drafts')),
        source_row_id UUID NOT NULL,
        suggested_manufacturer_id UUID REFERENCES manufacturers(id) ON DELETE SET NULL,
        suggested_model_id UUID REFERENCES manufacturer_models(id) ON DELETE SET NULL,
        user_action TEXT NOT NULL CHECK (user_action IN ('accepted','rejected','overridden_with_text','ignored')),
        user_text_value TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_feedback_user ON registry_match_feedback(user_id);
      CREATE INDEX IF NOT EXISTS idx_feedback_manufacturer ON registry_match_feedback(suggested_manufacturer_id);
    `,
  },
  {
    name: "RLS: enable on registry tables",
    sql: `
      ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
      ALTER TABLE manufacturer_models ENABLE ROW LEVEL SECURITY;
      ALTER TABLE registry_match_feedback ENABLE ROW LEVEL SECURITY;
    `,
  },
  {
    name: "RLS policy: manufacturers readable by authenticated",
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname='public' AND tablename='manufacturers'
            AND policyname='manufacturers readable by authenticated'
        ) THEN
          CREATE POLICY "manufacturers readable by authenticated"
            ON manufacturers FOR SELECT TO authenticated USING (true);
        END IF;
      END $$;
    `,
  },
  {
    name: "RLS policy: models readable by authenticated",
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname='public' AND tablename='manufacturer_models'
            AND policyname='models readable by authenticated'
        ) THEN
          CREATE POLICY "models readable by authenticated"
            ON manufacturer_models FOR SELECT TO authenticated USING (true);
        END IF;
      END $$;
    `,
  },
  {
    name: "RLS policy: feedback insert own",
    sql: `
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname='public' AND tablename='registry_match_feedback'
            AND policyname='feedback insert own'
        ) THEN
          CREATE POLICY "feedback insert own"
            ON registry_match_feedback FOR INSERT TO authenticated
            WITH CHECK (user_id = auth.uid());
        END IF;
      END $$;
    `,
  },
]

const VERIFICATIONS: Array<{ name: string; sql: string; expect: (rows: unknown[]) => boolean }> = [
  {
    name: "table manufacturers exists",
    sql: `SELECT 1 FROM information_schema.tables WHERE table_name = 'manufacturers';`,
    expect: rows => rows.length === 1,
  },
  {
    name: "table manufacturer_models exists",
    sql: `SELECT 1 FROM information_schema.tables WHERE table_name = 'manufacturer_models';`,
    expect: rows => rows.length === 1,
  },
  {
    name: "table registry_match_feedback exists",
    sql: `SELECT 1 FROM information_schema.tables WHERE table_name = 'registry_match_feedback';`,
    expect: rows => rows.length === 1,
  },
  {
    name: "listings.manufacturer_id exists",
    sql: `SELECT 1 FROM information_schema.columns WHERE table_name='listings' AND column_name='manufacturer_id';`,
    expect: rows => rows.length === 1,
  },
  {
    name: "sos_requests.manufacturer_id exists",
    sql: `SELECT 1 FROM information_schema.columns WHERE table_name='sos_requests' AND column_name='manufacturer_id';`,
    expect: rows => rows.length === 1,
  },
  {
    name: "pg_trgm extension installed",
    sql: `SELECT 1 FROM pg_extension WHERE extname='pg_trgm';`,
    expect: rows => rows.length === 1,
  },
]

async function runQuery(sql: string): Promise<unknown[]> {
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
  const json = (await res.json()) as unknown
  // Management API returns either an array or { data: [...] }; normalize.
  if (Array.isArray(json)) return json
  if (json && typeof json === "object" && "data" in json && Array.isArray((json as { data: unknown }).data)) {
    return (json as { data: unknown[] }).data
  }
  return []
}

async function run() {
  console.log(`Running Cycle 61a registry migration on project: ${SUPABASE_PROJECT_REF}`)
  console.log(`Statements: ${STATEMENTS.length}`)

  for (const stmt of STATEMENTS) {
    process.stdout.write(`  → ${stmt.name} ... `)
    try {
      await runQuery(stmt.sql)
      console.log("ok")
    } catch (err) {
      console.log("FAILED")
      console.error(err instanceof Error ? err.message : String(err))
      process.exit(1)
    }
  }

  console.log("\nVerifying schema:")
  let allOk = true
  for (const v of VERIFICATIONS) {
    const rows = await runQuery(v.sql)
    const ok = v.expect(rows)
    console.log(`  ${ok ? "✓" : "✗"} ${v.name}`)
    if (!ok) allOk = false
  }

  if (!allOk) {
    console.error("\nVerification failed.")
    process.exit(1)
  }

  console.log("\nMigration complete. Next: run scripts/seed-equipment-registry.ts")
}

run().catch(err => {
  console.error("Unexpected error:", err)
  process.exit(1)
})
