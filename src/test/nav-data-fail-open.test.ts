import { describe, it, expect, vi, beforeEach } from 'vitest'

const getUserMock = vi.fn(async () => ({ data: { user: { id: 'user-1', email: 'u@example.com' } } }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: getUserMock } })),
}))

// Per-table mocks. Each `from(table)` returns a query builder whose terminal
// behavior is configured via `mockResolvedValues`. We intercept the final
// terminal call (`then(resolve, reject)`).
type Outcome = { kind: 'ok'; payload: unknown } | { kind: 'reject'; reason: unknown }

const outcomes: Record<string, Outcome[]> = {}

function takeOutcome(table: string): Outcome {
  const queue = outcomes[table] ?? []
  return queue.shift() ?? { kind: 'ok', payload: { data: null, count: 0 } }
}

function makeBuilder(table: string) {
  function then(resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) {
    const outcome = takeOutcome(table)
    if (outcome.kind === 'reject') return Promise.reject(outcome.reason).catch(reject)
    return Promise.resolve(outcome.payload).then(resolve)
  }
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    or: () => builder,
    neq: () => builder,
    is: () => builder,
    gte: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => builder,
    single: () => builder,
    then,
  }
  return builder
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => makeBuilder(table),
  }),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({ get: () => undefined }),
}))

vi.mock('@/app/actions/company', () => ({
  getUserCompanies: vi.fn(async () => []),
}))

describe('getNavContext fail-open behavior', () => {
  beforeEach(() => {
    for (const key of Object.keys(outcomes)) delete outcomes[key]
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1', email: 'u@example.com' } } })
  })

  it('returns null when unauthenticated', async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } } as never)
    const { getNavContext } = await import('@/lib/layout/nav-data')
    const ctx = await getNavContext()
    expect(ctx).toBeNull()
  })

  it('returns badges = 0 when every badge query fails', async () => {
    outcomes.conversations = [{ kind: 'reject', reason: new Error('conv fail') }]
    outcomes.user_equipment_interests = [{ kind: 'reject', reason: new Error('interests fail') }]
    outcomes.profiles = [{ kind: 'reject', reason: new Error('profile fail') }]
    outcomes.messages = [{ kind: 'reject', reason: new Error('msg fail') }]
    outcomes.sos_requests = [{ kind: 'reject', reason: new Error('sos fail') }]
    outcomes.contact_credits = [{ kind: 'reject', reason: new Error('credits fail') }]

    const { getNavContext } = await import('@/lib/layout/nav-data')
    const ctx = await getNavContext()
    expect(ctx).not.toBeNull()
    expect(ctx!.badges.unreadMessages).toBe(0)
    expect(ctx!.badges.activeSosInCategories).toBe(0)
    expect(ctx!.badges.creditsBalance).toBe(0)
  })

  it('still renders user with sensible defaults when profile lookup returns empty', async () => {
    outcomes.profiles = [{ kind: 'ok', payload: { data: null } }]
    const { getNavContext } = await import('@/lib/layout/nav-data')
    const ctx = await getNavContext()
    expect(ctx).not.toBeNull()
    expect(ctx!.user.userId).toBe('user-1')
    expect(ctx!.user.displayName).toBeTruthy()
    expect(ctx!.user.initials.length).toBeGreaterThan(0)
    expect(ctx!.user.subscriptionTier).toBe('free')
  })

  it('reads badges from successful queries', async () => {
    outcomes.conversations = [{ kind: 'ok', payload: { data: [{ id: 'c1' }] } }]
    outcomes.user_equipment_interests = [{ kind: 'ok', payload: { data: [{ tier2: 'pumps' }] } }]
    outcomes.profiles = [{ kind: 'ok', payload: { data: { id: 'user-1', display_name: 'Mark M', avatar_url: null, subscription_tier: 'pro', is_admin: false } } }]
    outcomes.messages = [{ kind: 'ok', payload: { count: 7 } }]
    outcomes.sos_requests = [{ kind: 'ok', payload: { count: 4 } }]
    outcomes.contact_credits = [{ kind: 'ok', payload: { data: { credits_remaining: 25 } } }]

    const { getNavContext } = await import('@/lib/layout/nav-data')
    const ctx = await getNavContext()
    expect(ctx).not.toBeNull()
    expect(ctx!.badges.unreadMessages).toBe(7)
    expect(ctx!.badges.activeSosInCategories).toBe(4)
    expect(ctx!.badges.creditsBalance).toBe(25)
    expect(ctx!.user.displayName).toBe('Mark M')
    expect(ctx!.user.initials).toBe('MM')
    expect(ctx!.user.subscriptionTier).toBe('pro')
  })
})
