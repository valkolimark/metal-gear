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

const { submitReview, submitReport, getProfileCompletionPercentage } = await import(
  '@/app/actions/reputation'
)

describe('Reputation actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('submitReview', () => {
    it('rejects unauthenticated users', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } })
      const result = await submitReview('conv1', 'seller1', 5, 'Great!')
      expect(result.error).toBe('Not authenticated')
    })

    it('rejects self-reviews', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'seller1' } },
        error: null,
      })
      const result = await submitReview('conv1', 'seller1', 5, 'Great!')
      expect(result.error).toBe('Cannot review yourself')
    })

    it('rejects invalid ratings', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'buyer1' } },
        error: null,
      })
      const result = await submitReview('conv1', 'seller1', 6, 'Great!')
      expect(result.error).toBe('Rating must be 1-5')
    })

    it('rejects rating of 0', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'buyer1' } },
        error: null,
      })
      const result = await submitReview('conv1', 'seller1', 0, 'Bad!')
      expect(result.error).toBe('Rating must be 1-5')
    })

    it('rejects if user is not the buyer in the conversation', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'buyer1' } },
        error: null,
      })

      const convBuilder = chainableBuilder({ buyer_id: 'someone_else', seller_id: 'seller1' })
      mockAdminFrom.mockReturnValue(convBuilder)

      const result = await submitReview('conv1', 'seller1', 5, 'Great!')
      expect(result.error).toBe('Can only review sellers you have conversed with')
    })

    it('succeeds with valid review', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'buyer1' } },
        error: null,
      })

      const convBuilder = chainableBuilder({ buyer_id: 'buyer1', seller_id: 'seller1' })
      const insertBuilder = chainableBuilder(null, null)
      // Make insert resolve with no error
      insertBuilder.insert = vi.fn().mockResolvedValue({ error: null })

      let callCount = 0
      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'conversations') return convBuilder
        if (table === 'reviews') return insertBuilder
        return chainableBuilder()
      })

      const result = await submitReview('conv1', 'seller1', 4, 'Good seller')
      expect(result.success).toBe(true)
    })

    it('handles duplicate review error', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'buyer1' } },
        error: null,
      })

      const convBuilder = chainableBuilder({ buyer_id: 'buyer1', seller_id: 'seller1' })
      const insertBuilder = chainableBuilder(null, null)
      insertBuilder.insert = vi.fn().mockResolvedValue({ error: { code: '23505', message: 'duplicate' } })

      mockAdminFrom.mockImplementation((table: string) => {
        if (table === 'conversations') return convBuilder
        if (table === 'reviews') return insertBuilder
        return chainableBuilder()
      })

      const result = await submitReview('conv1', 'seller1', 4, 'Good seller')
      expect(result.error).toBe('You already reviewed this transaction')
    })
  })

  describe('submitReport', () => {
    it('rejects unauthenticated users', async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'No session' } })
      const result = await submitReport('listing', 'target1', 'spam', 'Details')
      expect(result.error).toBe('Not authenticated')
    })

    it('rejects empty reason', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user1' } },
        error: null,
      })
      const result = await submitReport('listing', 'target1', '  ', 'Details')
      expect(result.error).toBe('Reason is required')
    })

    it('succeeds with valid report', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: 'user1' } },
        error: null,
      })

      const insertBuilder = chainableBuilder(null, null)
      insertBuilder.insert = vi.fn().mockResolvedValue({ error: null })
      mockAdminFrom.mockReturnValue(insertBuilder)

      const result = await submitReport('listing', 'target1', 'spam', 'This is spam')
      expect(result.success).toBe(true)
    })
  })

  describe('getProfileCompletionPercentage', () => {
    it('returns 0 for missing profile', async () => {
      const profileBuilder = chainableBuilder(null)
      mockAdminFrom.mockReturnValue(profileBuilder)

      const result = await getProfileCompletionPercentage('user1')
      expect(result.percentage).toBe(0)
    })

    it('calculates correct percentage with all fields', async () => {
      const profileBuilder = chainableBuilder({
        full_name: 'John Doe',
        display_name: 'johnd',
        company_name: 'Acme',
        bio: 'Industrial equipment specialist',
        phone: '555-1234',
        industry: 'Manufacturing',
        location_city: 'Houston',
        avatar_url: 'https://example.com/avatar.jpg',
      })
      mockAdminFrom.mockReturnValue(profileBuilder)

      const result = await getProfileCompletionPercentage('user1')
      expect(result.percentage).toBe(100)
    })

    it('calculates partial completion', async () => {
      const profileBuilder = chainableBuilder({
        full_name: 'John Doe', // 15
        display_name: null,
        company_name: null,
        bio: null,
        phone: null,
        industry: null,
        location_city: 'Houston', // 10
        avatar_url: null,
      })
      mockAdminFrom.mockReturnValue(profileBuilder)

      const result = await getProfileCompletionPercentage('user1')
      expect(result.percentage).toBe(25) // 15 + 10
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
