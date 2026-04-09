'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { ONBOARDING_STEPS } from '@/lib/constants/onboarding'
import type { EnhancedOnboardingData } from '@/lib/constants/onboarding'

export async function getOnboardingProgress() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: progress } = await admin
    .from('onboarding_progress')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!progress) {
    // Auto-create onboarding record
    const { data: newProgress } = await admin
      .from('onboarding_progress')
      .insert({ user_id: user.id })
      .select()
      .single()

    // Auto-detect completed steps
    const { data: profile } = await admin
      .from('profiles')
      .select('full_name, location_city, location_state')
      .eq('id', user.id)
      .single()

    const autoSteps: string[] = []
    if (profile?.full_name) autoSteps.push('profile')
    if (profile?.location_city && profile?.location_state) autoSteps.push('location')

    if (autoSteps.length > 0 && newProgress) {
      await admin
        .from('onboarding_progress')
        .update({ steps_completed: autoSteps })
        .eq('user_id', user.id)

      return { progress: { ...newProgress, steps_completed: autoSteps } }
    }

    return { progress: newProgress }
  }

  return { progress }
}

export async function completeOnboardingStep(stepId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: progress } = await admin
    .from('onboarding_progress')
    .select('steps_completed')
    .eq('user_id', user.id)
    .single()

  if (!progress) return { error: 'Not found' }

  const steps = progress.steps_completed || []
  if (steps.includes(stepId)) return { success: true }

  const newSteps = [...steps, stepId]
  const allComplete = ONBOARDING_STEPS.every((s) => newSteps.includes(s.id))

  await admin
    .from('onboarding_progress')
    .update({
      steps_completed: newSteps,
      ...(allComplete ? { completed_at: new Date().toISOString() } : {}),
    })
    .eq('user_id', user.id)

  return { success: true }
}

export async function dismissOnboarding() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  await admin
    .from('onboarding_progress')
    .update({ dismissed: true })
    .eq('user_id', user.id)

  return { success: true }
}

export async function updateLastLogin() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return

  const admin = createAdminClient()

  await admin
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', user.id)
}

// ─── Enhanced Multi-Step Onboarding (Cycle 6) ───────────────────────

export async function getEnhancedOnboardingProgress() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  try {
    const { data: profile, error: profileError } = await admin
      .from('user_business_profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (profileError) {
      console.error('getEnhancedOnboardingProgress: user_business_profiles query failed:', profileError.message)
      // Table may not exist — treat as fresh user
    }

    if (!profile) {
      // Also fetch auth user info for prefilling
      const { data: authProfile } = await admin
        .from('profiles')
        .select('full_name, company_name, phone, location_city, location_state')
        .eq('id', user.id)
        .maybeSingle()

      return {
        step: 1,
        data: null,
        completed: false,
        prefill: {
          full_name: authProfile?.full_name || '',
          company_name: authProfile?.company_name || '',
          work_email: user.email || '',
          work_phone: authProfile?.phone || '',
          location_city: authProfile?.location_city || '',
          location_state: authProfile?.location_state || '',
        },
      }
    }

    // Get equipment interests
    const { data: interests } = await admin
      .from('user_equipment_interests')
      .select('*')
      .eq('user_id', user.id)

    return {
      step: profile.onboarding_step || 1,
      completed: profile.onboarding_completed || false,
      data: {
        ...profile,
        equipment_interests: (interests || []).map((i: { tier1: string; tier2: string; subcategories: string[] | null; brands: string[] | null }) => ({
          tier1: i.tier1,
          tier2: i.tier2,
          subcategories: i.subcategories || [],
          brands: i.brands || [],
        })),
      },
    }
  } catch (err) {
    console.error('getEnhancedOnboardingProgress: unexpected error:', err)
    return { error: 'Failed to load onboarding data' }
  }
}

