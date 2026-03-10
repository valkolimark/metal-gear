import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { anthropic } from '@/lib/anthropic'
import { sendEmail } from '@/lib/email'

export const runtime = 'nodejs'
export const maxDuration = 120

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://metal-gear-five.vercel.app'
const BRAND_COLOR = '#1877F2'
const BG_COLOR = '#0A0A0F'

interface WeeklyBriefData {
  period: { start: string; end: string }
  growth: {
    newSignups: number
    newSignupsVsLastWeek: number
    activeUsers: number
    churnedUsers: number
  }
  listings: {
    newListings: number
    soldListings: number
    avgDaysToSell: number
    topCategories: Array<{ category: string; count: number }>
    avgQualityScore: number
  }
  revenue: {
    newSubscriptions: number
    cancelledSubscriptions: number
    boostPurchases: number
  }
  sos: {
    totalSOSBroadcasts: number
    avgResponseRate: number
    criticalSOSUnfulfilled: number
    topRequestedEquipment: string[]
  }
  search: {
    topSearchTerms: string[]
    zeroResultSearches: string[]
    aiSearchAdoption: number
  }
  quality: {
    fraudFlagsThisWeek: number
    openDisputes: number
    resolvedDisputes: number
  }
  anomalies: string[]
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Calculate period (last 7 days)
  const periodEnd = new Date()
  const periodStart = new Date()
  periodStart.setDate(periodStart.getDate() - 7)
  const prevWeekStart = new Date()
  prevWeekStart.setDate(prevWeekStart.getDate() - 14)

  const startIso = periodStart.toISOString()
  const endIso = periodEnd.toISOString()
  const prevStartIso = prevWeekStart.toISOString()

  // Gather all data in parallel
  const [
    newSignupsRes,
    prevSignupsRes,
    activeUsersRes,
    churnedUsersRes,
    newListingsRes,
    soldListingsRes,
    topCategoriesRes,
    newSubsRes,
    cancelledSubsRes,
    boostPurchasesRes,
    sosRes,
    criticalSosRes,
    fraudRes,
    openDisputesRes,
    resolvedDisputesRes,
  ] = await Promise.all([
    // New signups this week
    admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', startIso),
    // New signups prev week (for delta)
    admin.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', prevStartIso).lt('created_at', startIso),
    // Active users (logged in this week)
    admin.from('profiles').select('id', { count: 'exact', head: true }).gte('last_login_at', startIso),
    // Churned (cancelled subscription this week — subscription_tier changed to free)
    admin.from('profiles').select('id', { count: 'exact', head: true }).eq('subscription_tier', 'free').gte('updated_at', startIso),
    // New listings
    admin.from('listings').select('id', { count: 'exact', head: true }).gte('created_at', startIso),
    // Sold listings
    admin.from('listings').select('id', { count: 'exact', head: true }).eq('status', 'sold').gte('updated_at', startIso),
    // Top categories
    admin.from('listings').select('category').gte('created_at', startIso),
    // New subscriptions
    admin.from('profiles').select('id', { count: 'exact', head: true }).neq('subscription_tier', 'free').gte('created_at', startIso),
    // Cancelled subscriptions (approximation)
    admin.from('admin_audit_log').select('id', { count: 'exact', head: true }).eq('action', 'subscription_cancelled').gte('created_at', startIso),
    // Boost purchases
    admin.from('boost_purchases').select('id', { count: 'exact', head: true }).gte('created_at', startIso),
    // SOS broadcasts
    admin.from('sos_requests').select('id, equipment_category', { count: 'exact' }).gte('created_at', startIso),
    // Critical SOS unfulfilled
    admin.from('sos_requests').select('id', { count: 'exact', head: true }).eq('urgency', 'critical').eq('status', 'active').gte('created_at', startIso),
    // Fraud flags
    admin.from('listings').select('id', { count: 'exact', head: true }).eq('ai_fraud_flagged', true).gte('created_at', startIso),
    // Open disputes
    admin.from('disputes').select('id', { count: 'exact', head: true }).in('status', ['open', 'under_review', 'escalated']),
    // Resolved disputes this week
    admin.from('disputes').select('id', { count: 'exact', head: true }).in('status', ['resolved_buyer', 'resolved_seller']).gte('updated_at', startIso),
  ])

