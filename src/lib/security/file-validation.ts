/**
 * Magic byte (file signature) validation.
 * Content-Type headers are trivially spoofed — we inspect the actual file bytes.
 */

const ALLOWED_IMAGE_SIGNATURES: Array<{
  bytes: number[]
  mime: string
  checkWebp?: boolean
}> = [
  { bytes: [0xff, 0xd8, 0xff], mime: 'image/jpeg' },
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: 'image/png' },
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp', checkWebp: true },
  { bytes: [0x47, 0x49, 0x46, 0x38], mime: 'image/gif' },
]

// HEIC/HEIF are ISO base media containers: bytes 4..11 = "ftypheic" / "ftypheix" / "ftypmif1" / "ftyphevc" / "ftyphevx"
const HEIF_BRANDS = new Set([
  'heic',
  'heix',
  'heim',
  'heis',
  'hevc',
  'hevx',
  'hevm',
  'hevs',
  'mif1',
  'msf1',
])

const ALLOWED_VIDEO_SIGNATURES: Array<{
  offset?: number
  bytes: number[]
  mime: string
}> = [
  { offset: 4, bytes: [0x66, 0x74, 0x79, 0x70], mime: 'video/mp4' },
]

const ALLOWED_DOC_SIGNATURES: Array<{
  bytes: number[]
  mime: string
}> = [
  { bytes: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf' },
  { bytes: [0x50, 0x4b, 0x03, 0x04], mime: 'application/zip' },
  { bytes: [0xd0, 0xcf, 0x11, 0xe0], mime: 'application/vnd.ms-excel' },
]

export type FileValidationResult =
  | { valid: true; detectedMime: string }
  | { valid: false; reason: string }

function matchesBytes(
  data: Uint8Array,
  signature: readonly number[]
): boolean {
  if (data.length < signature.length) return false
  return signature.every((byte, i) => data[i] === byte)
}

export async function validateImageBytes(
  file: File | Buffer
): Promise<FileValidationResult> {
  const slice =
    file instanceof File
      ? new Uint8Array(await file.slice(0, 16).arrayBuffer())
      : new Uint8Array(file.buffer, file.byteOffset, Math.min(16, file.length))

  for (const sig of ALLOWED_IMAGE_SIGNATURES) {
    if (matchesBytes(slice, sig.bytes)) {
      if (sig.checkWebp) {
        const webpSig = [0x57, 0x45, 0x42, 0x50]
        if (!matchesBytes(slice.slice(8), webpSig)) continue
      }
      return { valid: true, detectedMime: sig.mime }
    }
  }

  // HEIC/HEIF: "ftyp" at offset 4 followed by a known HEIF brand
  if (slice.length >= 12) {
    const ftyp = String.fromCharCode(slice[4], slice[5], slice[6], slice[7])
    if (ftyp === 'ftyp') {
      const brand = String.fromCharCode(slice[8], slice[9], slice[10], slice[11]).toLowerCase()
      if (HEIF_BRANDS.has(brand)) {
        return { valid: true, detectedMime: 'image/heic' }
      }
    }
  }

  return {
    valid: false,
    reason:
      'File content does not match an allowed image format (JPEG, PNG, WebP, GIF, HEIC)',
  }
}

export async function validateVideoBytes(
  file: File
): Promise<FileValidationResult> {
  const buffer = await file.slice(0, 12).arrayBuffer()
  const bytes = new Uint8Array(buffer)

  for (const sig of ALLOWED_VIDEO_SIGNATURES) {
    const sliced = bytes.slice(sig.offset ?? 0)
    if (matchesBytes(sliced, sig.bytes)) {
      return { valid: true, detectedMime: sig.mime }
    }
  }

  // MP4/MOV boxes can appear at different offsets — fall back to extension allowlist
  const ext = file instanceof File ? file.name.split('.').pop()?.toLowerCase() : undefined
  if (ext && ['mp4', 'mov', 'm4v'].includes(ext)) {
    return { valid: true, detectedMime: 'video/mp4' }
  }

  return {
    valid: false,
    reason:
      'File content does not match an allowed video format (MP4, MOV)',
  }
}

export async function validateDocumentBytes(
  file: File
): Promise<FileValidationResult> {
  const buffer = await file.slice(0, 8).arrayBuffer()
  const bytes = new Uint8Array(buffer)

  for (const sig of ALLOWED_DOC_SIGNATURES) {
    if (matchesBytes(bytes, sig.bytes)) {
      return { valid: true, detectedMime: sig.mime }
    }
  }

  return {
    valid: false,
    reason:
      'File content does not match an allowed document format (PDF, XLSX, XLS)',
  }
}

export const FILE_SIZE_LIMITS = {
  image: 10 * 1024 * 1024, // 10MB
  video: 500 * 1024 * 1024, // 500MB
  document: 25 * 1024 * 1024, // 25MB
  avatar: 5 * 1024 * 1024, // 5MB
} as const

export function validateFileSize(
  file: File,
  type: keyof typeof FILE_SIZE_LIMITS
): FileValidationResult {
  const limit = FILE_SIZE_LIMITS[type]
  if (file.size > limit) {
    const limitMB = Math.round(limit / (1024 * 1024))
    return { valid: false, reason: `File size exceeds ${limitMB}MB limit` }
  }
  return { valid: true, detectedMime: file.type }
}
