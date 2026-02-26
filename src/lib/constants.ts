// ─── Subscription Tiers ──────────────────────────────────────────────

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

export const TIER_PRICES = {
  free: 0,
  premium: 2999, // $29.99/mo in cents
  boost: 7999,   // $79.99/mo in cents
} as const

export const TIER_LABELS: Record<SubscriptionTier, string> = {
  free: 'Free',
  premium: 'Premium',
  boost: 'Boost',
}

// ─── Equipment ───────────────────────────────────────────────────────

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

export const LISTING_CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'for_parts', label: 'For Parts' },
] as const

export const LISTING_STATUSES = [
  'draft',
  'active',
  'sold',
  'expired',
  'removed',
] as const

// ─── Search & Sort ───────────────────────────────────────────────────

export const SORT_OPTIONS = [
  { value: 'relevance', label: 'Most Relevant' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'newest', label: 'Newest First' },
  { value: 'distance', label: 'Nearest First' },
] as const

// ─── App ─────────────────────────────────────────────────────────────

export const APP_NAME = 'Metal Gear'
export const APP_DESCRIPTION = 'Industrial Equipment Marketplace — Houston, TX'
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

// Houston, TX default coordinates
export const DEFAULT_LOCATION = {
  lat: 29.7604,
  lng: -95.3698,
  city: 'Houston',
  state: 'TX',
} as const

// File upload limits
export const UPLOAD_LIMITS = {
  maxPhotoSizeMB: 10,
  maxVideoSizeMB: 100,
  acceptedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  acceptedVideoTypes: ['video/mp4', 'video/quicktime'],
} as const
