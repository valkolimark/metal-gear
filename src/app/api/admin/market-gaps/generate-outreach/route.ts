import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { anthropic } from '@/lib/anthropic'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }

  const admin = createAdminClient()
  const { data: adminProfile } = await admin
    .from('profiles')
    .select('admin_role')
    .eq('id', user.id)
    .single()

  if (!adminProfile?.admin_role) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  const { subcategory, sosCount, unmatchedPct, sellerType } = await req.json()

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: `You are writing a cold outreach email to recruit equipment sellers for Metal Gear, a B2B industrial equipment marketplace based in Houston, TX. Write a compelling, professional email that highlights the specific demand signal.

Tone: Professional but not corporate. Mention the real data. Make the value proposition clear.

Return ONLY valid JSON:
{
  "subject": "short subject line",
  "body": "the full email body in plain text"
}`,
      messages: [
        {
          role: 'user',
          content: `Write a recruitment email for a ${sellerType || 'dealer'} who sells ${subcategory}. We're seeing ${sosCount} requests for this equipment in the Gulf Coast region over the past 90 days, with ${unmatchedPct}% going unanswered. Metal Gear is a growing marketplace that connects industrial equipment buyers and sellers.`,
        },
      ],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    return NextResponse.json(JSON.parse(jsonMatch[0]))
  } catch (err) {
    console.error('Market gap outreach generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate outreach' }, { status: 500 })
  }
}
