'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/app/actions/notifications'

const ToggleSchema = z.object({
  membershipId: z.string().uuid(),
  isPublic: z.boolean(),
})

async function getSessionUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

/**
 * Toggle a member's public visibility on /companies/[slug]. ONLY the member
 * themselves can change their own visibility. Admins can nudge via
 * `requestMembershipPublicVisibility` (sends a notification), but cannot
 * toggle for others.
 */
export async function toggleMembershipPublicVisibility(
  input: z.infer<typeof ToggleSchema>
) {
  const parsed = ToggleSchema.parse(input)
  const viewerId = await getSessionUserId()
  if (!viewerId) return { ok: false as const, error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data: membership, error: lookupErr } = await admin
    .from('company_memberships')
    .select('id, user_id, company_id, company_profiles ( slug )')
    .eq('id', parsed.membershipId)
    .maybeSingle()

  if (lookupErr || !membership) {
    return { ok: false as const, error: 'Membership not found' }
  }
  if (membership.user_id !== viewerId) {
    return {
      ok: false as const,
      error:
        'Only the team member themselves can change their own public visibility.',
    }
  }

  const { error: updateErr } = await admin
    .from('company_memberships')
    .update({ is_public_on_profile: parsed.isPublic })
    .eq('id', parsed.membershipId)

  if (updateErr) {
    return { ok: false as const, error: `Failed to update: ${updateErr.message}` }
  }

  // Revalidate the company storefront — slug-keyed.
  const companyJoin = membership.company_profiles as
    | { slug: string | null }
    | { slug: string | null }[]
    | null
  const slug = Array.isArray(companyJoin)
    ? companyJoin[0]?.slug
    : companyJoin?.slug
  if (slug) {
    revalidatePath(`/companies/${slug}`)
  } else {
    revalidatePath('/companies/[slug]', 'page')
  }
  revalidatePath('/settings/team-visibility')

  return { ok: true as const, isPublic: parsed.isPublic }
}

const RequestSchema = z.object({
  membershipId: z.string().uuid(),
})

/**
 * Admin nudge — sends a notification to the member asking them to opt into
 * public visibility. Does NOT change the visibility itself.
 *
 * Authorization: caller must be an owner/admin of the company that contains
 * the target membership.
 */
export async function requestMembershipPublicVisibility(
  input: z.infer<typeof RequestSchema>
) {
  const parsed = RequestSchema.parse(input)
  const adminUserId = await getSessionUserId()
  if (!adminUserId) return { ok: false as const, error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: target } = await admin
    .from('company_memberships')
    .select(
      'id, user_id, company_id, is_public_on_profile, company_profiles ( name )'
    )
    .eq('id', parsed.membershipId)
    .maybeSingle()

  if (!target) {
    return { ok: false as const, error: 'Membership not found' }
  }
  if (target.user_id === adminUserId) {
    return {
      ok: false as const,
      error: 'You already control your own visibility — no nudge needed.',
    }
  }
  if (target.is_public_on_profile) {
    return {
      ok: false as const,
      error: 'This member is already public on the team page.',
    }
  }

  // Caller must be owner/admin of the same company.
  const { data: callerMembership } = await admin
    .from('company_memberships')
    .select('role')
    .eq('company_id', target.company_id)
    .eq('user_id', adminUserId)
    .eq('is_active', true)
    .in('role', ['owner', 'admin'])
    .maybeSingle()

  if (!callerMembership) {
    return {
      ok: false as const,
      error: 'Only company owners or admins can request public visibility.',
    }
  }

  // Resolve admin display name for the notification copy.
  const { data: adminProfile } = await admin
    .from('profiles')
    .select('display_name, full_name')
    .eq('id', adminUserId)
    .maybeSingle()
  const adminName =
    adminProfile?.display_name?.trim() ||
    adminProfile?.full_name?.trim() ||
    'A teammate'
  const companyJoin = target.company_profiles as
    | { name: string | null }
    | { name: string | null }[]
    | null
  const companyName = (Array.isArray(companyJoin)
    ? companyJoin[0]?.name
    : companyJoin?.name)?.trim() || 'your company'

  await createNotification(
    target.user_id,
    'team_visibility_request',
    'Feature you on the team page?',
    `${adminName} would like to feature you on ${companyName}'s public team page. You can toggle this anytime.`,
    {
      membership_id: target.id,
      company_id: target.company_id,
      requested_by: adminUserId,
    }
  )

  return { ok: true as const }
}
