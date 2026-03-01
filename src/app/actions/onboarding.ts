'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const ONBOARDING_STEPS = [
  { id: 'profile', label: 'Complete your profile', description: 'Add your name, company, and location' },
  { id: 'location', label: 'Set your location', description: 'Help buyers and sellers find you' },
  { id: 'browse', label: 'Browse equipment', description: 'Explore categories and search for equipment' },
  { id: 'action', label: 'Create a listing or save a search', description: 'Start buying or selling' },
]

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