export async function saveEnhancedOnboardingStep(step: number, data: Partial<EnhancedOnboardingData>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Check if profile exists
  const { data: existing } = await admin
    .from('user_business_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  const profileFields: Record<string, unknown> = {
    onboarding_step: step + 1,
    updated_at: new Date().toISOString(),
  }

  // Step 1: Identity
  if (data.company_name) profileFields.company_name = data.company_name
  if (data.job_title !== undefined) profileFields.job_title = data.job_title
  if (data.work_phone !== undefined) profileFields.work_phone = data.work_phone
  if (data.show_phone_to) profileFields.show_phone_to = data.show_phone_to
  if (data.primary_role) profileFields.primary_role = data.primary_role
  if (data.secondary_roles) profileFields.secondary_roles = data.secondary_roles

  // Step 3: Industry & Pain Points
  if (data.industries) profileFields.industries = data.industries
  if (data.pain_points) profileFields.pain_points = data.pain_points
  if (data.pain_points_other !== undefined) profileFields.pain_points_other = data.pain_points_other

  // Step 4: Trading Intent
  if (data.trading_intents) profileFields.trading_intents = data.trading_intents

  // Step 5: Transparency & SOS
  if (data.show_company !== undefined) profileFields.show_company = data.show_company
  if (data.show_name !== undefined) profileFields.show_name = data.show_name
  if (data.show_email_to) profileFields.show_email_to = data.show_email_to
  if (data.sos_responder !== undefined) profileFields.sos_responder = data.sos_responder
  if (data.sos_categories) profileFields.sos_categories = data.sos_categories
  if (data.sos_urgency_level) profileFields.sos_urgency_level = data.sos_urgency_level
  if (data.sos_notify_methods) profileFields.sos_notify_methods = data.sos_notify_methods
  if (data.sos_allow_realtime_contact !== undefined) profileFields.sos_allow_realtime_contact = data.sos_allow_realtime_contact

  // Step 6: Quality Agreement
  if (data.quality_agreement_accepted !== undefined) {
    profileFields.quality_agreement_accepted = data.quality_agreement_accepted
    if (data.quality_agreement_accepted) {
      profileFields.quality_agreement_accepted_at = new Date().toISOString()
    }
  }

  if (existing) {
    const { error } = await admin
      .from('user_business_profiles')
      .update(profileFields)
      .eq('user_id', user.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await admin
      .from('user_business_profiles')
      .insert({
        user_id: user.id,
        company_name: data.company_name || '',
        primary_role: data.primary_role || 'end_user',
        ...profileFields,
      })
    if (error) return { error: error.message }
  }

  // Also update main profiles table with name/company if provided
  if (data.full_name || data.company_name) {
    const profileUpdate: Record<string, string> = { updated_at: new Date().toISOString() }
    if (data.full_name) profileUpdate.full_name = data.full_name
    if (data.company_name) profileUpdate.company_name = data.company_name
    await admin.from('profiles').update(profileUpdate).eq('id', user.id)
  }

  return { success: true, nextStep: step + 1 }
}

export async function saveEquipmentInterests(
  interests: { tier1: string; tier2: string; subcategories: string[]; brands: string[] }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Delete existing and re-insert
  await admin.from('user_equipment_interests').delete().eq('user_id', user.id)

  if (interests.length > 0) {
    const rows = interests.map((i) => ({
      user_id: user.id,
      tier1: i.tier1,
      tier2: i.tier2,
      subcategories: i.subcategories,
      brands: i.brands,
    }))
    const { error } = await admin.from('user_equipment_interests').insert(rows)
    if (error) return { error: error.message }
  }

  return { success: true }
}

export async function completeEnhancedOnboarding() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { error } = await admin
    .from('user_business_profiles')
    .update({
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      onboarding_step: 7,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)

  if (error) return { error: error.message }

  // Also mark old onboarding as complete
  await admin
    .from('onboarding_progress')
    .upsert({
      user_id: user.id,
      steps_completed: ['profile', 'location', 'browse', 'action'],
      completed_at: new Date().toISOString(),
    })

  return { success: true }
}

export async function checkEnhancedOnboardingStatus() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { completed: true }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_business_profiles')
    .select('onboarding_completed')
    .eq('user_id', user.id)
    .maybeSingle()

  return { completed: profile?.onboarding_completed ?? false }
}

// ─── Cycle 23: Role-Aware Onboarding ────────────────────────────────

import type { OnboardingFormData } from '@/lib/constants/onboarding'
import { getTier1ForTier2 } from '@/lib/constants/equipment-taxonomy'

export async function getOnboardingPrefill() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, display_name, company_name, phone, location_city, location_state, contact_visibility')
    .eq('id', user.id)
    .maybeSingle()

  return {
    prefill: {
      display_name: profile?.display_name || profile?.full_name || user.user_metadata?.full_name || '',
      company_name: profile?.company_name || '',
      phone: profile?.phone || '',
      city: profile?.location_city || '',
      state: profile?.location_state || '',
      contact_visibility: profile?.contact_visibility || 'pro_plus',
    },
  }
}

