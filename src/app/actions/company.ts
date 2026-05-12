'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import type { CompanyProfile, CompanyWithRole, CompanyWithMembers, CompanyRole } from '@/types/company'

// ─── Read ─────────────────────────────────────────────────────────

/** Get all companies the current user belongs to, with their role */
export async function getUserCompanies(userId: string): Promise<CompanyWithRole[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('company_memberships')
    .select(`
      id,
      role,
      company_profiles (*)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('joined_at', { ascending: true })

  if (error || !data) return []

  return data
    .filter((m: Record<string, unknown>) => m.company_profiles)
    .map((m: Record<string, unknown>) => ({
      ...(m.company_profiles as CompanyProfile),
      role: m.role as CompanyRole,
      membership_id: m.id as string,
    }))
}

/** Get a company by slug (public) */
export async function getCompanyBySlug(slug: string): Promise<CompanyProfile | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('slug', slug)
    .single()
  return data ?? null
}

/** Get a company by id */
export async function getCompanyById(id: string): Promise<CompanyProfile | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('id', id)
    .single()
  return data ?? null
}

/** Get company with members list (for settings page) */
export async function getCompanyWithMembers(companyId: string): Promise<CompanyWithMembers | null> {
  const supabase = createAdminClient()
  const { data: company } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('id', companyId)
    .single()
  if (!company) return null

  const { data: memberships } = await supabase
    .from('company_memberships')
    .select(`
      id,
      user_id,
      role,
      joined_at,
      is_public_on_profile,
      profiles ( full_name, avatar_url, email )
    `)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('joined_at', { ascending: true })

  return {
    ...company,
    members: (memberships ?? []).map((m: Record<string, unknown>) => ({
      membership_id: m.id as string,
      user_id: m.user_id as string,
      role: m.role as CompanyRole,
      joined_at: m.joined_at as string,
      full_name: (m.profiles as Record<string, unknown> | null)?.full_name as string | null ?? null,
      avatar_url: (m.profiles as Record<string, unknown> | null)?.avatar_url as string | null ?? null,
      email: (m.profiles as Record<string, unknown> | null)?.email as string | null ?? null,
      is_public_on_profile: Boolean(m.is_public_on_profile),
    })),
  }
}

// ─── Create ───────────────────────────────────────────────────────

export interface CreateCompanyInput {
  name: string
  industries?: string[]
  company_size?: string
  website?: string
  phone?: string
  city?: string
  state?: string
  tagline?: string
  description?: string
}

export async function createCompany(
  userId: string,
  input: CreateCompanyInput
): Promise<{ success: boolean; company?: CompanyProfile; error?: string }> {
  const supabase = createAdminClient()

  // Generate unique slug
  const base = input.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'company'

  let slug = base
  let attempt = 0
  while (true) {
    const { data: existing } = await supabase
      .from('company_profiles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!existing) break
    slug = `${base}-${++attempt}`
  }

  // Mirror industries[0] to legacy industry column for one cycle (drop in Cycle 66)
  const industries = (input.industries ?? []).filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
  const insertPayload = {
    ...input,
    industries,
    industry: industries[0] ?? null,
    slug,
    created_by: userId,
  }

  const { data: company, error } = await supabase
    .from('company_profiles')
    .insert(insertPayload)
    .select()
    .single()

  if (error || !company) {
    return { success: false, error: error?.message ?? 'Failed to create company' }
  }

  // Create owner membership
  await supabase.from('company_memberships').insert({
    company_id: company.id,
    user_id: userId,
    role: 'owner',
  })

  // Set as active company on profile
  await supabase
    .from('profiles')
    .update({ active_company_id: company.id })
    .eq('id', userId)

  // Set active_company_id cookie
  const cookieStore = await cookies()
  cookieStore.set('active_company_id', company.id, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  revalidatePath('/', 'layout')
  return { success: true, company }
}

// ─── Update ───────────────────────────────────────────────────────

export type UpdateCompanyInput = Partial<Omit<
  CompanyProfile,
  'id' | 'slug' | 'created_by' | 'created_at' | 'updated_at' | 'is_verified' | 'verified_at' | 'is_suspended'
>>

export async function updateCompany(
  companyId: string,
  userId: string,
  input: UpdateCompanyInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Verify user is owner or admin
  const { data: membership } = await supabase
    .from('company_memberships')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  // Mirror industries[0] to legacy industry column for one cycle (drop in Cycle 66)
  const updatePayload: Record<string, unknown> = { ...input }
  if (Array.isArray(input.industries)) {
    const industries = input.industries.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    updatePayload.industries = industries
    updatePayload.industry = industries[0] ?? null
  }

  const { error } = await supabase
    .from('company_profiles')
    .update(updatePayload)
    .eq('id', companyId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings/company')
  return { success: true }
}

// ─── Remove Member ───────────────────────────────────────────────

export async function removeMember(
  companyId: string,
  targetUserId: string,
  requestingUserId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Verify requester is owner or admin
  const { data: requesterMembership } = await supabase
    .from('company_memberships')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', requestingUserId)
    .eq('is_active', true)
    .single()

  if (!requesterMembership || !['owner', 'admin'].includes(requesterMembership.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  // Check target membership
  const { data: targetMembership } = await supabase
    .from('company_memberships')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', targetUserId)
    .eq('is_active', true)
    .single()

  if (!targetMembership) {
    return { success: false, error: 'Member not found' }
  }

  // Prevent owner from being removed
  if (targetMembership.role === 'owner') {
    return { success: false, error: 'Cannot remove the company owner. Transfer ownership first.' }
  }

  // Deactivate membership
  const { error } = await supabase
    .from('company_memberships')
    .update({ is_active: false })
    .eq('company_id', companyId)
    .eq('user_id', targetUserId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings/company/members')
  return { success: true }
}
