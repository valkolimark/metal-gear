'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export type AuthProvider = 'email' | 'google' | 'apple' | 'unknown'

export interface ProviderLookupResult {
  /** Known sign-in providers for this email. Empty array = no account or unknown. */
  providers: AuthProvider[]
  /** True iff `email` is one of the providers (i.e. the account has a password). */
  hasPassword: boolean
  /** The single "canonical" provider to recommend to the user, or null. */
  primary: AuthProvider | null
  /** True iff the email matched a row in `auth.users`. */
  exists: boolean
}

const EMPTY_RESULT: ProviderLookupResult = {
  providers: [],
  hasPassword: false,
  primary: null,
  exists: false,
}

/**
 * Resolve which auth provider(s) are registered for an email.
 *
 * Uses the `public.get_auth_providers_for_email(text)` SECURITY DEFINER
 * RPC, which is granted to `service_role` only. This action must only
 * be invoked *after* a user has proven intent to sign in (e.g. a failed
 * password attempt or a forgot-password submission) — never on page
 * load — so we don't leak account existence to a drive-by attacker.
 */
export async function getProvidersForEmail(
  email: string
): Promise<ProviderLookupResult> {
  const trimmed = email.trim().toLowerCase()
  if (!trimmed || !trimmed.includes('@')) return EMPTY_RESULT

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.rpc as any)(
    'get_auth_providers_for_email',
    { p_email: trimmed }
  )

  if (error) {
    console.error('[getProvidersForEmail] RPC failed:', error.message)
    return EMPTY_RESULT
  }

  const raw = (data ?? []) as string[]
  if (raw.length === 0) return EMPTY_RESULT

  const providers: AuthProvider[] = raw.map((p) => {
    if (p === 'email' || p === 'google' || p === 'apple') return p
    return 'unknown'
  })

  const hasPassword = providers.includes('email')

  // Recommend the most specific provider. Email+OAuth legacy accounts are
  // told to use the password (safer: they already know it).
  let primary: AuthProvider | null = null
  if (providers.length === 1) {
    primary = providers[0]
  } else if (hasPassword) {
    primary = 'email'
  } else if (providers.includes('google')) {
    primary = 'google'
  } else if (providers.includes('apple')) {
    primary = 'apple'
  }

  return {
    providers,
    hasPassword,
    primary,
    exists: true,
  }
}
