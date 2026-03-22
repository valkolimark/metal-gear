// Client-side image quality validation — Cycle 27c

export interface ImageQualityResult {
  passed: boolean
  issues: string[]
  warnings: string[]
}

const MIN_WIDE_SHOT_SIZE = 400
const MIN_NAMEPLATE_SIZE = 200
const MIN_FILE_SIZE = 5 * 1024 // 5KB
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MIN_BRIGHTNESS = 30
const MAX_BRIGHTNESS = 230
const BLUR_THRESHOLD_WIDE = 50
const BLUR_THRESHOLD_NAMEPLATE = 100
const SAMPLE_SIZE = 100

function computeQualityChecks(
  data: Uint8ClampedArray,
  naturalWidth: number,
  naturalHeight: number,
  fileSize: number,
  mode: 'wide_shot' | 'nameplate'
): ImageQualityResult {
  const issues: string[] = []
  const warnings: string[] = []

  // 1. File size
  if (fileSize < MIN_FILE_SIZE) {
    issues.push('Image file is too small and may be corrupted. Please use a different photo.')
  }
  if (fileSize > MAX_FILE_SIZE) {
    issues.push('Image file is larger than 10MB. Please use a smaller or more compressed photo.')
  }

  // 2. Resolution
  const minSize = mode === 'wide_shot' ? MIN_WIDE_SHOT_SIZE : MIN_NAMEPLATE_SIZE
  if (naturalWidth < minSize || naturalHeight < minSize) {
    issues.push(
      `Image is too small (${naturalWidth}×${naturalHeight}px). ` +
      `Minimum ${minSize}×${minSize}px required. Try getting closer or using a higher resolution photo.`
    )
  }

  // 3. Brightness (average luminance)
  let totalLuminance = 0
  const pixelCount = SAMPLE_SIZE * SAMPLE_SIZE
  for (let i = 0; i < data.length; i += 4) {
    // Perceived luminance formula
    totalLuminance += data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114
  }
  const avgLuminance = totalLuminance / pixelCount

  if (avgLuminance < MIN_BRIGHTNESS) {
    issues.push('Image is too dark. Adjust lighting and retake the photo.')
  } else if (avgLuminance > MAX_BRIGHTNESS) {
    issues.push('Image is too bright or overexposed. Reduce lighting and retake.')
  }

  // 4. Blur detection (Laplacian variance approximation on grayscale)
  const grayscale: number[] = []
  for (let i = 0; i < data.length; i += 4) {
    grayscale.push(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114)
  }

  let laplacianSum = 0
  let laplacianCount = 0
  for (let y = 1; y < SAMPLE_SIZE - 1; y++) {
    for (let x = 1; x < SAMPLE_SIZE - 1; x++) {
      const idx = y * SAMPLE_SIZE + x
      const laplacian =
        -4 * grayscale[idx] +
        grayscale[idx - 1] +
        grayscale[idx + 1] +
        grayscale[idx - SAMPLE_SIZE] +
        grayscale[idx + SAMPLE_SIZE]
      laplacianSum += laplacian * laplacian
      laplacianCount++
    }
  }
  const blurVariance = laplacianCount > 0 ? laplacianSum / laplacianCount : 0
  const blurThreshold = mode === 'wide_shot' ? BLUR_THRESHOLD_WIDE : BLUR_THRESHOLD_NAMEPLATE

  if (blurVariance < blurThreshold) {
    warnings.push(
      mode === 'nameplate'
        ? 'Image may be blurry. For best results, hold the camera steady and ensure the nameplate text is sharp.'
        : 'Image may be blurry. Hold the camera steady for a clearer shot.'
    )
  }

  return {
    passed: issues.length === 0,
    issues,
    warnings,
  }
}

export async function validateImageQuality(
  file: File,
  mode: 'wide_shot' | 'nameplate'
): Promise<ImageQualityResult> {
  // SSR guard
  if (typeof window === 'undefined' || typeof HTMLCanvasElement === 'undefined') {
    return { passed: true, issues: [], warnings: [] }
  }

  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = SAMPLE_SIZE
        canvas.height = SAMPLE_SIZE
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          URL.revokeObjectURL(url)
          resolve({ passed: true, issues: [], warnings: [] })
          return
        }
        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE)
        const data = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data
        URL.revokeObjectURL(url)
        resolve(computeQualityChecks(data, img.naturalWidth, img.naturalHeight, file.size, mode))
      } catch {
        URL.revokeObjectURL(url)
        resolve({ passed: true, issues: [], warnings: [] })
      }
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve({ passed: false, issues: ['Unable to load image. The file may be corrupted.'], warnings: [] })
    }

    img.src = url
  })
}
