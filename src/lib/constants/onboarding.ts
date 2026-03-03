// Onboarding constants — shared between server actions and client components

export const ONBOARDING_STEPS = [
  { id: 'profile', label: 'Complete your profile', description: 'Add your name, company, and location' },
  { id: 'location', label: 'Set your location', description: 'Help buyers and sellers find you' },
  { id: 'browse', label: 'Browse equipment', description: 'Explore categories and search for equipment' },
  { id: 'action', label: 'Create a listing or save a search', description: 'Start buying or selling' },
]

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
    category: string
    sub_types: string[]
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
