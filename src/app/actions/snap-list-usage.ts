"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { SNAP_LIST_QUOTA, type SubscriptionTier } from "@/lib/constants"
import { getActiveTier } from "./tier"

export interface SnapListQuotaStatus {
  allowed: boolean
  remaining: number
  /** `Infinity` for paid tiers. */
  limit: number
  used: number
  tier: SubscriptionTier
  monthYear: string
}

function currentMonthYear(): string {
  const now = new Date()
  const y = now.getUTCFullYear()
  const m = String(now.getUTCMonth() + 1).padStart(2, "0")
  return `${y}-${m}`
}

/**
 * Returns whether the user can start another Snap & List analysis and how
 * many remaining this month. Creates the monthly usage row if missing.
 */
export async function checkSnapListQuota(
  userId: string,
  companyId?: string | null,
): Promise<SnapListQuotaStatus> {
  const admin = createAdminClient()
  const tier = await getActiveTier(userId, companyId ?? null)
  const limit = SNAP_LIST_QUOTA[tier] ?? 0
  const monthYear = currentMonthYear()

  const { data: row } = await admin
    .from("snap_list_usage")
    .select("analysis_count")
    .eq("owner_id", userId)
    .eq("month_year", monthYear)
    .maybeSingle()

  const used = row?.analysis_count ?? 0

  if (!Number.isFinite(limit)) {
    return {
      allowed: true,
      remaining: Infinity,
      limit: Infinity,
      used,
      tier,
      monthYear,
    }
  }

  const remaining = Math.max(0, limit - used)
  return {
    allowed: remaining > 0,
    remaining,
    limit,
    used,
    tier,
    monthYear,
  }
}

/**
 * Atomic increment on the monthly usage row. Upserts if missing.
 */
export async function incrementSnapListUsage(
  userId: string,
  kind: "analysis" | "publish" = "analysis",
): Promise<void> {
  const admin = createAdminClient()
  const monthYear = currentMonthYear()

  const { data: existing } = await admin
    .from("snap_list_usage")
    .select("id, analysis_count, publish_count")
    .eq("owner_id", userId)
    .eq("month_year", monthYear)
    .maybeSingle()

  if (existing) {
    const update =
      kind === "analysis"
        ? { analysis_count: (existing.analysis_count ?? 0) + 1, updated_at: new Date().toISOString() }
        : { publish_count: (existing.publish_count ?? 0) + 1, updated_at: new Date().toISOString() }
    await admin.from("snap_list_usage").update(update).eq("id", existing.id)
    return
  }

  await admin.from("snap_list_usage").insert({
    owner_id: userId,
    month_year: monthYear,
    analysis_count: kind === "analysis" ? 1 : 0,
    publish_count: kind === "publish" ? 1 : 0,
  })
}

/**
 * Server action wrapper that reads the current authed user and returns
 * their quota status. Safe to call from client components.
 */
export async function getMyQuotaStatus(): Promise<SnapListQuotaStatus | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return checkSnapListQuota(user.id)
}
