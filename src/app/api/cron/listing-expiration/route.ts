import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { createNotification } from '@/app/actions/notifications'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()

  // 1. Expire active listings past their expiration date
  const { data: expiredListings } = await admin
    .from('listings')
    .select('id, title, seller_id, auto_renew, expires_at')
    .eq('status', 'active')
    .lt('expires_at', now.toISOString())
    .not('expires_at', 'is', null)

  let expired = 0
  let renewed = 0

  for (const listing of expiredListings || []) {
    if (listing.auto_renew) {
      // Auto-renew: extend by 90 days
      const newExpiry = new Date()
      newExpiry.setDate(newExpiry.getDate() + 90)

      await admin
        .from('listings')
        .update({ expires_at: newExpiry.toISOString() })
        .eq('id', listing.id)

      renewed++

      await createNotification(
        listing.seller_id,
        'listing_sold', // reuse type for listing events
        'Listing Auto-Renewed',
        `Your listing "${listing.title}" has been automatically renewed for 90 days.`,
        { listing_id: listing.id }
      )
    } else {
      // Expire the listing
      await admin
        .from('listings')
        .update({ status: 'expired' })
        .eq('id', listing.id)

      expired++

      // Notify seller
      await createNotification(
        listing.seller_id,
        'listing_sold',
        'Listing Expired',
        `Your listing "${listing.title}" has expired. Renew it to make it visible again.`,
        { listing_id: listing.id }
      )

      // Send email
      const { data: authUser } = await admin.auth.admin.getUserById(listing.seller_id)
      if (authUser?.user?.email) {
        await sendEmail({
          to: authUser.user.email,
          subject: `Your listing "${listing.title}" has expired`,
          html: `
            <h2>Listing Expired</h2>
            <p>Your listing "<strong>${listing.title}</strong>" has expired after 90 days.</p>
            <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/listings/${listing.id}">Renew your listing →</a></p>
          `,
        }).catch(console.error)
      }
    }
  }

  // 2. Send warning emails for listings expiring in 7 days
  const sevenDaysFromNow = new Date()
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
  const sixDaysFromNow = new Date()
  sixDaysFromNow.setDate(sixDaysFromNow.getDate() + 6)

  const { data: soonExpiring } = await admin
    .from('listings')
    .select('id, title, seller_id, expires_at, auto_renew')
    .eq('status', 'active')
    .gte('expires_at', sixDaysFromNow.toISOString())
    .lt('expires_at', sevenDaysFromNow.toISOString())

  let warned = 0
  for (const listing of soonExpiring || []) {
    if (listing.auto_renew) continue // No warning needed for auto-renew

    const { data: authUser } = await admin.auth.admin.getUserById(listing.seller_id)
    if (!authUser?.user?.email) continue

    await sendEmail({
      to: authUser.user.email,
      subject: `Your listing "${listing.title}" expires in 7 days`,
      html: `
        <h2>Listing Expiring Soon</h2>
        <p>Your listing "<strong>${listing.title}</strong>" will expire in 7 days.</p>
        <p>To keep it active, you can:</p>
        <ul>
          <li><a href="${process.env.NEXT_PUBLIC_APP_URL}/listings/${listing.id}/edit">Enable auto-renewal</a></li>
          <li><a href="${process.env.NEXT_PUBLIC_APP_URL}/listings/${listing.id}">Manually renew</a></li>
        </ul>
      `,
    }).catch(console.error)

    warned++
  }

  // 3. Send warning for listings expiring tomorrow
  const oneDayFromNow = new Date()
  oneDayFromNow.setDate(oneDayFromNow.getDate() + 1)
  const twoDaysFromNow = new Date()
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)

  const { data: expiringTomorrow } = await admin
    .from('listings')
    .select('id, title, seller_id, auto_renew')
    .eq('status', 'active')
    .gte('expires_at', oneDayFromNow.toISOString())
    .lt('expires_at', twoDaysFromNow.toISOString())

  for (const listing of expiringTomorrow || []) {
    if (listing.auto_renew) continue

    await createNotification(
      listing.seller_id,
      'listing_sold',
      'Listing Expires Tomorrow',
      `Your listing "${listing.title}" expires tomorrow. Renew it to keep it visible.`,
      { listing_id: listing.id }
    )
  }

  return NextResponse.json({ expired, renewed, warned })
}
