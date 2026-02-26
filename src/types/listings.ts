import type { EQUIPMENT_CATEGORIES, INDUSTRIES } from '@/lib/constants'

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number]
export type Industry = (typeof INDUSTRIES)[number]

export type ListingCondition =
  | 'new'
  | 'like_new'
  | 'good'
  | 'fair'
  | 'poor'
  | 'for_parts'

export interface Listing {
  id: string
  seller_id: string
  title: string
  description: string
  category: EquipmentCategory
  industry: Industry
  condition: ListingCondition
  price_cents: number
  negotiable: boolean
  location_lat: number
  location_lng: number
  location_city: string
  location_state: string
  photos: string[]
  videos: string[]
  specifications: Record<string, string>
  ai_quality_score: number | null
  status: 'draft' | 'active' | 'sold' | 'expired' | 'removed'
  created_at: string
  updated_at: string
}

export interface SearchFilters {
  category?: EquipmentCategory
  industry?: Industry
  condition?: ListingCondition[]
  priceMin?: number
  priceMax?: number
  radiusMiles?: number
  lat?: number
  lng?: number
}
