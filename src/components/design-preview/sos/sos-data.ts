export type SOSUrgency = 'critical' | 'high' | 'normal' | 'low'
export type SOSStatus = 'open' | 'claimed' | 'resolved' | 'expired'

export const MOCK_SOS_KPIS: Array<{
  label: string
  value: string | number
  delta: string
  tone: 'orange' | 'navy' | 'green' | 'blue'
}> = [
  { label: 'Open in network', value: 12, delta: '+3 today', tone: 'orange' },
  { label: 'My active requests', value: 4, delta: '2 awaiting reply', tone: 'navy' },
  { label: 'Avg response time', value: '14m', delta: '−6m vs last wk', tone: 'green' },
  { label: 'Win rate (30d)', value: '68%', delta: '+5%', tone: 'blue' },
]

export const URG: Record<SOSUrgency, { label: string; color: string; bg: string }> = {
  critical: { label: 'Critical', color: '#DC2626', bg: '#FEF2F2' },
  high: { label: 'High', color: '#EA580C', bg: '#FFF7ED' },
  normal: { label: 'Normal', color: '#1877F2', bg: '#EFF6FF' },
  low: { label: 'Low', color: '#64748B', bg: '#F1F5F9' },
}

export const STATUS: Record<SOSStatus, { label: string; color: string; bg: string }> = {
  open: { label: 'Open', color: '#0EA5E9', bg: 'rgba(14,165,233,0.10)' },
  claimed: { label: 'Claimed', color: '#A855F7', bg: 'rgba(168,85,247,0.10)' },
  resolved: { label: 'Resolved', color: '#22C55E', bg: 'rgba(34,197,94,0.10)' },
  expired: { label: 'Expired', color: '#94A3B8', bg: 'rgba(148,163,184,0.10)' },
}

export type SOSRow = {
  id: string
  mine: boolean
  urgency: SOSUrgency
  status: SOSStatus
  category: string
  company: string
  rating: number
  location: string
  distance: number
  posted: string
  responses: number
  claimedBy: string | null
  budget: string
}

export const MOCK_SOS_ROWS: SOSRow[] = [
  { id: 'OP-1042', mine: false, urgency: 'critical', status: 'open', category: 'Centrifuge — Alfa Laval MAB-104', company: 'Hesperia Resources', rating: 4.8, location: 'Midland, TX', distance: 18, posted: '12m ago', responses: 4, claimedBy: null, budget: '$8k–12k' },
  { id: 'OP-1041', mine: false, urgency: 'critical', status: 'open', category: 'Processing Pumps — Sulzer', company: 'Westline Energy', rating: 4.6, location: 'Odessa, TX', distance: 42, posted: '24m ago', responses: 7, claimedBy: null, budget: '$15k+' },
  { id: 'OP-1039', mine: true, urgency: 'normal', status: 'claimed', category: 'Processing Separation', company: 'NRM Company', rating: 4.9, location: 'Houston, TX', distance: 0, posted: '1h ago', responses: 11, claimedBy: 'Bayou Sep.', budget: '$5k' },
  { id: 'OP-1038', mine: false, urgency: 'high', status: 'open', category: 'Centrifuge Repair', company: 'Katema Industrial', rating: 4.4, location: 'Lafayette, LA', distance: 134, posted: '2h ago', responses: 2, claimedBy: null, budget: '$3k–6k' },
  { id: 'OP-1037', mine: false, urgency: 'normal', status: 'open', category: 'Heat Exchangers', company: 'Reedco Bakery', rating: 4.7, location: 'Baton Rouge, LA', distance: 168, posted: '4h ago', responses: 1, claimedBy: null, budget: '$2k' },
  { id: 'OP-1034', mine: true, urgency: 'normal', status: 'resolved', category: 'Decanter rebuild', company: 'NRM Company', rating: 4.9, location: 'Houston, TX', distance: 0, posted: '1d ago', responses: 6, claimedBy: 'Pacific Gear', budget: '$4k' },
  { id: 'OP-1031', mine: false, urgency: 'high', status: 'claimed', category: 'CENTRISYS Centrifugal Separator', company: 'Fisher Oilfield', rating: 4.3, location: 'Tulsa, OK', distance: 412, posted: '1d ago', responses: 5, claimedBy: 'Centrifuge Repair Co.', budget: '$10k' },
  { id: 'OP-1029', mine: false, urgency: 'normal', status: 'expired', category: 'Alfa Laval Food Refrigeration', company: 'Cold Chain Logistics', rating: 4.5, location: 'Dallas, TX', distance: 248, posted: '2d ago', responses: 0, claimedBy: null, budget: '$1k–3k' },
]
