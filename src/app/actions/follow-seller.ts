'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const FollowInput = z
  .object({
    sellerProfileId: z.string().uuid().nullable(),
    sellerCompanyId: z.string().uuid().nullable(),
  })
  .refine(
    (d) =>
      (d.sellerProfileId !== null && d.sellerCompanyId === null) ||
      (d.sellerProfileId === null && d.sellerCompanyId !== null),
    {
      message:
        'Exactly one of sellerProfileId or sellerCompanyId must be set.',
    },
  )

type ToggleFollowResult =
  | { ok: true; isFollowing: boolean }
  | { ok: false; error: string }

/**
 * Toggle the current viewer's follow state for either a profile-seller or a
 * company-seller. Self-follow is rejected. Idempotent at the row level — if
 * a follow row already exists we delete (= unfollow); otherwise we insert.
 */
export async function toggleFollow(
  raw: z.input<typeof FollowInput>,
): Promise<ToggleFollowResult> {
  const parsed = FollowInput.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }
  const { sellerProfileId, sellerCompanyId } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Not authenticated.' }

  if (sellerProfileId && sellerProfileId === user.id) {
    return { ok: false, error: 'You cannot follow yourself.' }
  }

  const admin = createAdminClient()

  // Look up the existing row using whichever target is set.
  const existingQuery = sellerProfileId
    ? admin
        .from('seller_followers')
        .select('id')
        .eq('follower_id', user.id)
        .eq('seller_profile_id', sellerProfileId)
        .maybeSingle()
    : admin
        .from('seller_followers')
        .select('id')
        .eq('follower_id', user.id)
        .eq('seller_company_id', sellerCompanyId as string)
        .maybeSingle()

  const { data: existing, error: lookupErr } = await existingQuery
  if (lookupErr) return { ok: false, error: lookupErr.message }

  if (existing) {
    const { error: delErr } = await admin
      .from('seller_followers')
      .delete()
      .eq('id', existing.id)
    if (delErr) return { ok: false, error: delErr.message }
    revalidate(sellerProfileId, sellerCompanyId)
    return { ok: true, isFollowing: false }
  }

  const { error: insErr } = await admin.from('seller_followers').insert({
    follower_id: user.id,
    seller_profile_id: sellerProfileId,
    seller_company_id: sellerCompanyId,
  })
  if (insErr) {
    // Unique-constraint races land here; treat as success.
    if (insErr.code === '23505') {
      revalidate(sellerProfileId, sellerCompanyId)
      return { ok: true, isFollowing: true }
    }
    return { ok: false, error: insErr.message }
  }
  revalidate(sellerProfileId, sellerCompanyId)
  return { ok: true, isFollowing: true }
}

/** Read the viewer's follow state for a given seller. */
export async function isFollowing({
  sellerProfileId,
  sellerCompanyId,
}: {
  sellerProfileId?: string | null
  sellerCompanyId?: string | null
}): Promise<boolean> {
  if (!sellerProfileId && !sellerCompanyId) return false
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false
  if (sellerProfileId && sellerProfileId === user.id) return false

  const admin = createAdminClient()
  const q = sellerProfileId
    ? admin
        .from('seller_followers')
        .select('id')
        .eq('follower_id', user.id)
        .eq('seller_profile_id', sellerProfileId)
        .maybeSingle()
    : admin
        .from('seller_followers')
        .select('id')
        .eq('follower_id', user.id)
        .eq('seller_company_id', sellerCompanyId as string)
        .maybeSingle()
  const { data } = await q
  return !!data
}

function revalidate(profileId: string | null, companyId: string | null) {
  if (profileId) revalidatePath(`/sellers/${profileId}`)
  if (companyId) revalidatePath(`/companies/${companyId}`)
}
