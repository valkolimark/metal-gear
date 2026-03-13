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
  pro: {
    listings: 25,
    photos: 20,
    videos: 3,
    conversations: Infinity,
    searchRadius: 500,
    matchExpiry: 168,
  },
  business: {
    listings: 100,
    photos: 30,
    videos: 5,
    conversations: Infinity,
    searchRadius: Infinity,
    matchExpiry: 336,
  },
  enterprise: {
    listings: Infinity,
    photos: 50,
    videos: 10,
    conversations: Infinity,
    searchRadius: Infinity,
    matchExpiry: 720,
  },
  // Legacy tier aliases (DB may still contain these)
  premium: {
    listings: 25,
    photos: 20,
    videos: 3,
    conversations: Infinity,
    searchRadius: 500,
    matchExpiry: 168,
  },
  boost: {
    listings: 100,
    photos: 30,
    videos: 5,
    conversations: Infinity,
    searchRadius: Infinity,
    matchExpiry: 336,
  },
} as const

export type SubscriptionTier = keyof typeof TIER_LIMITS

export const TIER_PRICES = {
  free: 0,
  pro: 17900,        // $179/mo in cents
  business: 34900,    // $349/mo in cents
  enterprise: 59900,  // $599/mo in cents
  premium: 17900,     // legacy alias
  boost: 34900,       // legacy alias
} as const

export const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
  premium: 'Pro',     // legacy alias
  boost: 'Business',  // legacy alias
}

// ─── Boost Products ─────────────────────────────────────────────────

export type BoostType = 'listing_featured' | 'category_pin' | 'homepage_slot' | 'storefront_featured' | 'sos_priority'

export const BOOST_PRODUCTS: Record<BoostType, {
  label: string
  description: string
  icon: string
  needsListing: boolean
  options: { days: number; cents: number }[]
}> = {
  listing_featured: {
    label: 'Listing Featured',
    description: 'Listing appears in "Featured" carousel on browse + category pages with a Featured badge.',
    icon: 'star',
    needsListing: true,
    options: [
      { days: 7, cents: 4900 },
      { days: 14, cents: 8900 },
      { days: 30, cents: 14900 },
    ],
  },
  category_pin: {
    label: 'Category Pin',
    description: 'Listing pinned to position 1-3 on a specific category page.',
    icon: 'pin',
    needsListing: true,
    options: [
      { days: 7, cents: 7900 },
      { days: 14, cents: 13900 },
      { days: 30, cents: 22900 },
    ],
  },
  homepage_slot: {
    label: 'Homepage Slot',
    description: 'Listing or company card in the homepage featured section (limited slots).',
    icon: 'home',
    needsListing: true,
    options: [
      { days: 7, cents: 19900 },
      { days: 14, cents: 34900 },
    ],
  },
  storefront_featured: {
    label: 'Storefront Featured',
    description: 'Seller storefront promoted in "Top Sellers" widget.',
    icon: 'store',
    needsListing: false,
    options: [
      { days: 14, cents: 5900 },
      { days: 30, cents: 9900 },
    ],
  },
  sos_priority: {
    label: 'SOS Priority',
    description: 'SOS broadcasts reach 2x more responders and appear at top of dashboards.',
    icon: 'zap',
    needsListing: false,
    options: [
      { days: 7, cents: 2900 },
      { days: 14, cents: 4900 },
    ],
  },
} as const

export const PRIORITY_TIER_BOOSTS: Record<string, number> = {
  standard: 0,
  preferred: 10,
  featured: 25,
  platinum: 50,
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
