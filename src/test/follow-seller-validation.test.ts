import { describe, it, expect, vi, beforeEach } from 'vitest'

// We test the input validation by directly invoking the server action's Zod
// guard. The action itself talks to Supabase; we mock the client surface so
// no network calls happen.

const fromMock = vi.fn()
const adminMock = { from: fromMock }
const getUserMock = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: getUserMock } }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => adminMock,
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

import { toggleFollow } from '@/app/actions/follow-seller'

beforeEach(() => {
  fromMock.mockReset()
  getUserMock.mockReset()
})

describe('toggleFollow input guards', () => {
  it('rejects when neither profile nor company is supplied', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'viewer-1' } } })
    const res = await toggleFollow({
      sellerProfileId: null,
      sellerCompanyId: null,
    })
    expect(res.ok).toBe(false)
  })

  it('rejects when both profile and company are supplied', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'viewer-1' } } })
    const res = await toggleFollow({
      sellerProfileId: 'a1b2c3d4-e5f6-4789-9abc-def012345001',
      sellerCompanyId: 'a1b2c3d4-e5f6-4789-9abc-def012345002',
    })
    expect(res.ok).toBe(false)
  })

  it('rejects unauthenticated callers', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    const res = await toggleFollow({
      sellerProfileId: 'a1b2c3d4-e5f6-4789-9abc-def012345001',
      sellerCompanyId: null,
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.toLowerCase()).toContain('not authenticated')
  })

  it('rejects self-follow when sellerProfileId equals viewer id', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'a1b2c3d4-e5f6-4789-9abc-def012345001' } },
    })
    const res = await toggleFollow({
      sellerProfileId: 'a1b2c3d4-e5f6-4789-9abc-def012345001',
      sellerCompanyId: null,
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error.toLowerCase()).toContain('yourself')
  })

  it('rejects malformed UUIDs', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'viewer-1' } } })
    const res = await toggleFollow({
      sellerProfileId: 'not-a-uuid',
      sellerCompanyId: null,
    })
    expect(res.ok).toBe(false)
  })
})
