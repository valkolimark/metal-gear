export type Thread = {
  id: string
  tag: string
  avatarColor: string
  name: string
  sub: string
  verified: boolean
  last: string
  when: string
  unread: number
  online: boolean
  kind: 'person' | 'company' | 'sos' | 'group'
  pinned?: boolean
  badge?: { label: string; color: string }
}

export type FilterEntry = { key: string; label: string; count: number }

export type ActiveHeader = {
  tag: string
  avatarColor: string
  name: string
  sub: string
  online: boolean
  lastSeen: string
  verified: boolean
  mutual: number
  context: { type: string; title: string; id: string; price: string }
}

export type ListingCardData = {
  bg: number
  title: string
  id: string
  condition: string
  price: number
  location: string
}

export type FileData = { name: string; size: string }
export type RFQData = { ask: number; status: 'sent' | 'received' }
export type RFQCounterData = { ask: number; counter: number; terms: string }

export type Message =
  | { id: string; from: 'me' | 'them'; kind: 'text'; body: string; when: string; read?: boolean }
  | {
      id: string
      from: 'me' | 'them'
      kind: 'listing-card'
      when: string
      read?: boolean
      listing: ListingCardData
    }
  | {
      id: string
      from: 'me' | 'them'
      kind: 'file'
      when: string
      read?: boolean
      file: FileData
    }
  | {
      id: string
      from: 'me' | 'them'
      kind: 'rfq-card'
      when: string
      read?: boolean
      rfq: RFQData
    }
  | {
      id: string
      from: 'me' | 'them'
      kind: 'rfq-counter'
      when: string
      read?: boolean
      rfq: RFQCounterData
    }

export const M_THREADS: Thread[] = [
  {
    id: 't1',
    tag: 'MT',
    avatarColor: '#3D9BD6',
    name: 'Marcus Tate',
    sub: 'Centrifuge Repair Co.',
    verified: false,
    last: 'Can do $26k if you cover freight to Channelview.',
    when: '2m',
    unread: 2,
    online: true,
    kind: 'person',
    pinned: true,
    badge: { label: 'Listing', color: '#0EA5E9' },
  },
  {
    id: 't2',
    tag: 'BG',
    avatarColor: '#1877F2',
    name: 'Bayou Industrial Group',
    sub: 'Verified seller · 4.8 ★',
    verified: true,
    last: 'Sending the bowl-runout report now. Should clear 0.001".',
    when: '14m',
    unread: 0,
    online: true,
    kind: 'company',
    badge: { label: 'RFQ', color: '#FF6B2B' },
  },
  {
    id: 't3',
    tag: 'SOS',
    avatarColor: '#FF6B2B',
    name: 'SOS-2031 · Channelview',
    sub: '7 responders · critical',
    verified: false,
    last: 'Renée: I can be on-site by 6 PM.',
    when: '32m',
    unread: 5,
    online: false,
    kind: 'sos',
    badge: { label: 'SOS', color: '#FF6B2B' },
  },
  {
    id: 't4',
    tag: 'RK',
    avatarColor: '#0B2545',
    name: 'Renée Khoury',
    sub: 'Process engineer · BIG',
    verified: false,
    last: 'You: thanks, looping in Marcus on this.',
    when: '1h',
    unread: 0,
    online: true,
    kind: 'person',
  },
  {
    id: 't5',
    tag: 'GP',
    avatarColor: '#16A34A',
    name: 'Gulf Process Equipment',
    sub: 'Verified seller · 4.9 ★',
    verified: true,
    last: 'New unit just arrived — sending photos.',
    when: '3h',
    unread: 1,
    online: false,
    kind: 'company',
  },
  {
    id: 't6',
    tag: 'JB',
    avatarColor: '#94A3B8',
    name: 'Jamal Boudreaux',
    sub: 'Field service tech · Westline',
    verified: false,
    last: 'Got it, will swing by Thursday morning.',
    when: 'Yest',
    unread: 0,
    online: false,
    kind: 'person',
  },
  {
    id: 't7',
    tag: 'CR',
    avatarColor: '#0EA5E9',
    name: 'Centrifuge Repair Co.',
    sub: 'Service team',
    verified: true,
    last: 'Quote sent. Valid 30 days.',
    when: 'Yest',
    unread: 0,
    online: false,
    kind: 'company',
  },
  {
    id: 't8',
    tag: 'GR',
    avatarColor: '#831843',
    name: 'Decanter operators TX/LA',
    sub: '24 members · group',
    verified: false,
    last: 'Alex: anyone seen vibration on a CS18-4 lately?',
    when: '2d',
    unread: 0,
    online: false,
    kind: 'group',
  },
  {
    id: 't9',
    tag: 'WL',
    avatarColor: '#155E75',
    name: 'Westline Energy',
    sub: 'Buyer · Odessa',
    verified: false,
    last: 'You: bowl runout came in at 0.0008", documented.',
    when: '3d',
    unread: 0,
    online: false,
    kind: 'company',
  },
]

