"use server"

import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { requireSuperadminOrAnalyst } from "@/lib/admin/permissions"

export interface AccuracySampleDraft {
  draftId: string
  createdAt: string
  nameplatePhotoUrl: string | null
  firstPhotoUrl: string | null
  fields: {
    manufacturer: string | null
    model: string | null
    serialNumber: string | null
    year: number | null
    condition: string | null
  }
  ocrText: string | null
  reviewsByField: Record<string, { correct: boolean; reviewerId: string; notes: string | null }>
}

/**
 * Return up to `limit` published Snap & List drafts for manual accuracy review.
 * Prioritizes drafts that have not yet been reviewed.
 */
export async function getAccuracySamplerDrafts(
  limit = 30,
): Promise<AccuracySampleDraft[]> {
  await requireSuperadminOrAnalyst()
  const admin = createAdminClient()

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: drafts } = await admin
    .from("listing_drafts")
    .select(
      "id, photo_urls, nameplate_photo_index, fields, ocr_raw, created_at",
    )
    .eq("status", "published")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(limit * 3) // over-fetch so we can prefer unreviewed

  const rows = drafts ?? []
  const ids = rows.map((r) => r.id as string)
  const { data: reviews } = await admin
    .from("snap_list_accuracy_reviews")
    .select("draft_id, field_name, correct, reviewer_id, notes")
    .in("draft_id", ids.length ? ids : [""])

  const reviewsByDraft = new Map<
    string,
    Record<string, { correct: boolean; reviewerId: string; notes: string | null }>
  >()
  for (const rev of reviews ?? []) {
    const draftId = rev.draft_id as string
    if (!reviewsByDraft.has(draftId)) reviewsByDraft.set(draftId, {})
    reviewsByDraft.get(draftId)![rev.field_name as string] = {
      correct: rev.correct as boolean,
      reviewerId: rev.reviewer_id as string,
      notes: (rev.notes as string | null) ?? null,
    }
  }

  // Prefer drafts with fewer existing reviews.
  const sorted = [...rows].sort((a, b) => {
    const ra = Object.keys(reviewsByDraft.get(a.id as string) ?? {}).length
    const rb = Object.keys(reviewsByDraft.get(b.id as string) ?? {}).length
    return ra - rb
  })

  return sorted.slice(0, limit).map((row) => {
    const photos = (row.photo_urls as string[]) ?? []
    const nameplateIdx = row.nameplate_photo_index as number | null
    const fields = (row.fields as Record<string, unknown>) ?? {}
    const ocrFullText = pickOcrText(row.ocr_raw)
    return {
      draftId: row.id as string,
      createdAt: row.created_at as string,
      nameplatePhotoUrl:
        nameplateIdx !== null && photos[nameplateIdx] ? photos[nameplateIdx] : null,
      firstPhotoUrl: photos[0] ?? null,
      fields: {
        manufacturer: (fields.manufacturer as string | null) ?? null,
        model: (fields.model as string | null) ?? null,
        serialNumber: (fields.serialNumber as string | null) ?? null,
        year: (fields.year as number | null) ?? null,
        condition: (fields.condition as string | null) ?? null,
      },
      ocrText: ocrFullText,
      reviewsByField: reviewsByDraft.get(row.id as string) ?? {},
    }
  })
}

function pickOcrText(raw: unknown): string | null {
  if (!raw || !Array.isArray(raw)) return null
  const firstWithText = (raw as Array<{ fullText?: string }>).find(
    (r) => r.fullText && r.fullText.trim().length > 0,
  )
  return firstWithText?.fullText ?? null
}

const RecordReviewSchema = z.object({
  draftId: z.string().uuid(),
  field: z.string().min(1).max(50),
  correct: z.boolean(),
  notes: z.string().max(500).optional(),
})

export async function recordAccuracyReview(
  draftId: string,
  field: string,
  correct: boolean,
  notes?: string,
): Promise<{ ok: true } | { error: string }> {
  const parsed = RecordReviewSchema.safeParse({ draftId, field, correct, notes })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "invalid input" }
  }

  const { userId } = await requireSuperadminOrAnalyst()
  const admin = createAdminClient()

  // Look up ai_value so the review record preserves what we were judging.
  const { data: draft } = await admin
    .from("listing_drafts")
    .select("fields")
    .eq("id", parsed.data.draftId)
    .maybeSingle()
  const fields = (draft?.fields as Record<string, unknown>) ?? {}
  const aiValue = fields[parsed.data.field]

  const { error } = await admin
    .from("snap_list_accuracy_reviews")
    .upsert(
      {
        draft_id: parsed.data.draftId,
        reviewer_id: userId,
        field_name: parsed.data.field,
        ai_value: aiValue == null ? null : String(aiValue),
        correct: parsed.data.correct,
        notes: parsed.data.notes ?? null,
      },
      { onConflict: "draft_id,field_name,reviewer_id" },
    )

  if (error) {
    console.error("[recordAccuracyReview] failed:", error.message)
    return { error: "Could not save review." }
  }
  return { ok: true }
}

export interface AccuracyAggregate {
  totalReviews: number
  correctReviews: number
  accuracyPercent: number | null
}

export async function getAccuracyAggregate(): Promise<AccuracyAggregate> {
  await requireSuperadminOrAnalyst()
  const admin = createAdminClient()
  const { data } = await admin
    .from("snap_list_accuracy_reviews")
    .select("correct")
  const total = data?.length ?? 0
  const correct = (data ?? []).filter((r) => r.correct === true).length
  return {
    totalReviews: total,
    correctReviews: correct,
    accuracyPercent: total > 0 ? Math.round((correct / total) * 1000) / 10 : null,
  }
}
