'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type TrustedVendor = {
  id: string
  name: string
  slug: string
  logo_url: string | null
  industry: string | null
  city: string | null
  state: string | null
  favoritedAt: string
}

export async function getTrustedVendors(userId: string): Promise<TrustedVendor[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('company_favorites')
    .select(`
      company_id,
      created_at,
      company_profiles (
        id,
        name,
        slug,
        logo_url,
        industry,
        city,
        state
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error || !data) return []

  return data
    .filter((f) => f.company_profiles)
    .map((f) => {
      const cp = f.company_profiles as unknown as {
        id: string
        name: string
        slug: string
        logo_url: string | null
        industry: string | null
        city: string | null
        state: string | null
      }
      return {
        id: cp.id,
        name: cp.name,
        slug: cp.slug,
        logo_url: cp.logo_url,
        industry: cp.industry,
        city: cp.city,
        state: cp.state,
        favoritedAt: f.created_at,
      }
    })
}

export async function addTrustedVendor(
  userId: string,
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('company_favorites')
    .insert({ user_id: userId, company_id: companyId })

  if (error?.code === '23505') return { success: true } // already favorited, idempotent
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function removeTrustedVendor(
  userId: string,
  companyId: string
): Promise<{ success: boolean }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('company_favorites')
    .delete()
    .eq('user_id', userId)
    .eq('company_id', companyId)

  return { success: !error }
}

export async function isCompanyFavorited(
  userId: string,
  companyId: string
): Promise<boolean> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('company_favorites')
    .select('id')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .maybeSingle()

  return !!data
}
