import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const body = await req.text()

  // Verify webhook signature
  const secret = process.env.CLOUDFLARE_STREAM_WEBHOOK_SECRET
  if (secret) {
    const signature = req.headers.get('webhook-signature') || ''
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex')

    if (signature !== expectedSig) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  const event = JSON.parse(body)
  const videoId = event?.uid
  if (!videoId) {
    return NextResponse.json({ ok: true })
  }

  const admin = createAdminClient()

  if (event.readyToStream) {
    await admin
      .from('listing_videos')
      .update({
        status: 'ready',
        duration_seconds: Math.round(event.duration || 0),
      })
      .eq('stream_video_id', videoId)
  } else if (event.status?.state === 'error') {
    await admin
      .from('listing_videos')
      .update({ status: 'error' })
      .eq('stream_video_id', videoId)
  }

  return NextResponse.json({ ok: true })
}
