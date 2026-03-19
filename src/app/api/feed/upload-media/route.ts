import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { uploadFeedPostMedia } from '@/lib/media'
import { getStreamVideo } from '@/lib/cloudflare-stream'

const IMAGE_MAX_SIZE = 10 * 1024 * 1024 // 10MB
const VIDEO_MAX_SIZE = 200 * 1024 * 1024 // 200MB

// In-memory rate limit: 20 uploads per user per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(userId)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 10 * 60 * 1000 })
    return true
  }
  if (entry.count >= 20) return false
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
  const type = formData.get('type') as string | null
  const postId = formData.get('postId') as string | null

  if (!file || !type || !postId) {
    return NextResponse.json({ error: 'Missing file, type, or postId' }, { status: 400 })
  }

  if (type !== 'image' && type !== 'video') {
    return NextResponse.json({ error: 'Type must be image or video' }, { status: 400 })
  }

  const maxSize = type === 'image' ? IMAGE_MAX_SIZE : VIDEO_MAX_SIZE
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: 'File too large' },
      { status: 413 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await uploadFeedPostMedia(buffer, postId, file.type, type)

  return NextResponse.json({
    url: result.url,
    streamVideoId: result.streamVideoId ?? null,
    thumbnailUrl: result.thumbnailUrl ?? null,
    mediaType: type,
    status: type === 'image' ? 'ready' : 'processing',
  })
}

// GET — video status polling
export async function GET(request: NextRequest): Promise<Response> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const streamVideoId = request.nextUrl.searchParams.get('streamVideoId')
  if (!streamVideoId) {
    return NextResponse.json({ error: 'Missing streamVideoId' }, { status: 400 })
  }

  try {
    const video = await getStreamVideo(streamVideoId)
    const status = video.readyToStream ? 'ready' : video.status?.state === 'error' ? 'error' : 'processing'
    return NextResponse.json({ status })
  } catch {
    return NextResponse.json({ status: 'error' })
  }
}
