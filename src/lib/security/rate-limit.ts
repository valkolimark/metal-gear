/**
 * In-memory token bucket rate limiter.
 * Per-instance on Vercel serverless — provides burst protection.
 * For global rate limits, migrate to Upstash Redis post-launch.
 */

interface Bucket {
  tokens: number
  lastRefill: number
}

const buckets = new Map<string, Bucket>()

// Cleanup every 10 minutes to prevent memory leak on long-running instances
if (typeof globalThis !== 'undefined') {
  const cleanup = () => {
    const now = Date.now()
    for (const [key, bucket] of buckets.entries()) {
      if (now - bucket.lastRefill > 10 * 60 * 1000) {
        buckets.delete(key)
      }
    }
  }
  // Use globalThis to avoid duplicate intervals in hot reload
  const g = globalThis as unknown as { _rateLimitCleanup?: ReturnType<typeof setInterval> }
  if (!g._rateLimitCleanup) {
    g._rateLimitCleanup = setInterval(cleanup, 10 * 60 * 1000)
  }
}

export interface RateLimitConfig {
  maxTokens: number
  refillRate: number // tokens per refillInterval
  refillInterval: number // ms
}

export const RATE_LIMIT_CONFIGS = {
  aiSearch: { maxTokens: 10, refillRate: 0.1, refillInterval: 1000 },
  aiCopy: { maxTokens: 5, refillRate: 0.05, refillInterval: 1000 },
  aiImageAnalysis: {
    maxTokens: 5,
    refillRate: 0.05,
    refillInterval: 1000,
  },
  aiSOS: { maxTokens: 10, refillRate: 0.1, refillInterval: 1000 },
  contactReveal: {
    maxTokens: 10,
    refillRate: 0.05,
    refillInterval: 1000,
  },
  general: { maxTokens: 60, refillRate: 1, refillInterval: 1000 },
} as const

export type RateLimitKey = keyof typeof RATE_LIMIT_CONFIGS

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetInMs: number
}

export function checkRateLimit(
  identifier: string,
  configKey: RateLimitKey
): RateLimitResult {
  const config = RATE_LIMIT_CONFIGS[configKey]
  const key = `${configKey}:${identifier}`
  const now = Date.now()

  let bucket = buckets.get(key)

  if (!bucket) {
    bucket = { tokens: config.maxTokens, lastRefill: now }
    buckets.set(key, bucket)
  }

  // Refill tokens since last check
  const elapsed = now - bucket.lastRefill
  const tokensToAdd =
    (elapsed / config.refillInterval) * config.refillRate
  bucket.tokens = Math.min(config.maxTokens, bucket.tokens + tokensToAdd)
  bucket.lastRefill = now

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1
    return {
      allowed: true,
      remaining: Math.floor(bucket.tokens),
      resetInMs: Math.ceil(
        (1 / config.refillRate) * config.refillInterval
      ),
    }
  }

  return {
    allowed: false,
    remaining: 0,
    resetInMs: Math.ceil(
      ((1 - bucket.tokens) / config.refillRate) * config.refillInterval
    ),
  }
}

export function getRequestIdentifier(request: Request): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return new Response(
    JSON.stringify({ error: 'Too many requests. Please slow down.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(result.resetInMs / 1000)),
        'X-RateLimit-Remaining': '0',
      },
    }
  )
}
