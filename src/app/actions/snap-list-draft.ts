"use server"

import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { Json } from "@/types/database"
import { getActiveCompanyId } from "./company-context"
import { getActiveTier } from "./tier"
import { incrementSnapListUsage } from "./snap-list-usage"
import { logSnapListEvent } from "@/lib/snap-list/events"
import { TIER_LIMITS, type SubscriptionTier } from "@/lib/constants"
import type {
  SnapListDraft,
  SnapListDraftFields,
  SnapListDraftStatus,
} from "@/lib/snap-list/types"

function mapDraftRow(row: Record<string, unknown>): SnapListDraft {
  const fields = (row.fields ?? {}) as Partial<SnapListDraftFields>
  return {
    id: row.id as string,
    ownerId: row.owner_id as string,
    companyId: (row.company_id as string | null) ?? null,
    photoUrls: (row.photo_urls as string[]) ?? [],
    nameplatePhotoIndex: (row.nameplate_photo_index as number | null) ?? null,
    fields: {
      title: fields.title ?? null,
      description: fields.description ?? null,
      category: fields.category ?? null,
      tier1: fields.tier1 ?? null,
      tier2: fields.tier2 ?? null,
      subcategory: fields.subcategory ?? null,
      manufacturer: fields.manufacturer ?? null,
      model: fields.model ?? null,
      serialNumber: fields.serialNumber ?? null,
      year: fields.year ?? null,
      condition: fields.condition ?? null,
      specs: fields.specs ?? {},
      priceSuggestion: fields.priceSuggestion ?? null,
      locationCity: fields.locationCity ?? null,
      locationState: fields.locationState ?? null,
    },
    confidenceScores: (row.confidence_scores as Record<string, number>) ?? {},
    clarifyingQuestions: (row.clarifying_questions as SnapListDraft["clarifyingQuestions"]) ?? [],
    photoCoach: (row.photo_coach as SnapListDraft["photoCoach"]) ?? null,
    stockPhotoMatches: (row.stock_photo_matches as string[]) ?? [],
    status: row.status as SnapListDraftStatus,
    analysisStage: (row.analysis_stage as SnapListDraft["analysisStage"]) ?? null,
    errorMessage: (row.error_message as string | null) ?? null,
    publishedListingId: (row.published_listing_id as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    expiresAt: row.expires_at as string,
  }
}

const UrlSchema = z.string().url().refine(
  (u) => /https?:\/\/(media\.metalgear\.com|[^/]*\.r2\.dev|pub-[a-z0-9]+\.r2\.dev)/i.test(u),
  { message: "photo URL must be from our R2 domain" },
)

const CreateDraftSchema = z.object({
  photoUrls: z.array(UrlSchema).min(1).max(10),
})

export async function createDraft(
  photoUrls: string[],
): Promise<{ draftId: string } | { error: string }> {
  const parsed = CreateDraftSchema.safeParse({ photoUrls })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid photo urls" }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const companyId = await getActiveCompanyId(user.id)
  const admin = createAdminClient()

  const { data: row, error } = await admin
    .from("listing_drafts")
    .insert({
      owner_id: user.id,
      company_id: companyId,
      photo_urls: parsed.data.photoUrls,
      status: "analyzing",
      analysis_stage: "uploading",
      fields: {},
      confidence_scores: {},
    })
    .select("id")
    .single()

  if (error || !row) {
    console.error("[createDraft] insert failed:", error)
    return { error: "Could not create draft. Please try again." }
  }

  // Fire-and-forget instrumentation + usage increment.
  void logSnapListEvent({
    type: "draft_created",
    draftId: row.id,
    ownerId: user.id,
    payload: { photo_count: parsed.data.photoUrls.length },
  })
  void incrementSnapListUsage(user.id, "analysis")

  return { draftId: row.id }
}

export async function getDraft(
  draftId: string,
): Promise<SnapListDraft | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: row } = await admin
    .from("listing_drafts")
    .select("*")
    .eq("id", draftId)
    .eq("owner_id", user.id)
    .maybeSingle()

  if (!row) return null
  return mapDraftRow(row as Record<string, unknown>)
}

