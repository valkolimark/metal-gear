import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TIER_LIMITS } from '@/lib/constants'

// Mock Supabase modules before importing the action
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

// Import after mocks
const { checkListingLimit, checkConversationLimit, checkPhotoLimit } = await import(
  '@/app/actions/tier'
)

describe('Tier limit checks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('checkListingLimit', () => {
    it('rejects unauthenticated users', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } })

      const result = await checkListingLimit()
      expect(result.allowed).toBe(false)
      expect(result.error).toBe('Not authenticated')
    })

    it('allows free tier user under limit', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user1' } },
        error: null,
      })

      // Profile query
      const profileBuilder = chainableBuilder({ subscription_tier: 'free' })
      // Listings count query
      const listingsBuilder = chainableBuilder(null, null, 1)

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileBuilder
        if (table === 'listings') return listingsBuilder
        return chainableBuilder()
      })

      const result = await checkListingLimit()
      expect(result.allowed).toBe(true)
      expect(result.current).toBe(1)
      expect(result.limit).toBe(TIER_LIMITS.free.listings)
    })

    it('blocks free tier user at limit', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user1' } },
        error: null,
      })

      const profileBuilder = chainableBuilder({ subscription_tier: 'free' })
      const listingsBuilder = chainableBuilder(null, null, 3) // free limit is 3

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileBuilder
        if (table === 'listings') return listingsBuilder
        return chainableBuilder()
      })

      const result = await checkListingLimit()
      expect(result.allowed).toBe(false)
      expect(result.current).toBe(3)
      expect(result.error).toContain('listing limit')
    })

    it('allows premium tier user with higher limit', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user1' } },
        error: null,
      })

      const profileBuilder = chainableBuilder({ subscription_tier: 'premium' })
      const listingsBuilder = chainableBuilder(null, null, 10)

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'profiles') return profileBuilder
        if (table === 'listings') return listingsBuilder
        return chainableBuilder()
      })

      const result = await checkListingLimit()
      expect(result.allowed).toBe(true)
      expect(result.limit).toBe(TIER_LIMITS.premium.listings)
    })
  })

  describe('checkConversationLimit', () => {
    it('premium users have unlimited conversations', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user1' } },
        error: null,
      })

      const profileBuilder = chainableBuilder({ subscription_tier: 'premium' })
      mockAdminFrom.mockReturnValue(profileBuilder)

      const result = await checkConversationLimit()
      expect(result.allowed).toBe(true)
      expect(result.limit).toBe(Infinity)
    })
  })

  describe('checkPhotoLimit', () => {
    it('allows photo upload under limit', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user1' } },
        error: null,
      })

      const profileBuilder = chainableBuilder({ subscription_tier: 'free' })
      mockAdminFrom.mockReturnValue(profileBuilder)

      const result = await checkPhotoLimit(3)
      expect(result.allowed).toBe(true)
      expect(result.limit).toBe(TIER_LIMITS.free.photos)
    })

    it('blocks photo upload at limit', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user1' } },
        error: null,
      })

      const profileBuilder = chainableBuilder({ subscription_tier: 'free' })
      mockAdminFrom.mockReturnValue(profileBuilder)

      const result = await checkPhotoLimit(5)
      expect(result.allowed).toBe(false)
      expect(result.error).toContain('photo limit')
    })
  })
})

// Helper to create a chainable mock query builder
function chainableBuilder(data: unknown = null, error: unknown = null, count: number | null = null) {
  const obj: Record<string, unknown> = {}
  const chainMethods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'in', 'or', 'gte', 'lte', 'order', 'limit', 'range', 'is', 'not']

  for (const m of chainMethods) {
    obj[m] = vi.fn().mockReturnValue(obj)
  }

  obj.single = vi.fn().mockResolvedValue({ data, error })
  obj.maybeSingle = vi.fn().mockResolvedValue({ data, error })

  // Make the builder itself a promise (for queries that don't call .single())
  const result = { data: Array.isArray(data) ? data : [], error, count }
  obj.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve)

  return obj
}
