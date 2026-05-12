'use server'

import { searchServicesTaxonomy } from '@/lib/profile/services-taxonomy'

/**
 * Thin server action wrapper around `searchServicesTaxonomy` so the client
 * ServicesEditor can call it directly (we never pass server functions from
 * Server Components into Client Components — must live in a `'use server'`
 * file).
 */
export async function searchTaxonomyAction(query: string) {
  const opts = await searchServicesTaxonomy(query, 20)
  return opts.map((o) => ({
    id: o.id,
    label: o.label,
    category: o.category,
    typicalSlaMinDays: o.typicalSlaMinDays,
    typicalSlaMaxDays: o.typicalSlaMaxDays,
    typicalPriceFromUsd: o.typicalPriceFromUsd,
  }))
}
