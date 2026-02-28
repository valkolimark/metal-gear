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

  const ext = file.name.split('.').pop()
  const path = `${user.id}/avatar-${Date.now()}.${ext}`

  // Use admin client to bypass RLS for storage operations
  const admin = createAdminClient()

  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(path, file, { contentType: file.type })

  if (uploadError) {
    return { error: `Upload failed: ${uploadError.message}` }
  }

  const {
    data: { publicUrl },
  } = admin.storage.from('avatars').getPublicUrl(path)

  // Update profile with new avatar URL and return full profile
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
