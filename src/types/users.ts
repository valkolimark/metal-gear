import type { SubscriptionTier } from '@/lib/constants'
import type { Tables } from './database'

export interface User {
  id: string
  email: string
  created_at: string
}

export type Profile = Tables<'profiles'> & {
  subscription_tier: SubscriptionTier
}
