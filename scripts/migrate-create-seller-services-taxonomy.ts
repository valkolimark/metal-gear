#!/usr/bin/env tsx
export {} // module marker so top-level const names don't clash with sibling scripts
/**
 * Migration (Cycle 70): create `seller_services_taxonomy` curated reference table
 * and seed ~40 starter services across 8 categories.
 *
 *   SUPABASE_ACCESS_TOKEN=... npx tsx scripts/migrate-create-seller-services-taxonomy.ts            # execute
 *   SUPABASE_ACCESS_TOKEN=... npx tsx scripts/migrate-create-seller-services-taxonomy.ts --dry-run  # plan only
 *
 * Idempotent — `IF NOT EXISTS` on table create, `ON CONFLICT (slug) DO NOTHING`
 * on seed insert. Safe to re-run.
 *
 * Companion tables: `seller_services` (Cycle 70 — separate migration).
 */

const SUPABASE_PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ?? 'fkcyfpdkcrhjieauhchn'
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const DRY_RUN = process.argv.includes('--dry-run')

if (!SUPABASE_ACCESS_TOKEN) {
  console.error('ERROR: SUPABASE_ACCESS_TOKEN env var is required.')
  process.exit(1)
}

// ─── DDL ────────────────────────────────────────────────────────────────────
const DDL: Array<{ name: string; sql: string }> = [
  {
    name: 'extension: pg_trgm (no-op if present)',
    sql: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`,
  },
  {
    name: 'create seller_services_taxonomy table',
    sql: `
CREATE TABLE IF NOT EXISTS public.seller_services_taxonomy (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  typical_sla_min_days INT,
  typical_sla_max_days INT,
  typical_price_from_usd INT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`,
  },
  {
    name: 'index: active + sort_order (partial)',
    sql: `
CREATE INDEX IF NOT EXISTS idx_services_taxonomy_active
  ON public.seller_services_taxonomy (is_active, sort_order)
  WHERE is_active = TRUE;
`,
  },
  {
    name: 'index: category + sort_order',
    sql: `
CREATE INDEX IF NOT EXISTS idx_services_taxonomy_category
  ON public.seller_services_taxonomy (category, sort_order);
`,
  },
  {
    name: 'index: trigram on label (fuzzy typeahead)',
    sql: `
CREATE INDEX IF NOT EXISTS idx_services_taxonomy_label_trgm
  ON public.seller_services_taxonomy USING gin (label gin_trgm_ops);
`,
  },
  {
    name: 'enable RLS',
    sql: `ALTER TABLE public.seller_services_taxonomy ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: 'policy: public read of active taxonomy entries',
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'seller_services_taxonomy'
      AND policyname = 'services_taxonomy_select_public'
  ) THEN
    CREATE POLICY "services_taxonomy_select_public"
      ON public.seller_services_taxonomy
      FOR SELECT
      USING (is_active = TRUE);
  END IF;
END$$;
`,
  },
  {
    name: 'trigger: updated_at',
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'seller_services_taxonomy_updated_at'
  ) THEN
    CREATE TRIGGER seller_services_taxonomy_updated_at
      BEFORE UPDATE ON public.seller_services_taxonomy
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END$$;
`,
  },
]

// ─── SEED ───────────────────────────────────────────────────────────────────
// ~40 starter services across 8 categories. Values derived from the
// /design/sellers preview (decanter rebuild $28k, bowl reconditioning $12k,
// gearbox service $8.4k, field service $1.85k) and broader B2B industrial
// guidelines. These are admin-editable guidelines — seller-level values
// live on seller_services rows.
type Seed = {
  slug: string
  label: string
  category: string
  sort_order: number
  typical_sla_min_days: number | null
  typical_sla_max_days: number | null
  typical_price_from_usd: number | null
  description?: string
}

