import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadListingVideo } from '@/lib/media'
import { validateVideoBytes } from '@/lib/security/file-validation'

const VIDEO_MAX_SIZE = 200 * 1024 * 1024 // 200MB

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 10 * 60 * 1000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest): Promise<Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!checkRateLimit(user.id)) {
    return NextResponse.json({ error: 'Upload rate limit exceeded' }, { status: 429 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  const listingId = formData.get('listingId') as string | null

  if (!file || !listingId) {
    return NextResponse.json({ error: 'Missing file or listingId' }, { status: 400 })
  }

  if (file.size > VIDEO_MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 200MB)' }, { status: 413 })
  }

  const byteCheck = await validateVideoBytes(file)
  if (!byteCheck.valid) {
    return NextResponse.json({ error: byteCheck.reason }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const result = await uploadListingVideo(buffer, listingId, file.name)
    return NextResponse.json({
      videoId: result.videoId,
      embedUrl: result.embedUrl,
      thumbnailUrl: result.thumbnailUrl,
      hlsUrl: result.hlsUrl,
      status: 'processing',
    })
  } catch (err) {
    console.error('Listing video upload error:', err)
    return NextResponse.json({ error: 'Video upload failed' }, { status: 500 })
  }
}