export async function submitOnboarding(data: OnboardingFormData) {
  try {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!data.archetype) return { error: 'Archetype is required' }
  if (data.industries.length === 0) return { error: 'At least one industry is required' }
  if (!data.company_name.trim()) return { error: 'Company name is required' }
  if (!data.city.trim() || !data.state.trim()) return { error: 'City and state are required' }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // Map archetype to legacy primary_role for backward compatibility
  const primaryRoleMap: Record<string, string> = {
    operator: 'end_user',
    trader: 'dealer',
    service_provider: 'services',
    logistics: 'logistics',
  }

  // Combine industries — add custom "Other" value if specified
  const industries = [...data.industries]
  if (data.industries_other.trim() && !industries.includes(data.industries_other.trim())) {
    industries.push(data.industries_other.trim())
  }

  // Build user_business_profiles row
  const bizProfile = {
    user_id: user.id,
    company_name: data.company_name.trim(),
    archetype: data.archetype,
    primary_role: primaryRoleMap[data.archetype] || 'end_user',
    industries,
    sos_opted_in: data.sos_opted_in,
    sos_responder: data.sos_opted_in,
    onboarding_completed: true,
    onboarding_completed_at: now,
    onboarding_step: 6,
    updated_at: now,
    // Archetype-specific fields
    sub_role: data.archetype === 'operator' && data.sub_role ? data.sub_role : null,
    sourcing_methods: data.archetype === 'operator' && data.sourcing_methods.length > 0 ? data.sourcing_methods : null,
    trading_activities: data.archetype === 'trader' && data.trading_activities.length > 0 ? data.trading_activities : null,
    monthly_volume: data.archetype === 'trader' && data.monthly_volume ? data.monthly_volume : null,
    service_types: data.archetype === 'service_provider' && data.service_types.length > 0 ? data.service_types : null,
    service_area: data.archetype === 'service_provider' || data.archetype === 'logistics' ? (data.service_area || null) : null,
    // Logistics-specific
    logistics_type: data.archetype === 'logistics' && data.logistics_type ? data.logistics_type : null,
    fleet_size: data.archetype === 'logistics' && data.fleet_size ? data.fleet_size : null,
    equipment_capabilities: data.archetype === 'logistics' && data.equipment_capabilities?.length > 0 ? data.equipment_capabilities : null,
    dot_mc_number: data.archetype === 'logistics' && data.dot_mc_number ? data.dot_mc_number : null,
    logistics_coverage: data.archetype === 'logistics' && data.logistics_coverage ? data.logistics_coverage : null,
    archetype_locked: true,
  }

  // Upsert user_business_profiles
  const { data: existing } = await admin
    .from('user_business_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    const { error } = await admin
      .from('user_business_profiles')
      .update(bizProfile)
      .eq('user_id', user.id)
    if (error) return { error: error.message }
  } else {
    const { error } = await admin
      .from('user_business_profiles')
      .insert(bizProfile)
    if (error) return { error: error.message }
  }

  // Save equipment interests (tier2 selections → user_equipment_interests)
  if (data.equipment_tier2s.length > 0) {
    try {
      await admin.from('user_equipment_interests').delete().eq('user_id', user.id)
      const rows = data.equipment_tier2s.map((tier2) => ({
        user_id: user.id,
        tier1: getTier1ForTier2(tier2),
        tier2,
        subcategories: [] as string[],
        brands: [] as string[],
      }))
      const { error: eqError } = await admin.from('user_equipment_interests').insert(rows)
      if (eqError) console.error('Equipment interests insert error:', eqError.message)
    } catch (err) {
      console.error('Equipment interests save error:', err)
    }
  }

  // Update profiles table (non-blocking — main save already succeeded)
  try {
    const profileUpdate: Record<string, string> = {
      updated_at: now,
      company_name: data.company_name.trim(),
      contact_visibility: data.contact_visibility,
    }
    if (data.display_name.trim()) {
      profileUpdate.full_name = data.display_name.trim()
      profileUpdate.display_name = data.display_name.trim()
    }
    if (data.city.trim()) profileUpdate.location_city = data.city.trim()
    if (data.state.trim()) profileUpdate.location_state = data.state.trim()
    if (data.phone.trim()) profileUpdate.phone = data.phone.trim()

    const { error: profileError } = await admin.from('profiles').update(profileUpdate).eq('id', user.id)
    if (profileError) console.error('Profile update error:', profileError.message)
  } catch (err) {
    console.error('Profile update error:', err)
  }

  // Mark legacy onboarding as complete (non-blocking)
  try {
    await admin
      .from('onboarding_progress')
      .upsert({
        user_id: user.id,
        steps_completed: ['profile', 'location', 'browse', 'action'],
        completed_at: now,
      })
  } catch (err) {
    console.error('Legacy onboarding progress error:', err)
  }

  // Set mg_archetype cookie
  try {
    const cookieStore = await cookies()
    cookieStore.set('mg_archetype', data.archetype, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
    })
  } catch {
    // Cookie setting is non-critical
  }

  return { success: true }
  } catch (err) {
    console.error('submitOnboarding unexpected error:', err)
    return { error: 'Failed to save. Please try again.' }
  }
}
