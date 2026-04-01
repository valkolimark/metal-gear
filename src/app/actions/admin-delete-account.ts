'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/admin/permissions'
import type { Json } from '@/types/database'

// ─── SOFT DELETE (Archive) ─────────────────────────────────────────────────────

export async function softDeleteAccount(
  targetUserId: string,
  reason: string
): Promise<{ success: boolean; error?: string }> {
  const { profile: adminProfile } = await requireAdmin('grant_roles')

  // Only superadmins
  if (adminProfile.admin_role !== 'superadmin') {
    return { success: false, error: 'Only superadmins can delete accounts' }
  }

  // Prevent self-deletion
  if (targetUserId === adminProfile.id) {
    return { success: false, error: 'Cannot delete your own account' }
  }

  const supabase = createAdminClient()

  // Check if target is a superadmin
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('admin_role, full_name')
    .eq('id', targetUserId)
    .single()

  if (targetProfile?.admin_role === 'superadmin') {
    return { success: false, error: 'Cannot delete a superadmin account. Remove their admin role first.' }
  }

  // Log BEFORE making changes
  const { error: logError } = await supabase.from('admin_audit_log').insert({
    admin_id: adminProfile.id,
    action: 'soft_delete_account',
    target_type: 'user',
    target_id: targetUserId,
    metadata: { reason } as unknown as Json,
  })

  if (logError) {
    return { success: false, error: 'Failed to write audit log — aborting' }
  }

  // 1. Mark profile as soft-deleted
  await supabase.from('profiles').update({
    is_banned: true,
    deleted_at: new Date().toISOString(),
    deletion_type: 'soft',
    deleted_by: adminProfile.id,
    deletion_reason: reason,
  }).eq('id', targetUserId)

  // 2. Archive all active/pending listings
  await supabase.from('listings')
    .update({ status: 'archived' })
    .eq('seller_id', targetUserId)
    .in('status', ['active', 'pending_review'])

  // 3. Cancel all active SOS requests
  await supabase.from('sos_requests')
    .update({ status: 'cancelled' })
    .eq('requester_id', targetUserId)
    .eq('status', 'active')

  // 4. Suspend company memberships (not delete)
  await supabase.from('company_memberships')
    .update({ is_active: false })
    .eq('user_id', targetUserId)

  // 5. Cancel Stripe subscription
  await cancelUserStripeSubscription(targetUserId)

  // 6. Revoke pending invites sent by this user
  await supabase.from('company_invites')
    .update({ status: 'revoked' })
    .eq('invited_by', targetUserId)
    .eq('status', 'pending')

  return { success: true }
}

// ─── REACTIVATE (reverse soft delete) ──────────────────────────────────────────

export async function reactivateAccount(
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  const { profile: adminProfile } = await requireAdmin('grant_roles')

  if (adminProfile.admin_role !== 'superadmin') {
    return { success: false, error: 'Only superadmins can reactivate accounts' }
  }

  const supabase = createAdminClient()

  const { error: logError } = await supabase.from('admin_audit_log').insert({
    admin_id: adminProfile.id,
    action: 'reactivate_account',
    target_type: 'user',
    target_id: targetUserId,
    metadata: {} as Json,
  })

  if (logError) {
    return { success: false, error: 'Failed to write audit log — aborting' }
  }

  // Reverse all soft-delete effects
  await supabase.from('profiles').update({
    is_banned: false,
    deleted_at: null,
    deletion_type: null,
    deleted_by: null,
    deletion_reason: null,
  }).eq('id', targetUserId)

  // Restore archived listings
  await supabase.from('listings')
    .update({ status: 'active' })
    .eq('seller_id', targetUserId)
    .eq('status', 'archived')

  // Restore company memberships
  await supabase.from('company_memberships')
    .update({ is_active: true })
    .eq('user_id', targetUserId)

  return { success: true }
}

// ─── HARD DELETE (Permanent) ───────────────────────────────────────────────────

