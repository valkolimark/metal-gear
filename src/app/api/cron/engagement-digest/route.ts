import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Find users inactive for 7+ days
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const { data: inactiveUsers } = await admin
    .from('profiles')
    .select('id, full_name, email_notifications')
    .lt('last_login_at', sevenDaysAgo.toISOString())
    .not('last_login_at', 'is', null)

  if (!inactiveUsers || inactiveUsers.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // Get recent listings for digest
  const { data: newListings } = await admin
    .from('listings')
    .select('id, title, category, price_cents')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(5)

  let sent = 0

  for (const user of inactiveUsers) {
    // Check if user has unsubscribed from digests
    const prefs = user.email_notifications as Record<string, boolean> | null
    if (prefs?.digest === false) continue

    // Get user email from auth
    const { data: authUser } = await admin.auth.admin.getUserById(user.id)
    if (!authUser?.user?.email) continue

    const listingsHtml = (newListings || [])
      .map(
        (l) =>
          `<li><a href="${process.env.NEXT_PUBLIC_APP_URL}/listings/${l.id}">${l.title}</a> — ${
            l.price_cents ? `$${(l.price_cents / 100).toLocaleString()}` : 'Contact for price'
          }</li>`
      )
      .join('')

    await sendEmail({
      to: authUser.user.email,
      subject: 'What\'s new on Metal Gear this week',
      html: `
        <h2>Hey ${user.full_name || 'there'}, we miss you!</h2>
        <p>Here's what's happening on Metal Gear:</p>

        ${
          listingsHtml
            ? `<h3>New Equipment Listings</h3><ul>${listingsHtml}</ul>`
            : ''
        }

        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/search">Browse all equipment →</a></p>

        <hr>
        <p style="font-size: 12px; color: #888;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?user=${user.id}&type=digest">Unsubscribe from weekly digest</a>
        </p>
      `,
    }).catch(console.error)

    sent++
  }

  return NextResponse.json({ sent })
}
