export type Urgency = 'critical' | 'high' | 'normal'

export const MOCK_COMPANIES = [
  { initials: 'NC', name: 'NRM Company', active: true },
  { initials: 'SW', name: 'Separator Works' },
]

export type SOSStory = {
  id: string
  type?: 'create'
  urgency?: Urgency
  yours?: boolean
  time?: string
  category?: string
  company?: string
  bg?: string
}

export const MOCK_SOS_STORIES: SOSStory[] = [
  { id: 'create', type: 'create' },
  {
    id: 's1',
    urgency: 'normal',
    yours: true,
    time: '1h ago',
    category: 'Processing Separation',
    company: 'NRM Company',
    bg: 'linear-gradient(180deg, #1E3A8A 0%, #1877F2 100%)',
  },
  {
    id: 's2',
    urgency: 'critical',
    time: '12m ago',
    category: 'Mining Oil Gas',
    company: 'Hesperia Resources',
    bg: 'linear-gradient(180deg, #7F1D1D 0%, #DC2626 100%)',
  },
  {
    id: 's3',
    urgency: 'critical',
    time: '24m ago',
    category: 'Processing Pumps',
    company: 'Westline Energy',
    bg: 'linear-gradient(180deg, #831843 0%, #BE185D 100%)',
  },
  {
    id: 's4',
    urgency: 'high',
    time: '2h ago',
    category: 'Centrifuge Repair',
    company: 'Katema Industrial',
    bg: 'linear-gradient(180deg, #78350F 0%, #EA580C 100%)',
  },
  {
    id: 's5',
    urgency: 'normal',
    time: '4h ago',
    category: 'Heat Exchangers',
    company: 'Reedco Bakery',
    bg: 'linear-gradient(180deg, #064E3B 0%, #059669 100%)',
  },
]

export type FeedPost = {
  id: string
  author: string
  authorBadge?: string
  avatar: string
  avatarInitials: string
  timeAgo: string
  location: string
  body: string
  media?: { kind: 'image' | 'video'; src: string }
  reactions: { like: number; love?: number; care?: number; wow?: number; total: number }
  comments: number
  shares: number
}

export const MOCK_POSTS: FeedPost[] = [
  {
    id: 'p1',
    author: 'Gear Force Machine',
    authorBadge: 'Verified',
    avatar: '#3B82F6',
    avatarInitials: 'GF',
    timeAgo: '4h',
    location: 'Midland, TX',
    body: "Rebuilt with Gear Force Machine — we are Dow, Chevron, BP and DuPont #1 trusted go-to vendor for all equipment services. Why shouldn't we be yours? www.GearForceMachine.com",
    media: { kind: 'video', src: 'https://images.unsplash.com/photo-1565043666747-69f6646db940?auto=format&fit=crop&w=1200&q=80' },
    reactions: { like: 24, love: 6, care: 3, total: 33 },
    comments: 1,
    shares: 2,
  },
  {
    id: 'p2',
    author: "David Marcowitz's Company",
    avatar: '#8B5CF6',
    avatarInitials: 'DM',
    timeAgo: '6h',
    location: 'Houston, TX',
    body: "I've dealt with xyz company and did not like their service. Keep away — there are more companies on here that have a way better 1-5 score.",
    reactions: { like: 12, love: 1, total: 13 },
    comments: 8,
    shares: 0,
  },
  {
    id: 'p3',
    author: 'Bayou Industrial Group',
    authorBadge: 'Verified',
    avatar: '#059669',
    avatarInitials: 'BI',
    timeAgo: '8h',
    location: 'Baton Rouge, LA',
    body: 'Just picked up two Alfa Laval MAB-104 separators in pristine condition. DM if you have a placement need in the Gulf — these go fast.',
    media: {
      kind: 'image',
      src: 'https://images.unsplash.com/photo-1581094271901-8022df4466f9?auto=format&fit=crop&w=1200&q=80',
    },
    reactions: { like: 47, love: 12, wow: 4, total: 63 },
    comments: 11,
    shares: 6,
  },
]

export const MOCK_SOS_ALERTS: Array<{ urgency: Urgency; title: string; time: string }> = [
  { urgency: 'normal', title: 'Katema Industrial Centrifuges BAS 3', time: '4h ago' },
  { urgency: 'critical', title: 'Fisher Oilfield Equipment p1', time: '14h ago' },
  { urgency: 'critical', title: 'CENTRISYS Centrifugal Separators (DiscD…', time: '1d ago' },
  { urgency: 'critical', title: 'Reedco Bakery & Pastry Equipment', time: '1d ago' },
  { urgency: 'critical', title: 'Alfa Laval Food Refrigeration', time: '2d ago' },
]

export const MOCK_DISCOVERY = [
  { name: 'Centrifuge Repair Co.', loc: 'Tulsa, OK', match: 92 },
  { name: 'Bayou Separator Works', loc: 'Houma, LA', match: 87 },
  { name: 'Pacific Gear Surplus', loc: 'Long Beach, CA', match: 81 },
]

export const MOCK_TRENDING = ['#centrifuge', '#alfalaval', '#decanters', '#pumps', '#heatExchanger']

export function urgencyConfig(u: Urgency): {
  label: string
  code: string
  color: string
  stripeColor: string
} {
  if (u === 'critical')
    return { label: 'Critical', code: 'P1', color: '#FA3E3E', stripeColor: '#FA3E3E' }
  if (u === 'high')
    return { label: 'High', code: 'P2', color: '#F7B928', stripeColor: '#F7B928' }
  return { label: 'Normal', code: 'P3', color: '#1877F2', stripeColor: '#3D9BD6' }
}
