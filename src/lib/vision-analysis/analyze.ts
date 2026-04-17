/**
 * `analyzeEquipmentImages` — the main reusable entry point for the vision
 * analysis pipeline.
 *
 *   Input:  photoUrls (publicly reachable), options.taxonomyContext.
 *   Output: EquipmentAnalysisResult with structured fields + confidence map.
 *
 * Fans out Google Vision (OCR + web detection) and Claude in parallel via
 * Promise.allSettled, then merges. This module MUST NOT depend on
 *   - listing_drafts
 *   - listings
 *   - sos_requests
 *   - @/app/actions/snap-list*
 *   - @/lib/snap-list/*
 *
 * A consumer (orchestrator) layers persistence and business rules on top.
 */

import Anthropic from "@anthropic-ai/sdk"
import {
  detectNameplateText,
  detectWebMatches,
  type NameplateOCRResult,
  type WebDetectionResult,
} from "@/lib/google-vision"
import {
  buildEquipmentIdentificationPrompt,
  EQUIPMENT_VISION_SYSTEM_PROMPT,
} from "./prompts"
import {
  extractFieldsFromOCR,
  mergeOCRWithVisual,
  type ClaudeIdentificationOutput,
} from "./merge"
import type {
  EquipmentAnalysisOptions,
  EquipmentAnalysisResult,
} from "./types"

const CLAUDE_MODEL = "claude-sonnet-4-20250514"

// A photo must carry at least this many characters of OCR text before we
// treat it as a nameplate capture. Below the threshold we'd be labeling a
// side-of-machine warning sticker or a single-word brand decal as a
// "nameplate" — confusing when the dealer didn't actually shoot the data tag.
const MIN_NAMEPLATE_OCR_CHARS = 30

function pickNameplatePhoto(
  ocrResults: NameplateOCRResult[],
): { index: number | null; text: string; result: NameplateOCRResult | null } {
  let best = -1
  let bestLen = 0
  for (let i = 0; i < ocrResults.length; i++) {
    const len = ocrResults[i]?.fullText?.trim()?.length ?? 0
    if (len > bestLen) {
      bestLen = len
      best = i
    }
  }
  if (best === -1 || bestLen < MIN_NAMEPLATE_OCR_CHARS) {
    // Still return any OCR text we did find — it can still inform Claude —
    // but don't mark a specific photo as "the nameplate."
    const anyText = best >= 0 ? ocrResults[best].fullText : ""
    return { index: null, text: anyText, result: best >= 0 ? ocrResults[best] : null }
  }
  return { index: best, text: ocrResults[best].fullText, result: ocrResults[best] }
}

function extractJSON(text: string): unknown {
  if (!text) return null
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  const raw = fenced ? fenced[1] : text
  const firstBrace = raw.indexOf("{")
  const lastBrace = raw.lastIndexOf("}")
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null
  const slice = raw.slice(firstBrace, lastBrace + 1)
  try {
    return JSON.parse(slice)
  } catch {
    return null
  }
}

async function fetchImageAsBase64(
  url: string,
): Promise<{ data: string; mediaType: string } | null> {
  try {
    const res = await fetch(url, { cache: "no-store" })
    if (!res.ok) return null
    const buf = Buffer.from(await res.arrayBuffer())
    const mediaType = res.headers.get("content-type") ?? "image/jpeg"
    return { data: buf.toString("base64"), mediaType }
  } catch (err) {
    console.error("[vision-analysis] fetchImageAsBase64 failed:", err)
    return null
  }
}

async function callClaude(
  photoUrls: string[],
  ocrText: string,
  nameplateHintIndex: number | null,
  options: EquipmentAnalysisOptions,
): Promise<{ output: ClaudeIdentificationOutput | null; raw: string; error?: string }> {
  const apiKey = options.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { output: null, raw: "", error: "missing_anthropic_api_key" }

  const client = new Anthropic({ apiKey })

  // Cap at 4 images for the Claude call — matches the existing analyzer pattern
  // and keeps token usage reasonable.
  const urlsForClaude = photoUrls.slice(0, 4)
  const imageFetches = await Promise.all(urlsForClaude.map(fetchImageAsBase64))
  const imageBlocks = imageFetches
    .filter((b): b is { data: string; mediaType: string } => b !== null)
    .map((b) => ({
      type: "image" as const,
      source: {
        type: "base64" as const,
        media_type: b.mediaType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
        data: b.data,
      },
    }))

  if (imageBlocks.length === 0) {
    return { output: null, raw: "", error: "no_images_fetchable" }
  }

  const promptText = buildEquipmentIdentificationPrompt({
    photoCount: imageBlocks.length,
    ocrText: ocrText || null,
    nameplateHintPhotoIndex: nameplateHintIndex,
    taxonomy: options.taxonomyContext,
  })

  try {
    const response = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      system: EQUIPMENT_VISION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            ...imageBlocks,
            { type: "text", text: promptText },
          ],
        },
      ],
    })

    const rawText = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("\n")

    const parsed = extractJSON(rawText) as ClaudeIdentificationOutput | null
    return { output: parsed, raw: rawText }
  } catch (err) {
    console.error("[vision-analysis] Claude call failed:", err)
    return {
      output: null,
      raw: "",
      error: err instanceof Error ? err.message : "claude_call_failed",
    }
  }
}

