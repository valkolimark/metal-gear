'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import type { Profile } from '@/types/users'

async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .single()
  return data as Profile | null
}

/**
 * Hydrates auth state from Supabase on mount and listens for auth changes.
 * Place this in the root layout so it runs once for the entire app.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setLoading } = useAuthStore()

  useEffect(() => {
    const supabase = createClient()

    // Get initial session
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUser({
          id: user.id,
          email: user.email!,
          created_at: user.created_at,
        })
        // Fetch profile (may not exist yet for new users)
        const profile = await fetchProfile(user.id).catch(() => null)
        if (profile) setProfile(profile)
      }
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
          const profile = await fetchProfile(session.user.id).catch(() => null)
          if (profile) setProfile(profile)
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
