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

  // Update profile with new avatar URL
  const { error: updateError } = await admin
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)

  if (updateError) {
    return { error: `Profile update failed: ${updateError.message}` }
  }

  return { url: publicUrl }
}
