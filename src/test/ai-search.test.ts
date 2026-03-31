import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/cache
vi.mock('next/cache', () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
}))

// Mock the anthropic client
const mockCreate = vi.fn()
vi.mock('@/lib/anthropic', () => ({
  anthropic: {
    messages: {
      create: (...args: unknown[]) => mockCreate(...args),
    },
  },
}))

// Mock supabase admin client — chainable
function chainable(resolveData = { data: [], count: 0, error: null }) {
  const chain: Record<string, unknown> = {}
  const methods = [
    'from', 'select', 'eq', 'in', 'gte', 'lte', 'or', 'ilike',
    'textSearch', 'order', 'limit', 'not',
  ]
  for (const m of methods) {
    chain[m] = vi.fn(() => {
      // .limit() resolves the chain
      if (m === 'limit') return Promise.resolve(resolveData)
      return chain
    })
  }
  return chain
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => chainable(),
}))

function makeClaudeResponse(jsonObj: Record<string, unknown>) {
  return {
    content: [{ type: 'text', text: JSON.stringify(jsonObj) }],
  }
}

describe('AI Search — Filter Extraction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('extracts category and price from centrifuge query', async () => {
    const expected = {
      intent: 'search',
      filters: {
        tier2: 'processing_separation',
        subcategories: ['centrifugal_separators'],
        maxPrice: 50000,
        keywords: 'centrifuge oily water separation',
      },
      explanation: 'Searching for centrifugal separators under $50,000...',
    }

    mockCreate.mockResolvedValueOnce(makeClaudeResponse(expected))

    const { POST } = await import('@/app/api/search/ai/route')
    const request = new Request('http://localhost/api/search/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'centrifuge for oily water separation, Houston area, under 50k',
      }),
    })

    const response = await POST(request as unknown as import('next/server').NextRequest)
    const data = await response.json()

    expect(data.ai.intent).toBe('search')
    expect(data.ai.filters.maxPrice).toBe(50000)
    expect(data.ai.filters.subcategories).toContain('centrifugal_separators')
  })

  it('extracts manufacturer and condition from brand query', async () => {
    const expected = {
      intent: 'search',
      filters: {
        tier2: 'processing_separation',
        manufacturer: 'Alfa Laval',
        condition: ['good', 'like_new'],
        keywords: 'decanter 3 phase',
      },
      explanation: 'Searching for Alfa Laval decanter centrifuges...',
    }

    mockCreate.mockResolvedValueOnce(makeClaudeResponse(expected))

    const { POST } = await import('@/app/api/search/ai/route')
    const request = new Request('http://localhost/api/search/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'decanter, Alfa Laval or Andritz, good condition, 3 phase',
      }),
    })

    const response = await POST(request as unknown as import('next/server').NextRequest)
    const data = await response.json()

    expect(data.ai.filters.manufacturer).toBe('Alfa Laval')
    expect(data.ai.filters.condition).toEqual(expect.arrayContaining(['good']))
  })

  it('returns clarifying question for vague query', async () => {
    const expected = {
      intent: 'clarify',
      filters: {},
      clarifyingQuestion: 'What type of equipment are you looking for?',
      explanation: 'I need more information.',
    }

    mockCreate.mockResolvedValueOnce(makeClaudeResponse(expected))

    const { POST } = await import('@/app/api/search/ai/route')
    const request = new Request('http://localhost/api/search/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'something for my refinery' }),
    })

    const response = await POST(request as unknown as import('next/server').NextRequest)
    const data = await response.json()

    expect(data.ai.intent).toBe('clarify')
    expect(data.ai.clarifyingQuestion).toBeTruthy()
    expect(data.listings).toEqual([])
  })

  it('handles multi-turn conversation with history', async () => {
    const expected = {
      intent: 'search',
      filters: {
        tier2: 'processing_separation',
        maxPrice: 25000,
      },
      explanation: 'Filtering under $25,000.',
    }

    mockCreate.mockResolvedValueOnce(makeClaudeResponse(expected))

    const { POST } = await import('@/app/api/search/ai/route')
    const request = new Request('http://localhost/api/search/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: 'Show me cheaper ones',
        conversationHistory: [
          { role: 'user', content: '3-phase centrifuges under $50k' },
          { role: 'assistant', content: 'Searching for centrifuges under $50,000...' },
        ],
      }),
    })

    const response = await POST(request as unknown as import('next/server').NextRequest)
    const data = await response.json()

    // Verify conversation history was passed
    expect(mockCreate).toHaveBeenCalled()
    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.messages).toHaveLength(3) // 2 history + 1 new
    expect(data.ai.filters.maxPrice).toBe(25000)
  })

  it('falls back gracefully on Claude API failure', async () => {
    mockCreate.mockRejectedValueOnce(new Error('API error'))

    const { POST } = await import('@/app/api/search/ai/route')
    const request = new Request('http://localhost/api/search/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'centrifuge under 50k' }),
    })

    const response = await POST(request as unknown as import('next/server').NextRequest)
    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.error).toBe('AI search failed')
  })
})
