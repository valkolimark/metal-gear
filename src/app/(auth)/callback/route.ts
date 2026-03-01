import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, welcomeEmail } from '@/lib/email'
import { trackReferralSignup } from '@/app/actions/referrals'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      // Send welcome email for new users (only once)
      try {
        const admin = createAdminClient()
        const { data: profile } = await admin
          .from('profiles')
          .select('full_name, email_notifications')
          .eq('id', data.user.id)
          .single()

        const prefs = (profile?.email_notifications as Record<string, unknown>) || {}
        if (profile && !prefs.welcome_sent && data.user.email) {
          const name =
            profile.full_name ||
            data.user.user_metadata?.full_name ||
            data.user.email.split('@')[0]
          const email = welcomeEmail(name, data.user.id)
          sendEmail({ to: data.user.email, ...email }).catch(console.error)

          // Mark welcome email as sent
          await admin
            .from('profiles')
            .update({
              email_notifications: { ...prefs, welcome_sent: true },
            })
            .eq('id', data.user.id)
        }

        // Track referral signup from user metadata
        const refCode = data.user.user_metadata?.referral_code
        if (refCode && typeof refCode === 'string') {
          await trackReferralSignup(refCode, data.user.id).catch(console.error)
        }
      } catch (e) {
        console.error('Welcome email check failed:', e)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Auth code exchange failed — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`)
}