  // Process top categories
  const categoryData = (topCategoriesRes.data || []) as Array<{ category: string }>
  const categoryCounts = new Map<string, number>()
  for (const l of categoryData) {
    categoryCounts.set(l.category, (categoryCounts.get(l.category) || 0) + 1)
  }
  const topCategories = [...categoryCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, count]) => ({ category, count }))

  // Get SOS equipment data
  const sosData = (sosRes.data || []) as Array<{ id: string; equipment_category: string }>
  const sosCats = new Map<string, number>()
  for (const s of sosData) {
    if (s.equipment_category) sosCats.set(s.equipment_category, (sosCats.get(s.equipment_category) || 0) + 1)
  }
  const topRequestedEquipment = [...sosCats.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat]) => cat)

  // Build anomalies
  const anomalies: string[] = []
  const newSignups = newSignupsRes.count || 0
  const prevSignups = prevSignupsRes.count || 0
  if (prevSignups > 0 && newSignups > prevSignups * 1.5) {
    anomalies.push(`Signup spike: ${newSignups} vs ${prevSignups} last week (+${Math.round(((newSignups - prevSignups) / prevSignups) * 100)}%)`)
  }
  if (prevSignups > 0 && newSignups < prevSignups * 0.5) {
    anomalies.push(`Signup drop: ${newSignups} vs ${prevSignups} last week (-${Math.round(((prevSignups - newSignups) / prevSignups) * 100)}%)`)
  }
  if ((fraudRes.count || 0) > 5) {
    anomalies.push(`High fraud flags: ${fraudRes.count} this week`)
  }

  const briefData: WeeklyBriefData = {
    period: {
      start: periodStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      end: periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    },
    growth: {
      newSignups,
      newSignupsVsLastWeek: newSignups - prevSignups,
      activeUsers: activeUsersRes.count || 0,
      churnedUsers: churnedUsersRes.count || 0,
    },
    listings: {
      newListings: newListingsRes.count || 0,
      soldListings: soldListingsRes.count || 0,
      avgDaysToSell: 0,
      topCategories,
      avgQualityScore: 0,
    },
    revenue: {
      newSubscriptions: newSubsRes.count || 0,
      cancelledSubscriptions: cancelledSubsRes.count || 0,
      boostPurchases: boostPurchasesRes.count || 0,
    },
    sos: {
      totalSOSBroadcasts: sosRes.count || 0,
      avgResponseRate: 0,
      criticalSOSUnfulfilled: criticalSosRes.count || 0,
      topRequestedEquipment,
    },
    search: {
      topSearchTerms: [],
      zeroResultSearches: [],
      aiSearchAdoption: 0,
    },
    quality: {
      fraudFlagsThisWeek: fraudRes.count || 0,
      openDisputes: openDisputesRes.count || 0,
      resolvedDisputes: resolvedDisputesRes.count || 0,
    },
    anomalies,
  }

  // Generate AI brief
  let aiBrief: string
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: `You are the business intelligence analyst for Metal Gear, a B2B industrial equipment marketplace in Houston, TX. Write a concise weekly executive brief for the founders.

Format:
1. **Week in Review** (2-3 sentences: what stood out)
2. **Key Numbers** (bullet list of most important metrics with context)
3. **What's Working** (1-3 specific things showing positive signals)
4. **Concerns** (1-3 things that need attention — be direct)
5. **Recommended Actions** (exactly 3 specific, actionable items for this week)
6. **One Insight** (one non-obvious observation from the data)

Tone: Direct, honest, founder-to-founder. No fluff. If something is bad, say it.
If something is great, say why it matters. Max 500 words total.

Return plain text formatted with markdown.`,
      messages: [
        {
          role: 'user',
          content: `Weekly data for ${briefData.period.start} – ${briefData.period.end}:\n\n${JSON.stringify(briefData, null, 2)}`,
        },
      ],
    })

    aiBrief = response.content[0].type === 'text' ? response.content[0].text : 'Failed to generate brief.'
  } catch (err) {
    console.error('Weekly brief AI generation failed:', err)
    aiBrief = 'AI brief generation failed. Raw data attached below.'
  }

  // Get superadmin emails
  const { data: superadmins } = await admin
    .from('profiles')
    .select('id')
    .eq('admin_role', 'superadmin')

  const recipientEmails: string[] = []
  for (const sa of superadmins || []) {
    const { data: authUser } = await admin.auth.admin.getUserById(sa.id)
    if (authUser?.user?.email) recipientEmails.push(authUser.user.email)
  }

  // Store brief
  await admin.from('weekly_briefs').insert({
    period_start: periodStart.toISOString().split('T')[0],
    period_end: periodEnd.toISOString().split('T')[0],
    raw_data: JSON.parse(JSON.stringify(briefData)),
    ai_brief: aiBrief,
    sent_to: recipientEmails,
  })

  // Send emails
  let emailsSent = 0
  const weekLabel = `${briefData.period.start} – ${briefData.period.end}`

  // Convert markdown to simple HTML
  const briefHtml = aiBrief
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:#fff;">$1</strong>')
    .replace(/^### (.*$)/gm, '<h3 style="color:#1877F2;font-size:16px;margin:16px 0 8px;">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 style="color:#1877F2;font-size:18px;margin:20px 0 10px;">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 style="color:#1877F2;font-size:20px;margin:24px 0 12px;">$1</h1>')
    .replace(/^- (.*$)/gm, '<li style="color:#ccc;font-size:14px;line-height:1.6;margin:4px 0;">$1</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')

  const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background-color:${BG_COLOR};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:${BRAND_COLOR};font-size:24px;margin:0;">Metal Gear</h1>
      <p style="color:#888;font-size:12px;margin:4px 0 0;">Weekly Business Brief</p>
    </div>
    <div style="background:#15151F;border-radius:12px;padding:32px;border:1px solid #2a2a3a;">
      <h2 style="color:#fff;font-size:20px;margin:0 0 8px;">Week of ${weekLabel}</h2>
      <div style="color:#ccc;font-size:14px;line-height:1.6;">
        ${briefHtml}
      </div>
      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #2a2a3a;">
        <details style="color:#888;font-size:12px;">
          <summary style="cursor:pointer;color:#999;margin-bottom:8px;">Raw Data</summary>
          <pre style="background:#0d0d15;padding:12px;border-radius:6px;overflow-x:auto;font-size:11px;color:#888;">${JSON.stringify(briefData, null, 2)}</pre>
        </details>
      </div>
      <div style="text-align:center;margin-top:24px;">
        <a href="${APP_URL}/admin"
           style="display:inline-block;background:${BRAND_COLOR};color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
          View Admin Dashboard
        </a>
      </div>
    </div>
  </div>
</body>
</html>`

  for (const email of recipientEmails) {
    const result = await sendEmail({
      to: email,
      subject: `Metal Gear Weekly Brief — Week of ${weekLabel}`,
      html: emailHtml,
    })
    if (result.success) emailsSent++
  }

  return NextResponse.json({
    period: weekLabel,
    emailsSent,
    recipients: recipientEmails.length,
    dataPoints: Object.keys(briefData).length,
  })
}
