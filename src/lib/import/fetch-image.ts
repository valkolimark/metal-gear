import { uploadListingImage } from '@/lib/media'

export type ImageFetchResult = {
  success: boolean
  r2Url?: string
  error?: string
}

export async function fetchAndUploadImage(
  imageUrl: string,
  listingId: string,
  timeoutMs: number = 15000
): Promise<ImageFetchResult> {
  try {
    // Validate URL protocol
    const url = new URL(imageUrl)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { success: false, error: 'Invalid URL protocol' }
    }

    // Fetch with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'MetalGear-Import/1.0' },
    })
    clearTimeout(timeout)

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    // Validate content type
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) {
      return { success: false, error: `Not an image (content-type: ${contentType})` }
    }

    // Read as buffer
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Validate size (max 10MB)
    if (buffer.length > 10 * 1024 * 1024) {
      return { success: false, error: 'Image exceeds 10MB limit' }
    }

    // Upload to R2 via media.ts
    const r2Url = await uploadListingImage(buffer, listingId, contentType)
    return { success: true, r2Url }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Timeout after 15s' }
    }
    return { success: false, error: error instanceof Error ? error.message : String(error) }
  }
}
