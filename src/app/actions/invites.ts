'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { SEAT_LIMITS } from '@/lib/constants'
import { getActiveTier } from '@/app/actions/tier'
import { sendEmail, inviteEmail } from '@/lib/email'
import { revalidatePath } from 'next/cache'

export async function getCompanyMemberCount(companyId: string): Promise<number> {
  const supabase = createAdminClient()
  const { count } = await supabase
    .from('company_memberships')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('is_active', true)
  return count ?? 0
}

export async function getCompanySeatLimit(companyId: string): Promise<number> {
  const supabase = createAdminClient()
  // Get the owner's subscription tier for this company
  const { data: membership } = await supabase
    .from('company_memberships')
    .select('user_id')
    .eq('company_id', companyId)
    .eq('role', 'owner')
    .eq('is_active', true)
    .maybeSingle()

  if (!membership) return 1
  const tier = await getActiveTier(membership.user_id, companyId)
  return SEAT_LIMITS[tier] ?? 1
}

export async function getPendingInvites(companyId: string) {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('company_invites')
    .select('id, email, role, status, created_at, expires_at, invited_by')
    .eq('company_id', companyId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function sendCompanyInvite(
  companyId: string,
  invitedBy: string,
  email: string,
  role: 'admin' | 'member'
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Check seat limit
  const [memberCount, seatLimit] = await Promise.all([
    getCompanyMemberCount(companyId),
    getCompanySeatLimit(companyId),
  ])

  if (memberCount >= seatLimit) {
    return {
      success: false,
      error: `Your plan allows ${seatLimit} seat${seatLimit === 1 ? '' : 's'}. Upgrade to add more team members.`,
    }
  }

  // Check for existing member with this email
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle()

  if (existingProfile) {
    const { data: existingMembership } = await supabase
      .from('company_memberships')
      .select('id')
      .eq('company_id', companyId)
      .eq('user_id', existingProfile.id)
      .eq('is_active', true)
      .maybeSingle()

    if (existingMembership) {
      return { success: false, error: 'This person is already a member of your company.' }
    }
  }

  // Check for existing pending invite
  const { data: existingInvite } = await supabase
    .from('company_invites')
    .select('id')
    .eq('company_id', companyId)
    .eq('email', email.toLowerCase().trim())
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (existingInvite) {
    return { success: false, error: 'An invite is already pending for this email address.' }
  }

  // Create invite
  const { data: invite, error } = await supabase
    .from('company_invites')
    .insert({
      company_id: companyId,
      invited_by: invitedBy,
      email: email.toLowerCase().trim(),
      role,
    })
    .select('token')
    .single()

  if (error || !invite) {
    return { success: false, error: 'Failed to create invite. Please try again.' }
  }

  // Get company name for email
  const { data: company } = await supabase
    .from('company_profiles')
    .select('name')
    .eq('id', companyId)
    .single()

  // Send invite email
  try {
    const emailContent = inviteEmail(
      company?.name ?? 'Metal Gear',
      role,
      invite.token
    )
    await sendEmail({ to: email, ...emailContent })
  } catch (emailError) {
    console.error('Invite email failed:', emailError)
  }

  revalidatePath('/settings/company/members')
  return { success: true }
}

export async function revokeInvite(inviteId: string): Promise<{ success: boolean }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('company_invites')
    .update({ status: 'revoked' })
    .eq('id', inviteId)

  revalidatePath('/settings/company/members')
  return { success: !error }
}

export async function acceptInvite(
  token: string,
  userId: string
): Promise<{ success: boolean; companyId?: string; error?: string }> {
  const supabase = createAdminClient()

  // Find invite
  const { data: invite, error } = await supabase
    .from('company_invites')
    .select('id, company_id, email, role, status, expires_at')
    .eq('token', token)
    .maybeSingle()

  if (error || !invite) return { success: false, error: 'Invite not found.' }
  if (invite.status !== 'pending') return { success: false, error: 'This invite has already been used or revoked.' }
  if (new Date(invite.expires_at) < new Date()) return { success: false, error: 'This invite has expired. Ask the company owner to send a new one.' }

  // Check if already a member
  const { data: existingMembership } = await supabase
    .from('company_memberships')
    .select('id')
    .eq('company_id', invite.company_id)
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()

  if (existingMembership) {
    // Mark invite as accepted anyway
    await supabase
      .from('company_invites')
      .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: userId })
      .eq('id', invite.id)
    return { success: true, companyId: invite.company_id }
  }

  // Check seat limit at accept time
  const [memberCount, seatLimit] = await Promise.all([
    getCompanyMemberCount(invite.company_id),
    getCompanySeatLimit(invite.company_id),
  ])

  if (memberCount >= seatLimit) {
    return { success: false, error: 'This company has reached its seat limit. The owner needs to upgrade before adding more members.' }
  }

  // Add membership
  const { error: memberError } = await supabase
    .from('company_memberships')
    .upsert(
      {
        company_id: invite.company_id,
        user_id: userId,
        role: invite.role as 'admin' | 'member',
        is_active: true,
        joined_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,user_id' }
    )

  if (memberError) return { success: false, error: 'Failed to join company. Please try again.' }

  // Mark invite accepted
  await supabase
    .from('company_invites')
    .update({ status: 'accepted', accepted_at: new Date().toISOString(), accepted_by: userId })
    .eq('id', invite.id)

  // Update user's active_company_id
  await supabase
    .from('profiles')
    .update({ active_company_id: invite.company_id })
    .eq('id', userId)

  return { success: true, companyId: invite.company_id }
}

export async function removeCompanyMember(
  companyId: string,
  userId: string
): Promise<{ success: boolean }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('company_memberships')
    .update({ is_active: false })
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .neq('role', 'owner') // Cannot remove owner

  revalidatePath('/settings/company/members')
  return { success: !error }
}
