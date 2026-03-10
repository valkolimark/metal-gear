/**
 * One-time migration: create company_profiles from user_business_profiles
 *
 * Run: npx ts-node --project tsconfig.scripts.json scripts/migrate-companies.ts
 * Flags:
 *   --dry-run      Print what would happen, no writes
 *   --limit=N      Only process first N users (for testing)
 *   --user-id=X    Migrate a single user only
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const args = process.argv.slice(2)
const DRY_RUN    = args.includes('--dry-run')
const LIMIT      = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '99999')
const ONLY_USER  = args.find(a => a.startsWith('--user-id='))?.split('=')[1]

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63) || 'company'
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base
  // Ensure slug is at least 3 chars for constraint
  if (slug.length < 3) slug = slug + '-co'
  const origSlug = slug
  let attempt = 0
  while (true) {
    const { data } = await supabase
      .from('company_profiles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!data) return slug
    attempt++
    slug = `${origSlug}-${attempt}`
  }
}

async function main() {
  console.log(`\nMetal Gear — Company Migration ${DRY_RUN ? '[DRY RUN]' : '[LIVE]'}\n`)

  // Fetch all users
  let query = supabase
    .from('profiles')
    .select('id, full_name, active_company_id')
    .order('created_at', { ascending: true })
    .limit(LIMIT)

  if (ONLY_USER) query = query.eq('id', ONLY_USER)

  const { data: users, error } = await query
  if (error) throw error

  console.log(`Found ${users?.length ?? 0} users to process\n`)

  let created = 0, skipped = 0, failed = 0

  for (const user of users ?? []) {
    // Skip if already has a company (re-run safe)
    const { data: existing } = await supabase
      .from('company_memberships')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (existing) {
      skipped++
      console.log(`  [skip] ${user.full_name ?? user.id} — already has company`)
      continue
    }

    // Fetch business profile separately (no FK relationship with profiles)
    const { data: bp } = await supabase
      .from('user_business_profiles')
      .select('company_name, industries, work_phone')
      .eq('user_id', user.id)
      .maybeSingle()

    const companyName = bp?.company_name
      || (user.full_name ? `${user.full_name}'s Company` : 'My Company')

    // Extract first industry from array
    const industry = bp?.industries?.[0] ?? null

    const slug = await uniqueSlug(slugify(companyName))

    const companyData = {
      id:           randomUUID(),
      name:         companyName,
      slug,
      industry,
      phone:        bp?.work_phone ?? null,
      country:      'US',
      created_by:   user.id,
    }

    console.log(`  -> Creating company "${companyName}" (${slug}) for user ${user.id}`)
    if (!DRY_RUN) {
      const { error: cpError } = await supabase
        .from('company_profiles')
        .insert(companyData)
      if (cpError) { console.error(`     ERROR company_profiles insert:`, cpError.message); failed++; continue }

      // Create owner membership
      const { error: cmError } = await supabase
        .from('company_memberships')
        .insert({ company_id: companyData.id, user_id: user.id, role: 'owner' })
      if (cmError) { console.error(`     ERROR company_memberships insert:`, cmError.message); failed++; continue }

      // Set active_company_id on profile
      await supabase
        .from('profiles')
        .update({ active_company_id: companyData.id })
        .eq('id', user.id)

      // Backfill listings
      const { data: updatedListings } = await supabase
        .from('listings')
        .update({ company_id: companyData.id })
        .eq('seller_id', user.id)
        .is('company_id', null)
        .select('id')
      console.log(`     OK linked ${updatedListings?.length ?? 0} listings`)

      // Backfill subscriptions
      await supabase
        .from('subscriptions')
        .update({ company_id: companyData.id })
        .eq('user_id', user.id)
        .is('company_id', null)

      // Backfill seller_storefronts
      await supabase
        .from('seller_storefronts')
        .update({ company_id: companyData.id })
        .eq('user_id', user.id)
        .is('company_id', null)

      // Backfill sos_requests
      await supabase
        .from('sos_requests')
        .update({ company_id: companyData.id })
        .eq('user_id', user.id)
        .is('company_id', null)

      created++
    } else {
      console.log(`     [dry] would create + link listings/subscriptions/storefronts/sos`)
      created++
    }
  }

  console.log(`\nDone. Created: ${created} | Skipped: ${skipped} | Failed: ${failed}\n`)
}

main().catch(e => { console.error(e); process.exit(1) })
