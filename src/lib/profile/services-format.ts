/**
 * Pure formatting helpers shared between server-side `getServicesForSeller`
 * and client/server components. Kept in a separate module from `services.ts`
 * so it can be imported into client/test code without pulling in
 * `server-only`.
 */

/**
 * Format a service price for display. Whole-dollar amount with thousands
 * separators; null → "Quote on request" (caller decides whether to render
 * this or the lock icon based on `isPricingGated`).
 */
export function formatPriceFrom(priceFromUsd: number | null): string {
  if (priceFromUsd == null) return 'Quote on request'
  return `From $${priceFromUsd.toLocaleString('en-US')}`
}

/**
 * Format the SLA row for display. Returns null when both min and max are
 * unset (caller should omit the row entirely in that case).
 */
export function formatSla(min: number | null, max: number | null): string | null {
  if (min == null && max == null) return null
  if (min == null) return `SLA: ~${max} day${max === 1 ? '' : 's'}`
  if (max == null) return `SLA: ~${min} day${min === 1 ? '' : 's'}`
  if (min === max) return `SLA: ${min} day${min === 1 ? '' : 's'}`
  return `SLA: ${min}–${max} days`
}
