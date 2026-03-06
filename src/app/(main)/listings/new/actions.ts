'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { uploadListingImage, uploadListingVideo } from '@/lib/media'

export async function uploadListingImageAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided' }

  const buffer = Buffer.from(await file.arrayBuffer())
  const listingId = (formData.get('listingId') as string) || 'draft'

  try {
    const url = await uploadListingImage(buffer, listingId, file.type)
    return { url }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('R2 listing image upload failed:', msg)
    return { error: `R2 upload error: ${msg}` }
  }
}

export async function uploadListingVideoAction(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided' }

  const buffer = Buffer.from(await file.arrayBuffer())
  const listingId = (formData.get('listingId') as string) || 'draft'

  try {
    const result = await uploadListingVideo(buffer, listingId, file.name)
    return { video: result }
  } catch (err) {
    console.error('Stream video upload failed:', err)
    return { error: 'Failed to upload video — listing will be saved without video' }
  }
}

export async function deleteListingImageAction(url: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const { deleteMedia } = await import('@/lib/media')
  try {
    await deleteMedia(url)
    return { success: true }
  } catch (err) {
    console.error('Delete media failed:', err)
    return { error: 'Failed to delete media' }
  }
}
