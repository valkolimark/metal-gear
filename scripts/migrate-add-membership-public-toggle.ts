#!/usr/bin/env tsx
export {} // module marker so top-level const names don't clash with sibling scripts
/**
 * Migration (Cycle 70): add `company_memberships.is_public_on_profile`
 * (per-member opt-in for the public Team module on /companies/[slug])
 * plus the narrow public-read RLS policy filtered to opted-in members.
 *
 *   SUPABASE_ACCESS_TOKEN=... npx tsx scripts/migrate-add-membership-public-toggle.ts            # execute
 *   SUPABASE_ACCESS_TOKEN=... npx tsx scripts/migrate-add-membership-public-toggle.ts --dry-run  # plan only
 *
 * Idempotent. The column is added with default FALSE for ALL existing rows,
 * including owners. This is intentional — opt-in privacy posture.
 *
 * IMPORTANT — the new public-read policy is permissive (OR'd with existing
 * policies). Combined with the existing `company_memberships_read_*` policies
 * (which require auth.uid() match), the net effect is:
 *   - Anonymous viewers see only rows where is_public_on_profile = TRUE.
 *   - Authenticated members see public rows + their own + their org's rows.
 *
 * Pre-flight prints the existing policy set so the operator can sanity-check.
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
    name: 'add company_memberships.is_public_on_profile (default FALSE)',
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'company_memberships'
      AND column_name = 'is_public_on_profile'
  ) THEN
    ALTER TABLE public.company_memberships
      ADD COLUMN is_public_on_profile BOOLEAN NOT NULL DEFAULT FALSE;
  END IF;
END$$;
`,
  },
  {
    name: 'comment on column',
    sql: `
COMMENT ON COLUMN public.company_memberships.is_public_on_profile IS
  'Per-member opt-in (Cycle 70). When TRUE, the member appears in the public Team module on /companies/[slug]. Defaults FALSE for privacy. Members toggle this themselves; admins can request via notification but cannot grant.';
`,
  },
  {
    name: 'index: partial on opted-in members',
    sql: `
CREATE INDEX IF NOT EXISTS idx_company_memberships_public
  ON public.company_memberships (company_id, is_public_on_profile)
  WHERE is_public_on_profile = TRUE;
`,
  },
  {
    name: 'policy: select opted-in public (additive, OR-merged with existing)',
    sql: `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'company_memberships'
      AND policyname = 'memberships_select_public_optin'
  ) THEN
    CREATE POLICY "memberships_select_public_optin"
      ON public.company_memberships
      FOR SELECT
      USING (is_public_on_profile = TRUE);
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
  console.log('Cycle 70 — add company_memberships.is_public_on_profile')
  console.log(`Project: ${SUPABASE_PROJECT_REF}`)
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no changes)' : 'EXECUTE'}`)
  console.log('')

  // Pre-flight: inspect existing RLS policies on company_memberships
  console.log('Pre-flight — current company_memberships policies:')
  const existing = (await runQuery(`
    SELECT policyname, cmd FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'company_memberships'
    ORDER BY policyname;
  `)) as Array<{ policyname: string; cmd: string }>
  existing.forEach((p) => console.log(`  ${p.cmd.padEnd(8)} ${p.policyname}`))
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
    console.log('Verifying...')
    const col = (await runQuery(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'company_memberships'
        AND column_name = 'is_public_on_profile';
    `)) as Array<{
      column_name: string
      data_type: string
      is_nullable: string
      column_default: string
    }>
    console.log(`  column: ${JSON.stringify(col[0])}`)

    const after = (await runQuery(`
      SELECT policyname, cmd FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'company_memberships'
      ORDER BY policyname;
    `)) as Array<{ policyname: string; cmd: string }>
    console.log('  Updated policy set:')
    after.forEach((p) => console.log(`    ${p.cmd.padEnd(8)} ${p.policyname}`))

    // Sanity: count opted-in rows (should be 0 after fresh migration)
    const optedIn = (await runQuery(`
      SELECT COUNT(*)::int AS n
      FROM public.company_memberships
      WHERE is_public_on_profile = TRUE;
    `)) as Array<{ n: number }>
    console.log(`  Opted-in members (initial): ${optedIn[0]?.n ?? 0}`)
  }

  console.log('')
  console.log(DRY_RUN ? 'Dry run complete.' : 'Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
