/**
 * Low-level Google Cloud Vision wrapper.
 *
 * Domain-agnostic — knows nothing about equipment, listings, or Metal Gear
 * business rules. Higher-level consumers (src/lib/vision-analysis/) layer
 * their own merge/confidence/prompt logic on top.
 *
 * Credentials are supplied via env:
 *   - GOOGLE_CLOUD_PROJECT_ID
 *   - GOOGLE_APPLICATION_CREDENTIALS_JSON (base64-encoded service-account JSON)
 *
 * All calls are wrapped so a failure in Google returns an empty typed result
 * (with `error` populated) rather than throwing — callers must never be
 * blocked by a vendor outage.
 */

import { ImageAnnotatorClient, protos } from "@google-cloud/vision"

export interface OCRBlock {
  text: string
  confidence: number
  bounds: Array<{ x: number; y: number }>
}

export interface NameplateOCRResult {
  fullText: string
  blocks: OCRBlock[]
  hasText: boolean
  error?: string
}

export interface WebDetectionResult {
  fullMatchingImages: string[]
  partialMatchingImages: string[]
  pagesWithMatchingImages: string[]
  error?: string
}

let cachedClient: ImageAnnotatorClient | null = null

function getClient(): ImageAnnotatorClient | null {
  if (cachedClient) return cachedClient

  const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID
  const credentialsB64 = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON

  if (!projectId || !credentialsB64) {
    return null
  }

  try {
    const jsonText = Buffer.from(credentialsB64, "base64").toString("utf8")
    const credentials = JSON.parse(jsonText)
    cachedClient = new ImageAnnotatorClient({ credentials, projectId })
    return cachedClient
  } catch (err) {
    // Bad base64 / JSON parse — log and return null so callers fall back.
    console.error("[google-vision] failed to init client:", err)
    return null
  }
}

function emptyOCR(error?: string): NameplateOCRResult {
  return { fullText: "", blocks: [], hasText: false, error }
}

function emptyWebDetection(error?: string): WebDetectionResult {
  return {
    fullMatchingImages: [],
    partialMatchingImages: [],
    pagesWithMatchingImages: [],
    error,
  }
}

/**
 * Run DOCUMENT_TEXT_DETECTION on a publicly-reachable image URL.
 * Returns normalized OCR blocks with confidences; never throws.
 */
export async function detectNameplateText(
  imageUrl: string,
): Promise<NameplateOCRResult> {
  const client = getClient()
  if (!client) return emptyOCR("google_vision_not_configured")

  try {
    const [result] = await client.annotateImage({
      image: { source: { imageUri: imageUrl } },
      features: [{ type: "DOCUMENT_TEXT_DETECTION" }],
    })

    const annotation = result.fullTextAnnotation
    const fullText = annotation?.text ?? ""

    const blocks: OCRBlock[] = []
    for (const page of annotation?.pages ?? []) {
      for (const block of page.blocks ?? []) {
        const text = flattenBlockText(block)
        if (!text.trim()) continue
        const vertices = block.boundingBox?.vertices ?? []
        blocks.push({
          text,
          confidence: block.confidence ?? 0,
          bounds: vertices.map((v) => ({ x: v.x ?? 0, y: v.y ?? 0 })),
        })
      }
    }

    return { fullText, blocks, hasText: fullText.trim().length > 0 }
  } catch (err) {
    console.error("[google-vision] detectNameplateText failed:", err)
    return emptyOCR(err instanceof Error ? err.message : "unknown_error")
  }
}

/**
 * Run WEB_DETECTION on an image URL — used to flag stock photos / reused
 * imagery. Returns matching URLs and pages; never throws.
 */
export async function detectWebMatches(
  imageUrl: string,
): Promise<WebDetectionResult> {
  const client = getClient()
  if (!client) return emptyWebDetection("google_vision_not_configured")

  try {
    const [result] = await client.annotateImage({
      image: { source: { imageUri: imageUrl } },
      features: [{ type: "WEB_DETECTION" }],
    })
    const web = result.webDetection
    return {
      fullMatchingImages: (web?.fullMatchingImages ?? [])
        .map((i) => i.url ?? "")
        .filter(Boolean),
      partialMatchingImages: (web?.partialMatchingImages ?? [])
        .map((i) => i.url ?? "")
        .filter(Boolean),
      pagesWithMatchingImages: (web?.pagesWithMatchingImages ?? [])
        .map((p) => p.url ?? "")
        .filter(Boolean),
    }
  } catch (err) {
    console.error("[google-vision] detectWebMatches failed:", err)
    return emptyWebDetection(err instanceof Error ? err.message : "unknown_error")
  }
}

function flattenBlockText(block: protos.google.cloud.vision.v1.IBlock): string {
  const words: string[] = []
  for (const paragraph of block.paragraphs ?? []) {
    for (const word of paragraph.words ?? []) {
      const text = (word.symbols ?? []).map((s) => s.text ?? "").join("")
      if (text) words.push(text)
    }
  }
  return words.join(" ")
}

export function isGoogleVisionConfigured(): boolean {
  return getClient() !== null
}
