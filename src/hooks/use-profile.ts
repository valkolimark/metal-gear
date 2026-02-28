'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import type { Profile } from '@/types/users'

async function fetchProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    // PGRST116 = no rows returned — expected for new users without a profile
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data as Profile
}

export function useProfile() {
  const user = useAuthStore((s) => s.user)

  return useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user?.id,
  })
}
