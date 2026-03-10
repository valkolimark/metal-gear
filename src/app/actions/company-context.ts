'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/**
 * Switch the active company for a user.
 * Updates: cookie (SSR), profiles.active_company_id (persistent)
 * Zustand is updated client-side by the CompanySwitcher component.
 */
export async function switchActiveCompany(
  userId: string,
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Verify user actually belongs to this company
  const { data: membership } = await supabase
    .from('company_memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single()

  if (!membership) {
    return { success: false, error: 'Not a member of this company' }
  }

  // Update persistent active company on profile
  await supabase
    .from('profiles')
    .update({ active_company_id: companyId })
    .eq('id', userId)

  // Update cookie for SSR
  const cookieStore = await cookies()
  cookieStore.set('active_company_id', companyId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Get active company ID for current request.
 * Cookie-first (fast), falls back to profiles table.
 */
export async function getActiveCompanyId(userId: string): Promise<string | null> {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get('active_company_id')?.value
  if (cookieValue) return cookieValue

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('active_company_id')
    .eq('id', userId)
    .single()

  return data?.active_company_id ?? null
}