const SEEDS: Seed[] = [
  // ── centrifuge-services (10/20/30…)
  { slug: 'decanter-rebuild', label: 'Decanter rebuild', category: 'centrifuge-services', sort_order: 10, typical_sla_min_days: 5, typical_sla_max_days: 10, typical_price_from_usd: 28000 },
  { slug: 'bowl-reconditioning', label: 'Bowl reconditioning', category: 'centrifuge-services', sort_order: 20, typical_sla_min_days: 3, typical_sla_max_days: 5, typical_price_from_usd: 12000 },
  { slug: 'disc-stack-service', label: 'Disc-stack service', category: 'centrifuge-services', sort_order: 30, typical_sla_min_days: 3, typical_sla_max_days: 7, typical_price_from_usd: 9500 },
  { slug: 'scroll-rebuild', label: 'Scroll rebuild', category: 'centrifuge-services', sort_order: 40, typical_sla_min_days: 5, typical_sla_max_days: 14, typical_price_from_usd: 22000 },
  { slug: 'bowl-hard-coat', label: 'Bowl hard-coat / tungsten carbide tile', category: 'centrifuge-services', sort_order: 50, typical_sla_min_days: 7, typical_sla_max_days: 14, typical_price_from_usd: 18000 },
  { slug: 'runout-balance-certification', label: 'Runout & balance certification', category: 'centrifuge-services', sort_order: 60, typical_sla_min_days: 2, typical_sla_max_days: 4, typical_price_from_usd: 3500 },

  // ── pump-services (110+)
  { slug: 'mechanical-seal-replacement', label: 'Mechanical seal replacement', category: 'pump-services', sort_order: 110, typical_sla_min_days: 1, typical_sla_max_days: 3, typical_price_from_usd: 2200 },
  { slug: 'impeller-replacement', label: 'Impeller replacement', category: 'pump-services', sort_order: 120, typical_sla_min_days: 2, typical_sla_max_days: 5, typical_price_from_usd: 3800 },
  { slug: 'pump-casing-repair', label: 'Pump casing repair / re-machining', category: 'pump-services', sort_order: 130, typical_sla_min_days: 3, typical_sla_max_days: 7, typical_price_from_usd: 5400 },
  { slug: 'pump-alignment', label: 'Pump-motor laser alignment', category: 'pump-services', sort_order: 140, typical_sla_min_days: 0, typical_sla_max_days: 1, typical_price_from_usd: 1200 },
  { slug: 'pump-vibration-analysis', label: 'Vibration analysis (pumps)', category: 'pump-services', sort_order: 150, typical_sla_min_days: 0, typical_sla_max_days: 2, typical_price_from_usd: 950 },

  // ── gearbox-drivetrain (210+)
  { slug: 'gearbox-service', label: 'Gearbox service', category: 'gearbox-drivetrain', sort_order: 210, typical_sla_min_days: 2, typical_sla_max_days: 5, typical_price_from_usd: 8400 },
  { slug: 'gear-inspection', label: 'Gear inspection / wear mapping', category: 'gearbox-drivetrain', sort_order: 220, typical_sla_min_days: 1, typical_sla_max_days: 3, typical_price_from_usd: 1850 },
  { slug: 'coupling-alignment', label: 'Coupling alignment', category: 'gearbox-drivetrain', sort_order: 230, typical_sla_min_days: 0, typical_sla_max_days: 1, typical_price_from_usd: 1100 },
  { slug: 'bearing-replacement', label: 'Bearing replacement', category: 'gearbox-drivetrain', sort_order: 240, typical_sla_min_days: 1, typical_sla_max_days: 3, typical_price_from_usd: 2400 },

  // ── field-service (310+)
  { slug: 'field-service', label: 'Field service (emergency dispatch)', category: 'field-service', sort_order: 310, typical_sla_min_days: 0, typical_sla_max_days: 1, typical_price_from_usd: 1850 },
  { slug: 'on-site-diagnostic', label: 'On-site diagnostic', category: 'field-service', sort_order: 320, typical_sla_min_days: 0, typical_sla_max_days: 2, typical_price_from_usd: 950 },
  { slug: 'install-commission', label: 'Install & commission', category: 'field-service', sort_order: 330, typical_sla_min_days: 2, typical_sla_max_days: 7, typical_price_from_usd: 4800 },
  { slug: 'remote-troubleshooting', label: 'Remote troubleshooting', category: 'field-service', sort_order: 340, typical_sla_min_days: 0, typical_sla_max_days: 1, typical_price_from_usd: 350 },

  // ── inspection-testing (410+)
  { slug: 'vibration-analysis-general', label: 'Vibration analysis (general)', category: 'inspection-testing', sort_order: 410, typical_sla_min_days: 0, typical_sla_max_days: 2, typical_price_from_usd: 1200 },
  { slug: 'ndt', label: 'Non-destructive testing (NDT)', category: 'inspection-testing', sort_order: 420, typical_sla_min_days: 1, typical_sla_max_days: 3, typical_price_from_usd: 1800 },
  { slug: 'ultrasonic-thickness', label: 'Ultrasonic thickness testing', category: 'inspection-testing', sort_order: 430, typical_sla_min_days: 1, typical_sla_max_days: 3, typical_price_from_usd: 1500 },
  { slug: 'infrared-thermography', label: 'Infrared thermography', category: 'inspection-testing', sort_order: 440, typical_sla_min_days: 1, typical_sla_max_days: 2, typical_price_from_usd: 1100 },

  // ── fabrication (510+)
  { slug: 'custom-skid-build', label: 'Custom skid build', category: 'fabrication', sort_order: 510, typical_sla_min_days: 14, typical_sla_max_days: 45, typical_price_from_usd: 35000 },
  { slug: 'welding-repair', label: 'Welding & repair', category: 'fabrication', sort_order: 520, typical_sla_min_days: 1, typical_sla_max_days: 5, typical_price_from_usd: 1800 },
  { slug: 'piping-fabrication', label: 'Piping fabrication', category: 'fabrication', sort_order: 530, typical_sla_min_days: 5, typical_sla_max_days: 21, typical_price_from_usd: 8500 },
  { slug: 'machine-shop', label: 'Machine shop / custom parts', category: 'fabrication', sort_order: 540, typical_sla_min_days: 3, typical_sla_max_days: 14, typical_price_from_usd: 1200 },

  // ── rigging-logistics (610+)
  { slug: 'heavy-haul', label: 'Heavy haul (over-dimension)', category: 'rigging-logistics', sort_order: 610, typical_sla_min_days: 1, typical_sla_max_days: 7, typical_price_from_usd: 3500 },
  { slug: 'crane-service', label: 'Crane service', category: 'rigging-logistics', sort_order: 620, typical_sla_min_days: 0, typical_sla_max_days: 2, typical_price_from_usd: 1850 },
  { slug: 'machinery-moving', label: 'Machinery moving / rigging', category: 'rigging-logistics', sort_order: 630, typical_sla_min_days: 1, typical_sla_max_days: 5, typical_price_from_usd: 2400 },
  { slug: 'oversize-permits', label: 'Oversize permits & route planning', category: 'rigging-logistics', sort_order: 640, typical_sla_min_days: 2, typical_sla_max_days: 7, typical_price_from_usd: 850 },

  // ── other (710+)
  { slug: 'parts-supply', label: 'Parts supply (OEM & aftermarket)', category: 'other', sort_order: 710, typical_sla_min_days: 1, typical_sla_max_days: 14, typical_price_from_usd: null },
  { slug: 'equipment-rental', label: 'Equipment rental', category: 'other', sort_order: 720, typical_sla_min_days: 0, typical_sla_max_days: 3, typical_price_from_usd: null },
  { slug: 'operator-training', label: 'Operator training', category: 'other', sort_order: 730, typical_sla_min_days: 3, typical_sla_max_days: 14, typical_price_from_usd: 4500 },
  { slug: 'engineering-consulting', label: 'Engineering consulting', category: 'other', sort_order: 740, typical_sla_min_days: 2, typical_sla_max_days: 14, typical_price_from_usd: 3500 },
  { slug: 'preventive-maintenance', label: 'Preventive maintenance program', category: 'other', sort_order: 750, typical_sla_min_days: 7, typical_sla_max_days: 30, typical_price_from_usd: 2800 },
  { slug: 'shutdown-turnaround', label: 'Shutdown / turnaround support', category: 'other', sort_order: 760, typical_sla_min_days: 5, typical_sla_max_days: 30, typical_price_from_usd: 18000 },
  { slug: 'spare-parts-stocking', label: 'Spare-parts stocking program', category: 'other', sort_order: 770, typical_sla_min_days: 7, typical_sla_max_days: 30, typical_price_from_usd: null },
  { slug: 'oil-analysis', label: 'Oil analysis', category: 'inspection-testing', sort_order: 450, typical_sla_min_days: 2, typical_sla_max_days: 5, typical_price_from_usd: 350 },
  { slug: 'motor-rewind', label: 'Motor rewind', category: 'gearbox-drivetrain', sort_order: 250, typical_sla_min_days: 5, typical_sla_max_days: 14, typical_price_from_usd: 4200 },
  { slug: 'valve-actuator-service', label: 'Valve / actuator service', category: 'field-service', sort_order: 350, typical_sla_min_days: 1, typical_sla_max_days: 5, typical_price_from_usd: 1800 },
]

