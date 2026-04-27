import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import { createClient } from "@/lib/supabase/server"
import { EQUIPMENT_TAXONOMY } from "@/lib/constants/equipment-taxonomy"
import * as Sentry from "@sentry/nextjs"
import {
  analyzeEquipmentImages,
  type AnalysisMode,
  type EquipmentAnalysisResult,
} from "@/lib/vision-analysis"
import { projectAnalysisToSosFields } from "@/lib/sos/vision-orchestrator"
import { uploadToR2, deleteFromR2 } from "@/lib/r2"
import { getR2Url } from "@/lib/r2"
import type {
  AnalyzeImageRequest,
  AIAnalysisResult,
  FieldConfidenceScores,
} from "@/types/ai-analysis"

export const maxDuration = 60

const MAX_BASE64_SIZE = 15_000_000
const VALID_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const
const VALID_MODES: AnalysisMode[] = ["snap-list", "sos", "listing-helper"]

type ImageMimeType = (typeof VALID_MIME_TYPES)[number]

interface AnalyzeRequestBody extends AnalyzeImageRequest {
  mode?: AnalysisMode
}

function extFromMime(mime: string): string {
  switch (mime) {
    case "image/png":
      return "png"
    case "image/webp":
      return "webp"
    case "image/gif":
      return "gif"
    default:
      return "jpg"
  }
}

async function uploadBase64ToTempR2(
  base64: string,
  ownerId: string,
  mime: string,
): Promise<{ url: string; key: string }> {
  const buffer = Buffer.from(base64, "base64")
  const key = `tmp/analyze/${ownerId}/${randomUUID()}.${extFromMime(mime)}`
  await uploadToR2(buffer, key, mime)
  return { url: getR2Url(key), key }
}

function bestEffortDelete(key: string) {
  // Fire-and-forget — best-effort cleanup. Failures are not user-visible.
  deleteFromR2(key).catch((err) => {
    console.error("[analyze-image] tmp R2 cleanup failed", { key, err })
  })
}

function pickConditionConfidence(result: EquipmentAnalysisResult): number {
  return (
    result.confidence?.condition_estimate ??
    result.confidence?.condition ??
    0.5
  )
}

