// Onboarding constants — shared between server actions and client components

export const ONBOARDING_STEPS = [
  { id: 'profile', label: 'Complete your profile', description: 'Add your name, company, and location' },
  { id: 'location', label: 'Set your location', description: 'Help buyers and sellers find you' },
  { id: 'browse', label: 'Browse equipment', description: 'Explore categories and search for equipment' },
  { id: 'action', label: 'Create a listing or save a search', description: 'Start buying or selling' },
]

// Legacy interface — kept for backward compatibility with existing onboarding server actions
export interface EnhancedOnboardingData {
  // Step 1: Identity
  full_name?: string
  company_name?: string
  job_title?: string
  work_email?: string
  work_phone?: string
  show_phone_to?: 'everyone' | 'messaged' | 'no_one'
  primary_role?: string
  secondary_roles?: string[]
  // Step 2: Equipment
  equipment_interests?: {
    tier1: string
    tier2: string
    subcategories: string[]
    brands: string[]
  }[]
  // Step 3: Industry & Pain Points
  industries?: string[]
  pain_points?: string[]
  pain_points_other?: string
  // Step 4: Trading Intent
  trading_intents?: string[]
  // Step 5: Transparency & SOS
  show_company?: boolean
  show_name?: boolean
  show_email_to?: 'everyone' | 'messaged' | 'no_one'
  sos_responder?: boolean
  sos_categories?: string[]
  sos_urgency_level?: 'critical_only' | 'all'
  sos_notify_methods?: string[]
  sos_allow_realtime_contact?: boolean
  // Step 6: Quality Agreement
  quality_agreement_accepted?: boolean
}

// ─── Cycle 23: Role-Aware Onboarding ────────────────────────────────

export type Archetype = 'operator' | 'trader' | 'service_provider' | 'logistics'

export interface OnboardingFormData {
  // Step 1: Archetype
  archetype: Archetype | null

  // Step 2: Industries
  industries: string[]
  industries_other: string

  // Step 3: Role-specific (branch by archetype)
  // Operator
  sub_role: string
  equipment_tier2s: string[]
  sourcing_methods: string[]
  // Trader
  trading_activities: string[]
  monthly_volume: string
  // Service Provider
  service_types: string[]
  service_area: string
  // Logistics
  logistics_type: 'fleet' | 'individual' | ''
  fleet_size: string
  equipment_capabilities: string[]
  dot_mc_number: string
  logistics_coverage: string

  // Step 4: SOS & Transparency
  sos_opted_in: boolean
  contact_visibility: 'pro_plus' | 'public' | 'hidden'

  // Step 5: Profile
  display_name: string
  company_name: string
  city: string
  state: string
  phone: string
}

export const INITIAL_ONBOARDING_DATA: OnboardingFormData = {
  archetype: null,
  industries: [],
  industries_other: '',
  sub_role: '',
  equipment_tier2s: [],
  sourcing_methods: [],
  trading_activities: [],
  monthly_volume: '',
  service_types: [],
  service_area: '',
  logistics_type: '',
  fleet_size: '',
  equipment_capabilities: [],
  dot_mc_number: '',
  logistics_coverage: '',
  sos_opted_in: true,
  contact_visibility: 'pro_plus',
  display_name: '',
  company_name: '',
  city: '',
  state: '',
  phone: '',
}

export const ONBOARDING_INDUSTRIES = [
  'Oil & Gas',
  'Petrochemical',
  'Mining',
  'Manufacturing',
  'CNC Machining',
  'Food & Beverage',
  'Pharmaceutical',
  'Plastics & Chemicals',
  'Dairy',
  'Pulp & Paper',
  'Power Generation',
  'Other',
] as const

export const OPERATOR_SUB_ROLES = [
  { id: 'plant_manager', label: 'Plant Manager' },
  { id: 'maintenance_manager', label: 'Maintenance Manager' },
  { id: 'process_engineer', label: 'Process Engineer' },
  { id: 'procurement', label: 'Procurement / Purchasing' },
  { id: 'operations_manager', label: 'Operations Manager' },
  { id: 'other', label: 'Other' },
] as const

export const SOURCING_METHODS = [
  { id: 'purchase_new', label: 'Purchase new' },
  { id: 'purchase_used', label: 'Purchase used/surplus' },
  { id: 'rental', label: 'Rental' },
  { id: 'rebuild_inhouse', label: 'Rebuild/refurbish in-house' },
  { id: 'contract_repairs', label: 'Contract out for repairs' },
] as const

export const TRADING_ACTIVITY_OPTIONS = [
  { id: 'buy', label: 'Buy equipment' },
  { id: 'sell', label: 'Sell equipment' },
  { id: 'rebuild', label: 'Rebuild / refurbish equipment' },
  { id: 'rent', label: 'Rent equipment' },
] as const

export const MONTHLY_VOLUME_OPTIONS = [
  { id: '1-5', label: '1–5' },
  { id: '6-20', label: '6–20' },
  { id: '21-50', label: '21–50' },
  { id: '50+', label: '50+' },
] as const

export const SERVICE_TYPE_OPTIONS = [
  { id: 'trucking_freight', label: 'Trucking / Freight' },
  { id: 'rigging_crane', label: 'Rigging & Crane' },
  { id: 'forklift', label: 'Forklift Rental / Sales' },
  { id: 'machine_shop', label: 'Machine Shop / Machining' },
  { id: 'rebuilding_repair', label: 'Rebuilding / Repair' },
  { id: 'inspection', label: 'Inspection & Certification' },
  { id: 'demolition', label: 'Demolition' },
  { id: 'scrap_recycling', label: 'Scrap & Recycling / Boneyard' },
  { id: 'millwright', label: 'Millwright Services' },
  { id: 'other', label: 'Other' },
] as const

export const SERVICE_AREA_OPTIONS = [
  { id: 'local', label: 'Local (within 100 miles)' },
  { id: 'regional', label: 'Regional / Statewide' },
  { id: 'national', label: 'National' },
  { id: 'international', label: 'International' },
] as const

// ─── Logistics archetype constants ──────────────────────────────────

export const LOGISTICS_CAPABILITIES = [
  { id: 'flatbed', label: 'Flatbed' },
  { id: 'lowboy_rgn', label: 'Lowboy / RGN' },
  { id: 'step_deck', label: 'Step Deck' },
  { id: 'crane_truck', label: 'Crane Truck' },
  { id: 'boom_truck', label: 'Boom Truck' },
  { id: 'forklift_moffett', label: 'Forklift / Moffett' },
  { id: 'rigging_truck', label: 'Rigging Truck' },
  { id: 'oversize_ow', label: 'Oversized / OW Permitted' },
  { id: 'hazmat', label: 'Hazmat Certified' },
  { id: 'other_heavy_haul', label: 'Other Heavy Haul' },
] as const

export const LOGISTICS_COVERAGE_OPTIONS = [
  { id: 'local', label: 'Local' },
  { id: 'regional', label: 'Regional' },
  { id: 'national', label: 'National' },
  { id: 'cross_border', label: 'Cross-border' },
] as const

export const FLEET_SIZE_OPTIONS = [
  { id: '2-10', label: '2–10 trucks' },
  { id: '11-50', label: '11–50 trucks' },
  { id: '51-200', label: '51–200 trucks' },
  { id: '200+', label: '200+ trucks' },
] as const
