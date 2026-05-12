import type { ConditionKey } from '../_shared/listings-data'

export type MarketListing = {
  id: string
  bg: number
  title: string
  category: string
  condition: ConditionKey
  price: number | null
  contact?: boolean
  seller: string
  sellerRating: number
  location: string
  distance: number
  posted: string
  faved: boolean
  verified: boolean
  pinX: number
  pinY: number
}

export const MOCK_MARKET_LISTINGS: MarketListing[] = [
  { id: 'M-3091', bg: 0, title: 'Alfa Laval BTPX 510 separator', category: 'Centrifuges', condition: 'excellent', price: 24000, seller: 'Bayou Industrial Group', sellerRating: 4.8, location: 'Baton Rouge, LA', distance: 168, posted: '2h ago', faved: false, verified: true, pinX: 36, pinY: 64 },
  { id: 'M-3088', bg: 5, title: 'Goulds 3196 STX 6×8-13 ANSI pump', category: 'Pumps', condition: 'good', price: 4200, seller: 'Pacific Gear Surplus', sellerRating: 4.5, location: 'Long Beach, CA', distance: 1380, posted: '4h ago', faved: true, verified: true, pinX: 18, pinY: 50 },
  { id: 'M-3082', bg: 1, title: 'CENTRISYS CS18-4 decanter centrifuge', category: 'Centrifuges', condition: 'fair', price: null, contact: true, seller: 'Centrifuge Repair Co.', sellerRating: 4.7, location: 'Tulsa, OK', distance: 412, posted: '1d ago', faved: false, verified: false, pinX: 50, pinY: 50 },
  { id: 'M-3079', bg: 2, title: 'GEA NX-418 nozzle separator', category: 'Centrifuges', condition: 'new', price: 48000, seller: 'Gulf Process Equipment', sellerRating: 4.9, location: 'Houma, LA', distance: 198, posted: '1d ago', faved: false, verified: true, pinX: 56, pinY: 66 },
  { id: 'M-3076', bg: 3, title: 'Sulzer APP 33-150 chemical pump', category: 'Pumps', condition: 'good', price: 3100, seller: 'Hesperia Resources', sellerRating: 4.8, location: 'Midland, TX', distance: 18, posted: '2d ago', faved: false, verified: true, pinX: 38, pinY: 62 },
  { id: 'M-3074', bg: 4, title: 'Westfalia OSE-30 oil separator', category: 'Centrifuges', condition: 'excellent', price: 19500, seller: 'Westline Energy', sellerRating: 4.6, location: 'Odessa, TX', distance: 42, posted: '2d ago', faved: false, verified: false, pinX: 38, pinY: 62 },
  { id: 'M-3070', bg: 6, title: 'Tranter GX-051 plate heat exchanger', category: 'Heat Exchangers', condition: 'excellent', price: 6800, seller: 'Reedco Bakery', sellerRating: 4.7, location: 'Houston, TX', distance: 0, posted: '3d ago', faved: true, verified: true, pinX: 44, pinY: 64 },
]

export function priceFmt(l: MarketListing): string {
  if (l.contact) return 'Contact'
  if (!l.price) return '—'
  return '$' + l.price.toLocaleString()
}
