/**
 * Map Supabase auth error messages to user-safe, actionable copy.
 * Runs on the client — no network call. Import wherever a Supabase auth
 * error bubbles up to an `<p className="text-destructive">...` element.
 */
export function friendlyAuthError(rawMessage: string | null | undefined): string {
  if (!rawMessage) return 'Sign-in failed. Please try again.'
  const msg = rawMessage.toLowerCase()

  if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'Incorrect email or password.'
  }
  if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
    return 'Please confirm your email address. Check your inbox for a verification link.'
  }
  if (msg.includes('rate limit') || msg.includes('over_request_rate_limit')) {
    return 'Too many attempts. Please wait a minute and try again.'
  }
  if (msg.includes('user not found') || msg.includes('user_not_found')) {
    return 'No account found with that email.'
  }
  if (msg.includes('weak_password') || msg.includes('password should be at least')) {
    return 'Password must be at least 8 characters.'
  }
  if (msg.includes('otp') && msg.includes('expired')) {
    return 'This link has expired. Please request a new one.'
  }
  if (msg.includes('new password should be different')) {
    return 'Your new password must be different from your current one.'
  }
  if (msg.includes('oauth')) {
    return 'Sign-in failed. Please try again or use a different method.'
  }
  return rawMessage
}

export function providerLabel(provider: 'email' | 'google' | 'apple' | 'unknown'): string {
  switch (provider) {
    case 'email':
      return 'email and password'
    case 'google':
      return 'Google sign-in'
    case 'apple':
      return 'Apple sign-in'
    default:
      return 'another sign-in method'
  }
}
