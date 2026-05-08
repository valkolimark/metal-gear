// Cycle 67 — design fallback data for the cinematic landing.
// Used when the live DB has nothing to show (fresh dev DBs, preview deploys
// pre-seed). Production renders real records from `src/app/actions/landing.ts`.

import type { LandingFeaturedShop, LandingTickerItem } from './types'

export const LANDING_TESTIMONIAL = {
  quote:
    'Saved us at 3 AM on a Sunday. Bowl wandered out of spec on a brand-new install. Drove from Houston, replaced the runout shim stack, back online before first shift Monday.',
  author: 'Marcus Tate',
  role: 'Plant maintenance lead · Texas City, TX',
  tag: 'MT',
  color: '#0EA5E9',
} as const

// Featured-shop fallback gradient palette. The live mapping in
// `src/app/actions/landing.ts` cycles through this list deterministically by
// position so the same company always lands on the same color across renders.
export const SHOP_GRADIENTS: Array<{ color: string; bg: string }> = [
  {
    color: 'linear-gradient(135deg, #0B2545 0%, #1877F2 100%)',
    bg: 'linear-gradient(135deg, #0B2545 0%, #1B3A6B 60%, #FF6B2B 140%)',
  },
  {
    color: 'linear-gradient(135deg, #1F2937 0%, #475569 100%)',
    bg: 'linear-gradient(135deg, #1F1B16 0%, #3D3024 60%, #92400E 140%)',
  },
  {
    color: 'linear-gradient(135deg, #155E75 0%, #0EA5E9 100%)',
    bg: 'linear-gradient(135deg, #0C2A33 0%, #155E75 60%, #38BDF8 140%)',
  },
  {
    color: 'linear-gradient(135deg, #7F1D1D 0%, #DC2626 100%)',
    bg: 'linear-gradient(135deg, #1A0F0F 0%, #5B1212 60%, #DC2626 140%)',
  },
]

export const LANDING_FALLBACK_SHOPS: LandingFeaturedShop[] = [
  {
    tag: 'BIG',
    name: 'Bayou Industrial Group',
    city: 'Houma, LA',
    specialty: 'Decanter rebuilds',
    rating: 4.9,
    jobs: 642,
    response: '12 min',
    color: SHOP_GRADIENTS[0].color,
    bg: SHOP_GRADIENTS[0].bg,
    href: '/sellers',
  },
  {
    tag: 'SHE',
    name: 'Sherman Engineering',
    city: 'Texas City, TX',
    specialty: 'Bowl runout, balance',
    rating: 4.8,
    jobs: 418,
    response: '18 min',
    color: SHOP_GRADIENTS[1].color,
    bg: SHOP_GRADIENTS[1].bg,
    href: '/sellers',
  },
  {
    tag: 'GCM',
    name: 'Gulf Coast Machineworks',
    city: 'Pasadena, TX',
    specialty: 'Gearbox & shafting',
    rating: 4.9,
    jobs: 521,
    response: '22 min',
    color: SHOP_GRADIENTS[2].color,
    bg: SHOP_GRADIENTS[2].bg,
    href: '/sellers',
  },
  {
    tag: 'RED',
    name: 'Redline Rotating Equip.',
    city: 'Lafayette, LA',
    specialty: 'Field service 24/7',
    rating: 5.0,
    jobs: 287,
    response: '8 min',
    color: SHOP_GRADIENTS[3].color,
    bg: SHOP_GRADIENTS[3].bg,
    href: '/sellers',
  },
]

export const LANDING_FALLBACK_TICKER: LandingTickerItem[] = [
  {
    kind: 'sos',
    tag: 'SOS-2031',
    when: '2 min ago',
    text: 'Decanter vibration spiking — Channelview, TX',
    status: 'CLAIMED',
    color: '#FF6B2B',
  },
  {
    kind: 'lst',
    tag: 'L-2041',
    when: '4 min ago',
    text: 'Alfa Laval MAB-104 listed — $28,500 — Houston, TX',
    status: 'NEW',
    color: '#1877F2',
  },
  {
    kind: 'tx',
    tag: 'TX-1989',
    when: '11 min ago',
    text: 'Sulzer CS18-4 sold — $64,000 — Texas City, TX',
    status: 'CLOSED',
    color: '#22C55E',
  },
  {
    kind: 'sos',
    tag: 'SOS-2030',
    when: '23 min ago',
    text: 'Bowl wandered out of spec — Beaumont, TX',
    status: 'RESOLVED',
    color: '#22C55E',
  },
]
