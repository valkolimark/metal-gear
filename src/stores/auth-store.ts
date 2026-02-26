import { create } from 'zustand'
import type { User, Profile } from '@/types/users'
import type { SubscriptionTier } from '@/lib/constants'

interface AuthStore {
  user: User | null
  profile: Profile | null
  tier: SubscriptionTier
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  tier: 'free',
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setProfile: (profile) =>
    set({ profile, tier: profile?.subscription_tier ?? 'free' }),
  setLoading: (isLoading) => set({ isLoading }),
  signOut: async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    set({
      user: null,
      profile: null,
      tier: 'free',
      isAuthenticated: false,
    })
  },
}))
