/**
 * Cycle 64 — read-side back-compat for listings.industry → listings.industries[].
 *
 * Until Cycle 65 drops the legacy `industry` column, every read site goes
 * through these helpers so the two shapes coexist. After the column drop,
 * `getIndustries()` collapses to `row.industries ?? []` and `getPrimaryIndustry()`
 * stays as a convenience accessor.
 */

import { OTHER_INDUSTRY_PREFIX } from '@/lib/constants/onboarding'

export interface IndustryShape {
  industries?: string[] | null
  industry?: string | null
}

export function getIndustries(row: IndustryShape | null | undefined): string[] {
  if (!row) return []
  if (Array.isArray(row.industries) && row.industries.length > 0) {
    return row.industries.filter((s): s is string => typeof s === 'string' && s.length > 0)
  }
  if (typeof row.industry === 'string' && row.industry.trim().length > 0) {
    return [row.industry]
  }
  return []
}

export function getPrimaryIndustry(row: IndustryShape | null | undefined): string | null {
  const list = getIndustries(row)
  return list[0] ?? null
}

/**
 * Render a single industry value for display. `other:<slug>` becomes a
 * humanised "Slug words" string; canonical values pass through.
 */
export function industryDisplayLabel(value: string): string {
  if (!value.startsWith(OTHER_INDUSTRY_PREFIX)) return value
  const slug = value.slice(OTHER_INDUSTRY_PREFIX.length).trim()
  if (!slug) return 'Other'
  return slug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/**
 * Normalize a free-text "Other" entry into the canonical `other:<slug>` form.
 * Returns null when the input is too short to be a meaningful tag.
 */
export function normalizeOtherIndustry(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length < 2) return null
  const slug = trimmed
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
  if (!slug) return null
  return `${OTHER_INDUSTRY_PREFIX}${slug}`
}

/**
 * Pure-function helper used by both the migration script's verification path
 * and any application code that needs to coerce a singleton legacy value
 * into the new array shape (e.g., import flows where the caller has only
 * the old field).
 */
export function coerceIndustryArray(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
  }
  if (typeof input === 'string') {
    const trimmed = input.trim()
    return trimmed.length > 0 ? [trimmed] : []
  }
  return []
}
