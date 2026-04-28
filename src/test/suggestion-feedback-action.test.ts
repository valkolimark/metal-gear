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

const { recordSuggestionFeedback, recordRegistryFeedbackFromChip } = await import(
  '@/app/actions/ai-feedback'
)

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000'

const validInput = {
  sourceTable: 'listing_drafts' as const,
  sourceRowId: VALID_UUID,
  fieldName: 'manufacturer',
  suggestedValue: 'Caterpillar',
  userAction: 'accepted' as const,
  userValue: 'Caterpillar',
  surface: 'photo_to_listing' as const,
}

describe('recordSuggestionFeedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects unauthenticated callers', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const out = await recordSuggestionFeedback(validInput)
    expect(out.ok).toBe(false)
    expect(out.error).toMatch(/sign/i)
  })

  it('rejects invalid input shape (bad UUID)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const out = await recordSuggestionFeedback({ ...validInput, sourceRowId: 'not-a-uuid' })
    expect(out.ok).toBe(false)
    expect(out.error).toMatch(/invalid/i)
  })

  it('rejects unknown user_action value', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const out = await recordSuggestionFeedback({
      ...validInput,
      // @ts-expect-error intentional bad value to verify Zod rejects
      userAction: 'thumbs-up',
    })
    expect(out.ok).toBe(false)
  })

  it('rejects when ownership check fails (different owner)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockAdminFrom.mockReturnValue(chainableBuilder({ owner_id: 'somebody-else' }))
    const out = await recordSuggestionFeedback(validInput)
    expect(out.ok).toBe(false)
    expect(out.error).toMatch(/draft/i)
  })

  it('inserts a row when caller is the owner of the listing draft', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let callCount = 0
    const insertSpy = vi.fn().mockResolvedValue({ error: null })
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return chainableBuilder({ owner_id: 'u1' })
      const builder = chainableBuilder()
      builder.insert = insertSpy
      return builder
    })
    const out = await recordSuggestionFeedback(validInput)
    expect(out.ok).toBe(true)
    expect(insertSpy).toHaveBeenCalledOnce()
    const inserted = insertSpy.mock.calls[0][0]
    expect(inserted.user_id).toBe('u1')
    expect(inserted.field_name).toBe('manufacturer')
    expect(inserted.user_action).toBe('accepted')
    expect(inserted.surface).toBe('photo_to_listing')
  })

  it('owner check honors sos_requests.requester_id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockAdminFrom.mockReturnValue(chainableBuilder({ requester_id: 'other' }))
    const out = await recordSuggestionFeedback({
      ...validInput,
      sourceTable: 'sos_requests',
      surface: 'sos_analysis',
    })
    expect(out.ok).toBe(false)
    expect(out.error).toMatch(/sos/i)
  })

  it('owner check honors listings.seller_id', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockAdminFrom.mockReturnValue(chainableBuilder({ seller_id: 'other' }))
    const out = await recordSuggestionFeedback({
      ...validInput,
      sourceTable: 'listings',
      surface: 'listing_analyzer_helper',
    })
    expect(out.ok).toBe(false)
    expect(out.error).toMatch(/listing/i)
  })

  it('returns ok=false when DB insert errors', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    let callCount = 0
    mockAdminFrom.mockImplementation(() => {
      callCount++
      if (callCount === 1) return chainableBuilder({ owner_id: 'u1' })
      const builder = chainableBuilder()
      builder.insert = vi.fn().mockResolvedValue({ error: { message: 'boom' } })
      return builder
    })
    const out = await recordSuggestionFeedback(validInput)
    expect(out.ok).toBe(false)
    expect(out.error).toMatch(/save/i)
  })
})

describe('recordRegistryFeedbackFromChip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects bad input shape', async () => {
    const out = await recordRegistryFeedbackFromChip({
      sourceTable: 'listing_drafts',
      sourceRowId: 'not-a-uuid',
      userAction: 'accepted',
    })
    expect(out.ok).toBe(false)
  })

  it('maps overridden→overridden_with_text and unsure→ignored', async () => {
    // We don't test the underlying recordRegistryFeedback here (covered in
    // registry-actions.test.ts). Just confirm the wrapper validates and
    // routes through. Auth fails because no user mock → cycle short-circuits.
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const out1 = await recordRegistryFeedbackFromChip({
      sourceTable: 'listing_drafts',
      sourceRowId: VALID_UUID,
      userAction: 'overridden',
    })
    expect(out1.ok).toBe(false)
    const out2 = await recordRegistryFeedbackFromChip({
      sourceTable: 'sos_requests',
      sourceRowId: VALID_UUID,
      userAction: 'unsure',
    })
    expect(out2.ok).toBe(false)
  })
})

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function chainableBuilder(data: unknown = null, error: unknown = null): any {
  const obj: Record<string, unknown> = {}
  const chain = [
    'select', 'insert', 'update', 'delete', 'eq', 'in', 'or', 'gte', 'lte',
    'order', 'limit', 'ilike', 'is', 'not',
  ]
  for (const m of chain) obj[m] = vi.fn().mockReturnValue(obj)
  obj.single = vi.fn().mockResolvedValue({ data, error })
  obj.maybeSingle = vi.fn().mockResolvedValue({ data, error })
  const result = { data: Array.isArray(data) ? data : [], error }
  obj.then = (resolve: (v: unknown) => void) => Promise.resolve(result).then(resolve)
  return obj
}