/**
 * Analyze 1–N equipment photos and return a structured result.
 *
 * - Parallel fan-out: OCR per photo + web detection + Claude.
 * - Never throws: partial failures populate `errors[]` and return whatever
 *   could be produced.
 */
export async function analyzeEquipmentImages(
  photoUrls: string[],
  options: EquipmentAnalysisOptions,
): Promise<EquipmentAnalysisResult> {
  const errors: string[] = []
  const stageTimings: Record<string, number> = {}
  const reportStage = (stage: string, ms: number) => {
    stageTimings[stage] = ms
    options.onStageComplete?.(stage, ms)
  }

  if (!photoUrls || photoUrls.length === 0) {
    return emptyResult(options, ["no_photos_provided"])
  }

  // ─── Parallel stage 1 — OCR on every photo + web detection on the first ───
  const ocrStart = Date.now()
  const webStart = Date.now()

  const [ocrSettled, webSettled] = await Promise.all([
    Promise.allSettled(photoUrls.map((url) => detectNameplateText(url))),
    Promise.allSettled([detectWebMatches(photoUrls[0])]),
  ])

  const ocrResults: NameplateOCRResult[] = ocrSettled.map((r, i) => {
    if (r.status === "fulfilled") return r.value
    errors.push(`ocr_photo_${i}_failed`)
    return { fullText: "", blocks: [], hasText: false, error: "ocr_rejected" }
  })
  reportStage("ocr", Date.now() - ocrStart)

  let webDetection: WebDetectionResult = {
    fullMatchingImages: [],
    partialMatchingImages: [],
    pagesWithMatchingImages: [],
  }
  if (webSettled[0].status === "fulfilled") {
    webDetection = webSettled[0].value
  } else {
    errors.push("web_detection_failed")
  }
  reportStage("web_detection", Date.now() - webStart)

  const nameplate = pickNameplatePhoto(ocrResults)

  // ─── Parallel stage 2 — Claude ─────────────────────────────────────────
  const claudeStart = Date.now()
  const claudeRes = await callClaude(photoUrls, nameplate.text, nameplate.index, options)
  reportStage("claude", Date.now() - claudeStart)
  if (claudeRes.error) errors.push(`claude_${claudeRes.error}`)

  // ─── Merge ─────────────────────────────────────────────────────────────
  const mergeStart = Date.now()
  const ocrExtracted = nameplate.result
    ? extractFieldsFromOCR(nameplate.result.blocks, nameplate.result.fullText)
    : {}
  const merged = mergeOCRWithVisual(
    claudeRes.output ?? {},
    ocrExtracted,
    nameplate.text.length > 0,
  )
  reportStage("merge", Date.now() - mergeStart)

  // ─── Fraud signal ──────────────────────────────────────────────────────
  const stockPhotoMatches = webDetection.fullMatchingImages.filter((u) => {
    // A match on our own R2 domain is not fraud — it's the photo we just uploaded.
    return !u.includes("media.metalgear.com") && !u.includes("r2.dev")
  })

  const isSuspicious =
    merged.fraud.isSuspicious || stockPhotoMatches.length > 0

  return {
    identification: merged.identification,
    specs: merged.specs,
    condition: merged.condition,
    ocr: {
      fullText: nameplate.text,
      blocks: nameplate.result?.blocks ?? [],
      hasText: nameplate.text.length > 0,
      sourcePhotoIndex: nameplate.index,
    },
    fraud: {
      stockPhotoMatches,
      webPages: webDetection.pagesWithMatchingImages,
      isSuspicious,
      reasons: merged.fraud.reasons,
    },
    confidence: merged.confidence,
    clarifyingQuestions: merged.clarifyingQuestions,
    stageTimings,
    callerTag: options.callerTag,
    errors,
    rawClaudeOutput: claudeRes.raw || undefined,
    rawWebDetection: webDetection,
    rawOCR: ocrResults,
  }
}

function emptyResult(
  options: EquipmentAnalysisOptions,
  errors: string[],
): EquipmentAnalysisResult {
  return {
    identification: {
      manufacturer: null,
      model: null,
      serialNumber: null,
      year: null,
      equipmentType: null,
      taxonomy: { tier1: null, tier2: null, subcategory: null },
      suggestedTitle: null,
      suggestedDescription: null,
    },
    specs: {},
    condition: { tier: null, notes: null },
    ocr: { fullText: "", blocks: [], hasText: false, sourcePhotoIndex: null },
    fraud: { stockPhotoMatches: [], webPages: [], isSuspicious: false, reasons: [] },
    confidence: {},
    clarifyingQuestions: [],
    stageTimings: {},
    callerTag: options.callerTag,
    errors,
  }
}
