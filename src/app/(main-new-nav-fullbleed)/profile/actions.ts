'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const file = formData.get('file') as File
  if (!file) {
    return { error: 'No file provided' }
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: 'File must be under 10MB' }
  }

  const { uploadAvatar } = await import('@/lib/media')
  const buffer = Buffer.from(await file.arrayBuffer())

  let publicUrl: string
  try {
    publicUrl = await uploadAvatar(buffer, user.id, file.type)
  } catch (err) {
    return { error: `Upload failed: ${err instanceof Error ? err.message : 'R2 error'}` }
  }

  // Update profile with new avatar URL and return full profile
  const admin = createAdminClient()
  const { data: updatedProfile, error: updateError } = await admin
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)
    .select()
    .single()

  if (updateError) {
    return { error: `Profile update failed: ${updateError.message}` }
  }

  return { url: publicUrl, profile: updatedProfile }
}

export async function updateNotificationPreferences(preferences: {
  messages: boolean
  inquiries: boolean
  subscription: boolean
  marketing: boolean
}) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const admin = createAdminClient()

  // Get existing prefs to preserve welcome_sent flag
  const { data: profile } = await admin
    .from('profiles')
    .select('email_notifications')
    .eq('id', user.id)
    .single()

  const existing = (profile?.email_notifications as Record<string, unknown>) || {}

  const { data, error } = await admin
    .from('profiles')
    .update({
      email_notifications: {
        ...existing,
        ...preferences,
      },
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    return { error: `Save failed: ${error.message}` }
  }

  return { profile: data }
}

export async function updateContactSettings(data: {
  contact_email: string | null
  contact_visibility: 'public' | 'pro_plus' | 'hidden'
}) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const admin = createAdminClient()

  const { data: profile, error } = await admin
    .from('profiles')
    .update({
      contact_email: data.contact_email,
      contact_visibility: data.contact_visibility,
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    return { error: `Save failed: ${error.message}` }
  }

  return { profile }
}

export async function updateProfile(formData: {
  full_name: string
  display_name: string | null
  company_name: string | null
  bio: string | null
  phone: string | null
  industry: string | null
  location_city: string
  location_state: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('profiles')
    .update(formData)
    .eq('id', user.id)
    .select()
    .single()

  if (error) {
    return { error: `Save failed: ${error.message}` }
  }

  return { profile: data }
}