function projectToAIAnalysisResult(
  result: EquipmentAnalysisResult,
  analysisMode: "single_image" | "multi_image",
  rawText: string,
  mode: AnalysisMode,
): AIAnalysisResult {
  const id = result.identification
  const conf = result.confidence ?? {}

  const scores: FieldConfidenceScores = {
    equipment_type: conf.equipment_type ?? 0.5,
    manufacturer: conf.manufacturer ?? 0.5,
    model: conf.model ?? 0.5,
    serial_number: conf.serial_number ?? conf.serialNumber ?? 0.5,
    year: conf.year ?? 0.5,
    condition: pickConditionConfidence(result),
    taxonomy: conf.taxonomy ?? 0.5,
    title: conf.suggested_title ?? conf.title ?? 0.5,
    fraud: conf.fraud ?? 0.5,
  }

  const criticalKeys: Array<keyof FieldConfidenceScores> = [
    "equipment_type",
    "manufacturer",
    "model",
    "taxonomy",
    "title",
  ]
  const overallConfidence =
    Math.round(
      (criticalKeys.reduce((acc, k) => acc + scores[k], 0) /
        criticalKeys.length) *
        100,
    ) / 100

  const lowConfidenceFields = (
    [
      "equipment_type",
      "manufacturer",
      "model",
      "serial_number",
      "year",
      "taxonomy",
    ] as Array<keyof FieldConfidenceScores>
  ).filter((k) => scores[k] < 0.5)

  const taxConf = scores.taxonomy
  const taxConfStr: "high" | "medium" | "low" =
    taxConf >= 0.8 ? "high" : taxConf >= 0.5 ? "medium" : "low"

  // SOS-mode callers may want a projected suggestion shape on the side, but
  // the response envelope stays AIAnalysisResult so existing clients are
  // unchanged. We project to surface SOS-tuned fields as a non-breaking
  // addition on `listing.specs` if the orchestrator yields anything new.
  let specs: Record<string, string | number> = result.specs ?? {}
  if (mode === "sos") {
    const sos = projectAnalysisToSosFields(result)
    specs = { ...specs, ...sos.keySpecs }
  }

  // Convert spec values to strings (legacy AIAnalysisResult shape).
  const specsAsStrings: Record<string, string> = {}
  for (const [key, value] of Object.entries(specs)) {
    specsAsStrings[key] = typeof value === "string" ? value : String(value)
  }

  return {
    taxonomy: {
      tier1: id.taxonomy.tier1 ?? undefined,
      tier2: id.taxonomy.tier2 ?? undefined,
      subcategory: id.taxonomy.subcategory ?? undefined,
      confidence: taxConfStr,
      numericConfidence: taxConf,
      alternatives: [],
    },
    listing: {
      title: id.suggestedTitle ?? undefined,
      manufacturer: id.manufacturer ?? undefined,
      model: id.model ?? undefined,
      serialNumber: id.serialNumber ?? undefined,
      year: id.year ?? undefined,
      condition: result.condition.tier ?? undefined,
      specs: specsAsStrings,
      suggestedDescription: id.suggestedDescription ?? undefined,
    },
    fraud: {
      flagged: result.fraud.isSuspicious,
      reason:
        result.fraud.reasons.length > 0
          ? result.fraud.reasons.join("; ")
          : undefined,
      confidence: scores.fraud,
    },
    rawAnalysis: rawText,
    confidenceScores: scores,
    overallConfidence,
    lowConfidenceFields,
    analysisMode,
    wasReprompted: false,
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 },
    )
  }

  let body: AnalyzeRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const {
    wideShot,
    nameplateShot,
    nameplateImageBase64,
    mimeType = "image/jpeg",
    nameplateMimeType,
    mode: rawMode,
  } = body

  const mode: AnalysisMode = VALID_MODES.includes(rawMode as AnalysisMode)
    ? (rawMode as AnalysisMode)
    : "listing-helper"

  if (wideShot && wideShot.length > MAX_BASE64_SIZE) {
    return NextResponse.json(
      { error: "Wide shot image too large (max 10MB)" },
      { status: 400 },
    )
  }
  if (nameplateShot && nameplateShot.length > MAX_BASE64_SIZE) {
    return NextResponse.json(
      { error: "Nameplate image too large (max 10MB)" },
      { status: 400 },
    )
  }
  if (nameplateImageBase64 && nameplateImageBase64.length > MAX_BASE64_SIZE) {
    return NextResponse.json(
      { error: "Nameplate image too large (max 10MB)" },
      { status: 400 },
    )
  }
  if (!VALID_MIME_TYPES.includes(mimeType as ImageMimeType)) {
    return NextResponse.json(
      { error: "Invalid image MIME type" },
      { status: 400 },
    )
  }
  if (
    nameplateMimeType &&
    !VALID_MIME_TYPES.includes(nameplateMimeType as ImageMimeType)
  ) {
    return NextResponse.json(
      { error: "Invalid nameplate MIME type" },
      { status: 400 },
    )
  }

  const resolvedNameplate = nameplateShot || nameplateImageBase64

  if (!wideShot && !resolvedNameplate) {
    return NextResponse.json(
      { error: "At least one image (wideShot or nameplateShot) is required" },
      { status: 400 },
    )
  }

  const isMultiImage = !!(wideShot && resolvedNameplate)
  const analysisMode = isMultiImage
    ? ("multi_image" as const)
    : ("single_image" as const)

  // Bridge: write incoming base64 to a temporary R2 key so analyzeEquipmentImages
  // can fetch URLs. Cleanup is best-effort fire-and-forget after analysis.
  const tempKeys: string[] = []
  const photoUrls: string[] = []

  try {
    if (wideShot) {
      const { url, key } = await uploadBase64ToTempR2(
        wideShot,
        user.id,
        mimeType,
      )
      photoUrls.push(url)
      tempKeys.push(key)
    }
    if (resolvedNameplate) {
      const { url, key } = await uploadBase64ToTempR2(
        resolvedNameplate,
        user.id,
        nameplateMimeType ?? mimeType,
      )
      photoUrls.push(url)
      tempKeys.push(key)
    }

    const result = await analyzeEquipmentImages(photoUrls, {
      taxonomyContext: EQUIPMENT_TAXONOMY,
      callerTag: `analyze-image:${mode}`,
      mode,
    })

    const aiResult = projectToAIAnalysisResult(
      result,
      analysisMode,
      result.rawClaudeOutput ?? "",
      mode,
    )

    return NextResponse.json(aiResult)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    Sentry.captureException(err, {
      extra: { mimeType, analysisMode, mode, errorMessage: msg },
    })
    return NextResponse.json(
      { error: "Image analysis failed", details: [msg] },
      { status: 500 },
    )
  } finally {
    for (const key of tempKeys) bestEffortDelete(key)
  }
}
