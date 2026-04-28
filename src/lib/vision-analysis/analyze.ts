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
  RegistryMatchSummary,
} from "./types"

const CLAUDE_MODEL = "claude-sonnet-4-20250514"

// A photo must carry at least this many characters of OCR text before we
// treat it as a nameplate capture. Below the threshold we'd be labeling a
// side-of-machine warning sticker or a single-word brand decal as a
// "nameplate" — confusing when the dealer didn't actually shoot the data tag.
const MIN_NAMEPLATE_OCR_CHARS = 30

// Threshold at which the registry lookup is confident enough to override the
// Claude/OCR-derived manufacturer string with the canonical registry name.
// Below this, the FK summary is still attached to the result (so orchestrators
// can log it) but the free-text manufacturer is left untouched.
const REGISTRY_OVERRIDE_THRESHOLD = 0.9

// Max OCR brand candidates fed to the registry lookup. Most nameplates carry
// 1–3 visible brand names (equipment OEM + motor + maybe a controller); 6 is
// generous headroom without inflating the search fan-out.
const MAX_BRAND_CANDIDATES = 6

/**
 * Heuristic brand-candidate extractor for the registry lookup.
 *
 * OCR blocks include short ALL-CAPS tokens that are very likely brand decals
 * (BALDOR, ABB, WEG, SHARPLES, …). We collect those, plus the Claude-identified
 * manufacturer, dedup case-insensitively, and hand the union to the registry.
 *
 * Conservative on purpose: we filter to tokens that look like brand strings
 * (ASCII letters/digits/&/-, length 2–40, mostly letters) so we don't drown
 * the registry search in serial numbers and dimensions.
 */
function gatherBrandCandidates(
  claudeManufacturer: string | null,
  ocrFullText: string,
): string[] {
  const seen = new Set<string>()
  const out: string[] = []

  const push = (raw: string | null | undefined) => {
    if (!raw) return
    const s = raw.trim()
    if (!s) return
    const key = s.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    out.push(s)
  }

  push(claudeManufacturer)

  if (ocrFullText) {
    // Token regex: words containing letters, possibly with digits, &, hyphen.
    const tokens = ocrFullText.match(/[A-Za-z][A-Za-z0-9&\-]{1,39}/g) ?? []
    for (const tok of tokens) {
      // Skip very common OCR fragments that aren't brands.
      const upper = tok.toUpperCase()
      if (
        upper.length < 2 ||
        BRAND_NOISE_TOKENS.has(upper) ||
        /^\d+$/.test(tok)
      ) {
        continue
      }
      // Heuristic: brand-like tokens are ALL-CAPS words from the nameplate
      // graphic OR start with an uppercase letter. We bias toward ALL-CAPS
      // because brand decals are almost always rendered that way.
      const allCaps = tok === upper && /[A-Z]/.test(tok)
      if (allCaps) push(tok)
      if (out.length >= MAX_BRAND_CANDIDATES) break
    }
  }

  return out.slice(0, MAX_BRAND_CANDIDATES)
}

const BRAND_NOISE_TOKENS: ReadonlySet<string> = new Set([
  "MODEL",
  "SERIAL",
  "TYPE",
  "MFG",
  "MFD",
  "DATE",
  "WARNING",
  "CAUTION",
  "DANGER",
  "NOTICE",
  "VOLT",
  "VOLTS",
  "VOLTAGE",
  "AMP",
  "AMPS",
  "WATT",
  "WATTS",
  "HP",
  "RPM",
  "HZ",
  "KW",
  "PHASE",
  "PH",
  "PSI",
  "BAR",
  "MAX",
  "MIN",
  "NO",
  "PART",
  "PARTS",
  "MADE",
  "USA",
  "CHINA",
  "GERMANY",
  "JAPAN",
  "ITALY",
  "FRANCE",
  "UK",
  "EU",
  "OEM",
  "INC",
  "LLC",
  "LTD",
  "CO",
  "CORP",
  "GMBH",
])

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
  perPhotoOcr: Array<{ photoIndex: number; text: string }>,
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
    perPhotoOcr: perPhotoOcr.filter((p) => p.photoIndex < imageBlocks.length),
    nameplateHintPhotoIndex: nameplateHintIndex,
    taxonomy: options.taxonomyContext,
    mode: options.mode,
  })

  const claudeStart = Date.now()
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

    safeEmitUsage(options, {
      vendor: "anthropic",
      model: CLAUDE_MODEL,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      latencyMs: Date.now() - claudeStart,
      success: true,
    })

    const parsed = extractJSON(rawText) as ClaudeIdentificationOutput | null
    return { output: parsed, raw: rawText }
  } catch (err) {
    console.error("[vision-analysis] Claude call failed:", err)
    safeEmitUsage(options, {
      vendor: "anthropic",
      model: CLAUDE_MODEL,
      latencyMs: Date.now() - claudeStart,
      success: false,
      errorClass: err instanceof Error ? err.name || "Error" : "unknown",
    })
    return {
      output: null,
      raw: "",
      error: err instanceof Error ? err.message : "claude_call_failed",
    }
  }
}

