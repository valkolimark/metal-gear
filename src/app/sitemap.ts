import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { EQUIPMENT_CATEGORIES } from '@/lib/constants'

const BASE_URL = 'https://metal-gear-five.vercel.app'

function categorySlug(name: string): string {
  return name.toLowerCase().replace(/[&]/g, 'and').replace(/\s+/g, '-')
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient()

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  const categoryPages: MetadataRoute.Sitemap = EQUIPMENT_CATEGORIES
    .filter((c) => c !== 'Other')
    .map((category) => ({
      url: `${BASE_URL}/equipment/${categorySlug(category)}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }))

  // Company pages
  const { data: companies } = await admin
    .from('company_profiles')
    .select('slug, updated_at')
    .order('updated_at', { ascending: false })
    .limit(500)

  const companyRoutes: MetadataRoute.Sitemap = (companies ?? []).map((c) => ({
    url: `${BASE_URL}/companies/${c.slug}`,
    lastModified: c.updated_at ? new Date(c.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  // Active listings — prefer high quality, fall back to recent
  const { data: qualityListings } = await admin
    .from('listings')
    .select('id, updated_at')
    .eq('status', 'active')
    .eq('has_media', true)
    .not('listing_quality_score', 'is', null)
    .gte('listing_quality_score', 50)
    .order('listing_quality_score', { ascending: false })
    .limit(500)

  const qualityIds = new Set((qualityListings ?? []).map((l) => l.id))

  const { data: recentListings } = await admin
    .from('listings')
    .select('id, updated_at')
    .eq('status', 'active')
    .eq('has_media', true)
    .order('updated_at', { ascending: false })
    .limit(1000)

  const allListingRoutes: MetadataRoute.Sitemap = [
    ...(qualityListings ?? []).map((l) => ({
      url: `${BASE_URL}/listings/${l.id}`,
      lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...(recentListings ?? [])
      .filter((l) => !qualityIds.has(l.id))
      .slice(0, 500)
      .map((l) => ({
        url: `${BASE_URL}/listings/${l.id}`,
        lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      })),
  ]

  // Seller storefronts
  const { data: sellers } = await admin
    .from('profiles')
    .select('id, updated_at')
    .not('company_name', 'is', null)
    .limit(200)

  const sellerRoutes: MetadataRoute.Sitemap = (sellers ?? []).map((s) => ({
    url: `${BASE_URL}/sellers/${s.id}`,
    lastModified: s.updated_at ? new Date(s.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  // Hashtag pages — top 100 by post count
  const { data: hashtags } = await admin
    .from('feed_hashtags')
    .select('tag, last_used_at')
    .gt('post_count', 0)
    .order('post_count', { ascending: false })
    .limit(100)

  const hashtagRoutes: MetadataRoute.Sitemap = (hashtags ?? []).map((h) => ({
    url: `${BASE_URL}/feed/hashtag/${encodeURIComponent(h.tag)}`,
    lastModified: h.last_used_at ? new Date(h.last_used_at) : new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.5,
  }))

  return [
    ...staticPages,
    ...categoryPages,
    ...companyRoutes,
    ...allListingRoutes,
    ...sellerRoutes,
    ...hashtagRoutes,
  ]
}
