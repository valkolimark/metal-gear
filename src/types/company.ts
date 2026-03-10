import type { Tables } from './database'

export type CompanyRole = 'owner' | 'admin' | 'member'
export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+'

export type CompanyProfile = Tables<'company_profiles'>

export interface CompanyMembership {
  id: string
  company_id: string
  user_id: string
  role: CompanyRole
  invited_by: string | null
  joined_at: string
  is_active: boolean
  company?: CompanyProfile
}

export interface CompanyWithRole extends CompanyProfile {
  role: CompanyRole
  membership_id: string
}

export interface CompanyWithMembers extends CompanyProfile {
  members: Array<{
    membership_id: string
    user_id: string
    role: CompanyRole
    joined_at: string
    full_name: string | null
    avatar_url: string | null
    email: string | null
  }>
}
