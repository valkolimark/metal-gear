/**
 * One-time migration: Supabase Storage → Cloudflare R2 + Stream
 *
 * Usage:
 *   npx ts-node scripts/migrate-media.ts              # full migration
 *   npx ts-node scripts/migrate-media.ts --limit=10   # test with 10 records
 *
 * Idempotent: skips records whose URLs already contain R2_PUBLIC_URL.
 * Concurrency: max 10 parallel uploads.
 *
 * DO NOT run automatically — Mark runs manually.
 */

import { createClient } from '@supabase/supabase-js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import * as fs from 'fs'
import * as path from 'path'

// ── Config ──

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!
const BUCKET = process.env.R2_BUCKET_NAME!
const CF_ACCOUNT = process.env.CLOUDFLARE_ACCOUNT_ID!
const STREAM_TOKEN = process.env.CLOUDFLARE_STREAM_TOKEN!
const CF_SUBDOMAIN = process.env.CLOUDFLARE_CUSTOMER_SUBDOMAIN!

const CONCURRENCY = 10
const limitArg = process.argv.find((a) => a.startsWith('--limit='))
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : Infinity

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${CF_ACCOUNT}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

interface MigrationLog {
  started: string
  listing_images: { success: number; failed: number; skipped: number; errors: string[] }
  listing_videos: { success: number; failed: number; skipped: number; errors: string[] }
  avatars: { success: number; failed: number; skipped: number; errors: string[] }
  finished?: string
}

const log: MigrationLog = {
  started: new Date().toISOString(),
  listing_images: { success: 0, failed: 0, skipped: 0, errors: [] },
  listing_videos: { success: 0, failed: 0, skipped: 0, errors: [] },
  avatars: { success: 0, failed: 0, skipped: 0, errors: [] },
}

function saveLog() {
  fs.writeFileSync(
    path.join(__dirname, 'migration-log.json'),
    JSON.stringify(log, null, 2)
  )
}

async function downloadFile(url: string): Promise<Buffer> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${url}`)
  return Buffer.from(await res.arrayBuffer())
}

async function uploadToR2(buffer: Buffer, key: string, contentType: string): Promise<string> {
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  )
  return `${R2_PUBLIC_URL}/${key}`
}

async function uploadToStream(buffer: Buffer, filename: string) {
  const formData = new FormData()
  formData.append('file', new Blob([new Uint8Array(buffer)]), filename)

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT}/stream`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${STREAM_TOKEN}` },
      body: formData,
    }
  )

  if (!res.ok) throw new Error(`Stream upload failed: ${await res.text()}`)
  const json = await res.json()
  const v = json.result
  return {
    videoId: v.uid,
    thumbnailUrl: `https://${CF_SUBDOMAIN}/${v.uid}/thumbnails/thumbnail.jpg`,
    embedUrl: `https://iframe.videodelivery.net/${v.uid}`,
    hlsUrl: `https://${CF_SUBDOMAIN}/${v.uid}/manifest/video.m3u8`,
  }
}

function isAlreadyMigrated(url: string): boolean {
  return url.includes(R2_PUBLIC_URL) || url.includes('videodelivery.net') || url.includes(CF_SUBDOMAIN)
}

function contentTypeFromUrl(url: string): string {
  const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase()
  const map: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
    gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml',
    pdf: 'application/pdf', mp4: 'video/mp4', mov: 'video/quicktime',
  }
  return map[ext || ''] || 'application/octet-stream'
}

async function runBatch<T>(items: T[], fn: (item: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    const batch = items.slice(i, i + CONCURRENCY)
    await Promise.allSettled(batch.map(fn))
    saveLog()
  }
}

async function migrateListingImages() {
  console.log('\n--- Migrating listing_images ---')
  let query = supabase.from('listing_images').select('id, url, listing_id').order('created_at')
  if (LIMIT !== Infinity) query = query.limit(LIMIT)
  const { data: images } = await query
  if (!images?.length) { console.log('No listing images found'); return }

  console.log(`Found ${images.length} listing images`)

  await runBatch(images, async (img) => {
    if (isAlreadyMigrated(img.url)) {
      log.listing_images.skipped++
      return
    }
    try {
      const buffer = await downloadFile(img.url)
      const ext = img.url.split('.').pop()?.split('?')[0] || 'jpg'
      const key = `listings/${img.listing_id}/images/${img.id}.${ext}`
      const newUrl = await uploadToR2(buffer, key, contentTypeFromUrl(img.url))
      await supabase.from('listing_images').update({ url: newUrl }).eq('id', img.id)
      log.listing_images.success++
      console.log(`  [OK] listing_image ${img.id}`)
    } catch (err) {
      log.listing_images.failed++
      log.listing_images.errors.push(`${img.id}: ${err}`)
      console.error(`  [FAIL] listing_image ${img.id}:`, err)
    }
  })
}

