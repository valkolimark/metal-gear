import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail, savedSearchAlertEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(req: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Get all saved searches with email alerts enabled
  const { data: alertSearches, error: searchError } = await admin
    .from('saved_searches')
    .select('*, profiles!saved_searches_user_id_fkey(full_name, display_name, email_notifications)')
    .eq('notify_email', true)

  if (searchError || !alertSearches || alertSearches.length === 0) {
    return NextResponse.json({ processed: 0 })
  }

  // Get new listings from the last 24 hours
  const oneDayAgo = new Date()
  oneDayAgo.setDate(oneDayAgo.getDate() - 1)

  const { data: recentListings } = await admin
    .from('listings')
    .select('id, title, price_cents, category, condition, industry, location_city, location_state, contact_for_price, created_at')
    .eq('status', 'active')
    .gte('created_at', oneDayAgo.toISOString())

  if (!recentListings || recentListings.length === 0) {
    return NextResponse.json({ processed: 0, reason: 'no new listings' })
  }

  let emailsSent = 0

  // Get user emails via auth admin
  const userIds = [...new Set(alertSearches.map((s) => s.user_id))]
  const userEmails = new Map<string, string>()

  for (const userId of userIds) {
    const { data: authUser } = await admin.auth.admin.getUserById(userId)
    if (authUser?.user?.email) {
      userEmails.set(userId, authUser.user.email)
    }
  }

  // Process each saved search
  for (const search of alertSearches) {
    const filters = search.filters as Record<string, string>
    const profile = search.profiles as { full_name: string; display_name: string | null; email_notifications: unknown } | null
    const email = userEmails.get(search.user_id)

    if (!email || !profile) continue

    // Match listings against search filters
    const matches = recentListings.filter((listing) => {
      if (filters.category && listing.category !== filters.category) return false
      if (filters.condition && listing.condition !== filters.condition) return false
      if (filters.industry && listing.industry !== filters.industry) return false
      if (filters.minPrice && listing.price_cents && listing.price_cents < parseInt(filters.minPrice) * 100) return false
      if (filters.maxPrice && listing.price_cents && listing.price_cents > parseInt(filters.maxPrice) * 100) return false
      if (filters.query) {
        const q = filters.query.toLowerCase()
        if (!listing.title.toLowerCase().includes(q)) return false
      }
      if (filters.city && listing.location_city?.toLowerCase() !== filters.city.toLowerCase()) return false
      if (filters.state && listing.location_state?.toLowerCase() !== filters.state.toLowerCase()) return false
      return true
    })

    if (matches.length === 0) continue

    // Format matches for email
    const emailMatches = matches.slice(0, 10).map((m) => ({
      title: m.title,
      price: m.contact_for_price
        ? 'Contact for Price'
        : m.price_cents
          ? `$${(m.price_cents / 100).toLocaleString()}`
          : 'Price Not Set',
      id: m.id,
    }))

    const recipientName = profile.display_name || profile.full_name?.split(' ')[0] || 'there'
    const template = savedSearchAlertEmail(recipientName, search.name, emailMatches, search.user_id)

    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    })

    if (result.success) {
      emailsSent++
      // Update last_notified_at
      await admin
        .from('saved_searches')
        .update({ last_notified_at: new Date().toISOString() })
        .eq('id', search.id)
    }
  }

  return NextResponse.json({
    processed: alertSearches.length,
    emailsSent,
    newListings: recentListings.length,
  })
}
