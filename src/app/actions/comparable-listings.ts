"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import {
  computePriceSuggestion,
  type ComparableListing,
} from "@/lib/snap-list/orchestrator"
import type { PriceSuggestion } from "@/lib/snap-list/types"

export interface FindComparablesArgs {
  category: string | null
  subcategory: string | null
  condition: string | null
  locationState?: string | null
  limit?: number
}

/**
 * Find comparable listings for pricing intelligence. Matches on category (text),
 * and optionally narrows by state. Prefers recent listings.
 */
export async function findComparables(
  args: FindComparablesArgs,
): Promise<ComparableListing[]> {
  const admin = createAdminClient()
  const limit = args.limit ?? 20

  let query = admin
    .from("listings")
    .select("id, title, price_cents, condition, location_city, location_state, created_at")
    .in("status", ["active", "sold"])
    .not("price_cents", "is", null)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (args.category) {
    query = query.eq("category", args.category)
  } else if (args.subcategory) {
    query = query.eq("category", args.subcategory)
  }

  if (args.locationState) {
    query = query.eq("location_state", args.locationState)
  }

  const { data } = await query
  if (!data) return []

  return data.map((row) => ({
    id: row.id as string,
    title: row.title as string,
    priceCents: (row.price_cents as number | null) ?? null,
    condition: (row.condition as string | null) ?? null,
    locationCity: (row.location_city as string | null) ?? null,
    locationState: (row.location_state as string | null) ?? null,
    createdAt: row.created_at as string,
  }))
}

export async function getPriceSuggestion(
  args: FindComparablesArgs,
): Promise<PriceSuggestion> {
  const comparables = await findComparables(args)
  const regionLabel = args.locationState ?? undefined
  return computePriceSuggestion(comparables, args.condition, regionLabel)
}
