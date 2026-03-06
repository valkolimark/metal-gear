import { randomUUID } from 'crypto'
import { uploadToR2, deleteFromR2, getR2Url } from './r2'
import { uploadToStream, deleteStreamVideo } from './cloudflare-stream'
import type { StreamUploadResult } from './cloudflare-stream'

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL!
const CUSTOMER_SUBDOMAIN = process.env.CLOUDFLARE_CUSTOMER_SUBDOMAIN!

function extFromContentType(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'application/pdf': 'pdf',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
  }
  return map[contentType] || 'bin'
}

export async function uploadListingImage(
  file: Buffer,
  listingId: string,
  contentType: string
): Promise<string> {
  const ext = extFromContentType(contentType)
  const key = `listings/${listingId}/images/${randomUUID()}.${ext}`
  return uploadToR2(file, key, contentType)
}

export type VideoUploadResult = StreamUploadResult

export async function uploadListingVideo(
  file: Buffer,
  listingId: string,
  filename: string
): Promise<VideoUploadResult> {
  return uploadToStream(file, `${listingId}-${filename}`)
}

export async function uploadAvatar(
  file: Buffer,
  userId: string,
  contentType: string
): Promise<string> {
  const ext = extFromContentType(contentType)
  const key = `avatars/${userId}/${randomUUID()}.${ext}`
  return uploadToR2(file, key, contentType)
}

export async function uploadSOSMedia(
  file: Buffer,
  sosId: string,
  contentType: string
): Promise<string> {
  const ext = extFromContentType(contentType)
  const key = `sos/${sosId}/${randomUUID()}.${ext}`
  return uploadToR2(file, key, contentType)
}

export async function uploadDisputeEvidence(
  file: Buffer,
  disputeId: string,
  contentType: string
): Promise<string> {
  const ext = extFromContentType(contentType)
  const key = `disputes/${disputeId}/${randomUUID()}.${ext}`
  return uploadToR2(file, key, contentType)
}

export async function uploadConditionReport(
  file: Buffer,
  reportId: string,
  contentType: string
): Promise<string> {
  const ext = extFromContentType(contentType)
  const key = `condition-reports/${reportId}/${randomUUID()}.${ext}`
  return uploadToR2(file, key, contentType)
}

export async function uploadMessageAttachmentFile(
  file: Buffer,
  userId: string,
  messageId: string,
  contentType: string
): Promise<string> {
  const ext = extFromContentType(contentType)
  const key = `messages/${userId}/${messageId}/${randomUUID()}.${ext}`
  return uploadToR2(file, key, contentType)
}

export async function uploadStorefrontBannerFile(
  file: Buffer,
  userId: string,
  contentType: string
): Promise<string> {
  const ext = extFromContentType(contentType)
  const key = `storefronts/${userId}/banner-${randomUUID()}.${ext}`
  return uploadToR2(file, key, contentType)
}

export async function uploadVerificationDocument(
  file: Buffer,
  userId: string,
  contentType: string
): Promise<string> {
  const ext = extFromContentType(contentType)
  const key = `verification/${userId}/${randomUUID()}.${ext}`
  return uploadToR2(file, key, contentType)
}

export async function deleteMedia(url: string): Promise<void> {
  // Cloudflare Stream URLs
  if (
    url.includes('videodelivery.net') ||
    url.includes(CUSTOMER_SUBDOMAIN)
  ) {
    // Extract video ID from Stream URLs
    const match = url.match(/\/([a-f0-9]{32})\b/)
    if (match) {
      await deleteStreamVideo(match[1])
    }
    return
  }

  // R2 URLs
  if (url.includes(R2_PUBLIC_URL)) {
    const key = url.replace(`${R2_PUBLIC_URL}/`, '')
    await deleteFromR2(key)
    return
  }

  // Legacy Supabase URLs — skip silently (don't delete during migration)
  console.warn(`deleteMedia: skipping unrecognized URL pattern: ${url}`)
}

export { getR2Url }
