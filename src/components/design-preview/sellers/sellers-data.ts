export type StorefrontKind = 'company' | 'person'

export type CoverTile = { kind: 'photo'; bg: string; label: string }

export type Service = {
  id: string
  label: string
  sub: string
  sla: string
  from: number
}

export type Location = {
  id: string
  city: string
  role: string
  phone: string
  radius: number
  primary: boolean
  x: number
  y: number
}

export type Cert = { label: string; sub: string; color: string }
export type TeamMember = { tag: string; name: string; role: string; color: string }

export type Storefront = {
  kind: StorefrontKind
  id: string
  name: string
  tag: string
  legal: string
  tagline: string
  pitch: string
  avatarColor: string
  headerColor: string
  coverTiles: CoverTile[]
  hq: string
  serviceArea: string
  founded: number
  joined: string
  rating: number
  reviews: number
  txCount: number
  responseRate: number
  responseTime: string
  oncall: string
  followers: number
  hours: string
  hoursStatus: 'open' | 'closed'
  verified: string[]
  industries: string[]
  services: Service[]
  locations: Location[]
  certs: Cert[]
  team: TeamMember[] | null
}

export const STOREFRONT_COMPANY: Storefront = {
  kind: 'company',
  id: 's-bayou',
  name: 'Bayou Industrial Group',
  tag: 'BG',
  legal: 'Bayou Industrial Group, LLC',
  tagline: 'Industrial centrifuge specialists — buy, sell, rebuild.',
  pitch:
    'Since 1987, we\'ve rebuilt and resold over 4,200 industrial centrifuges across the Gulf Coast. Documented runout reports on every refurb. 24/7 SOS line for emergency field service.',
  avatarColor: 'linear-gradient(135deg, #0B2545 0%, #1877F2 100%)',
  headerColor: '#0B2545',
  coverTiles: [
    {
      kind: 'photo',
      bg: 'linear-gradient(135deg, #1E3A8A 0%, #1877F2 60%, #3D9BD6 100%)',
      label: 'Decanter rebuild bay',
    },
    {
      kind: 'photo',
      bg: 'linear-gradient(135deg, #155E75 0%, #0EA5E9 100%)',
      label: 'Bowl reconditioning',
    },
    {
      kind: 'photo',
      bg: 'linear-gradient(135deg, #831843 0%, #DB2777 100%)',
      label: 'Field service rig',
    },
    {
      kind: 'photo',
      bg: 'linear-gradient(135deg, #1F2937 0%, #4B5563 100%)',
      label: 'Inspection bay',
    },
  ],
  hq: 'Channelview, TX',
  serviceArea: 'TX · LA · MS · Gulf Coast',
  founded: 1987,
  joined: 'Joined Aug 2018',
  rating: 4.8,
  reviews: 187,
  txCount: 312,
  responseRate: 94,
  responseTime: '~22 min',
  oncall: '24/7 SOS',
  followers: 8420,
  hours: 'Open · 7 AM – 7 PM CT',
  hoursStatus: 'open',
  verified: ['identity', 'insurance', 'tax', 'banking'],
  industries: ['Oil & Gas', 'Refining', 'Petrochemical', 'Wastewater', 'Power gen', 'Marine'],
  services: [
    { id: 'rebuild', label: 'Decanter rebuilds', sub: 'Full teardown, runout, balance', sla: '5–10 days', from: 28000 },
    { id: 'bowl', label: 'Bowl reconditioning', sub: 'Hard-coat, dynamic balance', sla: '3–5 days', from: 12000 },
    { id: 'gearbox', label: 'Gearbox service', sub: 'On-site or shop', sla: '2–5 days', from: 8400 },
    { id: 'field', label: 'Field service', sub: '24/7 emergency dispatch', sla: 'Same-day', from: 1850 },
    { id: 'inspect', label: 'Inspection / runout', sub: 'Documented to API 670', sla: 'Same-day', from: 950 },
    { id: 'logistics', label: 'Freight / rigging', sub: 'In-house heavy haul', sla: 'On request', from: 0 },
  ],
  locations: [
    {
      id: 'hou',
      city: 'Channelview, TX',
      role: 'HQ + main shop',
      phone: '(281) 555-0144',
      radius: 250,
      primary: true,
      x: 0.46,
      y: 0.62,
    },
    {
      id: 'lc',
      city: 'Lake Charles, LA',
      role: 'Field service depot',
      phone: '(337) 555-0192',
      radius: 180,
      primary: false,
      x: 0.62,
      y: 0.58,
    },
    {
      id: 'mob',
      city: 'Mobile, AL',
      role: 'Marine satellite',
      phone: '(251) 555-0117',
      radius: 150,
      primary: false,
      x: 0.78,
      y: 0.61,
    },
  ],
  certs: [
    { label: 'ISO 9001:2015', sub: 'Quality mgmt', color: '#0EA5E9' },
    { label: 'API 670 Compliant', sub: 'Machinery protection', color: '#155E75' },
    { label: 'ASME B73.1', sub: 'Pump standards', color: '#0B2545' },
    { label: 'OSHA VPP Star', sub: 'Safety program', color: '#16A34A' },
    { label: 'TWIC employer', sub: 'Port access', color: '#FF6B2B' },
  ],
  team: [
    { tag: 'JT', name: 'John Theriot', role: 'Owner / President', color: '#0B2545' },
    { tag: 'RK', name: 'Renée Khoury', role: 'Process engineer', color: '#831843' },
    { tag: 'DP', name: 'Dwayne Pellerin', role: 'Shop foreman', color: '#155E75' },
    { tag: 'AM', name: 'Alex Moreau', role: 'Field service lead', color: '#1877F2' },
    { tag: 'JL', name: 'Janelle Lavergne', role: 'Sales / quoting', color: '#94A3B8' },
  ],
}

