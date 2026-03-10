import { create } from 'zustand'
import type { User, Profile } from '@/types/users'
import type { SubscriptionTier } from '@/lib/constants'
import type { CompanyWithRole } from '@/types/company'

interface AuthStore {
  user: User | null
  profile: Profile | null
  tier: SubscriptionTier
  isLoading: boolean
  isAuthenticated: boolean
  activeCompany: CompanyWithRole | null
  userCompanies: CompanyWithRole[]
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  setLoading: (loading: boolean) => void
  setActiveCompany: (company: CompanyWithRole | null) => void
  setUserCompanies: (companies: CompanyWithRole[]) => void
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  profile: null,
  tier: 'free',
  isLoading: true,
  isAuthenticated: false,
  activeCompany: null,
  userCompanies: [],
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setProfile: (profile) =>
    set({ profile, tier: profile?.subscription_tier ?? 'free' }),
  setLoading: (isLoading) => set({ isLoading }),
  setActiveCompany: (company) => {
    set({ activeCompany: company })
    if (typeof document !== 'undefined' && company) {
      document.cookie = `active_company_id=${company.id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
    }
  },
  setUserCompanies: (companies) => set({ userCompanies: companies }),
  signOut: async () => {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    // Clear active_company_id cookie
    if (typeof document !== 'undefined') {
      document.cookie = 'active_company_id=; path=/; max-age=0'
    }
    set({
      user: null,
      profile: null,
      tier: 'free',
      isAuthenticated: false,
      activeCompany: null,
      userCompanies: [],
    })
  },
}))
