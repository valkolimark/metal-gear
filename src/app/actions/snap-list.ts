"use server"

import { z } from "zod"
import { after } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"
import { analyzeEquipmentImages } from "@/lib/vision-analysis"
import {
  projectAnalysisToDraftFields,
} from "@/lib/snap-list/orchestrator"
import { buildNameplateRegistryCallback } from "@/lib/registry/nameplate-callback"
import { EQUIPMENT_TAXONOMY } from "@/lib/constants/equipment-taxonomy"
import { logSnapListEvent, logStageCompleted } from "@/lib/snap-list/events"
import { getActiveCompanyId } from "./company-context"
import { createDraft } from "./snap-list-draft"
import { checkSnapListQuota } from "./snap-list-usage"
import { getPriceSuggestion } from "./comparable-listings"
import { generatePhotoCoaching } from "./photo-coach"

const AnalyzePhotosSchema = z.object({
  photoUrls: z
    .array(
      z.string().url().refine(
        (u) =>
          /https?:\/\/(media\.metalgear\.com|[^/]*\.r2\.dev|pub-[a-z0-9]+\.r2\.dev)/i.test(u),
        { message: "photo URL must be from our R2 domain" },
      ),
    )
    .min(1)
    .max(10),
})

export async function analyzePhotos(
  photoUrls: string[],
): Promise<{ draftId: string } | { error: string; code?: string }> {
  const parsed = AnalyzePhotosSchema.safeParse({ photoUrls })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid input", code: "bad_input" }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated", code: "auth" }

  const quota = await checkSnapListQuota(user.id)
  if (!quota.allowed) {
    return {
      error:
        "You've used all 3 AI-assisted listings this month. Upgrade to Pro for unlimited.",
      code: "quota_exceeded",
    }
  }

  const draftResult = await createDraft(parsed.data.photoUrls)
  if ("error" in draftResult) return draftResult

  const { draftId } = draftResult

  void logSnapListEvent({
    type: "analysis_started",
    draftId,
    ownerId: user.id,
    payload: {
      photo_count: parsed.data.photoUrls.length,
    },
  })

  // Defer the heavy work until after the response is flushed.
  after(async () => {
    await runAnalysisPipeline(draftId, user.id, parsed.data.photoUrls)
  })

  return { draftId }
}

async function runAnalysisPipeline(
  draftId: string,
  ownerId: string,
  photoUrls: string[],
): Promise<void> {
  const admin = createAdminClient()
  const totalStart = Date.now()

  try {
    // Stage 1: vision analysis (includes OCR + web detection + Claude).
    await admin
      .from("listing_drafts")
      .update({ analysis_stage: "identifying", updated_at: new Date().toISOString() })
      .eq("id", draftId)

    const analysis = await analyzeEquipmentImages(photoUrls, {
      taxonomyContext: EQUIPMENT_TAXONOMY,
      callerTag: "snap_list",
      onStageComplete: (stage, ms) => {
        void logStageCompleted(draftId, ownerId, stage, ms)
      },
      registryLookup: buildNameplateRegistryCallback(),
    })

    // Persist raw outputs + merged fields so the review screen can start
    // rendering even before pricing/coaching finishes.
    const fields = projectAnalysisToDraftFields(analysis)

    await admin
      .from("listing_drafts")
      .update({
        ocr_raw: (analysis.rawOCR ?? null) as unknown as Json,
        claude_raw: (analysis.rawClaudeOutput ?? null) as unknown as Json,
        web_detection_raw: (analysis.rawWebDetection ?? null) as unknown as Json,
        nameplate_photo_index: analysis.ocr.sourcePhotoIndex,
        fields: fields as unknown as Json,
        confidence_scores: analysis.confidence as unknown as Json,
        clarifying_questions: analysis.clarifyingQuestions as unknown as Json,
        stock_photo_matches: analysis.fraud.stockPhotoMatches,
        analysis_stage: "pricing",
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId)

    // Stage 2: pricing intelligence (comparable-based).
    const priceStart = Date.now()
    const priceSuggestion = await getPriceSuggestion({
      category: fields.category,
      subcategory: fields.subcategory,
      condition: fields.condition,
    })
    void logStageCompleted(draftId, ownerId, "pricing", Date.now() - priceStart)

    const fieldsWithPrice = { ...fields, priceSuggestion }

    await admin
      .from("listing_drafts")
      .update({
        fields: fieldsWithPrice as unknown as Json,
        analysis_stage: "coaching",
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId)

    // Stage 3: photo coaching.
    const coachStart = Date.now()
    const photoCoach = await generatePhotoCoaching({
      equipmentType: analysis.identification.equipmentType,
      manufacturer: analysis.identification.manufacturer,
      photoCount: photoUrls.length,
      hasNameplate: analysis.ocr.hasText,
      specs: analysis.specs,
    })
    void logStageCompleted(draftId, ownerId, "coaching", Date.now() - coachStart)

    // Finalize.
    await admin
      .from("listing_drafts")
      .update({
        photo_coach: (photoCoach ?? null) as unknown as Json,
        status: "ready",
        analysis_stage: "complete",
        updated_at: new Date().toISOString(),
      })
      .eq("id", draftId)

    const lowConfidenceCount = Object.values(analysis.confidence).filter(
      (c) => c < 0.75,
    ).length

    void logSnapListEvent({
      type: "analysis_completed",
      draftId,
      ownerId,
      payload: {
        total_duration_ms: Date.now() - totalStart,
        fields_count: Object.keys(analysis.confidence).length,
        low_confidence_field_count: lowConfidenceCount,
        vision_errors: analysis.errors,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown_pipeline_error"
    console.error("[snap-list] pipeline failed:", err)
    try {
      await admin
        .from("listing_drafts")
        .update({
          status: "failed",
          error_message: message,
          updated_at: new Date().toISOString(),
        })
        .eq("id", draftId)
    } catch (innerErr) {
      console.error("[snap-list] failed to record failure state:", innerErr)
    }
    void logSnapListEvent({
      type: "analysis_failed",
      draftId,
      ownerId,
      payload: { stage: "pipeline", error_message: message },
    })
  }
}

/**
 * Returns the active company (used by upload screen to resolve metadata).
 */
export async function getSnapListContext(): Promise<{
  userId: string | null
  companyId: string | null
}> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { userId: null, companyId: null }
  const companyId = await getActiveCompanyId(user.id)
  return { userId: user.id, companyId }
}