export const STOREFRONT_PERSON: Storefront = {
  kind: 'person',
  id: 's-marcus',
  name: 'Marcus Tate',
  tag: 'MT',
  legal: 'Tate Mechanical Services',
  tagline: 'Independent decanter rebuild & 3 AM SOS field tech.',
  pitch:
    'Twelve years on Alfa Laval, Sulzer, and GEA decanters. Houston-based, willing to drive anywhere on the Gulf Coast for a real emergency. I document everything, photograph every step, and stand behind the work.',
  avatarColor: 'linear-gradient(135deg, #831843 0%, #BE185D 100%)',
  headerColor: '#831843',
  coverTiles: [
    {
      kind: 'photo',
      bg: 'linear-gradient(135deg, #831843 0%, #BE185D 100%)',
      label: 'On-site teardown',
    },
    {
      kind: 'photo',
      bg: 'linear-gradient(135deg, #1E3A8A 0%, #1877F2 100%)',
      label: 'Bowl runout check',
    },
    {
      kind: 'photo',
      bg: 'linear-gradient(135deg, #155E75 0%, #0EA5E9 100%)',
      label: 'Vibration analysis',
    },
    {
      kind: 'photo',
      bg: 'linear-gradient(135deg, #1F2937 0%, #4B5563 100%)',
      label: 'Shop work',
    },
  ],
  hq: 'Houston, TX',
  serviceArea: 'Gulf Coast (will travel)',
  founded: 2013,
  joined: 'Joined Feb 2022',
  rating: 4.9,
  reviews: 47,
  txCount: 86,
  responseRate: 98,
  responseTime: '~8 min',
  oncall: '24/7 SOS',
  followers: 1240,
  hours: 'Active now',
  hoursStatus: 'open',
  verified: ['identity', 'insurance', 'tax'],
  industries: ['Oil & Gas', 'Refining', 'Petrochemical'],
  services: [
    { id: 'rebuild', label: 'Decanter rebuild', sub: 'On-site or shop', sla: '3–7 days', from: 18500 },
    { id: 'bowl', label: 'Bowl runout shim', sub: 'Documented to spec', sla: '1–2 days', from: 4800 },
    { id: 'gearbox', label: 'Gearbox swap', sub: 'Hot-zone capable', sla: '1–3 days', from: 6200 },
    { id: 'field', label: 'SOS field service', sub: 'Will travel anywhere', sla: '< 4 hrs', from: 1450 },
    { id: 'vibe', label: 'Vibration analysis', sub: 'API 670 compliant', sla: 'Same-day', from: 850 },
  ],
  locations: [
    {
      id: 'hou',
      city: 'Houston, TX',
      role: 'Home base',
      phone: '(713) 555-0274',
      radius: 400,
      primary: true,
      x: 0.46,
      y: 0.62,
    },
  ],
  certs: [
    { label: 'API 670', sub: 'Machinery protection', color: '#155E75' },
    { label: 'ASME Y14.5', sub: 'GD&T', color: '#0EA5E9' },
    { label: 'OSHA 30', sub: 'Construction', color: '#16A34A' },
    { label: 'TWIC', sub: 'Port access', color: '#FF6B2B' },
  ],
  team: null,
}

export type StorefrontListing = {
  id: string
  bg: number
  title: string
  sub: string
  year: number
  condition: string
  price: number
  views: number
  faves: number
  status: 'active' | 'featured'
}

