import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { anthropic } from '@/lib/anthropic'
import { withAiUsageTracking } from '@/lib/telemetry/ai-usage'

export const runtime = 'nodejs'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: userId } = await params

  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Check admin
  const { data: adminProfile } = await admin
    .from('profiles')
    .select('admin_role')
    .eq('id', user.id)
    .single()

  if (!adminProfile?.admin_role) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Get target user data
  const { data: targetProfile } = await admin
    .from('profiles')
    .select('full_name, display_name, subscription_tier, company_name, created_at, last_login_at')
    .eq('id', userId)
    .single()

  if (!targetProfile) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Get churn signals
  const { data: churnData } = await admin
    .from('churn_risk')
    .select('risk_score, risk_level, signals')
    .eq('user_id', userId)
    .single()

  // Get user activity stats
  const [listingsRes, conversationsRes, sosRes] = await Promise.all([
    admin.from('listings').select('id', { count: 'exact', head: true }).eq('seller_id', userId),
    admin.from('conversations').select('id', { count: 'exact', head: true }).or(`buyer_id.eq.${userId},seller_id.eq.${userId}`),
    admin.from('sos_requests').select('id', { count: 'exact', head: true }).eq('requester_id', userId),
  ])

  // Get user email
  const { data: authUser } = await admin.auth.admin.getUserById(userId)
  const userEmail = authUser?.user?.email || 'Unknown'

  const name = targetProfile.display_name || targetProfile.full_name || 'there'
  const daysSinceLogin = targetProfile.last_login_at
    ? Math.round((Date.now() - new Date(targetProfile.last_login_at).getTime()) / (1000 * 60 * 60 * 24))
    : null

  try {
    const response = await withAiUsageTracking(
      {
        userId: user.id,
        surface: 'other',
        vendor: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        traceId: userId,
      },
      () => anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: `You are writing a retention email for Metal Gear, a B2B industrial equipment marketplace. The tone should be personal, warm, and direct — like a founder reaching out to a valued customer. Not corporate marketing speak.

The goal is to re-engage the user before they cancel. Be genuine — acknowledge their inactivity without being pushy. Highlight the specific value they've gotten from the platform.

Return ONLY valid JSON:
{
  "subject": "short, personal subject line",
  "body": "the full email body in plain text with line breaks",
  "tone": "brief note on the tone used"
}`,
      messages: [
        {
          role: 'user',
          content: JSON.stringify({
            name,
            email: userEmail,
            company: targetProfile.company_name,
            tier: targetProfile.subscription_tier,
            memberSince: targetProfile.created_at,
            daysSinceLastLogin: daysSinceLogin,
            totalListings: listingsRes.count || 0,
            totalConversations: conversationsRes.count || 0,
            totalSOS: sosRes.count || 0,
            churnSignals: churnData?.signals || {},
            riskLevel: churnData?.risk_level || 'unknown',
          }),
        },
      ],
      }),
      (r) => ({
        inputTokens: r.usage?.input_tokens,
        outputTokens: r.usage?.output_tokens,
      }),
    )

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (err) {
    console.error('Outreach generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate outreach' }, { status: 500 })
  }
}
