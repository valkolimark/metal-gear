import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { escapePostgrestValue } from '@/lib/security/sanitize'

export interface TaxonomyOption {
  id: string
  slug: string
  label: string
  category: string
  description: string | null
  typicalSlaMinDays: number | null
  typicalSlaMaxDays: number | null
  typicalPriceFromUsd: number | null
}

/**
 * Search the curated `seller_services_taxonomy` by partial label.
 *
 * Strategy:
 *   - Empty/short query (<2 chars) → return first `limit` active entries by
 *     sort_order. Useful default for a fresh form.
 *   - 2+ chars → ILIKE fuzzy match on label (trigram-indexed). Free-text is
 *     escaped through `escapePostgrestValue` to prevent PostgREST filter
 *     injection.
 *
 * Only returns active entries — deactivated taxonomy slugs cannot be picked
 * for new service rows. Existing services that already point at deactivated
 * slugs continue to render via the join in `getServicesForSeller`.
 */
export async function searchServicesTaxonomy(
  query: string,
  limit: number = 20
): Promise<TaxonomyOption[]> {
  const admin = createAdminClient()
  const trimmed = query.trim()

  let q = admin
    .from('seller_services_taxonomy')
    .select(
      'id, slug, label, category, description, typical_sla_min_days, typical_sla_max_days, typical_price_from_usd'
    )
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .limit(limit)

  if (trimmed.length >= 2) {
    const safe = escapePostgrestValue(trimmed)
    if (safe.length > 0) {
      q = q.ilike('label', `%${safe}%`)
    }
  }

  const { data, error } = await q
  if (error || !data) return []

  return data.map((row) => ({
    id: row.id as string,
    slug: row.slug as string,
    label: row.label as string,
    category: row.category as string,
    description: (row.description ?? null) as string | null,
    typicalSlaMinDays: (row.typical_sla_min_days ?? null) as number | null,
    typicalSlaMaxDays: (row.typical_sla_max_days ?? null) as number | null,
    typicalPriceFromUsd: (row.typical_price_from_usd ?? null) as number | null,
  }))
}

/**
 * Look up a single taxonomy entry by id — used by server actions that need
 * to validate that a submitted taxonomy_id still exists and is active.
 */
export async function getTaxonomyById(
  id: string
): Promise<TaxonomyOption | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('seller_services_taxonomy')
    .select(
      'id, slug, label, category, description, typical_sla_min_days, typical_sla_max_days, typical_price_from_usd'
    )
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle()
  if (!data) return null
  return {
    id: data.id as string,
    slug: data.slug as string,
    label: data.label as string,
    category: data.category as string,
    description: (data.description ?? null) as string | null,
    typicalSlaMinDays: (data.typical_sla_min_days ?? null) as number | null,
    typicalSlaMaxDays: (data.typical_sla_max_days ?? null) as number | null,
    typicalPriceFromUsd: (data.typical_price_from_usd ?? null) as number | null,
  }
}
