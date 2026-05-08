// Cycle 67 — landing page data shapes.
// Cinematic homepage maps these to real DB records when available, falls back
// to design fixtures when the table is empty (fresh dev DBs / preview deploys).

export type LandingTickerKind = 'sos' | 'lst' | 'tx'

export interface LandingTickerItem {
  kind: LandingTickerKind
  /** Human-facing record id, e.g. `SOS-2031` */
  tag: string
  /** Relative time, e.g. `2 min ago` */
  when: string
  /** One-line summary, truncated in UI */
  text: string
  /** Status pill copy, e.g. `CLAIMED`, `NEW` */
  status: string
  /** Status pill accent (hex) */
  color: string
}

export interface LandingFeaturedShop {
  /** 3-letter monogram for the avatar tile */
  tag: string
  name: string
  city: string
  /** Short specialty line, e.g. `Decanter rebuilds` */
  specialty: string
  /** Out of 5; null when no reviews yet */
  rating: number | null
  /** Active listing / job count */
  jobs: number
  /** Response window, e.g. `12 min`; null when unknown */
  response: string | null
  /** Avatar tile gradient */
  color: string
  /** Full card backdrop gradient */
  bg: string
  /** Public company page link */
  href: string
}

export interface LandingStat {
  value: string
  label: string
  sub: string
}

export interface LandingNetworkSummary {
  /** Verified rebuilder / company count */
  rebuilders: number
  /** Active listings */
  listings: number
  /** Distinct US states with at least one company */
  states: number
}