function escSql(s: string): string {
  return s.replaceAll("'", "''")
}

function buildSeedInsert(): string {
  const values = SEEDS.map((s) => {
    const slug = `'${escSql(s.slug)}'`
    const label = `'${escSql(s.label)}'`
    const category = `'${escSql(s.category)}'`
    const desc = s.description ? `'${escSql(s.description)}'` : 'NULL'
    const slaMin = s.typical_sla_min_days == null ? 'NULL' : String(s.typical_sla_min_days)
    const slaMax = s.typical_sla_max_days == null ? 'NULL' : String(s.typical_sla_max_days)
    const priceFrom = s.typical_price_from_usd == null ? 'NULL' : String(s.typical_price_from_usd)
    const sortOrder = String(s.sort_order)
    return `(${slug}, ${label}, ${category}, ${desc}, ${slaMin}, ${slaMax}, ${priceFrom}, ${sortOrder})`
  }).join(',\n  ')

  return `
INSERT INTO public.seller_services_taxonomy
  (slug, label, category, description, typical_sla_min_days, typical_sla_max_days, typical_price_from_usd, sort_order)
VALUES
  ${values}
ON CONFLICT (slug) DO NOTHING;
`
}

const SEED_STATEMENT = { name: `seed ~${SEEDS.length} starter services`, sql: buildSeedInsert() }

