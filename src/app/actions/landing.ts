'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { industryDisplayLabel } from '@/lib/listings/industries'
import {
  LANDING_FALLBACK_SHOPS,
  LANDING_FALLBACK_TICKER,
  SHOP_GRADIENTS,
} from '@/components/landing/data'
import type {
  LandingFeaturedShop,
  LandingNetworkSummary,
  LandingStat,
  LandingTickerItem,
} from '@/components/landing/types'

// Cycle 67 — server data for the cinematic landing.
// All values come from real DB rows when available; fall back to design
// fixtures when a table returns nothing (preserves the visual integrity of
// the design on fresh dev DBs / preview deploys).

const RELATIVE_TIME_INTERVALS: Array<{ ms: number; unit: string }> = [
  { ms: 60 * 60 * 1000, unit: 'hr' },
  { ms: 60 * 1000, unit: 'min' },
]

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'just now'
  const diffMs = Date.now() - new Date(iso).getTime()
  if (diffMs < 60 * 1000) return 'just now'
  for (const { ms, unit } of RELATIVE_TIME_INTERVALS) {
    if (diffMs >= ms) {
      const n = Math.floor(diffMs / ms)
      return `${n} ${unit}${n === 1 ? '' : 's'} ago`
    }
  }
  return 'just now'
}

function monogram(name: string): string {
  const words = name
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return name.slice(0, 3).toUpperCase()
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase()
  if (words.length === 2) return (words[0][0] + words[1].slice(0, 2)).toUpperCase()
  return (words[0][0] + words[1][0] + words[2][0]).toUpperCase()
}

function deriveSpecialty(industries: string[] | null): string {
  if (!industries || industries.length === 0) return 'Industrial services'
  return industryDisplayLabel(industries[0])
}

// ─── Network summary ─────────────────────────────────────────────────

