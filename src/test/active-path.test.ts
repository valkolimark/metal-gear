import { describe, it, expect } from 'vitest'
import { isItemActive, selectActiveSidebarHref } from '@/components/layout/active-path'

describe('isItemActive', () => {
  it('matches exact path', () => {
    expect(isItemActive('/feed', '/feed', new URLSearchParams())).toBe(true)
  })

  it('matches child path under href', () => {
    expect(isItemActive('/listings', '/listings/abc', new URLSearchParams())).toBe(true)
  })

  it('rejects sibling paths', () => {
    expect(isItemActive('/listings', '/listings-archive', new URLSearchParams())).toBe(false)
  })

  it('matches even when pathname has query (query is on URL not pathname)', () => {
    expect(
      isItemActive('/feed', '/feed', new URLSearchParams('foo=bar')),
    ).toBe(true)
  })

  it('requires query string match when href has a query', () => {
    expect(
      isItemActive('/listings?tab=mine', '/listings', new URLSearchParams('tab=mine')),
    ).toBe(true)
    expect(
      isItemActive('/listings?tab=mine', '/listings', new URLSearchParams()),
    ).toBe(false)
    expect(
      isItemActive('/listings?tab=mine', '/listings', new URLSearchParams('tab=archived')),
    ).toBe(false)
  })

  it('only matches root href on literal /', () => {
    expect(isItemActive('/', '/', new URLSearchParams())).toBe(true)
    expect(isItemActive('/', '/anything', new URLSearchParams())).toBe(false)
  })

  it('works without searchParams arg (no-query hrefs)', () => {
    expect(isItemActive('/feed', '/feed')).toBe(true)
    expect(isItemActive('/listings?tab=mine', '/listings')).toBe(false)
  })
})

describe('selectActiveSidebarHref', () => {
  const hrefs = ['/feed', '/listings', '/listings?tab=mine', '/sos', '/messages']

  it('returns null when nothing matches', () => {
    expect(
      selectActiveSidebarHref(hrefs, '/no-such-route', new URLSearchParams()),
    ).toBe(null)
  })

  it('prefers query-string match over bare prefix', () => {
    expect(
      selectActiveSidebarHref(hrefs, '/listings', new URLSearchParams('tab=mine')),
    ).toBe('/listings?tab=mine')
  })

  it('falls back to bare prefix when no tab query', () => {
    expect(
      selectActiveSidebarHref(hrefs, '/listings', new URLSearchParams()),
    ).toBe('/listings')
  })

  it('matches sub-paths', () => {
    expect(
      selectActiveSidebarHref(hrefs, '/sos/abc', new URLSearchParams()),
    ).toBe('/sos')
  })

  it('picks the longest path when multiple bare prefixes match (defensive)', () => {
    const overlapping = ['/listings', '/listings/new']
    expect(
      selectActiveSidebarHref(overlapping, '/listings/new', new URLSearchParams()),
    ).toBe('/listings/new')
  })
})