function safeEmitUsage(
  options: EquipmentAnalysisOptions,
  event: import("./types").VisionUsageEvent,
): void {
  if (!options.onUsageEvent) return
  try {
    options.onUsageEvent(event)
  } catch (err) {
    // Telemetry is fire-and-forget — never let it break analysis.
    console.error("[vision-analysis] onUsageEvent threw:", err)
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
    Promise.allSettled(
      photoUrls.map(async (url) => {
        const callStart = Date.now()
        try {
          const result = await detectNameplateText(url)
          safeEmitUsage(options, {
            vendor: "google_vision",
            visionFeature: "document_text_detection",
            visionUnits: 1,
            latencyMs: Date.now() - callStart,
            success: !result.error,
            errorClass: result.error,
          })
          return result
        } catch (err) {
          safeEmitUsage(options, {
            vendor: "google_vision",
            visionFeature: "document_text_detection",
            visionUnits: 0,
            latencyMs: Date.now() - callStart,
            success: false,
            errorClass: err instanceof Error ? err.name || "Error" : "unknown",
          })
          throw err
        }
      }),
    ),
    Promise.allSettled([
      (async () => {
        const callStart = Date.now()
        try {
          const result = await detectWebMatches(photoUrls[0])
          safeEmitUsage(options, {
            vendor: "google_vision",
            visionFeature: "web_detection",
            visionUnits: 1,
            latencyMs: Date.now() - callStart,
            success: !result.error,
            errorClass: result.error,
          })
          return result
        } catch (err) {
          safeEmitUsage(options, {
            vendor: "google_vision",
            visionFeature: "web_detection",
            visionUnits: 0,
            latencyMs: Date.now() - callStart,
            success: false,
            errorClass: err instanceof Error ? err.name || "Error" : "unknown",
          })
          throw err
        }
      })(),
    ]),
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

  // ─── Parallel stage 2 — Claude (pass per-photo OCR for sub-component disambiguation) ───
  const perPhotoOcr = ocrResults.map((r, i) => ({
    photoIndex: i,
    text: r?.fullText ?? "",
  }))
  const claudeStart = Date.now()
  const claudeRes = await callClaude(photoUrls, perPhotoOcr, nameplate.index, options)
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

  let identification = merged.identification
  let registryMatch: RegistryMatchSummary | null = null

  // ─── Registry lookup (Cycle 61b) ───────────────────────────────────────
  // Opt-in: only runs when the caller passed a `registryLookup` callback.
  // The callback may throw or reject — we catch and treat as a soft failure.
  if (options.registryLookup) {
    const registryStart = Date.now()
    const candidates = gatherBrandCandidates(
      identification.manufacturer,
      nameplate.text,
    )
    if (candidates.length > 0) {
      try {
        const lookup = await options.registryLookup({
          candidates,
          equipmentType: identification.equipmentType,
          model: identification.model,
        })
        if (lookup) {
          registryMatch = {
            manufacturerId: lookup.manufacturerId,
            manufacturerModelId: lookup.manufacturerModelId,
            confidence: lookup.confidence,
            method: lookup.method,
          }
          // Override the free-text manufacturer with the canonical registry
          // name only at high confidence (precision over recall — false
          // positives undermine the "Verified manufacturer" trust signal).
          if (
            lookup.confidence >= REGISTRY_OVERRIDE_THRESHOLD &&
            lookup.manufacturerName
          ) {
            identification = {
              ...identification,
              manufacturer: lookup.manufacturerName,
              model: lookup.manufacturerModelName ?? identification.model,
            }
          }
        }
      } catch (err) {
        console.error("[vision-analysis] registryLookup failed:", err)
        errors.push("registry_lookup_failed")
      }
    }
    reportStage("registry_lookup", Date.now() - registryStart)
  }

  return {
    identification,
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
    registryMatch,
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
    registryMatch: null,
  }
}
