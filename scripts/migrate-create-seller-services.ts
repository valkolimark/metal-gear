#!/usr/bin/env tsx
export {} // module marker so top-level const names don't clash with sibling scripts
/**
 * Migration (Cycle 70): create `seller_services` — per-seller service rows
 * displayed on /sellers/[id] (Services tab) and /companies/[slug].
 *
 *   SUPABASE_ACCESS_TOKEN=... npx tsx scripts/migrate-create-seller-services.ts            # execute
 *   SUPABASE_ACCESS_TOKEN=... npx tsx scripts/migrate-create-seller-services.ts --dry-run  # plan only
 *
 * Idempotent — `IF NOT EXISTS` on table create, DO blocks for policies/triggers.
 *
 * Schema notes:
 *   - Target XOR: exactly one of seller_profile_id / seller_company_id.
 *   - Label XOR: either taxonomy_id (curated) or custom_label (free-text).
 *   - SLA range sanity check.
 *   - Price non-negative.
 *   - Soft-delete via is_active.
 *   - Ownership-scoped RLS uses `company_memberships.user_id` (not profile_id —
 *     the schema established that column name pre-Cycle 70).
 *   - updated_at trigger reuses existing `public.handle_updated_at()` function.
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
    name: 'create seller_services table',
    sql: `
CREATE TABLE IF NOT EXISTS public.seller_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  seller_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE,

  taxonomy_id UUID REFERENCES public.seller_services_taxonomy(id) ON DELETE SET NULL,
  custom_label TEXT,
  custom_category TEXT,

  sla_min_days INT,
  sla_max_days INT,
  price_from_usd INT,
  description TEXT,

  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 100,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT seller_services_target_check CHECK (
    (seller_profile_id IS NOT NULL AND seller_company_id IS NULL) OR
    (seller_profile_id IS NULL AND seller_company_id IS NOT NULL)
  ),

  CONSTRAINT seller_services_label_check CHECK (
    (taxonomy_id IS NOT NULL AND custom_label IS NULL) OR
    (taxonomy_id IS NULL AND custom_label IS NOT NULL AND length(trim(custom_label)) > 0)
  ),

  CONSTRAINT seller_services_sla_range CHECK (
    sla_min_days IS NULL OR sla_max_days IS NULL OR sla_min_days <= sla_max_days
  ),

  CONSTRAINT seller_services_price_nonneg CHECK (
    price_from_usd IS NULL OR price_from_usd >= 0
  )
);
`,
  },
  {
    name: 'index: profile active (partial)',
    sql: `
CREATE INDEX IF NOT EXISTS idx_seller_services_profile_active
  ON public.seller_services (seller_profile_id, sort_order)
  WHERE seller_profile_id IS NOT NULL AND is_active = TRUE;
`,
  },
  {
    name: 'index: company active (partial)',
    sql: `
CREATE INDEX IF NOT EXISTS idx_seller_services_company_active
  ON public.seller_services (seller_company_id, sort_order)
  WHERE seller_company_id IS NOT NULL AND is_active = TRUE;
`,
  },
  {
    name: 'index: taxonomy lookup',
    sql: `
CREATE INDEX IF NOT EXISTS idx_seller_services_taxonomy
  ON public.seller_services (taxonomy_id)
  WHERE taxonomy_id IS NOT NULL;
`,
  },
  {
    name: 'index: trigram on custom_label (free-text dedup)',
    sql: `
CREATE INDEX IF NOT EXISTS idx_seller_services_custom_label_trgm
  ON public.seller_services USING gin (custom_label gin_trgm_ops)
  WHERE custom_label IS NOT NULL;
`,
  },
  {
    name: 'enable RLS',
    sql: `ALTER TABLE public.seller_services ENABLE ROW LEVEL SECURITY;`,
  },
  // ─ public select: any viewer can see active services
  {
    name: 'policy: select active (public)',
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'seller_services'
      AND policyname = 'seller_services_select_active_public'
  ) THEN
    CREATE POLICY "seller_services_select_active_public"
      ON public.seller_services
      FOR SELECT
      USING (is_active = TRUE);
  END IF;
END$$;
`,
  },
  // ─ owner select: owner sees their own inactive services too
  {
    name: 'policy: select own (incl. inactive)',
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'seller_services'
      AND policyname = 'seller_services_select_owner'
  ) THEN
    CREATE POLICY "seller_services_select_owner"
      ON public.seller_services
      FOR SELECT
      USING (
        (seller_profile_id IS NOT NULL AND seller_profile_id = auth.uid()) OR
        (seller_company_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.company_memberships cm
          WHERE cm.company_id = seller_services.seller_company_id
            AND cm.user_id = auth.uid()
            AND cm.is_active = TRUE
            AND cm.role IN ('owner', 'admin')
        ))
      );
  END IF;
END$$;
`,
  },
  {
    name: 'policy: insert by owner',
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'seller_services'
      AND policyname = 'seller_services_insert_owner'
  ) THEN
    CREATE POLICY "seller_services_insert_owner"
      ON public.seller_services
      FOR INSERT
      WITH CHECK (
        (seller_profile_id IS NOT NULL AND seller_profile_id = auth.uid()) OR
        (seller_company_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.company_memberships cm
          WHERE cm.company_id = seller_services.seller_company_id
            AND cm.user_id = auth.uid()
            AND cm.is_active = TRUE
            AND cm.role IN ('owner', 'admin')
        ))
      );
  END IF;
END$$;
`,
  },
  {
    name: 'policy: update by owner',
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'seller_services'
      AND policyname = 'seller_services_update_owner'
  ) THEN
    CREATE POLICY "seller_services_update_owner"
      ON public.seller_services
      FOR UPDATE
      USING (
        (seller_profile_id IS NOT NULL AND seller_profile_id = auth.uid()) OR
        (seller_company_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.company_memberships cm
          WHERE cm.company_id = seller_services.seller_company_id
            AND cm.user_id = auth.uid()
            AND cm.is_active = TRUE
            AND cm.role IN ('owner', 'admin')
        ))
      );
  END IF;
END$$;
`,
  },
  {
    name: 'policy: delete by owner',
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'seller_services'
      AND policyname = 'seller_services_delete_owner'
  ) THEN
    CREATE POLICY "seller_services_delete_owner"
      ON public.seller_services
      FOR DELETE
      USING (
        (seller_profile_id IS NOT NULL AND seller_profile_id = auth.uid()) OR
        (seller_company_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.company_memberships cm
          WHERE cm.company_id = seller_services.seller_company_id
            AND cm.user_id = auth.uid()
            AND cm.is_active = TRUE
            AND cm.role IN ('owner', 'admin')
        ))
      );
  END IF;
END$$;
`,
  },
  // Rescope owner policies to TO authenticated. The pre-existing
  // company_memberships RLS has an EXISTS subquery against itself which
  // causes infinite-recursion (Postgres error 42P17) when evaluated by the
  // anon role. We side-step it by restricting the owner policies — anon
  // sees only `seller_services_select_active_public`. Idempotent.
  {
    name: 'scope owner policies to authenticated',
    sql: `
DO $$
BEGIN
  ALTER POLICY "seller_services_select_owner" ON public.seller_services TO authenticated;
  ALTER POLICY "seller_services_insert_owner" ON public.seller_services TO authenticated;
  ALTER POLICY "seller_services_update_owner" ON public.seller_services TO authenticated;
  ALTER POLICY "seller_services_delete_owner" ON public.seller_services TO authenticated;
EXCEPTION WHEN undefined_object THEN
  -- Policies don't exist yet on a fresh DB; the previous DO blocks created
  -- them with default TO public — they will be re-scoped by this script
  -- on the second pass.
  NULL;
END$$;
`,
  },
  {
    name: 'trigger: updated_at',
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'seller_services_updated_at'
  ) THEN
    CREATE TRIGGER seller_services_updated_at
      BEFORE UPDATE ON public.seller_services
      FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END$$;
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

async function main() {
  console.log('Cycle 70 — create seller_services')
  console.log(`Project: ${SUPABASE_PROJECT_REF}`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'EXECUTE'}`)
  console.log('')

  for (const { name, sql } of STATEMENTS) {
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
    console.log('Verifying schema...')
    const cols = (await runQuery(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'seller_services'
      ORDER BY ordinal_position;
    `)) as Array<{ column_name: string }>
    console.log(`  columns: ${cols.map((c) => c.column_name).join(', ')}`)

    const policies = (await runQuery(`
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'seller_services'
      ORDER BY policyname;
    `)) as Array<{ policyname: string }>
    console.log(`  policies: ${policies.map((p) => p.policyname).join(', ')}`)

    const checks = (await runQuery(`
      SELECT conname FROM pg_constraint
      WHERE conrelid = 'public.seller_services'::regclass
        AND contype = 'c'
      ORDER BY conname;
    `)) as Array<{ conname: string }>
    console.log(`  check constraints: ${checks.map((c) => c.conname).join(', ')}`)
  }

  console.log('')
  console.log(DRY_RUN ? 'Dry run complete.' : 'Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
