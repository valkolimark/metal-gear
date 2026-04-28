import type { EQUIPMENT_CATEGORIES, INDUSTRIES } from '@/lib/constants'
import type { Tables } from './database'

export type EquipmentCategory = (typeof EQUIPMENT_CATEGORIES)[number]
export type Industry = (typeof INDUSTRIES)[number]

export type ListingCondition =
  | 'new'
  | 'like_new'
  | 'good'
  | 'fair'
  | 'poor'
  | 'for_parts'

export type Listing = Tables<'listings'> & {
  images?: ListingImage[]
  seller?: Tables<'profiles'>
}

export type ListingImage = Tables<'listing_images'>

export type Conversation = Tables<'conversations'>
export type Message = Tables<'messages'>
export type Favorite = Tables<'favorites'>

export interface SearchFilters {
  category?: EquipmentCategory
  industries?: Industry[]
  condition?: ListingCondition[]
  priceMin?: number
  priceMax?: number
  radiusMiles?: number
  lat?: number
  lng?: number
}