export async function hardDeleteAccount(
  targetUserId: string,
  confirmationText: string,
  reason: string
): Promise<{ success: boolean; error?: string; warnings?: string[] }> {
  if (confirmationText !== 'DELETE') {
    return { success: false, error: 'Confirmation text did not match' }
  }

  const { profile: adminProfile } = await requireAdmin('grant_roles')

  if (adminProfile.admin_role !== 'superadmin') {
    return { success: false, error: 'Only superadmins can delete accounts' }
  }

  // Prevent self-deletion
  if (targetUserId === adminProfile.id) {
    return { success: false, error: 'Cannot delete your own account' }
  }

  const supabase = createAdminClient()

  // Check if target is a superadmin
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('admin_role, full_name')
    .eq('id', targetUserId)
    .single()

  if (targetProfile?.admin_role === 'superadmin') {
    return { success: false, error: 'Cannot delete a superadmin account. Remove their admin role first.' }
  }

  // Log BEFORE making changes
  const { error: logError } = await supabase.from('admin_audit_log').insert({
    admin_id: adminProfile.id,
    action: 'hard_delete_account',
    target_type: 'user',
    target_id: targetUserId,
    metadata: { reason, target_name: targetProfile?.full_name } as unknown as Json,
  })

  if (logError) {
    return { success: false, error: 'Failed to write audit log — aborting' }
  }

  const warnings: string[] = []

  // ── Check sole company ownership ──
  const { data: memberships } = await supabase
    .from('company_memberships')
    .select('company_id, role')
    .eq('user_id', targetUserId)
    .eq('role', 'owner')

  if (memberships && memberships.length > 0) {
    for (const m of memberships) {
      const { count } = await supabase
        .from('company_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', m.company_id)

      if (count === 1) {
        const { data: company } = await supabase
          .from('company_profiles')
          .select('name')
          .eq('id', m.company_id)
          .single()

        warnings.push(`Sole owner of "${company?.name || m.company_id}" — company will be ownerless`)
      }
    }
  }

  // ── Step 1: Queue R2 cleanup for listing images ──
  const { data: userListings } = await supabase
    .from('listings')
    .select('id')
    .eq('seller_id', targetUserId)

  const listingIds = (userListings ?? []).map(l => l.id)

  if (listingIds.length > 0) {
    const { data: listingImages } = await supabase
      .from('listing_images')
      .select('url')
      .in('listing_id', listingIds)

    if (listingImages?.length) {
      const r2Keys = listingImages
        .map(img => extractR2Key(img.url))
        .filter((key): key is string => key !== null)

      if (r2Keys.length > 0) {
        await supabase.from('r2_cleanup_queue').insert(
          r2Keys.map(key => ({ r2_key: key }))
        )
      }
    }
  }

  // ── Step 2: Cancel Stripe subscription ──
  await cancelUserStripeSubscription(targetUserId)

  // ── Step 3: Soft-delete sent messages (before profile cascade) ──
  await supabase.from('messages')
    .update({
      is_deleted: true,
      deleted_content_replacement: '[Message from deleted account]',
      content: '[Message from deleted account]',
    })
    .eq('sender_id', targetUserId)

  // ── Step 4: Anonymize reviews about this seller ──
  // seller_id FK is now SET NULL — setting to null preserves the review
  await supabase.from('reviews')
    .update({ seller_id: null })
    .eq('seller_id', targetUserId)

  // ── Step 5: Delete owned data (before profile cascade) ──

  // Delete listing images records (R2 files queued above)
  if (listingIds.length > 0) {
    await supabase.from('listing_images').delete().in('listing_id', listingIds)
    // Delete listing videos
    await supabase.from('listing_videos').delete().in('listing_id', listingIds)
  }

  // Delete reviews written BY this user
  await supabase.from('reviews').delete().eq('reviewer_id', targetUserId)

  // Delete SOS requests
  await supabase.from('sos_requests').delete().eq('requester_id', targetUserId)

  // Delete listings
  await supabase.from('listings').delete().eq('seller_id', targetUserId)

  // Delete company memberships
  await supabase.from('company_memberships').delete().eq('user_id', targetUserId)

  // Delete company invites
  await supabase.from('company_invites').delete().eq('invited_by', targetUserId)

  // Delete credit records
  await supabase.from('contact_credits').delete().eq('user_id', targetUserId)
  await supabase.from('contact_reveals').delete().eq('viewer_id', targetUserId)

  // Delete notifications
  await supabase.from('notifications').delete().eq('user_id', targetUserId)

  // Delete saved searches
  await supabase.from('saved_searches').delete().eq('user_id', targetUserId)

  // Delete churn risk
  await supabase.from('churn_risk').delete().eq('user_id', targetUserId)

  // Delete feed posts and reactions
  await supabase.from('feed_post_reactions').delete().eq('user_id', targetUserId)
  await supabase.from('feed_posts').delete().eq('author_id', targetUserId)

  // Delete radar saves (collection_items via collections) and collections
  const { data: userCollections } = await supabase
    .from('collections')
    .select('id')
    .eq('user_id', targetUserId)
  if (userCollections?.length) {
    const collectionIds = userCollections.map((c: { id: string }) => c.id)
    await supabase.from('collection_items').delete().in('collection_id', collectionIds)
    await supabase.from('collections').delete().eq('user_id', targetUserId)
  }

  // Delete company favorites
  await supabase.from('company_favorites').delete().eq('user_id', targetUserId)

  // ── Step 6: Delete the profile ──
  // Remaining CASCADE FKs will clean up anything we missed
  await supabase.from('profiles').delete().eq('id', targetUserId)

  // ── Step 7: Delete the Supabase Auth user ──
  const { error: authError } = await supabase.auth.admin.deleteUser(targetUserId)
  if (authError) {
    console.error('Failed to delete auth user:', authError)
    await supabase.from('admin_audit_log').insert({
      admin_id: adminProfile.id,
      action: 'hard_delete_auth_user_failed',
      target_type: 'user',
      target_id: targetUserId,
      metadata: { error: authError.message } as unknown as Json,
    })
    warnings.push('Auth user deletion failed — orphaned auth record logged')
  }

  return { success: true, warnings: warnings.length > 0 ? warnings : undefined }
}