// ─── runner ─────────────────────────────────────────────────────────────────
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

async function main() {
  console.log('Cycle 70 — create seller_services_taxonomy + seed')
  console.log(`Project: ${SUPABASE_PROJECT_REF}`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'EXECUTE'}`)
  console.log('')

  const allStatements = [...DDL, SEED_STATEMENT]

  for (const { name, sql } of allStatements) {
    if (DRY_RUN) {
      console.log(`  [skip] ${name}`)
      continue
    }
    process.stdout.write(`  → ${name} ... `)
    try {
      await runQuery(sql)
      console.log('ok')
    } catch (err) {
      console.log('FAILED')
      console.error(err)
      process.exit(1)
    }
  }

  if (!DRY_RUN) {
    console.log('')
    console.log('Verifying...')
    const rows = (await runQuery(
      `SELECT category, COUNT(*)::int AS n FROM public.seller_services_taxonomy GROUP BY category ORDER BY category;`
    )) as Array<{ category: string; n: number }>
    console.log('  Seeded entries by category:')
    rows.forEach((r) => console.log(`    ${r.category.padEnd(28)} ${r.n}`))
    const total = (await runQuery(
      `SELECT COUNT(*)::int AS n FROM public.seller_services_taxonomy;`
    )) as Array<{ n: number }>
    console.log(`  Total: ${total[0]?.n ?? 0}`)
  }

  console.log('')
  console.log(DRY_RUN ? 'Dry run complete.' : 'Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
