'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getSavedSearches() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { searches: [] }

  const admin = createAdminClient()
  const { data } = await admin
    .from('saved_searches')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return { searches: data || [] }
}

export async function saveSearch(name: string, filters: Record<string, string>, frequency: string = 'daily') {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('saved_searches')
    .insert({
      user_id: user.id,
      name,
      filters,
      frequency,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { search: data }
}

export async function updateSearchFrequency(searchId: string, frequency: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('saved_searches')
    .update({ frequency })
    .eq('id', searchId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteSavedSearch(searchId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  await admin
    .from('saved_searches')
    .delete()
    .eq('id', searchId)
    .eq('user_id', user.id)

  return { success: true }
}

export async function toggleSearchAlert(searchId: string, notifyEmail: boolean) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('saved_searches')
    .update({ notify_email: notifyEmail })
    .eq('id', searchId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}
