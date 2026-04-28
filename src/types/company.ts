import type { Tables } from './database'

export type CompanyRole = 'owner' | 'admin' | 'member'
export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+'

export type CompanyProfile = Tables<'company_profiles'>

/**
 * Read industries from a company in either shape (legacy singleton or array).
 * Cycle 65 deprecates the singleton; drop scheduled Cycle 66.
 */
export function getCompanyIndustries(
  company: Pick<CompanyProfile, 'industries' | 'industry'> | null | undefined,
): string[] {
  if (!company) return []
  if (Array.isArray(company.industries) && company.industries.length > 0) {
    return company.industries.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
  }
  if (company.industry && company.industry.trim().length > 0) return [company.industry]
  return []
}

/**
 * Primary industry (first array entry or legacy singleton). Used by surfaces
 * that need a single label (compact cards, OG image first slot, etc.).
 */
export function getPrimaryCompanyIndustry(
  company: Pick<CompanyProfile, 'industries' | 'industry'> | null | undefined,
): string | null {
  const list = getCompanyIndustries(company)
  return list[0] ?? null
}

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
