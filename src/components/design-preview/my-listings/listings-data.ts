import type { ConditionKey } from '../_shared/listings-data'

export const MOCK_MY_LISTINGS_KPIS = [
  { label: 'Active', value: 38 },
  { label: 'Drafts', value: 4 },
  { label: 'Views (30d)', value: '2.4k' },
  { label: 'Sold (30d)', value: 6 },
]

export type ListingStatus = 'active' | 'draft' | 'sold' | 'expired'

export const LSTATUS: Record<
  ListingStatus,
  { label: string; color: string; bg: string }
> = {
  active: { label: 'Active', color: '#22C55E', bg: 'rgba(34,197,94,0.10)' },
  draft: { label: 'Draft', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
  sold: { label: 'Sold', color: '#1877F2', bg: 'rgba(24,119,242,0.10)' },
  expired: { label: 'Expired', color: '#94A3B8', bg: 'rgba(148,163,184,0.15)' },
}

export type MyListing = {
  id: string
  media: boolean
  bg: number
  title: string
  category: string
  condition: ConditionKey
  price: number | null
  contact?: boolean
  status: ListingStatus
  views: number
  faves: number
  score: number
  expiresIn: number
  autoRenew: boolean
  highPerf: boolean
  boostable: boolean
  location: string
}

export const MOCK_MY_LISTINGS: MyListing[] = [
  { id: 'L-2041', media: true, bg: 0, title: 'Alfa Laval MAB-104 disc separator', category: 'Centrifuges', condition: 'excellent', price: 18500, status: 'active', views: 487, faves: 32, score: 92, expiresIn: 47, autoRenew: true, highPerf: true, boostable: false, location: 'Houston, TX' },
  { id: 'L-2040', media: true, bg: 1, title: 'Sulzer ZE process pump (rebuilt)', category: 'Pumps', condition: 'good', price: 4200, status: 'active', views: 142, faves: 8, score: 78, expiresIn: 30, autoRenew: false, highPerf: false, boostable: true, location: 'Houston, TX' },
  { id: 'L-2039', media: false, bg: 2, title: 'CENTRISYS CS21-4 decanter', category: 'Centrifuges', condition: 'fair', price: null, contact: true, status: 'active', views: 12, faves: 0, score: 38, expiresIn: 12, autoRenew: false, highPerf: false, boostable: true, location: 'Midland, TX' },
  { id: 'L-2038', media: true, bg: 3, title: 'Westfalia HFC-200 cream separator', category: 'Food & Beverage', condition: 'new', price: 32000, status: 'active', views: 268, faves: 19, score: 88, expiresIn: 62, autoRenew: true, highPerf: false, boostable: false, location: 'Baton Rouge, LA' },
  { id: 'L-2037', media: true, bg: 4, title: 'Allis-Chalmers gyratory crusher', category: 'Mining & Aggregate', condition: 'good', price: null, contact: true, status: 'active', views: 92, faves: 11, score: 81, expiresIn: 5, autoRenew: false, highPerf: false, boostable: true, location: 'Tulsa, OK' },
  { id: 'L-2036', media: true, bg: 5, title: 'GEA WSI-100 plate heat exchanger', category: 'Heat Exchangers', condition: 'excellent', price: 8400, status: 'sold', views: 312, faves: 24, score: 90, expiresIn: 0, autoRenew: false, highPerf: false, boostable: false, location: 'Lafayette, LA' },
  { id: 'L-2035', media: false, bg: 6, title: 'Sundyne LMV-322 centrifugal pump', category: 'Pumps', condition: 'fair', price: 2200, status: 'draft', views: 0, faves: 0, score: 24, expiresIn: 0, autoRenew: false, highPerf: false, boostable: false, location: 'Odessa, TX' },
  { id: 'L-2034', media: true, bg: 7, title: 'Tri-Clover sanitary valve set (12)', category: 'Valves & Fittings', condition: 'new', price: 1850, status: 'active', views: 198, faves: 14, score: 85, expiresIn: 73, autoRenew: true, highPerf: false, boostable: false, location: 'Houston, TX' },
  { id: 'L-2033', media: true, bg: 8, title: 'Reedco bakery dough mixer', category: 'Food & Beverage', condition: 'good', price: 6750, status: 'expired', views: 88, faves: 5, score: 72, expiresIn: 0, autoRenew: false, highPerf: false, boostable: true, location: 'Houston, TX' },
  { id: 'L-2032', media: true, bg: 0, title: 'Goulds 3196 ANSI pump (8" impeller)', category: 'Pumps', condition: 'good', price: 3900, status: 'active', views: 521, faves: 38, score: 94, expiresIn: 41, autoRenew: true, highPerf: true, boostable: false, location: 'Houston, TX' },
]

export function priceFmt(l: MyListing): string {
  if (l.contact) return 'Contact'
  if (!l.price) return '—'
  return '$' + l.price.toLocaleString()
}
