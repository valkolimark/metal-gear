'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID!
const STREAM_TOKEN = process.env.CLOUDFLARE_STREAM_TOKEN!
const CUSTOMER_SUBDOMAIN = process.env.CLOUDFLARE_CUSTOMER_SUBDOMAIN!

/**
 * Creates a Cloudflare Stream Direct Creator Upload URL.
 * The client uploads directly to Cloudflare — no Vercel in the path.
 */
export async function createStreamDirectUpload(): Promise<
  { uploadUrl: string; uid: string } | { error: string }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  try {
    const expiry = new Date(Date.now() + 3600 * 1000).toISOString()

    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream/direct_upload`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${STREAM_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds: 600,
          expiry,
        }),
      }
    )

    if (!res.ok) {
      const text = await res.text()
      console.error('Stream direct upload creation failed:', text)
      return { error: 'Failed to create upload URL' }
    }

    const json = await res.json()
    return {
      uploadUrl: json.result.uploadURL,
      uid: json.result.uid,
    }
  } catch (err) {
    console.error('Stream direct upload error:', err)
    return { error: 'Failed to create upload URL' }
  }
}

/**
 * After TUS upload completes, attach the Stream video to a feed post.
 */
export async function attachStreamVideoToFeedPost(
  postId: string,
  streamUid: string,
  clientThumbnailUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const admin = createAdminClient()

  const embedUrl = `https://iframe.videodelivery.net/${streamUid}`
  const thumbnailUrl = clientThumbnailUrl || `https://${CUSTOMER_SUBDOMAIN}/${streamUid}/thumbnails/thumbnail.jpg`

  const { error } = await admin
    .from('feed_post_media')
    .insert({
      post_id: postId,
      media_url: embedUrl,
      media_type: 'video',
      stream_video_id: streamUid,
      thumbnail_url: thumbnailUrl,
      sort_order: 0,
      status: 'processing',
    })

  if (error) {
    console.error('attachStreamVideoToFeedPost error:', error.message)
    return { success: false, error: 'Failed to attach video' }
  }

  return { success: true }
}

/**
 * After TUS upload completes, attach the Stream video to a listing.
 */
export async function attachStreamVideoToListing(
  listingId: string,
  streamUid: string,
  clientThumbnailUrl?: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const admin = createAdminClient()

  const embedUrl = `https://iframe.videodelivery.net/${streamUid}`
  const hlsUrl = `https://${CUSTOMER_SUBDOMAIN}/${streamUid}/manifest/video.m3u8`
  const thumbnailUrl = clientThumbnailUrl || `https://${CUSTOMER_SUBDOMAIN}/${streamUid}/thumbnails/thumbnail.jpg`

  const { error } = await admin
    .from('listing_videos')
    .insert({
      listing_id: listingId,
      url: embedUrl,
      storage_path: '',
      stream_video_id: streamUid,
      embed_url: embedUrl,
      hls_url: hlsUrl,
      thumbnail_url: thumbnailUrl,
      status: 'processing',
      position: 0,
    })

  if (error) {
    console.error('attachStreamVideoToListing error:', error.message)
    return { success: false, error: 'Failed to attach video' }
  }

  return { success: true }
}

/**
 * Upload a client-side generated thumbnail to R2 for immediate display.
 */
export async function uploadVideoPoster(
  formData: FormData
): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const file = formData.get('file') as File | null
  const postId = formData.get('postId') as string | null

  if (!file || !postId) return { error: 'Missing file or postId' }

  const { uploadListingImage } = await import('@/lib/media')
  const buffer = Buffer.from(await file.arrayBuffer())
  try {
    const url = await uploadListingImage(buffer, `posters/${postId}`, file.type)
    return { url }
  } catch {
    return { error: 'Failed to upload thumbnail' }
  }
}
