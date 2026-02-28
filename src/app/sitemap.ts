import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { EQUIPMENT_CATEGORIES } from '@/lib/constants'

const BASE_URL = 'https://metal-gear-five.vercel.app'

function categorySlug(name: string): string {
  return name.toLowerCase().replace(/[&]/g, 'and').replace(/\s+/g, '-')
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient()

  // Fetch active listing IDs and updated dates
  const { data: listings } = await admin
    .from('listings')
    .select('id, updated_at')
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(5000)

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/pricing`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
    { url: `${BASE_URL}/privacy`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/terms`, lastModified: new Date(), changeFrequency: 'yearly', priority: 0.3 },
    { url: `${BASE_URL}/search`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.8 },
  ]

  const categoryPages: MetadataRoute.Sitemap = EQUIPMENT_CATEGORIES
    .filter((c) => c !== 'Other')
    .map((category) => ({
      url: `${BASE_URL}/equipment/${categorySlug(category)}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    }))

  const listingPages: MetadataRoute.Sitemap = (listings ?? []).map((listing) => ({
    url: `${BASE_URL}/listings/${listing.id}`,
    lastModified: new Date(listing.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  return [...staticPages, ...categoryPages, ...listingPages]
}
