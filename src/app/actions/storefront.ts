'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function getStorefront(userId: string) {
  const admin = createAdminClient()
  const { data } = await admin
    .from('seller_storefronts')
    .select('*')
    .eq('user_id', userId)
    .single()

  return { storefront: data }
}

export async function getSellerStats(userId: string) {
  const admin = createAdminClient()

  const [listingsRes, reviewsRes, convRes, profile] = await Promise.all([
    admin
      .from('listings')
      .select('id', { count: 'exact' })
      .eq('seller_id', userId)
      .eq('status', 'active'),
    admin
      .from('reviews')
      .select('rating')
      .eq('seller_id', userId),
    admin
      .from('conversations')
      .select('id, created_at, messages(created_at, sender_id)')
      .eq('seller_id', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    admin
      .from('profiles')
      .select('created_at')
      .eq('id', userId)
      .single(),
  ])

  const totalListings = listingsRes.count || 0
  const reviews = reviewsRes.data || []
  const avgRating =
    reviews.length > 0
      ? Number(
          (
            reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
          ).toFixed(1)
        )
      : 0

  // Calculate avg response time from conversations
  let avgResponseMinutes = 0
  let responseCount = 0
  for (const conv of convRes.data || []) {
    const messages = (conv.messages as { created_at: string; sender_id: string }[]) || []
    if (messages.length < 2) continue
    const sorted = [...messages].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    // Find the first response from the seller
    const firstBuyer = sorted[0]
    if (firstBuyer.sender_id === userId) continue
    const sellerReply = sorted.find((m) => m.sender_id === userId)
    if (!sellerReply) continue
    const diff =
      (new Date(sellerReply.created_at).getTime() -
        new Date(firstBuyer.created_at).getTime()) /
      60000
    if (diff > 0 && diff < 10080) {
      avgResponseMinutes += diff
      responseCount++
    }
  }

  let responseTimeLabel = 'N/A'
  if (responseCount > 0) {
    const avg = avgResponseMinutes / responseCount
    if (avg < 60) responseTimeLabel = `${Math.round(avg)}m`
    else if (avg < 1440) responseTimeLabel = `${Math.round(avg / 60)}h`
    else responseTimeLabel = `${Math.round(avg / 1440)}d`
  }

  // Count total sold
  const { count: soldCount } = await admin
    .from('listings')
    .select('id', { count: 'exact' })
    .eq('seller_id', userId)
    .eq('status', 'sold')

  return {
    totalListings,
    totalReviews: reviews.length,
    avgRating,
    avgResponseTime: responseTimeLabel,
    totalSales: soldCount || 0,
    memberSince: profile?.data?.created_at || '',
  }
}

export async function updateStorefront(data: {
  tagline?: string | null
  featured_listing_ids?: string[]
  theme_color?: string
}) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Upsert storefront
  const { data: storefront, error } = await admin
    .from('seller_storefronts')
    .upsert(
      {
        user_id: user.id,
        ...data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (error) return { error: error.message }
  return { storefront }
}

export async function uploadStorefrontBanner(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided' }
  if (file.size > 10 * 1024 * 1024) return { error: 'File must be under 10MB' }

  const ext = file.name.split('.').pop()
  const path = `${user.id}/banner-${Date.now()}.${ext}`

  const admin = createAdminClient()

  const { error: uploadError } = await admin.storage
    .from('avatars')
    .upload(path, file, { contentType: file.type })

  if (uploadError) return { error: `Upload failed: ${uploadError.message}` }

  const {
    data: { publicUrl },
  } = admin.storage.from('avatars').getPublicUrl(path)

  // Upsert storefront with banner
  const { data: storefront, error: updateError } = await admin
    .from('seller_storefronts')
    .upsert(
      {
        user_id: user.id,
        banner_url: publicUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single()

  if (updateError) return { error: updateError.message }
  return { storefront }
}
