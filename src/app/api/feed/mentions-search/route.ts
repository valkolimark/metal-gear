import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// In-memory rate limit: 60 req/min per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit
  const now = Date.now()
  const rl = rateLimitMap.get(user.id)
  if (rl && now < rl.resetAt) {
    if (rl.count >= 60) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
    }
    rl.count++
  } else {
    rateLimitMap.set(user.id, { count: 1, resetAt: now + 60_000 })
  }

  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '8', 10), 20)

  if (q.length < 1) {
    return NextResponse.json({ results: [] })
  }

  const admin = createAdminClient()

  const [{ data: users }, { data: companies }] = await Promise.all([
    admin
      .from('profiles')
      .select('id, display_name, avatar_url')
      .ilike('display_name', `%${q}%`)
      .limit(limit),
    admin
      .from('company_profiles')
      .select('id, name, slug, logo_url')
      .ilike('name', `%${q}%`)
      .limit(limit),
  ])

  const qLower = q.toLowerCase()

  type MentionResult = {
    id: string
    display_name: string
    avatar_url: string | null
    type: 'user' | 'company'
    slug: string | null
  }

  const results: MentionResult[] = []
  const seen = new Set<string>()

  // Merge, prioritizing prefix matches
  const allResults: MentionResult[] = [
    ...(users ?? []).map((u) => ({
      id: u.id,
      display_name: u.display_name ?? 'Unknown',
      avatar_url: u.avatar_url,
      type: 'user' as const,
      slug: null,
    })),
    ...(companies ?? []).map((c) => ({
      id: c.id,
      display_name: c.name,
      avatar_url: c.logo_url,
      type: 'company' as const,
      slug: c.slug,
    })),
  ]

  // Sort: prefix matches first
  allResults.sort((a, b) => {
    const aPrefix = a.display_name.toLowerCase().startsWith(qLower) ? 0 : 1
    const bPrefix = b.display_name.toLowerCase().startsWith(qLower) ? 0 : 1
    return aPrefix - bPrefix
  })

  for (const r of allResults) {
    if (seen.has(r.id)) continue
    seen.add(r.id)
    results.push(r)
    if (results.length >= limit) break
  }

  return NextResponse.json({ results })
}
