import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockMaybeSingle = vi.fn()
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => mockMaybeSingle(),
        }),
      }),
    }),
  }),
}))

// `unstable_cache` would memoize results across cases — re-import per test
// (uncached function) to assert each branch.
vi.mock('next/cache', () => ({
  unstable_cache: (fn: unknown) => fn,
  revalidateTag: vi.fn(),
}))

beforeEach(() => {
  mockMaybeSingle.mockReset()
  vi.resetModules()
})

describe('getEnabledArchetypes — config fallback behavior', () => {
  it('falls back to defaults when system_config row is missing', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })
    const { getEnabledArchetypes, ARCHETYPE_DEFAULT_ENABLED } = await import('@/lib/archetypes')
    const result = await getEnabledArchetypes()
    expect(result).toEqual(ARCHETYPE_DEFAULT_ENABLED)
  })

  it('falls back to defaults when the DB query errors', async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: { message: 'pg blew up' } })
    const { getEnabledArchetypes, ARCHETYPE_DEFAULT_ENABLED } = await import('@/lib/archetypes')
    const result = await getEnabledArchetypes()
    expect(result).toEqual(ARCHETYPE_DEFAULT_ENABLED)
  })

  it('respects the stored config when value is a JSON array', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { value: ['operator', 'trader', 'service_provider', 'logistics'] },
      error: null,
    })
    const { getEnabledArchetypes } = await import('@/lib/archetypes')
    const result = await getEnabledArchetypes()
    expect(result).toEqual(['operator', 'trader', 'service_provider', 'logistics'])
  })

  it('parses JSON strings transparently (mirrors the credit-config write pattern)', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { value: JSON.stringify(['operator', 'service_provider']) },
      error: null,
    })
    const { getEnabledArchetypes } = await import('@/lib/archetypes')
    const result = await getEnabledArchetypes()
    expect(result).toEqual(['operator', 'service_provider'])
  })

  it('filters unknown archetype strings out of the stored config', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { value: ['operator', 'gibberish', 'trader', 'aliens'] },
      error: null,
    })
    const { getEnabledArchetypes } = await import('@/lib/archetypes')
    const result = await getEnabledArchetypes()
    expect(result).toEqual(['operator', 'trader'])
  })

  it('returns defaults when the stored array filters down to empty', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { value: ['gibberish', 'aliens'] },
      error: null,
    })
    const { getEnabledArchetypes, ARCHETYPE_DEFAULT_ENABLED } = await import('@/lib/archetypes')
    const result = await getEnabledArchetypes()
    expect(result).toEqual(ARCHETYPE_DEFAULT_ENABLED)
  })

  it('returns defaults when stored value is not an array', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { value: { not: 'an array' } },
      error: null,
    })
    const { getEnabledArchetypes, ARCHETYPE_DEFAULT_ENABLED } = await import('@/lib/archetypes')
    const result = await getEnabledArchetypes()
    expect(result).toEqual(ARCHETYPE_DEFAULT_ENABLED)
  })
})

describe('isArchetypeEnabled — short-circuit', () => {
  it('returns true for an enabled archetype', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { value: ['operator', 'service_provider'] },
      error: null,
    })
    const { isArchetypeEnabled } = await import('@/lib/archetypes')
    expect(await isArchetypeEnabled('operator')).toBe(true)
    expect(await isArchetypeEnabled('service_provider')).toBe(true)
  })

  it('returns false for a disabled archetype', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { value: ['operator', 'service_provider'] },
      error: null,
    })
    const { isArchetypeEnabled } = await import('@/lib/archetypes')
    expect(await isArchetypeEnabled('trader')).toBe(false)
    expect(await isArchetypeEnabled('logistics')).toBe(false)
  })
})

describe('getDisabledArchetypes', () => {
  it('returns the complement of enabled', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { value: ['operator', 'service_provider'] },
      error: null,
    })
    const { getDisabledArchetypes } = await import('@/lib/archetypes')
    const result = await getDisabledArchetypes()
    expect(result.sort()).toEqual(['logistics', 'trader'])
  })
})
