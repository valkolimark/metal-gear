export type ProfileKind = 'person' | 'company'
export type ProfileViewer = 'own' | 'visit'

export type ProfileListing = {
  id: string
  bg: number
  title: string
  sub: string
  condition: string
  price: number
}

export type ProfileReview = {
  tag: string
  name: string
  role: string
  when: string
  rating: number
  color: string
  body: string
  tx: string
}

export type ProfileActivity = {
  kind: 'sos-resp' | 'listing' | 'review' | 'tx' | 'cert'
  when: string
  title: string
  sub: string
  color: string
}

export type ProfileFeatured = {
  id: string
  bg: number
  title: string
  sub: string
  price: number
  badge: string
}

export type CompanyCapability = { label: string; count: string }
export type CompanyTeamMember = { tag: string; name: string; role: string; color: string }
export type CompanyCert = { label: string; sub: string; exp: string }

export type PersonProfile = {
  id: string
  name: string
  tag: string
  avatarColor: string
  title: string
  company: string
  location: string
  serviceArea: string
  bio: string
  joined: string
  responseRate: number
  responseTime: string
  txCount: number
  sosResponses: number
  rating: number
  reviews: number
  verified: boolean
  online: boolean
  mutual: number
  followers: number
  following: number
  cover: string
  certs: string[]
  skills: string[]
}

export type CompanyProfile = {
  id: string
  name: string
  tag: string
  avatarColor: string
  title: string
  location: string
  serviceArea: string
  bio: string
  joined: string
  responseRate: number
  responseTime: string
  txCount: number
  rating: number
  reviews: number
  verified: boolean
  followers: number
  hours: { status: string; text: string; oncall: string }
  cover: string
  capabilities: CompanyCapability[]
  team: CompanyTeamMember[]
  certs: CompanyCert[]
}

export const PERSON_PROFILE: PersonProfile = {
  id: 'p-marcus',
  name: 'Marcus Tate',
  tag: 'MT',
  avatarColor: '#3D9BD6',
  title: 'Decanter mechanic · 18 yrs',
  company: 'Centrifuge Repair Co.',
  location: 'Houston, TX',
  serviceArea: '250 mi radius',
  bio: "Specialize in Alfa Laval and Sulzer decanters across upstream + midstream. On-site rebuilds, bowl runout, gearbox swaps. If you're sideways at 2 AM in Channelview, I pick up.",
  joined: 'Joined Mar 2021',
  responseRate: 98,
  responseTime: '~12 min',
  txCount: 47,
  sosResponses: 23,
  rating: 4.9,
  reviews: 31,
  verified: true,
  online: true,
  mutual: 14,
  followers: 1284,
  following: 312,
  cover: 'linear-gradient(135deg, #0B2545 0%, #1E3A8A 50%, #3D9BD6 100%)',
  certs: ['API 670', 'ASME Y14.5', 'OSHA 30', 'TWIC'],
  skills: [
    'Decanter rebuilds',
    'Bowl runout',
    'Gearbox swaps',
    'Vibration analysis',
    'On-site teardown',
    'Hot-zone work',
  ],
}

export const COMPANY_PROFILE: CompanyProfile = {
  id: 'c-bayou',
  name: 'Bayou Industrial Group',
  tag: 'BG',
  avatarColor: '#1877F2',
  title: 'Verified seller · Industrial centrifuge specialists',
  location: 'Channelview, TX',
  serviceArea: 'Gulf Coast · TX / LA / MS',
  bio: 'Buying, selling, and refurbishing industrial separation equipment since 1987. Alfa Laval, Sulzer, Westfalia. Full service rebuilds with documented runout reports.',
  joined: 'Joined Aug 2018',
  responseRate: 94,
  responseTime: '~22 min',
  txCount: 312,
  rating: 4.8,
  reviews: 187,
  verified: true,
  followers: 8420,
  hours: { status: 'open', text: 'Open · 7 AM – 7 PM CT', oncall: '24/7 SOS line' },
  cover: 'linear-gradient(135deg, #0B2545 0%, #155E75 100%)',
  capabilities: [
    { label: 'Decanter rebuilds', count: 'Daily' },
    { label: 'Bowl reconditioning', count: '1–3 days' },
    { label: 'Gearbox service', count: '2–5 days' },
    { label: 'Field service', count: 'Same-day' },
    { label: 'Inspection / runout', count: 'Same-day' },
    { label: 'Logistics / freight', count: 'In-house' },
  ],
  team: [
    { tag: 'JT', name: 'John Theriot', role: 'Owner / President', color: '#0B2545' },
    { tag: 'RK', name: 'Renée Khoury', role: 'Process engineer', color: '#831843' },
    { tag: 'DP', name: 'Dwayne Pellerin', role: 'Shop foreman', color: '#155E75' },
    { tag: 'AM', name: 'Alex Moreau', role: 'Field service lead', color: '#1877F2' },
    { tag: 'SB', name: 'Sara Boudreaux', role: 'Logistics / freight', color: '#16A34A' },
    { tag: 'RP', name: 'Ricardo Paredes', role: 'Sr. mechanic', color: '#FF6B2B' },
    { tag: 'JL', name: 'Janelle Lavergne', role: 'Sales / quoting', color: '#94A3B8' },
    { tag: 'KH', name: 'Kenny Hebert', role: 'Apprentice mechanic', color: '#3D9BD6' },
  ],
  certs: [
    { label: 'ISO 9001:2015', sub: 'Quality mgmt', exp: '2027' },
    { label: 'API 670 Compliant', sub: 'Machinery protection', exp: '2026' },
    { label: 'ASME B73.1', sub: 'Pump standards', exp: '2026' },
    { label: 'OSHA VPP Star', sub: 'Safety program', exp: '2025' },
    { label: 'TWIC employer', sub: 'Port access', exp: '—' },
  ],
}

