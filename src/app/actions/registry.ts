"use server"

/**
 * Equipment Registry server actions (Cycle 61a).
 *
 * - searchManufacturers / searchModels — fuzzy-match autocomplete.
 * - getManufacturerById — fetch by FK for hydration.
 * - recordRegistryFeedback — audit accept/reject/override on registry suggestions.
 *
 * RLS is enabled on the underlying tables; the admin client bypasses RLS,
 * so each action enforces its own auth check (Zod-validated input) and
 * ownership check on writes.
 */

import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { escapePostgrestValue } from "@/lib/security/sanitize"
import type {
  Manufacturer,
  ManufacturerModel,
  ManufacturerTier,
} from "@/lib/registry"

// ─── DB row shapes (manual until database.ts is regenerated) ─────────────

interface ManufacturerRow {
  id: string
  slug: string
  name: string
  aliases: string[] | null
  country: string | null
  tier: number
  equipment_categories: string[] | null
  parent_manufacturer_id: string | null
  source_file: string
  notes: string | null
}

interface ManufacturerModelRow {
  id: string
  manufacturer_id: string
  slug: string
  name: string
  series: string | null
  equipment_type: string | null
  notes: string | null
  source_file: string
}

function toManufacturer(r: ManufacturerRow): Manufacturer {
  const tier = (r.tier === 1 || r.tier === 2 || r.tier === 3 ? r.tier : 3) as ManufacturerTier
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    aliases: r.aliases ?? [],
    country: r.country,
    tier,
    equipmentCategories: r.equipment_categories ?? [],
    parentManufacturerId: r.parent_manufacturer_id,
    sourceFile: r.source_file,
    notes: r.notes,
  }
}

function toModel(r: ManufacturerModelRow): ManufacturerModel {
  return {
    id: r.id,
    manufacturerId: r.manufacturer_id,
    slug: r.slug,
    name: r.name,
    series: r.series,
    equipmentType: r.equipment_type,
    notes: r.notes,
    sourceFile: r.source_file,
  }
}

// ─── Auth helper ─────────────────────────────────────────────────────────

async function requireUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

// ─── searchManufacturers ─────────────────────────────────────────────────

const SearchManufacturersSchema = z.object({
  query: z.string().trim().min(1).max(200),
  equipmentType: z.string().trim().max(60).optional(),
  limit: z.number().int().min(1).max(20).optional(),
})

export async function searchManufacturers(
  input: z.infer<typeof SearchManufacturersSchema>,
): Promise<Manufacturer[]> {
  const userId = await requireUserId()
  if (!userId) return []

  const parsed = SearchManufacturersSchema.safeParse(input)
  if (!parsed.success) return []

  const { query, equipmentType, limit = 10 } = parsed.data
  const safeQuery = escapePostgrestValue(query)
  if (!safeQuery) return []

  const admin = createAdminClient()
  // pg_trgm % operator gives fuzzy match; ilike supplements with substring/alias hits.
  // The `aliases` filter uses cs (contains) on the array — escapePostgrestValue
  // strips chars dangerous in PostgREST filter syntax.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("manufacturers")
    .select("id, slug, name, aliases, country, tier, equipment_categories, parent_manufacturer_id, source_file, notes")
    .or(`name.ilike.%${safeQuery}%,aliases.cs.{${safeQuery}}`)
    .order("tier", { ascending: true })
    .limit(limit)

  if (error || !data) return []

  let rows = (data as ManufacturerRow[]).map(toManufacturer)

  if (equipmentType) {
    const eq = equipmentType.toLowerCase()
    // Boost (sort first) those whose categories overlap the equipmentType.
    rows = [...rows].sort((a, b) => {
      const am = a.equipmentCategories.some(c => c.toLowerCase() === eq) ? 0 : 1
      const bm = b.equipmentCategories.some(c => c.toLowerCase() === eq) ? 0 : 1
      if (am !== bm) return am - bm
      return a.tier - b.tier
    })
  }

  return rows
}

// ─── getManufacturerById ─────────────────────────────────────────────────

