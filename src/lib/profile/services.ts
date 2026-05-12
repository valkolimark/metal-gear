import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveTier } from '@/app/actions/tier'
import type { SubscriptionTier } from '@/lib/constants'

/**
 * Tiers that unlock public pricing display. Free tier hides "From $X"
 * behind a lock icon; SLA still renders for free sellers. Legacy aliases
 * `premium` / `boost` are paid tiers too.
 */
const PAID_TIERS: ReadonlySet<SubscriptionTier> = new Set([
  'pro',
  'business',
  'enterprise',
  'premium',
  'boost',
])

export interface ServiceCardData {
  id: string
  /** Resolved label — taxonomy label takes precedence over custom_label. */
  label: string
  description: string | null
  category: string | null
  slaMinDays: number | null
  slaMaxDays: number | null
  /** NULL when seller is free-tier OR when the seller hasn't set a price. */
  priceFromUsd: number | null
  /** True when the seller is free-tier AND a price would have been shown. */
  isPricingGated: boolean
  /** Resolved sort order, lowest renders first. */
  sortOrder: number
}

export interface GetServicesResult {
  services: ServiceCardData[]
  totalCount: number
  /** Free-tier flag for the requested seller — useful for downstream UI banners. */
  isPricingGated: boolean
}

interface TaxonomyJoin {
  label: string | null
  category: string | null
}

interface ServiceRow {
  id: string
  taxonomy_id: string | null
  custom_label: string | null
  custom_category: string | null
  description: string | null
  sla_min_days: number | null
  sla_max_days: number | null
  price_from_usd: number | null
  sort_order: number
  seller_services_taxonomy: TaxonomyJoin | TaxonomyJoin[] | null
}

/**
 * Fetch the active services configured for a seller (individual profile OR
 * company), with the pricing-gate decision applied at the read layer.
 *
 * Pricing-gate rules (per Cycle 70 conventions):
 *   - Free-tier sellers: `priceFromUsd` is forced to NULL and `isPricingGated`
 *     is TRUE on every service. The card renders a lock icon + tooltip.
 *   - Paid tiers: pricing renders as configured. NULL price → "Quote on request".
 *   - SLA renders for all tiers — it's operational info buyers need, not a
 *     paid lead-gen hook.
 *
 * For companies, the tier is resolved using the company subscription first,
 * falling back to the inferred owner of the company. Free-tier individuals
 * follow the user-level subscription path inside `getActiveTier`.
 */
export async function getServicesForSeller(
  sellerProfileId: string | null,
  sellerCompanyId: string | null,
  limit?: number
): Promise<GetServicesResult> {
  if (!sellerProfileId && !sellerCompanyId) {
    return { services: [], totalCount: 0, isPricingGated: false }
  }

  const admin = createAdminClient()

  // Resolve the tier for the pricing gate.
  // For companies, getActiveTier accepts (userId, companyId?). We need to
  // pass a userId — use the company's first active owner. If we can't find
  // one, fall back to user-level tier with the membership owner.
  let tier: SubscriptionTier = 'free'
  if (sellerCompanyId) {
    const { data: ownerRow } = await admin
      .from('company_memberships')
      .select('user_id')
      .eq('company_id', sellerCompanyId)
      .eq('role', 'owner')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
    const ownerUserId = ownerRow?.user_id ?? ''
    tier = await getActiveTier(ownerUserId, sellerCompanyId)
  } else if (sellerProfileId) {
    tier = await getActiveTier(sellerProfileId, null)
  }
  const isPricingGated = !PAID_TIERS.has(tier)

  // Query active services with taxonomy join.
  let query = admin
    .from('seller_services')
    .select(
      `
      id,
      taxonomy_id,
      custom_label,
      custom_category,
      description,
      sla_min_days,
      sla_max_days,
      price_from_usd,
      sort_order,
      seller_services_taxonomy ( label, category )
      `,
      { count: 'exact' }
    )
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (sellerCompanyId) {
    query = query.eq('seller_company_id', sellerCompanyId)
  } else if (sellerProfileId) {
    query = query.eq('seller_profile_id', sellerProfileId)
  }

  if (limit && limit > 0) {
    query = query.limit(limit)
  }

  const { data, count, error } = await query
  if (error || !data) {
    return { services: [], totalCount: 0, isPricingGated }
  }

  const services: ServiceCardData[] = (data as ServiceRow[]).map((row) => {
    const taxonomy = Array.isArray(row.seller_services_taxonomy)
      ? row.seller_services_taxonomy[0] ?? null
      : row.seller_services_taxonomy
    const label =
      (row.taxonomy_id ? taxonomy?.label : null) ??
      row.custom_label ??
      'Service'
    const category =
      (row.taxonomy_id ? taxonomy?.category : null) ?? row.custom_category ?? null

    return {
      id: row.id,
      label,
      description: row.description,
      category,
      slaMinDays: row.sla_min_days,
      slaMaxDays: row.sla_max_days,
      priceFromUsd: isPricingGated ? null : row.price_from_usd,
      isPricingGated,
      sortOrder: row.sort_order,
    }
  })

  return { services, totalCount: count ?? services.length, isPricingGated }
}

// Pure formatting helpers live in services-format.ts so the
// `import 'server-only'` ban-list doesn't block client/component usage.
export { formatPriceFrom, formatSla } from './services-format'
