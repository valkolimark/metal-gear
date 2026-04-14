'use client'

import { uploadSosMedia } from '@/app/actions/sos'

export type UploadOutcome =
  | { ok: true; url: string }
  | { ok: false; error: string; code?: string }

/**
 * Client-side wrapper around `uploadSosMedia` that performs a single silent
 * retry on transient server/network failures. Classifies the final error so
 * callers can surface a specific inline message.
 */
export async function uploadSosPhotoWithRetry(
  file: File,
  onRetry?: () => void
): Promise<UploadOutcome> {
  const attempt = async (): Promise<UploadOutcome> => {
    try {
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadSosMedia(fd)
      if ('error' in result) {
        return { ok: false, error: result.error, code: result.code }
      }
      return { ok: true, url: result.url }
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : 'Upload failed — please try again.',
        code: 'server',
      }
    }
  }

  const first = await attempt()
  if (first.ok) return first

  // Only retry transient failures. Bad-type/too-large/corrupt are deterministic.
  const transient = first.code === 'server' || first.code === undefined
  if (!transient) return first

  onRetry?.()
  return attempt()
}
