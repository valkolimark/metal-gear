import type { SubscriptionTier } from '@/lib/constants'

export interface User {
  id: string
  email: string
  created_at: string
}

export interface Profile {
  id: string
  user_id: string
  full_name: string
  display_name: string | null
  avatar_url: string | null
  phone: string | null
  company_name: string | null
  bio: string | null
  location_city: string | null
  location_state: string | null
  location_lat: number | null
  location_lng: number | null
  subscription_tier: SubscriptionTier
  is_verified_dealer: boolean
  created_at: string
  updated_at: string
}
