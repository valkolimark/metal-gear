import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const uid = request.nextUrl.searchParams.get('uid')

  if (!uid) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // Redirect to profile page with notification settings anchor
  // User can manage their preferences there after logging in
  const url = new URL('/profile', request.url)
  url.searchParams.set('tab', 'notifications')
  return NextResponse.redirect(url)
}

export async function POST(request: NextRequest) {
  try {
    const { userId, preferences } = await request.json()

    if (!userId || !preferences) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin
      .from('profiles')
      .update({ email_notifications: preferences })
      .eq('id', userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