export const STOREFRONT_LISTINGS: StorefrontListing[] = [
  { id: 'L-2041', bg: 0, title: 'Alfa Laval MAB-104', sub: 'Disc separator', year: 2018, condition: 'Excellent', price: 28500, views: 487, faves: 32, status: 'active' },
  { id: 'L-2039', bg: 4, title: 'Sulzer CS18-4', sub: 'Decanter', year: 2017, condition: 'Good', price: 64000, views: 312, faves: 18, status: 'featured' },
  { id: 'L-2036', bg: 1, title: 'Westfalia OSE-20', sub: 'Separator', year: 2020, condition: 'New', price: 42000, views: 198, faves: 12, status: 'active' },
  { id: 'L-2034', bg: 5, title: 'Alfa Laval BTUX-510', sub: 'Decanter', year: 2019, condition: 'Excellent', price: 88500, views: 421, faves: 27, status: 'featured' },
  { id: 'L-2031', bg: 2, title: 'GEA CF 6000', sub: 'Decanter', year: 2016, condition: 'Refurb', price: 52000, views: 167, faves: 9, status: 'active' },
  { id: 'L-2028', bg: 3, title: 'Sulzer NPS-200', sub: 'Pump skid', year: 2020, condition: 'Good', price: 18500, views: 144, faves: 6, status: 'active' },
  { id: 'L-2024', bg: 0, title: 'Alfa Laval P3-VHS', sub: 'Disc separator', year: 2015, condition: 'Refurb', price: 31200, views: 89, faves: 5, status: 'active' },
  { id: 'L-2021', bg: 4, title: 'Westfalia OTC-20', sub: 'Decanter', year: 2014, condition: 'Good', price: 47800, views: 132, faves: 8, status: 'active' },
]

export type StorefrontReview = {
  tag: string
  name: string
  role: string
  when: string
  rating: number
  color: string
  body: string
  tx: string
  verified: boolean
}

export const STOREFRONT_REVIEWS: StorefrontReview[] = [
  {
    tag: 'WL',
    name: 'Wes Landry',
    role: 'Westline Energy',
    when: '2 weeks ago',
    rating: 5,
    color: '#155E75',
    body: 'Saved us at 3 AM on a Sunday. Bowl wandered out of spec on a brand-new install. Drove from Houston, replaced the runout shim stack, back online before first shift Monday. Documented everything.',
    tx: 'L-2041',
    verified: true,
  },
  {
    tag: 'RK',
    name: 'Renée Khoury',
    role: 'Bayou Industrial',
    when: '1 month ago',
    rating: 5,
    color: '#831843',
    body: 'Tricky CS18-4 gearbox swap. Other shops wanted to send the unit out — done on-site in 14 hours. Saved $40k in downtime.',
    tx: 'L-2039',
    verified: true,
  },
  {
    tag: 'JB',
    name: 'Jamal Boudreaux',
    role: 'Independent',
    when: '2 months ago',
    rating: 4,
    color: '#94A3B8',
    body: 'Solid work. Communication a little slow on day two but the rebuild was clean and runout came in under spec.',
    tx: 'L-2036',
    verified: true,
  },
]

export const STOREFRONT_REVIEW_BREAKDOWN = [
  { stars: 5, count: 142, pct: 0.76 },
  { stars: 4, count: 32, pct: 0.17 },
  { stars: 3, count: 8, pct: 0.04 },
  { stars: 2, count: 3, pct: 0.02 },
  { stars: 1, count: 2, pct: 0.01 },
]

export type StorefrontTabKey = 'home' | 'listings' | 'services' | 'reviews' | 'about' | 'locations'

export type StorefrontTab = { key: StorefrontTabKey; label: string; count?: number }

export const STOREFRONT_TABS: StorefrontTab[] = [
  { key: 'home', label: 'Storefront' },
  { key: 'listings', label: 'Listings', count: 67 },
  { key: 'services', label: 'Services', count: 6 },
  { key: 'reviews', label: 'Reviews', count: 187 },
  { key: 'about', label: 'About' },
  { key: 'locations', label: 'Locations', count: 3 },
]

export const STOREFRONT_FILTER_CATS = [
  { id: 'all', label: 'All', count: 67 },
  { id: 'centrifuges', label: 'Centrifuges', count: 28 },
  { id: 'separators', label: 'Separators', count: 14 },
  { id: 'pumps', label: 'Pumps', count: 9 },
  { id: 'decanters', label: 'Decanters', count: 11 },
  { id: 'parts', label: 'Parts', count: 5 },
]

export const STOREFRONT_SORTS = [
  'Featured',
  'Newest',
  'Price: low to high',
  'Price: high to low',
  'Most viewed',
]

export const STOREFRONT_ACTIVITY = [
  {
    kind: 'listing',
    when: '2h',
    title: 'Listed Alfa Laval MAB-104',
    sub: '$28,500 · Excellent',
    color: '#1877F2',
  },
  {
    kind: 'sos',
    when: '1d',
    title: 'Responded to SOS-2031',
    sub: 'Channelview · decanter vibration',
    color: '#FF6B2B',
  },
  {
    kind: 'review',
    when: '3d',
    title: 'Received a 5★ review',
    sub: '"Saved us at 3 AM…"',
    color: '#22C55E',
  },
  {
    kind: 'tx',
    when: '1w',
    title: 'Closed sale L-2039',
    sub: 'Sulzer CS18-4 · $64,000',
    color: '#0EA5E9',
  },
]
