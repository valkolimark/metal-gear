'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

export type Archetype = 'operator' | 'trader' | 'service_provider' | 'logistics'

export async function confirmArchetype(
  userId: string,
  archetype: Archetype,
  additionalData?: {
    sub_role?: string
    trading_activities?: string[]
    service_types?: string[]
    service_area?: string
    sourcing_methods?: string[]
    monthly_volume?: string
    logistics_type?: 'fleet' | 'individual'
    fleet_size?: string
    equipment_capabilities?: string[]
    dot_mc_number?: string
    logistics_coverage?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { data: existing } = await supabase
    .from('user_business_profiles')
    .select('archetype_locked')
    .eq('user_id', userId)
    .single()

  if (existing?.archetype_locked) {
    return { success: false, error: 'Archetype is already locked.' }
  }

  const { error } = await supabase
    .from('user_business_profiles')
    .update({
      archetype,
      archetype_locked: true,
      ...(additionalData ?? {}),
    })
    .eq('user_id', userId)

  if (error) return { success: false, error: error.message }

  const cookieStore = await cookies()
  cookieStore.set('mg_archetype', archetype, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  })

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function adminUpdateArchetype(
  adminId: string,
  targetUserId: string,
  newArchetype: Archetype,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  const { data: admin } = await supabase
    .from('profiles')
    .select('admin_role')
    .eq('id', adminId)
    .single()

  if (!admin?.admin_role || !['superadmin', 'moderator'].includes(admin.admin_role)) {
    return { success: false, error: 'Insufficient permissions.' }
  }

  const { error } = await supabase
    .from('user_business_profiles')
    .update({ archetype: newArchetype, archetype_locked: true })
    .eq('user_id', targetUserId)

  if (error) return { success: false, error: error.message }

  await supabase.from('admin_audit_log').insert({
    admin_id: adminId,
    action: 'update_archetype',
    target_type: 'user',
    target_id: targetUserId,
    metadata: { new_archetype: newArchetype, reason },
  })

  return { success: true }
}

export async function getArchetypeStatus(userId: string): Promise<{
  archetype: Archetype | null
  locked: boolean
}> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('user_business_profiles')
    .select('archetype, archetype_locked')
    .eq('user_id', userId)
    .maybeSingle()

  return {
    archetype: (data?.archetype as Archetype) ?? null,
    locked: data?.archetype_locked ?? false,
  }
}
