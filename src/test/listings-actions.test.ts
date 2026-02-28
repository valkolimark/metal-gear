import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetUser = vi.fn()
const mockAdminFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: (table: string) => mockAdminFrom(table),
  })),
}))

const { updateListingStatus, duplicateListing } = await import(
  '@/app/(main)/listings/actions'
)

describe('Listing actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('updateListingStatus', () => {
    it('rejects unauthenticated users', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } })
      const result = await updateListingStatus('listing1', 'sold')
      expect(result.error).toBe('Not authenticated')
    })

    it('rejects non-owner', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user1' } },
        error: null,
      })

      const builder = chainableBuilder({ seller_id: 'other-user' })
      mockAdminFrom.mockReturnValue(builder)

      const result = await updateListingStatus('listing1', 'sold')
      expect(result.error).toBe('Not authorized')
    })

    it('succeeds for owner', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user1' } },
        error: null,
      })

      // First call: select to verify ownership
      const selectBuilder = chainableBuilder({ seller_id: 'user1' })
      // Second call: update
      const updateBuilder = chainableBuilder()
      updateBuilder.update = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })

      let callCount = 0
      mockAdminFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) return selectBuilder
        return updateBuilder
      })

      const result = await updateListingStatus('listing1', 'sold')
      expect(result.success).toBe(true)
    })
  })

  describe('duplicateListing', () => {
    it('rejects unauthenticated users', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } })
      const result = await duplicateListing('listing1')
      expect(result.error).toBe('Not authenticated')
    })

    it('rejects if listing not found', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user1' } },
        error: null,
      })

      const builder = chainableBuilder(null)
      mockAdminFrom.mockReturnValue(builder)

      const result = await duplicateListing('nonexistent')
      expect(result.error).toBe('Listing not found')
    })

    it('creates draft copy with (Copy) suffix', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user1' } },
        error: null,
      })

      const original = {
        title: 'Haas VF-2 CNC',
        description: 'Great machine',
        category: 'CNC Machines',
        industry: 'Manufacturing',
        condition: 'good',
        price_cents: 5000000,
        negotiable: true,
        contact_for_price: false,
        location_city: 'Houston',
        location_state: 'TX',
        location_lat: null,
        location_lng: null,
        specifications: { weight: '5000 lbs' },
      }

      const selectBuilder = chainableBuilder(original)
      const newListing = { id: 'new-id', ...original, title: 'Haas VF-2 CNC (Copy)', status: 'draft' }
      const insertBuilder = chainableBuilder(null)
      insertBuilder.insert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: newListing, error: null }),
        }),
      })

      let callCount = 0
      mockAdminFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) return selectBuilder
        return insertBuilder
      })

      const result = await duplicateListing('listing1')
      expect(result.listing).toBeDefined()
      expect(result.listing.title).toBe('Haas VF-2 CNC (Copy)')
      expect(result.listing.status).toBe('draft')
    })
  })
})

function chainableBuilder(data: unknown = null, error: unknown = null, count: number | null = null) {
  const obj: Record<string, unknown> = {}
  const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'gte', 'lte', 'order', 'limit', 'range', 'is', 'not']

  for (const m of chainMethods) {
    obj[m] = vi.fn().mockReturnValue(obj)
  }

  obj.single = vi.fn().mockResolvedValue({ data, error })
  obj.maybeSingle = vi.fn().mockResolvedValue({ data, error })

  const result = { data: Array.isArray(data) ? data : [], error, count }
  obj.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve)

  return obj
}