// ─── Pre-delete check (for UI warnings) ───────────────────────────────────────

export async function getDeleteAccountWarnings(
  targetUserId: string
): Promise<{ warnings: string[]; isSuperadmin: boolean; isSelf: boolean }> {
  const { profile: adminProfile } = await requireAdmin('grant_roles')
  const supabase = createAdminClient()

  const warnings: string[] = []
  const isSelf = targetUserId === adminProfile.id

  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('admin_role')
    .eq('id', targetUserId)
    .single()

  const isSuperadmin = targetProfile?.admin_role === 'superadmin'

  // Check sole company ownership
  const { data: ownerships } = await supabase
    .from('company_memberships')
    .select('company_id, role')
    .eq('user_id', targetUserId)
    .eq('role', 'owner')

  if (ownerships) {
    for (const m of ownerships) {
      const { count } = await supabase
        .from('company_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', m.company_id)

      if (count === 1) {
        const { data: company } = await supabase
          .from('company_profiles')
          .select('name')
          .eq('id', m.company_id)
          .single()

        warnings.push(`Sole owner of "${company?.name || 'Unknown'}" — company will become ownerless`)
      }
    }
  }

  return { warnings, isSuperadmin, isSelf }
}

// ─── HELPERS ───────────────────────────────────────────────────────────────────

function extractR2Key(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'media.metalgear.com') {
      return parsed.pathname.slice(1) // strip leading /
    }
    return null
  } catch {
    return null
  }
}

async function cancelUserStripeSubscription(userId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_subscription_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  if (!subscription?.stripe_subscription_id) return

  try {
    const { stripe } = await import('@/lib/stripe')
    await stripe.subscriptions.cancel(subscription.stripe_subscription_id)
  } catch (error) {
    console.error('Failed to cancel Stripe subscription:', error)
  }
}
