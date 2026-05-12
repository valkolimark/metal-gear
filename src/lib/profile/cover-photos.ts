import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

interface GetCoverPhotosOptions {
  /** Profile id (seller-as-person). Either this or `companyId` must be set. */
  profileId?: string | null
  /** Company id. Either this or `profileId` must be set. */
  companyId?: string | null
  /** Number of small tiles to fill (the large left tile is the banner). */
  limit?: number
}

/**
 * Returns up to `limit` photo URLs to fill the small tiles in a cover grid.
 * Strategy: most-recently-updated listings, position-0 photos first,
 * deduplicate across listings to spread visual variety. When a single listing
 * is the only one with photos, we backfill with its remaining photos so
 * tiles are never empty when *any* media exists.
 */
export async function getCoverPhotosForSeller({
  profileId,
  companyId,
  limit = 3,
}: GetCoverPhotosOptions): Promise<string[]> {
  if (!profileId && !companyId) return []
  const admin = createAdminClient()

  const builder = admin
    .from('listings')
    .select('id')
    .eq('status', 'active')
    .eq('has_media', true)
    .order('updated_at', { ascending: false })
    .limit(8)

  const { data: listings, error } = companyId
    ? await builder.eq('company_id', companyId)
    : await builder.eq('seller_id', profileId as string)

  if (error || !listings || listings.length === 0) return []

  const listingIds = listings.map((l) => l.id)
  const { data: images, error: imgErr } = await admin
    .from('listing_images')
    .select('url, listing_id, position')
    .in('listing_id', listingIds)
    .order('position', { ascending: true })

  if (imgErr || !images || images.length === 0) return []

  // First pass: one photo per distinct listing, in listing-recency order.
  const byListing = new Map<string, typeof images>()
  for (const img of images) {
    if (!byListing.has(img.listing_id)) byListing.set(img.listing_id, [])
    byListing.get(img.listing_id)!.push(img)
  }

  const urls: string[] = []
  const seenUrls = new Set<string>()
  for (const lid of listingIds) {
    if (urls.length >= limit) break
    const photos = byListing.get(lid)
    if (!photos?.length) continue
    const candidate = photos[0]
    if (candidate.url && !seenUrls.has(candidate.url)) {
      urls.push(candidate.url)
      seenUrls.add(candidate.url)
    }
  }

  // Second pass: if still short, fill from remaining photos across all listings.
  if (urls.length < limit) {
    for (const img of images) {
      if (urls.length >= limit) break
      if (img.url && !seenUrls.has(img.url)) {
        urls.push(img.url)
        seenUrls.add(img.url)
      }
    }
  }

  return urls
}
