import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── mock collaborators ────────────────────────────────────────────

const mockUpsert = vi.fn()
const mockMaybeSingle = vi.fn()
const mockAuditInsert = vi.fn()
const mockRequireAdmin = vi.fn()
const mockUpdateTag = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'admin_audit_log') {
        return { insert: (...args: unknown[]) => mockAuditInsert(...args) }
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => mockMaybeSingle(),
          }),
        }),
        upsert: (...args: unknown[]) => mockUpsert(...args),
      }
    },
  }),
}))

vi.mock('@/lib/admin/permissions', () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}))

vi.mock('next/cache', () => ({
  updateTag: (...args: unknown[]) => mockUpdateTag(...args),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}))

beforeEach(() => {
  mockUpsert.mockReset()
  mockMaybeSingle.mockReset()
  mockAuditInsert.mockReset()
  mockRequireAdmin.mockReset()
  mockUpdateTag.mockReset()
  vi.resetModules()
})

// ── tests ─────────────────────────────────────────────────────────

describe('getEnabledArchetypesConfig', () => {
  it('returns the enabled list and the canonical ALL_ARCHETYPES tuple', async () => {
    mockRequireAdmin.mockResolvedValue({ profile: { id: 'admin-1', admin_role: 'superadmin' } })
    mockMaybeSingle.mockResolvedValue({
      data: { value: ['operator', 'service_provider'] },
      error: null,
    })

    const { getEnabledArchetypesConfig } = await import('@/app/(admin)/admin/actions')
    const result = await getEnabledArchetypesConfig()

    expect(result.enabled).toEqual(['operator', 'service_provider'])
    expect(result.all).toEqual(['operator', 'trader', 'service_provider', 'logistics'])
  })

  it('falls back to defaults when the row is absent', async () => {
    mockRequireAdmin.mockResolvedValue({ profile: { id: 'admin-1', admin_role: 'superadmin' } })
    mockMaybeSingle.mockResolvedValue({ data: null, error: null })

    const { getEnabledArchetypesConfig } = await import('@/app/(admin)/admin/actions')
    const result = await getEnabledArchetypesConfig()

    expect(result.enabled).toEqual(['operator', 'service_provider'])
  })

  it('parses JSON-string-stored values', async () => {
    mockRequireAdmin.mockResolvedValue({ profile: { id: 'admin-1', admin_role: 'superadmin' } })
    mockMaybeSingle.mockResolvedValue({
      data: { value: JSON.stringify(['operator', 'trader']) },
      error: null,
    })

    const { getEnabledArchetypesConfig } = await import('@/app/(admin)/admin/actions')
    const result = await getEnabledArchetypesConfig()

    expect(result.enabled).toEqual(['operator', 'trader'])
  })
})

describe('updateEnabledArchetypesConfig', () => {
  it('writes the upsert, logs to audit_log, and revalidates the cache tag', async () => {
    mockRequireAdmin.mockResolvedValue({ profile: { id: 'admin-1', admin_role: 'superadmin' } })
    mockUpsert.mockResolvedValue({ error: null })
    mockAuditInsert.mockResolvedValue({ error: null })

    const { updateEnabledArchetypesConfig } = await import('@/app/(admin)/admin/actions')
    const result = await updateEnabledArchetypesConfig({ enabled: ['operator', 'service_provider'] })

    expect(result.success).toBe(true)
    expect(mockUpsert).toHaveBeenCalledTimes(1)
    const upsertArg = mockUpsert.mock.calls[0][0]
    expect(upsertArg.key).toBe('enabled_archetypes')
    expect(typeof upsertArg.value).toBe('string')
    expect(JSON.parse(upsertArg.value)).toEqual(['operator', 'service_provider'])
    expect(upsertArg.updated_by).toBe('admin-1')

    expect(mockAuditInsert).toHaveBeenCalledTimes(1)
    const auditArg = mockAuditInsert.mock.calls[0][0]
    expect(auditArg.action).toBe('update_enabled_archetypes')
    expect(auditArg.target_type).toBe('system')

    expect(mockUpdateTag).toHaveBeenCalledWith('enabled-archetypes-config')
    expect(mockUpdateTag).toHaveBeenCalledTimes(1)
  })

  it('rejects an empty array', async () => {
    mockRequireAdmin.mockResolvedValue({ profile: { id: 'admin-1', admin_role: 'superadmin' } })

    const { updateEnabledArchetypesConfig } = await import('@/app/(admin)/admin/actions')
    const result = await updateEnabledArchetypesConfig({ enabled: [] })

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/at least one archetype/i)
    expect(mockUpsert).not.toHaveBeenCalled()
    expect(mockAuditInsert).not.toHaveBeenCalled()
    expect(mockUpdateTag).not.toHaveBeenCalled()
  })

  it('rejects unknown archetype strings', async () => {
    mockRequireAdmin.mockResolvedValue({ profile: { id: 'admin-1', admin_role: 'superadmin' } })

    const { updateEnabledArchetypesConfig } = await import('@/app/(admin)/admin/actions')
    const result = await updateEnabledArchetypesConfig({ enabled: ['operator', 'aliens'] })

    expect(result.success).toBe(false)
    expect(mockUpsert).not.toHaveBeenCalled()
    expect(mockUpdateTag).not.toHaveBeenCalled()
  })

  it('surfaces upsert errors as { success: false, error }', async () => {
    mockRequireAdmin.mockResolvedValue({ profile: { id: 'admin-1', admin_role: 'superadmin' } })
    mockUpsert.mockResolvedValue({ error: { message: 'permission denied' } })

    const { updateEnabledArchetypesConfig } = await import('@/app/(admin)/admin/actions')
    const result = await updateEnabledArchetypesConfig({ enabled: ['operator'] })

    expect(result.success).toBe(false)
    expect(result.error).toBe('permission denied')
    expect(mockAuditInsert).not.toHaveBeenCalled()
    expect(mockUpdateTag).not.toHaveBeenCalled()
  })
})