export const PROFILE_LISTINGS: ProfileListing[] = [
  { id: 'L-2041', bg: 0, title: 'Alfa Laval MAB-104', sub: 'Disc separator · 2018', condition: 'Excellent', price: 28500 },
  { id: 'L-2039', bg: 4, title: 'Sulzer CS18-4', sub: 'Decanter · 2017', condition: 'Good', price: 64000 },
  { id: 'L-2036', bg: 1, title: 'Westfalia OSE-20', sub: 'Separator · 2020', condition: 'New', price: 42000 },
  { id: 'L-2034', bg: 5, title: 'Alfa Laval BTUX-510', sub: 'Decanter · 2019', condition: 'Excellent', price: 88500 },
  { id: 'L-2031', bg: 2, title: 'GEA CF 6000', sub: 'Decanter · 2016', condition: 'Refurb', price: 52000 },
  { id: 'L-2028', bg: 3, title: 'Sulzer NPS-200', sub: 'Pump skid · 2020', condition: 'Good', price: 18500 },
]

export const PROFILE_REVIEWS: ProfileReview[] = [
  {
    tag: 'WL',
    name: 'Wes Landry',
    role: 'Westline Energy',
    when: '2 weeks ago',
    rating: 5,
    color: '#155E75',
    body: 'Marcus saved us at 3 AM on a Sunday. Bowl had wandered out of spec on a brand new install. He drove from Houston, replaced the runout shim stack, and we were back online before first shift Monday. Documented everything.',
    tx: 'L-2041',
  },
  {
    tag: 'RK',
    name: 'Renée Khoury',
    role: 'Bayou Industrial Group',
    when: '1 month ago',
    rating: 5,
    color: '#831843',
    body: 'Used him for a tricky CS18-4 gearbox swap. Other shops wanted to send the unit out — Marcus did it on-site in 14 hours. Saved us $40k in downtime.',
    tx: 'L-2039',
  },
  {
    tag: 'JB',
    name: 'Jamal Boudreaux',
    role: 'Independent',
    when: '2 months ago',
    rating: 4,
    color: '#94A3B8',
    body: 'Solid work. Communication was a little slow on the second day but the rebuild itself was clean and runout came in under spec.',
    tx: 'L-2036',
  },
  {
    tag: 'DP',
    name: 'Dwayne Pellerin',
    role: 'Bayou Industrial',
    when: '3 months ago',
    rating: 5,
    color: '#155E75',
    body: 'I refer Marcus to anyone who asks. Knows Alfa Laval better than the OEM techs. Worth every penny.',
    tx: 'L-2034',
  },
]

export const PROFILE_ACTIVITY: ProfileActivity[] = [
  { kind: 'sos-resp', when: '3h', title: 'Responded to SOS-2031', sub: 'Channelview · "decanter vibration"', color: '#FF6B2B' },
  { kind: 'listing', when: '2d', title: 'Listed Alfa Laval MAB-104', sub: '$28,500 · Excellent · L-2041', color: '#1877F2' },
  { kind: 'review', when: '1w', title: 'Received a 5★ review from Wes Landry', sub: '"Marcus saved us at 3 AM…"', color: '#22C55E' },
  { kind: 'tx', when: '2w', title: 'Completed transaction with Bayou Industrial Group', sub: 'Sulzer CS18-4 · $64,000', color: '#0EA5E9' },
  { kind: 'cert', when: '1mo', title: 'Renewed API 670 certification', sub: 'Valid through Mar 2027', color: '#831843' },
]

export const PROFILE_FEATURED: ProfileFeatured[] = [
  { id: 'L-2041', bg: 0, title: 'Alfa Laval MAB-104', sub: 'Disc separator', price: 28500, badge: 'Match' },
  { id: 'L-2039', bg: 4, title: 'Sulzer CS18-4', sub: 'Decanter · 2017', price: 64000, badge: 'New' },
  { id: 'L-2036', bg: 1, title: 'Westfalia OSE-20', sub: 'Separator · 2020', price: 42000, badge: 'Hot' },
]
