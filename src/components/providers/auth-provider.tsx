'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { getCurrentUser, fetchProfileServer } from '@/app/actions'
import type { Profile } from '@/types/users'

/**
 * Hydrates auth state from Supabase on mount and listens for auth changes.
 * Place this in the root layout so it runs once for the entire app.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()

    // Get initial session via server action (bypasses client-side RLS issues)
    getCurrentUser().then((result) => {
      if (result) {
        setUser(result.user)
        if (result.profile) setProfile(result.profile as Profile)
      }
      setLoading(false)
    }).catch(() => {
      setLoading(false)
    })

    // Listen for auth changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email!,
          created_at: session.user.created_at,
        })
        if (event === 'SIGNED_IN') {
          const profile = await fetchProfileServer(session.user.id).catch(() => null)
          if (profile) setProfile(profile as Profile)
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setProfile, setLoading])

  return <>{children}</>
}
