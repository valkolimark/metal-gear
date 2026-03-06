import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date().toISOString()

  // Find expired boosts
  const { data: expiredBoosts } = await admin
    .from('boost_purchases')
    .select('id, listing_id, boost_type')
    .eq('status', 'active')
    .lt('expires_at', now)

  if (!expiredBoosts || expiredBoosts.length === 0) {
    return NextResponse.json({ expired: 0 })
  }

  // Mark all as expired
  const expiredIds = expiredBoosts.map((b) => b.id)
  await admin
    .from('boost_purchases')
    .update({ status: 'expired' })
    .in('id', expiredIds)

  // Clear listing-level boost flags
  const listingIds = [
    ...new Set(
      expiredBoosts
        .filter((b) => b.listing_id && b.boost_type === 'listing_featured')
        .map((b) => b.listing_id!)
    ),
  ]

  for (const listingId of listingIds) {
    // Only clear if no other active boost exists for this listing
    const { count } = await admin
      .from('boost_purchases')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId)
      .eq('boost_type', 'listing_featured')
      .eq('status', 'active')

    if (!count || count === 0) {
      await admin
        .from('listings')
        .update({ is_featured: false, featured_until: null })
        .eq('id', listingId)
    }
  }

  // Clear pinned positions for expired category pins
  const pinnedListingIds = [
    ...new Set(
      expiredBoosts
        .filter((b) => b.listing_id && b.boost_type === 'category_pin')
        .map((b) => b.listing_id!)
    ),
  ]

  for (const listingId of pinnedListingIds) {
    const { count } = await admin
      .from('boost_purchases')
      .select('id', { count: 'exact', head: true })
      .eq('listing_id', listingId)
      .eq('boost_type', 'category_pin')
      .eq('status', 'active')

    if (!count || count === 0) {
      await admin
        .from('listings')
        .update({ pinned_position: null, pinned_category: null })
        .eq('id', listingId)
    }
  }

  // Log to audit trail
  await admin.from('admin_audit_log').insert({
    admin_id: '00000000-0000-0000-0000-000000000000',
    action: 'cron_expire_boosts',
    target_type: 'system',
    target_id: 'cron',
    metadata: { expired_count: expiredBoosts.length },
  })

  return NextResponse.json({ expired: expiredBoosts.length })
}
