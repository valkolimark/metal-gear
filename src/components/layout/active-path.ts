/**
 * Active-state detection for nav items. Pure function, exported so tests can
 * cover the edge cases (query params, prefix vs. exact, root paths).
 *
 *  - href "/feed" is active on pathname "/feed" or "/feed/anything"
 *  - href "/listings?tab=mine" is active when pathname starts with "/listings"
 *    AND searchParams contain `tab=mine` (exact tab match takes priority over
 *    bare-prefix matches — see selectActiveSidebarHref below)
 *  - href "/" only matches the literal root
 */
export function isItemActive(
  href: string,
  pathname: string,
  searchParams?: URLSearchParams,
): boolean {
  const [hrefPath, hrefQuery = ''] = href.split('?', 2) as [string, string?]

  if (hrefPath === '/') return pathname === '/'

  // pathname must equal or be a child of the href path
  const pathMatches = pathname === hrefPath || pathname.startsWith(hrefPath + '/')
  if (!pathMatches) return false

  if (!hrefQuery) return true

  // href has a query — require every key=value to match
  if (!searchParams) return false
  const expected = new URLSearchParams(hrefQuery)
  for (const [k, v] of expected.entries()) {
    if (searchParams.get(k) !== v) return false
  }
  return true
}

/**
 * Given a list of candidate hrefs and the current pathname/searchParams,
 * pick the single "winning" active href. Hrefs with query strings (more
 * specific) beat hrefs without; among the same specificity, the longest
 * path wins. Returns null if none match.
 */
export function selectActiveSidebarHref(
  hrefs: string[],
  pathname: string,
  searchParams?: URLSearchParams,
): string | null {
  const matches = hrefs.filter((h) => isItemActive(h, pathname, searchParams))
  if (matches.length === 0) return null
  matches.sort((a, b) => {
    const aHasQuery = a.includes('?') ? 1 : 0
    const bHasQuery = b.includes('?') ? 1 : 0
    if (aHasQuery !== bHasQuery) return bHasQuery - aHasQuery
    return b.length - a.length
  })
  return matches[0] ?? null
}
