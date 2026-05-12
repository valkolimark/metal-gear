import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

export interface TeamMemberData {
  /** profiles.id — also used to build the profile link target. */
  profileId: string
  /** Display name resolved from display_name → full_name → fallback. */
  name: string
  avatarUrl: string | null
  /**
   * Role label rendered under the avatar. Cycle 70's `company_memberships`
   * schema has no `title` column yet — we display the membership role enum
   * (Owner / Admin / Member). When a `title` column lands in a future cycle,
   * this is where it would resolve in.
   */
  role: string
  profileHref: string
}

export interface GetTeamResult {
  members: TeamMemberData[]
  totalPublicCount: number
  /**
   * Total active membership count INCLUDING private members. Internal use
   * only — callers must NOT expose this to anonymous viewers (it leaks org
   * size).
   */
  totalAllCount: number
}

const ROLE_LABEL: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
}

interface ProfileJoin {
  id: string | null
  display_name: string | null
  full_name: string | null
  avatar_url: string | null
}

interface MembershipRow {
  user_id: string
  role: string
  profiles: ProfileJoin | ProfileJoin[] | null
}

/**
 * Public team query for the Team module on /companies/[slug].
 *
 * Returns members opted into public visibility (is_public_on_profile = TRUE)
 * plus the total active membership count for the "5 of 12 (others private)"
 * display variant. The total is for internal use only — never render it
 * directly on the public surface without explicit company-admin opt-in.
 */
export async function getPublicTeamForCompany(
  companyId: string
): Promise<GetTeamResult> {
  const admin = createAdminClient()

  const [publicRowsRes, totalAllRes] = await Promise.all([
    admin
      .from('company_memberships')
      .select(
        // Hint the FK column — company_memberships references profiles via
        // both `user_id` (member) and `invited_by` (whoever sent the invite).
        'user_id, role, profiles:profiles!user_id ( id, display_name, full_name, avatar_url )'
      )
      .eq('company_id', companyId)
      .eq('is_active', true)
      .eq('is_public_on_profile', true)
      .order('joined_at', { ascending: true }),
    admin
      .from('company_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('is_active', true),
  ])

  if (publicRowsRes.error) {
    return { members: [], totalPublicCount: 0, totalAllCount: 0 }
  }

  const members: TeamMemberData[] = (publicRowsRes.data ?? []).map((raw) => {
    const row = raw as MembershipRow
    const profile = Array.isArray(row.profiles)
      ? row.profiles[0] ?? null
      : row.profiles
    const name =
      profile?.display_name?.trim() ||
      profile?.full_name?.trim() ||
      'Team member'
    return {
      profileId: row.user_id,
      name,
      avatarUrl: profile?.avatar_url ?? null,
      role: ROLE_LABEL[row.role] ?? row.role,
      profileHref: `/sellers/${row.user_id}`,
    }
  })

  return {
    members,
    totalPublicCount: members.length,
    totalAllCount: totalAllRes.count ?? members.length,
  }
}

/**
 * List the calling user's memberships with the per-membership public toggle.
 * Used by /settings/team-visibility — each member sees only their own rows.
 */
export interface UserMembershipForVisibility {
  membershipId: string
  companyId: string
  companyName: string
  companyLogoUrl: string | null
  role: string
  isPublic: boolean
}

interface CompanyJoin {
  id: string | null
  name: string | null
  logo_url: string | null
}

interface VisibilityRow {
  id: string
  company_id: string
  role: string
  is_public_on_profile: boolean
  company_profiles: CompanyJoin | CompanyJoin[] | null
}

export async function getMembershipsForVisibility(
  userId: string
): Promise<UserMembershipForVisibility[]> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('company_memberships')
    .select(
      'id, company_id, role, is_public_on_profile, company_profiles ( id, name, logo_url )'
    )
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('joined_at', { ascending: true })

  if (error || !data) return []
  return (data as VisibilityRow[]).map((row) => {
    const company = Array.isArray(row.company_profiles)
      ? row.company_profiles[0] ?? null
      : row.company_profiles
    return {
      membershipId: row.id,
      companyId: row.company_id,
      companyName: company?.name?.trim() || 'Company',
      companyLogoUrl: company?.logo_url ?? null,
      role: ROLE_LABEL[row.role] ?? row.role,
      isPublic: Boolean(row.is_public_on_profile),
    }
  })
}