export const M_FILTERS: FilterEntry[] = [
  { key: 'all', label: 'All', count: 12 },
  { key: 'unread', label: 'Unread', count: 4 },
  { key: 'listings', label: 'Listings', count: 3 },
  { key: 'sos', label: 'SOS', count: 1 },
  { key: 'companies', label: 'Companies', count: 5 },
  { key: 'archived', label: 'Archived', count: 28 },
  { key: 'requests', label: 'Requests', count: 2 },
]

export const M_ACTIVE_HEADER: ActiveHeader = {
  tag: 'MT',
  avatarColor: '#3D9BD6',
  name: 'Marcus Tate',
  sub: 'Decanter mechanic · Houston, TX · 18 mi away',
  online: true,
  lastSeen: 'Active now',
  verified: false,
  mutual: 4,
  context: {
    type: 'listing',
    title: 'Alfa Laval MAB-104 disc separator',
    id: 'L-2041',
    price: '$28,500',
  },
}

export const M_MESSAGES: Message[] = [
  {
    id: 'm1',
    from: 'them',
    kind: 'text',
    body: 'Hey — saw your listing for the MAB-104. Is the bowl assembly OEM?',
    when: '10:42 AM',
  },
  {
    id: 'm2',
    from: 'me',
    kind: 'text',
    body: 'Yes. Pulled from a working unit, runout documented under 0.001 in.',
    when: '10:44 AM',
    read: true,
  },
  {
    id: 'm3',
    from: 'me',
    kind: 'listing-card',
    when: '10:44 AM',
    read: true,
    listing: {
      bg: 0,
      title: 'Alfa Laval MAB-104 disc separator',
      id: 'L-2041',
      condition: 'Excellent',
      price: 28500,
      location: 'Houston, TX',
    },
  },
  {
    id: 'm4',
    from: 'them',
    kind: 'text',
    body:
      'Perfect. Got a vibration spec sheet I can send back? I want to compare against ours.',
    when: '10:46 AM',
  },
  {
    id: 'm5',
    from: 'them',
    kind: 'file',
    when: '10:47 AM',
    file: { name: 'MAB-104_runout_report.pdf', size: '2.1 MB' },
  },
  {
    id: 'm6',
    from: 'me',
    kind: 'text',
    body: 'Looks clean. Want to move on price?',
    when: '10:51 AM',
    read: true,
  },
  {
    id: 'm7',
    from: 'me',
    kind: 'rfq-card',
    when: '10:51 AM',
    read: true,
    rfq: { ask: 28500, status: 'sent' },
  },
  {
    id: 'm8',
    from: 'them',
    kind: 'rfq-counter',
    when: '11:02 AM',
    rfq: { ask: 28500, counter: 26000, terms: 'Buyer covers freight to Channelview' },
  },
  {
    id: 'm9',
    from: 'them',
    kind: 'text',
    body: 'Can do $26k if you cover freight to Channelview.',
    when: '11:02 AM',
  },
]

export const M_SMART_REPLIES = [
  '$26k works — let\'s do it',
  'Can you split freight 50/50?',
  'Send me a freight quote first',
]