async function migrateListingVideos() {
  console.log('\n--- Migrating listing_videos ---')
  let query = supabase.from('listing_videos').select('id, url, listing_id').order('created_at')
  if (LIMIT !== Infinity) query = query.limit(LIMIT)
  const { data: videos } = await query
  if (!videos?.length) { console.log('No listing videos found'); return }

  console.log(`Found ${videos.length} listing videos`)

  await runBatch(videos, async (vid) => {
    if (isAlreadyMigrated(vid.url)) {
      log.listing_videos.skipped++
      return
    }
    try {
      const buffer = await downloadFile(vid.url)
      const filename = `${vid.listing_id}-${vid.id}.mp4`
      const result = await uploadToStream(buffer, filename)
      await supabase
        .from('listing_videos')
        .update({
          url: result.embedUrl,
          stream_video_id: result.videoId,
          thumbnail_url: result.thumbnailUrl,
          embed_url: result.embedUrl,
          hls_url: result.hlsUrl,
          status: 'processing',
        })
        .eq('id', vid.id)
      log.listing_videos.success++
      console.log(`  [OK] listing_video ${vid.id} -> Stream ${result.videoId}`)
    } catch (err) {
      log.listing_videos.failed++
      log.listing_videos.errors.push(`${vid.id}: ${err}`)
      console.error(`  [FAIL] listing_video ${vid.id}:`, err)
    }
  })
}

async function migrateAvatars() {
  console.log('\n--- Migrating avatars ---')
  let query = supabase.from('profiles').select('id, avatar_url').not('avatar_url', 'is', null)
  if (LIMIT !== Infinity) query = query.limit(LIMIT)
  const { data: profiles } = await query
  if (!profiles?.length) { console.log('No avatars found'); return }

  const toMigrate = profiles.filter((p) => p.avatar_url && !isAlreadyMigrated(p.avatar_url))
  console.log(`Found ${toMigrate.length} avatars to migrate (${profiles.length - toMigrate.length} already done)`)
  log.avatars.skipped = profiles.length - toMigrate.length

  await runBatch(toMigrate, async (profile) => {
    try {
      const buffer = await downloadFile(profile.avatar_url!)
      const ext = profile.avatar_url!.split('.').pop()?.split('?')[0] || 'jpg'
      const key = `avatars/${profile.id}/avatar.${ext}`
      const newUrl = await uploadToR2(buffer, key, contentTypeFromUrl(profile.avatar_url!))
      await supabase.from('profiles').update({ avatar_url: newUrl }).eq('id', profile.id)
      log.avatars.success++
      console.log(`  [OK] avatar ${profile.id}`)
    } catch (err) {
      log.avatars.failed++
      log.avatars.errors.push(`${profile.id}: ${err}`)
      console.error(`  [FAIL] avatar ${profile.id}:`, err)
    }
  })
}

async function main() {
  console.log('=== Metal Gear Media Migration ===')
  console.log(`Limit: ${LIMIT === Infinity ? 'ALL' : LIMIT}`)
  console.log(`R2 target: ${R2_PUBLIC_URL}`)

  await migrateListingImages()
  await migrateListingVideos()
  await migrateAvatars()

  log.finished = new Date().toISOString()
  saveLog()

  console.log('\n=== Migration Complete ===')
  console.log(`Listing images: ${log.listing_images.success} OK, ${log.listing_images.failed} failed, ${log.listing_images.skipped} skipped`)
  console.log(`Listing videos: ${log.listing_videos.success} OK, ${log.listing_videos.failed} failed, ${log.listing_videos.skipped} skipped`)
  console.log(`Avatars: ${log.avatars.success} OK, ${log.avatars.failed} failed, ${log.avatars.skipped} skipped`)
  console.log(`Log saved to scripts/migration-log.json`)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  saveLog()
  process.exit(1)
})
