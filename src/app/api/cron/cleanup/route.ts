import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { deleteMedia } from '@/lib/media'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const results: Record<string, { deleted: number; error?: string }> = {}

  // 1. Delete old notifications (90+ days)
  try {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)

    const { data } = await admin
      .from('notifications')
      .delete()
      .lt('created_at', cutoff.toISOString())
      .select('id')

    results.old_notifications = { deleted: data?.length || 0 }
  } catch (e) {
    results.old_notifications = { deleted: 0, error: e instanceof Error ? e.message : 'Unknown' }
  }

  // 2. Delete old read notifications (30+ days)
  try {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 30)

    const { data } = await admin
      .from('notifications')
      .delete()
      .eq('read', true)
      .lt('created_at', cutoff.toISOString())
      .select('id')

    results.read_notifications = { deleted: data?.length || 0 }
  } catch (e) {
    results.read_notifications = { deleted: 0, error: e instanceof Error ? e.message : 'Unknown' }
  }

  // 3. Clean up old listing views (keep last 90 days)
  try {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 90)

    const { data } = await admin
      .from('listing_views')
      .delete()
      .lt('viewed_at', cutoff.toISOString())
      .select('id')

    results.old_views = { deleted: data?.length || 0 }
  } catch (e) {
    results.old_views = { deleted: 0, error: e instanceof Error ? e.message : 'Unknown' }
  }

  // 4. Clean up orphaned price history (listings no longer exist)
  try {
    const { data: priceHistoryIds } = await admin
      .from('price_history')
      .select('id, listing_id')

    if (priceHistoryIds && priceHistoryIds.length > 0) {
      const listingIds = [...new Set(priceHistoryIds.map(p => p.listing_id))]
      const { data: existingListings } = await admin
        .from('listings')
        .select('id')
        .in('id', listingIds)

      const existingSet = new Set((existingListings || []).map(l => l.id))
      const orphanedIds = priceHistoryIds
        .filter(p => !existingSet.has(p.listing_id))
        .map(p => p.id)

      if (orphanedIds.length > 0) {
        await admin.from('price_history').delete().in('id', orphanedIds)
      }
      results.orphaned_price_history = { deleted: orphanedIds.length }
    } else {
      results.orphaned_price_history = { deleted: 0 }
    }
  } catch (e) {
    results.orphaned_price_history = { deleted: 0, error: e instanceof Error ? e.message : 'Unknown' }
  }

  // 5. Process R2 cleanup queue (max 50 items per run)
  try {
    const { data: queueItems } = await admin
      .from('r2_cleanup_queue')
      .select('id, r2_key')
      .is('processed_at', null)
      .order('created_at', { ascending: true })
      .limit(50)

    let r2Cleaned = 0
    for (const item of queueItems ?? []) {
      try {
        const r2Url = `https://media.metalgear.com/${item.r2_key}`
        await deleteMedia(r2Url)
        await admin
          .from('r2_cleanup_queue')
          .update({ processed_at: new Date().toISOString() })
          .eq('id', item.id)
        r2Cleaned++
      } catch (error) {
        await admin
          .from('r2_cleanup_queue')
          .update({ error: String(error) })
          .eq('id', item.id)
      }
    }
    results.r2_cleanup = { deleted: r2Cleaned }
  } catch (e) {
    results.r2_cleanup = { deleted: 0, error: e instanceof Error ? e.message : 'Unknown' }
  }

  const totalDeleted = Object.values(results).reduce((sum, r) => sum + r.deleted, 0)

  console.log('[cron/cleanup]', JSON.stringify({ totalDeleted, results }))

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    totalDeleted,
    results,
  })
}
