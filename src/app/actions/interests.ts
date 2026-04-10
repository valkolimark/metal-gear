'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { EQUIPMENT_TAXONOMY } from '@/lib/constants/equipment-taxonomy'

export interface EquipmentInterestsData {
  tier2Groups: string[]
  industries: string[]
  sosReceiveAll: boolean
}

// Build a tier2 → tier1 lookup once per invocation
function getTier1ForTier2(tier2Id: string): string | null {
  for (const bucket of EQUIPMENT_TAXONOMY) {
    for (const group of bucket.groups) {
      if (group.id === tier2Id) return bucket.id
    }
  }
  return null
}

export async function getEquipmentInterests(): Promise<EquipmentInterestsData> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { tier2Groups: [], industries: [], sosReceiveAll: false }

  const admin = createAdminClient()

  const [{ data: interests }, { data: profileRaw }] = await Promise.all([
    admin
      .from('user_equipment_interests')
      .select('tier2')
      .eq('user_id', user.id),
    admin
      .from('user_business_profiles')
      // sos_receive_all column added 2026-04-10; not yet in generated types
      .select('industries, sos_receive_all' as 'industries')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const profile = profileRaw as
    | { industries: string[] | null; sos_receive_all: boolean | null }
    | null

  return {
    tier2Groups: (interests || []).map((r: { tier2: string }) => r.tier2).filter(Boolean),
    industries: profile?.industries ?? [],
    sosReceiveAll: profile?.sos_receive_all ?? false,
  }
}

export async function updateEquipmentInterests(
  data: EquipmentInterestsData
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Not authenticated' }

    const admin = createAdminClient()

    // Replace all equipment interests atomically: delete then insert
    const { error: deleteError } = await admin
      .from('user_equipment_interests')
      .delete()
      .eq('user_id', user.id)

    if (deleteError) {
      return { success: false, error: deleteError.message }
    }

    if (data.tier2Groups.length > 0) {
      // Deduplicate and derive tier1 from taxonomy
      const uniqueTier2 = Array.from(new Set(data.tier2Groups))
      const insertRows = uniqueTier2
        .map((tier2) => {
          const tier1 = getTier1ForTier2(tier2)
          if (!tier1) return null
          return {
            user_id: user.id,
            tier1,
            tier2,
            subcategories: [] as string[],
          }
        })
        .filter((row): row is { user_id: string; tier1: string; tier2: string; subcategories: string[] } => row !== null)

      if (insertRows.length > 0) {
        const { error: insertError } = await admin
          .from('user_equipment_interests')
          .insert(insertRows)

        if (insertError) {
          return { success: false, error: insertError.message }
        }
      }
    }

    // Update industries + sos_receive_all on user_business_profiles. Row is
    // guaranteed to exist for users who completed onboarding; if not, we
    // create a minimal stub row.
    const { error: profileError, count } = await admin
      .from('user_business_profiles')
      .update(
        {
          industries: data.industries,
          sos_receive_all: data.sosReceiveAll,
        } as { industries: string[]; sos_receive_all: boolean },
        { count: 'exact' }
      )
      .eq('user_id', user.id)

    if (profileError) {
      return { success: false, error: profileError.message }
    }

    if ((count ?? 0) === 0) {
      const { error: insertProfileError } = await admin
        .from('user_business_profiles')
        .insert({
          user_id: user.id,
          company_name: '',
          primary_role: '',
          industries: data.industries,
          sos_receive_all: data.sosReceiveAll,
        } as {
          user_id: string
          company_name: string
          primary_role: string
          industries: string[]
          sos_receive_all: boolean
        })
      if (insertProfileError) {
        return { success: false, error: insertProfileError.message }
      }
    }

    revalidatePath('/profile')
    revalidatePath('/feed')
    revalidatePath('/dashboard')

    return { success: true }
  } catch (err) {
    console.error('[updateEquipmentInterests]', err)
    return { success: false, error: 'Failed to update interests. Please try again.' }
  }
}
