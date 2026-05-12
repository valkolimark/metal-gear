// Shared types for profile + seller surfaces (Cycle 69).

export interface TrustMetrics {
  rating: { avg: number | null; count: number }
  transactions: { count: number }
  sosResponses: { count: number }
  responseTime: { avgMinutes: number | null; ratePct: number | null }
  onPlatform: { sinceYear: number | null; years: number | null }
  followers: { count: number }
}

export interface ActivityEntry {
  id: string
  type:
    | 'listing_created'
    | 'listing_sold'
    | 'review_received'
    | 'transaction_completed'
    | 'sos_responded'
  title: string
  subtitle: string
  occurredAt: string // ISO timestamp
}

export interface ProfileTabSpec {
  id: string
  label: string
  count?: number | null
  disabled?: boolean
}
