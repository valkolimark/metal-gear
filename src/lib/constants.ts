export const TIER_LIMITS = {
  free: {
    listings: 3,
    photos: 5,
    videos: 0,
    conversations: 10,
    searchRadius: 100,
    matchExpiry: 48,
  },
  premium: {
    listings: 15,
    photos: 15,
    videos: 3,
    conversations: Infinity,
    searchRadius: 500,
    matchExpiry: 168,
  },
  boost: {
    listings: 50,
    photos: 25,
    videos: 5,
    conversations: Infinity,
    searchRadius: Infinity,
    matchExpiry: 336,
  },
} as const

export type SubscriptionTier = keyof typeof TIER_LIMITS

export const EQUIPMENT_CATEGORIES = [
  'CNC Machines',
  'Lathes',
  'Milling Machines',
  'Drilling Machines',
  'Grinding Machines',
  'Welding Equipment',
  'Compressors',
  'Generators',
  'Pumps',
  'Valves',
  'Heat Exchangers',
  'Transformers',
  'Cranes & Hoists',
  'Forklifts',
  'Conveyors',
  'Tanks & Vessels',
  'Piping',
  'Electrical Equipment',
  'Safety Equipment',
  'Hand Tools',
  'Other',
] as const

export const INDUSTRIES = [
  'Oil & Gas',
  'Petrochemical',
  'Mining',
  'Manufacturing',
  'CNC Machining',
  'Aerospace',
  'Construction',
  'Power Generation',
  'Water Treatment',
  'Food & Beverage',
  'Pharmaceutical',
  'Other',
] as const

export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' },
  { value: 'distance', label: 'Nearest First' },
] as const

export const APP_NAME = 'Metal Gear'
export const APP_DESCRIPTION = 'Industrial Equipment Marketplace — Houston, TX'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