const UuidSchema = z.string().uuid()

export async function getManufacturerById(id: string): Promise<Manufacturer | null> {
  const userId = await requireUserId()
  if (!userId) return null
  if (!UuidSchema.safeParse(id).success) return null

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin as any)
    .from("manufacturers")
    .select("id, slug, name, aliases, country, tier, equipment_categories, parent_manufacturer_id, source_file, notes")
    .eq("id", id)
    .maybeSingle()

  if (error || !data) return null
  return toManufacturer(data as ManufacturerRow)
}

// ─── searchModels ────────────────────────────────────────────────────────

const SearchModelsSchema = z.object({
  manufacturerId: UuidSchema,
  query: z.string().trim().max(200).optional(),
  limit: z.number().int().min(1).max(20).optional(),
})

export async function searchModels(
  input: z.infer<typeof SearchModelsSchema>,
): Promise<ManufacturerModel[]> {
  const userId = await requireUserId()
  if (!userId) return []

  const parsed = SearchModelsSchema.safeParse(input)
  if (!parsed.success) return []

  const { manufacturerId, query, limit = 10 } = parsed.data
  const admin = createAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let q: any = (admin as any)
    .from("manufacturer_models")
    .select("id, manufacturer_id, slug, name, series, equipment_type, notes, source_file")
    .eq("manufacturer_id", manufacturerId)
    .order("name", { ascending: true })
    .limit(limit)

  if (query && query.length > 0) {
    const safeQuery = escapePostgrestValue(query)
    if (safeQuery) q = q.ilike("name", `%${safeQuery}%`)
  }

  const { data, error } = await q
  if (error || !data) return []
  return (data as ManufacturerModelRow[]).map(toModel)
}

// ─── recordRegistryFeedback ──────────────────────────────────────────────

const RecordFeedbackSchema = z.object({
  sourceTable: z.enum(["listings", "sos_requests", "snap_list_drafts"]),
  sourceRowId: UuidSchema,
  suggestedManufacturerId: UuidSchema.nullable().optional(),
  suggestedModelId: UuidSchema.nullable().optional(),
  userAction: z.enum(["accepted", "rejected", "overridden_with_text", "ignored"]),
  userTextValue: z.string().trim().max(200).optional().nullable(),
})

export async function recordRegistryFeedback(
  input: z.infer<typeof RecordFeedbackSchema>,
): Promise<{ success: boolean; error?: string }> {
  const userId = await requireUserId()
  if (!userId) return { success: false, error: "Not authenticated" }

  const parsed = RecordFeedbackSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: "Invalid input" }
  }
  const data = parsed.data

  const admin = createAdminClient()

  // Ownership check on the source row when applicable.
  if (data.sourceTable === "listings") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row } = await (admin as any)
      .from("listings")
      .select("seller_id")
      .eq("id", data.sourceRowId)
      .maybeSingle()
    if (!row || row.seller_id !== userId) {
      return { success: false, error: "Not authorized for this listing" }
    }
  } else if (data.sourceTable === "sos_requests") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row } = await (admin as any)
      .from("sos_requests")
      .select("requester_id")
      .eq("id", data.sourceRowId)
      .maybeSingle()
    if (!row || row.requester_id !== userId) {
      return { success: false, error: "Not authorized for this SOS request" }
    }
  } else if (data.sourceTable === "snap_list_drafts") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row } = await (admin as any)
      .from("listing_drafts")
      .select("owner_id")
      .eq("id", data.sourceRowId)
      .maybeSingle()
    if (!row || row.owner_id !== userId) {
      return { success: false, error: "Not authorized for this draft" }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from("registry_match_feedback").insert({
    user_id: userId,
    source_table: data.sourceTable,
    source_row_id: data.sourceRowId,
    suggested_manufacturer_id: data.suggestedManufacturerId ?? null,
    suggested_model_id: data.suggestedModelId ?? null,
    user_action: data.userAction,
    user_text_value: data.userTextValue ?? null,
  })

  if (error) return { success: false, error: "Could not record feedback" }
  return { success: true }
}
