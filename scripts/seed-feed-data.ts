// Seed realistic feed activity for test users
// Run with: npx tsx scripts/seed-feed-data.ts

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const EQUIPMENT_TIERS2 = [
  'heavy_equipment_construction',
  'mining_oil_gas',
  'pumps_fluid_handling',
  'compressors_vacuum',
  'heat_exchangers_boilers',
  'tanks_vessels',
  'material_handling',
  'cnc_machining',
  'metalworking_fabrication',
  'welding_cutting',
  'processing_separation',
  'energy_power',
]

const TIER1_MAP: Record<string, string> = {
  heavy_equipment_construction: 'machines_equipment',
  mining_oil_gas: 'machines_equipment',
  pumps_fluid_handling: 'machines_equipment',
  compressors_vacuum: 'machines_equipment',
  heat_exchangers_boilers: 'machines_equipment',
  tanks_vessels: 'machines_equipment',
  material_handling: 'machines_equipment',
  cnc_machining: 'machines_equipment',
  metalworking_fabrication: 'machines_equipment',
  welding_cutting: 'machines_equipment',
  processing_separation: 'machines_equipment',
  energy_power: 'machines_equipment',
}

const INDUSTRIES = [
  'Oil & Gas',
  'Petrochemical',
  'Mining',
  'Manufacturing',
  'CNC Machining',
  'Power Generation',
  'Chemical Processing',
]

const ARCHETYPES = ['operator', 'trader', 'service_provider'] as const

async function seedFeedData() {
  console.log('Fetching all users...')

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, full_name')

  if (error || !profiles?.length) {
    console.error('No profiles found or error:', error)
    return
  }

  console.log(`Found ${profiles.length} users. Seeding feed data...`)

  for (const profile of profiles) {
    console.log(`  Seeding ${profile.full_name ?? profile.id}...`)

    // 1. Check if user already has equipment interests — skip if so
    const { data: existingInterests } = await supabase
      .from('user_equipment_interests')
      .select('id')
      .eq('user_id', profile.id)
      .limit(1)

    if (!existingInterests?.length) {
      // Assign 3-5 random equipment interests
      const count = 3 + Math.floor(Math.random() * 3)
      const shuffled = [...EQUIPMENT_TIERS2].sort(() => Math.random() - 0.5)
      const selected = shuffled.slice(0, count)

      for (const tier2 of selected) {
        const { error: insertErr } = await supabase
          .from('user_equipment_interests')
          .insert({
            user_id: profile.id,
            tier2,
            tier1: TIER1_MAP[tier2] ?? 'machines_equipment',
          })
        if (insertErr && !insertErr.message.includes('duplicate')) {
          console.warn(`    Warning inserting interest: ${insertErr.message}`)
        }
      }
    }

    // 2. Check if user has a business profile — seed if not
    const { data: existingBizProfile } = await supabase
      .from('user_business_profiles')
      .select('id')
      .eq('user_id', profile.id)
      .maybeSingle()

    if (!existingBizProfile) {
      const archetype = ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)]
      const industry = INDUSTRIES[Math.floor(Math.random() * INDUSTRIES.length)]

      const { error: bizErr } = await supabase.from('user_business_profiles').insert({
        user_id: profile.id,
        archetype,
        industries: [industry],
        sos_opted_in: true,
        onboarding_completed: true,
      })
      if (bizErr && !bizErr.message.includes('duplicate')) {
        console.warn(`    Warning inserting biz profile: ${bizErr.message}`)
      }
    }

    // 3. Seed listing views (only if active listings exist)
    const { data: listings } = await supabase
      .from('listings')
      .select('id')
      .eq('status', 'active')
      .limit(50)

    if (listings?.length) {
      const shuffledListings = [...listings].sort(() => Math.random() - 0.5)
      const toView = shuffledListings.slice(0, 5)

      for (const listing of toView) {
        const { error: viewErr } = await supabase.from('listing_views').insert({
          listing_id: listing.id,
          viewer_id: profile.id,
          viewed_at: new Date(
            Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)
          ).toISOString(),
        })
        if (viewErr && !viewErr.message.includes('duplicate')) {
          // Ignore duplicate key errors silently
        }
      }
    }

    // 4. Seed 1 saved search if none exist
    const { data: existingSaved } = await supabase
      .from('saved_searches')
      .select('id')
      .eq('user_id', profile.id)
      .limit(1)

    if (!existingSaved?.length) {
      const tier2 = EQUIPMENT_TIERS2[Math.floor(Math.random() * EQUIPMENT_TIERS2.length)]
      await supabase.from('saved_searches').insert({
        user_id: profile.id,
        name: `${tier2.replace(/_/g, ' ')} alerts`,
        filters: { tier2 },
        is_ai_search: false,
      })
    }

    console.log(`  ✓ ${profile.full_name ?? profile.id} seeded`)
  }

  console.log('\n✅ Feed seeding complete!')
}

seedFeedData().catch(console.error)
