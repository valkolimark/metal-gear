#!/usr/bin/env tsx
export {} // make this a module so top-level const names don't clash with sibling scripts
/**
 * Migration (Cycle 69): create `seller_followers` table for the follow/unfollow
 * feature on `/sellers/[id]` and `/companies/[slug]`.
 *
 *   SUPABASE_ACCESS_TOKEN=... npx tsx scripts/migrate-create-seller-followers.ts            # execute
 *   SUPABASE_ACCESS_TOKEN=... npx tsx scripts/migrate-create-seller-followers.ts --dry-run  # plan only
 *
 * Idempotent — re-running is a no-op (DDL uses IF NOT EXISTS, policy creation
 * checked via DO block).
 *
 * Target exclusivity: a row references EITHER a profile OR a company, never
 * both. Two partial unique indexes prevent duplicate follows per
 * (follower, target).
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
    name: 'create seller_followers table (idempotent)',
    sql: `
CREATE TABLE IF NOT EXISTS public.seller_followers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  seller_company_id UUID REFERENCES public.company_profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT seller_followers_target_check CHECK (
    (seller_profile_id IS NOT NULL AND seller_company_id IS NULL) OR
    (seller_profile_id IS NULL AND seller_company_id IS NOT NULL)
  ),
  CONSTRAINT seller_followers_no_self CHECK (
    follower_id IS DISTINCT FROM seller_profile_id
  )
);
`,
  },
  {
    name: 'partial unique index: one (follower, profile) row',
    sql: `
CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_followers_unique_profile
  ON public.seller_followers (follower_id, seller_profile_id)
  WHERE seller_profile_id IS NOT NULL;
`,
  },
  {
    name: 'partial unique index: one (follower, company) row',
    sql: `
CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_followers_unique_company
  ON public.seller_followers (follower_id, seller_company_id)
  WHERE seller_company_id IS NOT NULL;
`,
  },
  {
    name: 'index: reverse lookup by seller profile',
    sql: `
CREATE INDEX IF NOT EXISTS idx_seller_followers_seller_profile
  ON public.seller_followers (seller_profile_id)
  WHERE seller_profile_id IS NOT NULL;
`,
  },
  {
    name: 'index: reverse lookup by seller company',
    sql: `
CREATE INDEX IF NOT EXISTS idx_seller_followers_seller_company
  ON public.seller_followers (seller_company_id)
  WHERE seller_company_id IS NOT NULL;
`,
  },
  {
    name: 'enable RLS',
    sql: `
ALTER TABLE public.seller_followers ENABLE ROW LEVEL SECURITY;
`,
  },
  {
    name: 'policy: anyone authenticated may read follower rows',
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'seller_followers'
      AND policyname = 'seller_followers_select_public'
  ) THEN
    CREATE POLICY "seller_followers_select_public"
      ON public.seller_followers
      FOR SELECT
      USING (true);
  END IF;
END$$;
`,
  },
  {
    name: 'policy: follower can insert their own follow row',
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'seller_followers'
      AND policyname = 'seller_followers_insert_self'
  ) THEN
    CREATE POLICY "seller_followers_insert_self"
      ON public.seller_followers
      FOR INSERT
      WITH CHECK (auth.uid() = follower_id);
  END IF;
END$$;
`,
  },
  {
    name: 'policy: follower can delete their own follow row',
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'seller_followers'
      AND policyname = 'seller_followers_delete_self'
  ) THEN
    CREATE POLICY "seller_followers_delete_self"
      ON public.seller_followers
      FOR DELETE
      USING (auth.uid() = follower_id);
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
  console.log('Cycle 69 — create seller_followers')
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

  // Post-flight: verify the table exists with the expected columns and policies.
  if (!DRY_RUN) {
    console.log('')
    console.log('Verifying schema...')
    const cols = (await runQuery(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'seller_followers'
      ORDER BY ordinal_position;
    `)) as Array<{ column_name: string; data_type: string; is_nullable: string }>
    console.log(`  columns: ${cols.map((c) => c.column_name).join(', ')}`)

    const policies = (await runQuery(`
      SELECT policyname FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'seller_followers'
      ORDER BY policyname;
    `)) as Array<{ policyname: string }>
    console.log(`  policies: ${policies.map((p) => p.policyname).join(', ')}`)
  }

  console.log('')
  console.log(DRY_RUN ? 'Dry run complete.' : 'Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