export async function getLandingNetworkSummary(): Promise<LandingNetworkSummary> {
  const admin = createAdminClient()

  const [{ count: rebuilders }, { count: listings }, { data: stateRows }] = await Promise.all([
    admin
      .from('company_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('is_suspended', false),
    admin
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .eq('has_media', true),
    admin
      .from('company_profiles')
      .select('state')
      .eq('is_suspended', false)
      .not('state', 'is', null)
      .limit(2000),
  ])

  const distinctStates = new Set(
    (stateRows ?? [])
      .map((r) => (r.state ?? '').trim().toUpperCase())
      .filter((s) => s.length > 0),
  )

  return {
    rebuilders: rebuilders ?? 0,
    listings: listings ?? 0,
    states: distinctStates.size,
  }
}

// ─── Featured rebuilders (top by listing count) ──────────────────────

export async function getLandingFeaturedShops(limit = 4): Promise<LandingFeaturedShop[]> {
  const admin = createAdminClient()

  // Pull a generous candidate set, then rank by active-listing count and
  // map to design's color palette deterministically.
  const { data: companies } = await admin
    .from('company_profiles')
    .select('id, name, slug, city, state, industries')
    .eq('is_suspended', false)
    .order('verified_at', { ascending: false, nullsFirst: false })
    .limit(20)

  if (!companies || companies.length === 0) return LANDING_FALLBACK_SHOPS

  const ids = companies.map((c) => c.id)
  const { data: counts } = await admin
    .from('listings')
    .select('company_id')
    .in('company_id', ids)
    .eq('status', 'active')
    .eq('has_media', true)

  const countByCompany = new Map<string, number>()
  for (const row of counts ?? []) {
    if (!row.company_id) continue
    countByCompany.set(row.company_id, (countByCompany.get(row.company_id) ?? 0) + 1)
  }

  const ranked = [...companies]
    .map((c) => ({ ...c, jobs: countByCompany.get(c.id) ?? 0 }))
    .sort((a, b) => b.jobs - a.jobs)
    .slice(0, limit)

  // Prefer real companies even when none have listings yet — the "Jobs"
  // stat below will render "—" instead of a misleading "0". Only fall back
  // to fixtures when the table is genuinely empty.
  if (ranked.length === 0) return LANDING_FALLBACK_SHOPS

  return ranked.map((c, i) => {
    const grad = SHOP_GRADIENTS[i % SHOP_GRADIENTS.length]
    const cityLine = [c.city, c.state].filter(Boolean).join(', ') || 'Houston, TX'
    return {
      tag: monogram(c.name),
      name: c.name,
      city: cityLine,
      specialty: deriveSpecialty(c.industries),
      rating: null,
      jobs: c.jobs,
      response: null,
      color: grad.color,
      bg: grad.bg,
      href: `/companies/${c.slug}`,
    } satisfies LandingFeaturedShop
  })
}

// ─── Live network ticker ─────────────────────────────────────────────

export async function getLandingTicker(limit = 4): Promise<LandingTickerItem[]> {
  const admin = createAdminClient()

  const [{ data: sosRows }, { data: listingRows }] = await Promise.all([
    admin
      .from('sos_requests')
      .select('id, title, location_city, location_state, status, urgency, created_at')
      .order('created_at', { ascending: false })
      .limit(limit),
    admin
      .from('listings')
      .select('id, title, price_cents, contact_for_price, location_city, location_state, created_at')
      .eq('status', 'active')
      .eq('has_media', true)
      .order('created_at', { ascending: false })
      .limit(limit),
  ])

  const items: LandingTickerItem[] = []

  for (const row of sosRows ?? []) {
    const loc = [row.location_city, row.location_state].filter(Boolean).join(', ')
    const status =
      row.status === 'fulfilled'
        ? 'RESOLVED'
        : row.status === 'cancelled'
          ? 'CANCELLED'
          : row.urgency === 'critical'
            ? 'CRITICAL'
            : 'ACTIVE'
    const color =
      status === 'RESOLVED'
        ? '#22C55E'
        : status === 'CRITICAL'
          ? '#FF6B2B'
          : 'rgb(var(--mg-accent-rgb))'
    const tagSuffix = row.id.slice(0, 4).toUpperCase()
    items.push({
      kind: 'sos',
      tag: `SOS-${tagSuffix}`,
      when: formatRelativeTime(row.created_at),
      text: loc ? `${row.title} — ${loc}` : row.title,
      status,
      color,
    })
  }

  for (const row of listingRows ?? []) {
    const loc = [row.location_city, row.location_state].filter(Boolean).join(', ')
    const price = row.contact_for_price
      ? null
      : row.price_cents != null
        ? `$${Math.round(row.price_cents / 100).toLocaleString()}`
        : null
    const text = [row.title, price, loc].filter(Boolean).join(' — ')
    const tagSuffix = row.id.slice(0, 4).toUpperCase()
    items.push({
      kind: 'lst',
      tag: `L-${tagSuffix}`,
      when: formatRelativeTime(row.created_at),
      text,
      status: 'NEW',
      color: '#1877F2',
    })
  }

  if (items.length === 0) return LANDING_FALLBACK_TICKER

  // Interleave by relative recency: parse "X min/hr ago" → ms; lower = newer.
  return items
    .sort((a, b) => relativeAgoMs(a.when) - relativeAgoMs(b.when))
    .slice(0, limit)
}

function relativeAgoMs(when: string): number {
  if (when === 'just now') return 0
  const [n, unit] = when.split(' ')
  const value = parseInt(n, 10) || 0
  if (unit?.startsWith('min')) return value * 60 * 1000
  if (unit?.startsWith('hr')) return value * 60 * 60 * 1000
  return Number.MAX_SAFE_INTEGER
}

// ─── Stats strip ─────────────────────────────────────────────────────

export async function getLandingStats(summary: LandingNetworkSummary): Promise<LandingStat[]> {
  // Only include stats backed by real numbers. We deliberately omit
  // "$184M traded" and "<4 hrs avg response" until those metrics are real.
  const stats: LandingStat[] = []

  if (summary.rebuilders > 0) {
    stats.push({
      value: summary.rebuilders.toLocaleString(),
      label: 'Verified rebuilders',
      sub:
        summary.states > 0
          ? `Across ${summary.states} state${summary.states === 1 ? '' : 's'}`
          : 'Across the network',
    })
  }

  if (summary.listings > 0) {
    stats.push({
      value: summary.listings.toLocaleString(),
      label: 'Active listings',
      sub: 'Updated continuously',
    })
  }

  if (summary.states > 0) {
    stats.push({
      value: summary.states.toString(),
      label: 'States served',
      sub: 'And growing',
    })
  }

  // Always show "free to list" — anchored value, not a number.
  stats.push({
    value: 'Free',
    label: 'To join the network',
    sub: 'No card required',
  })

  return stats
}
