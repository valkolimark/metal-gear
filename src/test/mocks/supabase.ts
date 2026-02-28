import { vi } from 'vitest'

// Mock query builder that chains
export function createMockQueryBuilder(data: unknown = null, error: unknown = null, count: number | null = null) {
  const builder: Record<string, unknown> = {}
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'in', 'or', 'gte', 'lte', 'gt', 'lt',
    'is', 'not', 'like', 'ilike', 'textSearch',
    'order', 'limit', 'range',
    'single', 'maybeSingle',
  ]

  for (const method of methods) {
    builder[method] = vi.fn().mockReturnValue(builder)
  }

  // Terminal methods return the data
  builder.single = vi.fn().mockResolvedValue({ data, error })
  builder.maybeSingle = vi.fn().mockResolvedValue({ data, error })
  builder.then = vi.fn((resolve: (value: unknown) => void) =>
    resolve({ data: Array.isArray(data) ? data : data ? [data] : [], error, count })
  )

  // Make the builder itself thenable
  Object.defineProperty(builder, 'then', {
    value: (resolve: (value: unknown) => void) =>
      Promise.resolve({ data: Array.isArray(data) ? data : data ? [data] : [], error, count }).then(resolve),
    writable: true,
    configurable: true,
  })

  return builder
}

export function createMockSupabaseClient(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
        error: null,
      }),
      ...((overrides.auth as Record<string, unknown>) || {}),
    },
    from: vi.fn().mockReturnValue(createMockQueryBuilder()),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/photo.jpg' } }),
      }),
    },
    ...overrides,
  }
}

export function createMockAdminClient(overrides: Record<string, unknown> = {}) {
  return {
    from: vi.fn().mockReturnValue(createMockQueryBuilder()),
    ...overrides,
  }
}
