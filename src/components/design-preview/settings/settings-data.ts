export type NavIconKind =
  | 'building'
  | 'user'
  | 'users'
  | 'shield'
  | 'tag'
  | 'map'
  | 'card'
  | 'siren'
  | 'bell'
  | 'plug'
  | 'lock'
  | 'download'
  | 'credit'

export type SettingsCompanyData = {
  name: string
  legalName: string
  tagline: string
  description: string
  founded: string
  ein: string
  industries: string[]
  capabilities: string[]
  size: string
  city: string
  state: string
  zip: string
  serviceRadius: number
  website: string
  phone: string
  email: string
  slug: string
  emergency: boolean
  hours: string
  logoBg: string
  logoText: string
  coverBg: string
}

export const SETTINGS_COMPANY: SettingsCompanyData = {
  name: 'NRM Company',
  legalName: 'NRM Equipment LLC',
  tagline: 'Trusted industrial equipment since 1987',
  description:
    'Specialty rebuilds for centrifugal separators, decanters, and pump skids. 38 years serving Gulf-coast refining, midstream, and dairy. 24/7 emergency response within 250 miles of Channelview.',
  founded: '1987',
  ein: '74-2841',
  industries: ['Oil & Gas', 'Refining', 'Petrochemical'],
  capabilities: ['Decanter rebuild', 'Centrifuge service', 'Pump skid', 'Bowl rework', 'Field service'],
  size: '11–50',
  city: 'Channelview',
  state: 'TX',
  zip: '77530',
  serviceRadius: 250,
  website: 'nrmequipment.com',
  phone: '(507) 600-0919',
  email: 'ops@nrmequipment.com',
  slug: 'nrm-equipment',
  emergency: true,
  hours: 'Mon–Fri 7a–6p · Emergency 24/7',
  logoBg: 'linear-gradient(135deg, #FF6B2B 0%, #DC2626 100%)',
  logoText: 'NRM',
  coverBg: 'linear-gradient(135deg, #0B2545 0%, #1E3A8A 60%, #FF6B2B 130%)',
}

export type NavItem = {
  key: string
  label: string
  icon: NavIconKind
  active?: boolean
  count?: number
  badge?: string
}

export type NavGroup = { group: string; items: NavItem[] }

export const SETTINGS_NAV: NavGroup[] = [
  {
    group: 'Profile',
    items: [
      { key: 'company', label: 'Company', icon: 'building', active: true },
      { key: 'profile', label: 'My profile', icon: 'user' },
      { key: 'team', label: 'Team', icon: 'users', count: 6 },
      { key: 'verify', label: 'Verification', icon: 'shield', badge: '2/3' },
    ],
  },
  {
    group: 'Marketplace',
    items: [
      { key: 'listings', label: 'Listing defaults', icon: 'tag' },
      { key: 'service', label: 'Service area', icon: 'map' },
      { key: 'payments', label: 'Payments & payouts', icon: 'card' },
      { key: 'sos', label: 'SOS preferences', icon: 'siren' },
    ],
  },
  {
    group: 'Account',
    items: [
      { key: 'notify', label: 'Notifications', icon: 'bell' },
      { key: 'integ', label: 'Integrations', icon: 'plug', count: 3 },
      { key: 'sec', label: 'Security & login', icon: 'lock' },
      { key: 'billing', label: 'Billing', icon: 'credit' },
      { key: 'data', label: 'Data & exports', icon: 'download' },
    ],
  },
]

export type CompletenessStep = {
  key: string
  label: string
  done: boolean
  hint: string
  cta?: string
}

export const SETTINGS_COMPLETENESS: { pct: number; steps: CompletenessStep[] } = {
  pct: 78,
  steps: [
    { key: 'basics', label: 'Basics', done: true, hint: 'Name · tagline · description' },
    { key: 'logo', label: 'Logo & cover', done: true, hint: 'Both uploaded' },
    { key: 'service', label: 'Service area', done: true, hint: '250 mi · 4 industries' },
    { key: 'verify', label: 'Verification', done: false, hint: 'Insurance COI missing', cta: 'Upload COI' },
    { key: 'team', label: 'Team members', done: true, hint: '6 members · 2 admins' },
    { key: 'payouts', label: 'Payouts set up', done: false, hint: 'Connect bank for SOS payouts', cta: 'Connect bank' },
  ],
}

export const SETTINGS_INDUSTRIES = [
  'Oil & Gas',
  'Refining',
  'Petrochemical',
  'Dairy',
  'Food & Bev',
  'Wastewater',
  'Mining',
  'Power gen',
  'Marine',
  'Pulp & paper',
]

export const SETTINGS_CAPABILITIES = [
  'Decanter rebuild',
  'Centrifuge service',
  'Pump skid',
  'Bowl rework',
  'Field service',
  'Emergency response',
  'Vibration analysis',
  'Refurb sales',
  'Parts supply',
  'Rentals',
]

export type VerifyEntry = {
  key: string
  label: string
  status: 'verified' | 'pending'
  detail: string
}

export const SETTINGS_VERIFY: VerifyEntry[] = [
  { key: 'biz', label: 'Business identity', status: 'verified', detail: 'EIN 74-2841 · TX SOS verified Jul 2024' },
  { key: 'ins', label: 'Insurance (COI)', status: 'pending', detail: '$2M general liability — re-upload required (expired)' },
  { key: 'cert', label: 'Industry certifications', status: 'verified', detail: 'API 671 · Alfa Laval authorized' },
]

export type TeamPreviewEntry = { name: string; role: string; init: string }

export const SETTINGS_TEAM_PREVIEW: TeamPreviewEntry[] = [
  { name: 'Mark Tate', role: 'Owner · Admin', init: 'MT' },
  { name: 'Wes Landry', role: 'Operations · Admin', init: 'WL' },
  { name: 'Carla Vega', role: 'Sales', init: 'CV' },
  { name: 'James Park', role: 'Field tech', init: 'JP' },
]

export type IntegrationEntry = {
  key: string
  name: string
  sub: string
  on: boolean
  color: string
}

export const SETTINGS_INTEGRATIONS: IntegrationEntry[] = [
  { key: 'qb', name: 'QuickBooks', sub: 'Sync invoices & payouts', on: true, color: '#2CA01C' },
  { key: 'ms', name: 'Slack', sub: 'SOS alerts → #ops', on: true, color: '#4A154B' },
  { key: 'tw', name: 'Twilio SMS', sub: 'Critical SOS to phones', on: false, color: '#F22F46' },
]
