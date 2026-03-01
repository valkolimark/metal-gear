import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  const checks: Record<string, { status: string; latency_ms?: number; error?: string }> = {}
  const start = Date.now()

  // Check Supabase connection
  try {
    const dbStart = Date.now()
    const admin = createAdminClient()
    const { error } = await admin.from('profiles').select('id').limit(1)
    checks.supabase = {
      status: error ? 'unhealthy' : 'healthy',
      latency_ms: Date.now() - dbStart,
      ...(error && { error: error.message }),
    }
  } catch (e) {
    checks.supabase = {
      status: 'unhealthy',
      error: e instanceof Error ? e.message : 'Unknown error',
    }
  }

  // Check Stripe connection
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    checks.stripe = {
      status: stripeKey ? 'configured' : 'not_configured',
    }
  } catch {
    checks.stripe = { status: 'error' }
  }

  // App info
  const overall = Object.values(checks).every(
    (c) => c.status === 'healthy' || c.status === 'configured'
  )

  return NextResponse.json(
    {
      status: overall ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime_ms: Date.now() - start,
      version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'dev',
      checks,
    },
    { status: overall ? 200 : 503 }
  )
}