const AllowedEditableFields = new Set([
  "title",
  "description",
  "category",
  "tier1",
  "tier2",
  "subcategory",
  "manufacturer",
  "model",
  "serialNumber",
  "year",
  "condition",
  "specs",
  "priceSuggestion",
  "locationCity",
  "locationState",
])

const UpdateFieldSchema = z.object({
  field: z.string().refine((f) => AllowedEditableFields.has(f), {
    message: "field not editable",
  }),
  value: z.any(),
})

export async function updateDraftField(
  draftId: string,
  field: string,
  value: unknown,
): Promise<{ ok: true } | { error: string }> {
  const parsed = UpdateFieldSchema.safeParse({ field, value })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid field" }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const admin = createAdminClient()
  const { data: draft } = await admin
    .from("listing_drafts")
    .select("id, owner_id, status, fields, confidence_scores")
    .eq("id", draftId)
    .eq("owner_id", user.id)
    .maybeSingle()

  if (!draft) return { error: "Draft not found" }
  if (draft.status === "published")
    return { error: "Draft already published — edit the listing instead." }
  if (draft.status === "discarded")
    return { error: "Draft was discarded." }

  const oldFields = (draft.fields ?? {}) as Record<string, unknown>
  const oldConfidence = (draft.confidence_scores ?? {}) as Record<string, number>
  const oldValue = oldFields[field]
  const hadConfidenceFlag = (oldConfidence[field] ?? 1) < 0.75

  const nextFields = { ...oldFields, [field]: value }
  // Bump edited field's confidence to 1.0 (user verified).
  const nextConfidence = { ...oldConfidence, [field]: 1.0 }

  const { error } = await admin
    .from("listing_drafts")
    .update({
      fields: nextFields as unknown as Json,
      confidence_scores: nextConfidence as unknown as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId)

  if (error) {
    console.error("[updateDraftField] failed:", error)
    return { error: "Could not save field." }
  }

  void logSnapListEvent({
    type: "field_edited",
    draftId,
    ownerId: user.id,
    payload: {
      field_name: field,
      old_value: oldValue,
      new_value: value,
      had_confidence_flag: hadConfidenceFlag,
    },
  })

  return { ok: true }
}

/**
 * Convert a ready draft into a live `listings` row. Sets `ai_assisted=true`
 * and `source_draft_id`. Increments publish counter.
 */
export async function publishDraft(
  draftId: string,
): Promise<{ listingId: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const companyId = await getActiveCompanyId(user.id)
  const admin = createAdminClient()

  const { data: draftRow } = await admin
    .from("listing_drafts")
    .select("*")
    .eq("id", draftId)
    .eq("owner_id", user.id)
    .maybeSingle()

  if (!draftRow) return { error: "Draft not found" }
  if (draftRow.status !== "ready")
    return { error: "Draft is not ready to publish yet." }

  const draft = mapDraftRow(draftRow as Record<string, unknown>)

  // Tier listing-count gate.
  const tier: SubscriptionTier = await getActiveTier(user.id, companyId)
  const limit = TIER_LIMITS[tier]?.listings ?? 0
  if (Number.isFinite(limit)) {
    const { count } = await admin
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("seller_id", user.id)
      .in("status", ["active", "draft"])
    if ((count ?? 0) >= limit) {
      return {
        error: `You've reached the ${limit} listing limit on the ${tier} plan. Upgrade to publish more.`,
      }
    }
  }

  const title = draft.fields.title?.trim() || "Industrial Equipment"
  const description = draft.fields.description ?? ""
  const category = draft.fields.category ?? draft.fields.tier2 ?? "Other"
  const conditionMap: Record<string, string> = {
    excellent: "excellent",
    good: "good",
    fair: "fair",
    poor: "poor",
  }
  const condition =
    draft.fields.condition && conditionMap[draft.fields.condition]
      ? conditionMap[draft.fields.condition]
      : "good"

  const priceCents = draft.fields.priceSuggestion?.median ?? null
  const specs = draft.fields.specs ?? {}

  const { data: listing, error: insertErr } = await admin
    .from("listings")
    .insert({
      seller_id: user.id,
      company_id: companyId,
      title,
      description,
      category,
      condition,
      price_cents: priceCents,
      negotiable: true,
      contact_for_price: priceCents === null,
      location_city: draft.fields.locationCity ?? undefined,
      location_state: draft.fields.locationState ?? undefined,
      specifications: specs as unknown as Json,
      specs: specs as unknown as Json,
      quantity: 1,
      status: "active",
      ai_assist_used: true,
      ai_assist_accepted: true,
      ai_assisted: true,
      source_draft_id: draft.id,
      ai_price_suggested: priceCents,
      expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single()

  if (insertErr || !listing) {
    console.error("[publishDraft] listing insert failed:", insertErr)
    return { error: "Could not publish listing. Please try again." }
  }

  // Attach photos as listing_images rows so the existing listing detail page
  // renders them. We're reusing the already-uploaded R2 URLs.
  if (draft.photoUrls.length > 0) {
    const imageRows = draft.photoUrls.map((url, i) => ({
      listing_id: listing.id,
      url,
      storage_path: url,
      position: i,
    }))
    const { error: imgErr } = await admin.from("listing_images").insert(imageRows)
    if (imgErr) {
      console.error("[publishDraft] listing_images insert failed:", imgErr.message)
    }
  }

  // Count fields the user edited before publish (confidence === 1.0).
  const editedFields = Object.entries(draft.confidenceScores).filter(
    ([, c]) => c === 1.0,
  ).length

  const { error: draftUpdErr } = await admin
    .from("listing_drafts")
    .update({
      status: "published",
      published_listing_id: listing.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draft.id)
  if (draftUpdErr) {
    console.error("[publishDraft] draft update failed:", draftUpdErr.message)
  }

  void incrementSnapListUsage(user.id, "publish")
  void logSnapListEvent({
    type: "draft_published",
    draftId: draft.id,
    ownerId: user.id,
    payload: {
      listing_id: listing.id,
      time_from_analysis_ms:
        Date.now() - new Date(draft.createdAt).getTime(),
      fields_edited_count: editedFields,
    },
  })

  return { listingId: listing.id }
}

export async function discardDraft(
  draftId: string,
): Promise<{ ok: true } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const admin = createAdminClient()
  const { error } = await admin
    .from("listing_drafts")
    .update({ status: "discarded", updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("owner_id", user.id)

  if (error) return { error: "Could not discard draft." }

  void logSnapListEvent({
    type: "draft_discarded",
    draftId,
    ownerId: user.id,
  })
  return { ok: true }
}

/**
 * Append additional photos to an existing draft (used when the UI's photo
 * coach prompts the dealer to add more shots).
 */
export async function appendDraftPhotos(
  draftId: string,
  newUrls: string[],
): Promise<{ ok: true } | { error: string }> {
  const parsed = z.array(UrlSchema).min(1).max(10).safeParse(newUrls)
  if (!parsed.success) return { error: "invalid photo urls" }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "Not authenticated" }

  const admin = createAdminClient()
  const { data: draft } = await admin
    .from("listing_drafts")
    .select("photo_urls")
    .eq("id", draftId)
    .eq("owner_id", user.id)
    .maybeSingle()

  if (!draft) return { error: "Draft not found" }

  const merged = [...(draft.photo_urls as string[]), ...parsed.data].slice(0, 15)

  const { error } = await admin
    .from("listing_drafts")
    .update({ photo_urls: merged, updated_at: new Date().toISOString() })
    .eq("id", draftId)

  if (error) return { error: "Could not append photos." }

  void logSnapListEvent({
    type: "photos_added_post_analysis",
    draftId,
    ownerId: user.id,
    payload: { new_total: merged.length, added: parsed.data.length },
  })
  return { ok: true }
}
