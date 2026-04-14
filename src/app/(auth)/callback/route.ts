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
      // Cross-method linking guard.
      //
      // Skip for the password-recovery flow: `next=/reset-password` always
      // means the user clicked a reset-password email, so we must preserve
      // the recovery session and let them set a new password. Any other
      // callback (OAuth sign-in, email confirmation) is fair game.
      //
      // If the user already has both `email` (password) AND an OAuth
      // identity after this exchange, Supabase's automatic identity
      // linking merged two accounts. That's the exact case the user
      // reported as "I can sign in with Google into my email account" —
      // we sign them out and redirect back to /login with a message
      // telling them to use their password instead.
      if (next !== '/reset-password') {
        const identities = data.user.identities ?? []
        const providers = new Set(identities.map((i) => i.provider))
        const hasEmailIdentity = providers.has('email')
        const hasOAuthIdentity = providers.has('google') || providers.has('apple')

        if (hasEmailIdentity && hasOAuthIdentity) {
          // Immediately kill the session before redirecting.
          await supabase.auth.signOut().catch(() => {})
          return NextResponse.redirect(
            `${origin}/login?error=wrong_method&provider=email`
          )
        }
      }

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
