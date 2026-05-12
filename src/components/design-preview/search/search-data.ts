import type { NLChipData, SearchSegment } from './SearchShared'
import type { ConditionKey } from '../_shared/listings-data'

export type SearchListing = {
  id: string
  bg: number
  title: string
  category: string
  condition: ConditionKey
  price: number
  seller: string
  sellerRating: number
  location: string
  distance: number
  posted: string
  faved: boolean
  verified: boolean
  pinX: number
  pinY: number
  match: number
}

export type SearchCompany = {
  id: string
  name: string
  type: string
  followers: number
  listings: number
  verified: boolean
  location: string
  tag: string
}

export type SearchPerson = {
  id: string
  name: string
  role: string
  company: string
  mutual: number
  location: string
  tag: string
}

export type SearchSOS = {
  id: string
  title: string
  posted: string
  status: 'open' | 'in-progress' | 'closed'
  responses: number
  urgency: 'critical' | 'high' | 'medium'
  location: string
}

export type SearchPost = {
  id: string
  author: string
  tag: string
  when: string
  excerpt: string
}

export const TRENDING_QUERIES = [
  { q: 'Alfa Laval separator', count: '1.2k searches this week' },
  { q: 'decanter centrifuge', count: '840 searches this week' },
  { q: 'Sulzer pump rebuilt', count: '612 searches this week' },
  { q: 'plate heat exchanger', count: '498 searches this week' },
  { q: 'gyratory crusher', count: '386 searches this week' },
  { q: 'CIP skid', count: '274 searches this week' },
]

export const RECENT_SEARCHES: Array<{ q: string; when: string; kind: 'nl' | 'plain' | 'filtered' }> = [
  { q: 'decanter under 50k near Houston', when: '2h ago', kind: 'nl' },
  { q: 'Alfa Laval MAB', when: 'Yesterday', kind: 'plain' },
  { q: 'verified sellers · pumps', when: '2d ago', kind: 'filtered' },
  { q: 'Sulzer ZE', when: '3d ago', kind: 'plain' },
]

export const SAVED_SEARCHES = [
  { name: 'Centrifuges · TX/LA · ≤$60k', alerts: 4, last: 'New: 3 today' },
  { name: 'Verified Goulds pumps', alerts: 2, last: 'New: 1 today' },
  { name: 'Heat exchangers · East TX', alerts: 0, last: 'No new in 5d' },
]

export const QUICK_CATEGORIES = [
  { label: 'Centrifuges', count: 487 },
  { label: 'Pumps', count: 1240 },
  { label: 'Heat exchangers', count: 312 },
  { label: 'Valves', count: 906 },
  { label: 'Mixers', count: 184 },
  { label: 'Crushers', count: 92 },
]

export const ACTIVE_QUERY = 'decanter under 50k near Houston'

export const ACTIVE_PARSE: NLChipData[] = [
  { kind: 'term', label: 'decanter', raw: 'decanter' },
  { kind: 'price', label: 'under $50,000', raw: 'under 50k', op: '≤', value: 50000 },
  { kind: 'location', label: 'near Houston, TX', raw: 'near Houston', radius: 250 },
]

export const SEARCH_SEGMENTS: SearchSegment[] = [
  { key: 'all', label: 'All', count: 248 },
  { key: 'listings', label: 'Listings', count: 142 },
  { key: 'companies', label: 'Companies', count: 18 },
  { key: 'people', label: 'People', count: 41 },
  { key: 'sos', label: 'SOS posts', count: 9 },
  { key: 'feed', label: 'Posts', count: 38 },
]

