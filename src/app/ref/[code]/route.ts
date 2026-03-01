import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const admin = createAdminClient()

  // Verify code exists
  const { data: referrer } = await admin
    .from('profiles')
    .select('id, display_name, full_name')
    .eq('referral_code', code)
    .single()

  if (!referrer) {
    // Invalid code, redirect to homepage
    return NextResponse.redirect(new URL('/signup', process.env.NEXT_PUBLIC_APP_URL || 'https://metal-gear-five.vercel.app'))
  }

  // Set referral cookie (30 day expiry)
  const cookieStore = await cookies()
  cookieStore.set('mg_referral', code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  })

  // Redirect to signup
  return NextResponse.redirect(
    new URL(`/signup?ref=${code}`, process.env.NEXT_PUBLIC_APP_URL || 'https://metal-gear-five.vercel.app')
  )
}