export const SEARCH_LISTINGS: SearchListing[] = [
  { id: 'M-3082', bg: 1, title: 'CENTRISYS CS18-4 decanter centrifuge', category: 'Centrifuges', condition: 'fair', price: 28500, seller: 'Centrifuge Repair Co.', sellerRating: 4.7, location: 'Tulsa, OK', distance: 412, posted: '1d ago', faved: false, verified: false, pinX: 50, pinY: 50, match: 96 },
  { id: 'M-3091', bg: 0, title: 'Alfa Laval ALDEC 408 decanter (rebuilt)', category: 'Centrifuges', condition: 'excellent', price: 42000, seller: 'Bayou Industrial Group', sellerRating: 4.8, location: 'Baton Rouge, LA', distance: 168, posted: '2h ago', faved: false, verified: true, pinX: 36, pinY: 64, match: 94 },
  { id: 'M-3074', bg: 4, title: 'GEA UCD 305 decanter centrifuge', category: 'Centrifuges', condition: 'good', price: 38000, seller: 'Westline Energy', sellerRating: 4.6, location: 'Odessa, TX', distance: 42, posted: '2d ago', faved: false, verified: false, pinX: 38, pinY: 62, match: 88 },
  { id: 'M-3079', bg: 2, title: 'Andritz D5L decanter (food grade)', category: 'Centrifuges', condition: 'new', price: 47500, seller: 'Gulf Process Equipment', sellerRating: 4.9, location: 'Houma, LA', distance: 198, posted: '1d ago', faved: false, verified: true, pinX: 56, pinY: 66, match: 86 },
  { id: 'M-3076', bg: 3, title: 'Hiller DP25 decanter, 2-phase', category: 'Centrifuges', condition: 'good', price: 31500, seller: 'Hesperia Resources', sellerRating: 4.8, location: 'Midland, TX', distance: 18, posted: '2d ago', faved: false, verified: true, pinX: 38, pinY: 62, match: 84 },
  { id: 'M-3070', bg: 6, title: 'Flottweg Z4E decanter (parts only)', category: 'Centrifuges', condition: 'for_parts', price: 8900, seller: 'Reedco Industrial', sellerRating: 4.7, location: 'Houston, TX', distance: 0, posted: '3d ago', faved: true, verified: true, pinX: 44, pinY: 64, match: 71 },
]

export const SEARCH_COMPANIES: SearchCompany[] = [
  { id: 'co-aft', name: 'Alfa Laval — Houston Service Center', type: 'OEM service', followers: 4820, listings: 38, verified: true, location: 'Houston, TX', tag: 'CT' },
  { id: 'co-bay', name: 'Bayou Industrial Group', type: 'Reseller', followers: 1240, listings: 92, verified: true, location: 'Baton Rouge, LA', tag: 'BG' },
  { id: 'co-gpe', name: 'Gulf Process Equipment', type: 'Reseller', followers: 980, listings: 51, verified: true, location: 'Houma, LA', tag: 'GP' },
]

export const SEARCH_PEOPLE: SearchPerson[] = [
  { id: 'p-mt', name: 'Marcus Tate', role: 'Decanter mechanic · 18 yrs', company: 'Centrifuge Repair Co.', mutual: 4, location: 'Houston, TX', tag: 'MT' },
  { id: 'p-rk', name: 'Renée Khoury', role: 'Process engineer', company: 'Bayou Industrial Group', mutual: 12, location: 'Baton Rouge, LA', tag: 'RK' },
  { id: 'p-jb', name: 'Jamal Boudreaux', role: 'Field service tech', company: 'Westline Energy', mutual: 2, location: 'Odessa, TX', tag: 'JB' },
]

export const SEARCH_SOS: SearchSOS[] = [
  { id: 'SOS-2031', title: 'Need decanter operator within 4 hours — Channelview', posted: '38m ago', status: 'open', responses: 7, urgency: 'critical', location: 'Channelview, TX' },
  { id: 'SOS-2027', title: 'Looking for spare bowl assy for CS18-4 decanter', posted: '3h ago', status: 'open', responses: 3, urgency: 'high', location: 'Houston, TX' },
  { id: 'SOS-2019', title: 'Decanter vibration diagnostics — remote OK', posted: 'Yesterday', status: 'in-progress', responses: 11, urgency: 'medium', location: 'Pasadena, TX' },
]

export const SEARCH_POSTS: SearchPost[] = [
  { id: 'fp-1', author: 'Centrifuge Repair Co.', tag: 'CR', when: '4h ago', excerpt: 'Five things we look for before quoting a decanter rebuild. #1: bowl runout. If it\'s past 0.003"…' },
  { id: 'fp-2', author: 'Renée Khoury', tag: 'RK', when: '1d ago', excerpt: 'Hot take: a fair-condition decanter at the right price beats a "rebuilt" one with no documentation every time.' },
  { id: 'fp-3', author: 'Bayou Industrial Group', tag: 'BG', when: '2d ago', excerpt: 'New arrival: Alfa Laval ALDEC 408, full tear-down complete, runout under 0.001". Asking $42k.' },
]
