"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { requireSuperadminOrAnalyst } from "@/lib/admin/permissions"

export type MetricStatus = "green" | "yellow" | "red"

export interface PilotMetric {
  label: string
  value: number
  /** Preferred display format ("%" for rates, "min" for durations). */
  unit: "%" | "min" | "count"
  target: number
  redFlag: number
  /** `lower_better` for rates you want low (edit rate); `higher_better` for things like accuracy. */
  direction: "lower_better" | "higher_better"
  status: MetricStatus
  description: string
}

export interface DailyPoint {
  date: string
  analyses: number
  publishes: number
  fieldEdits: number
}

export interface SnapListMetrics {
  range: { from: string; to: string }
  fieldEditRate: PilotMetric
  medianTimeToPublishMinutes: PilotMetric
  abandonmentRate: PilotMetric
  postPublishEditRate: PilotMetric
  totals: {
    draftsCreated: number
    analyses: number
    publishes: number
    fieldEdits: number
    abandoned: number
  }
  dailyTimeSeries: DailyPoint[]
}

export interface DateRange {
  from: Date | string
  to: Date | string
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function statusFor(
  value: number,
  target: number,
  redFlag: number,
  direction: "lower_better" | "higher_better",
): MetricStatus {
  if (direction === "lower_better") {
    if (value <= target) return "green"
    if (value >= redFlag) return "red"
    return "yellow"
  }
  if (value >= target) return "green"
  if (value <= redFlag) return "red"
  return "yellow"
}

/**
 * Aggregate pilot metrics across the Snap & List funnel.
 * RBAC-gated to superadmin + analyst only.
 */
export async function getSnapListMetrics(
  range: DateRange,
): Promise<SnapListMetrics> {
  await requireSuperadminOrAnalyst()
  const admin = createAdminClient()

  const from = new Date(range.from)
  const to = new Date(range.to)
  const fromIso = from.toISOString()
  const toIso = to.toISOString()

  // Pull all events in range. For pilot scale this fits comfortably in memory.
  const { data: events } = await admin
    .from("snap_list_events")
    .select("id, draft_id, owner_id, event_type, payload, created_at")
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
    .order("created_at", { ascending: true })

  const rows = events ?? []

  const draftsCreated = rows.filter((r) => r.event_type === "draft_created").length
  const analyses = rows.filter((r) => r.event_type === "analysis_started").length
  const fieldEdits = rows.filter((r) => r.event_type === "field_edited").length
  const published = rows.filter((r) => r.event_type === "draft_published")
  const discarded = rows.filter((r) => r.event_type === "draft_discarded").length
  const postPublishEdits = rows.filter(
    (r) => r.event_type === "listing_edited_post_publish",
  )

  // Abandoned drafts: created but never published + either discarded or expired.
  const { count: abandonedCount } = await admin
    .from("listing_drafts")
    .select("id", { count: "exact", head: true })
    .in("status", ["analyzing", "ready", "failed", "discarded"])
    .lt("expires_at", new Date().toISOString())
    .gte("created_at", fromIso)
    .lte("created_at", toIso)
  const abandoned = abandonedCount ?? discarded

  const publishCount = published.length
  const analysesCount = analyses
  const totalFieldsOnPublish = published.reduce((acc) => acc + 12, 0) // 12 tracked fields per draft
  const editRateValue =
    totalFieldsOnPublish > 0
      ? (fieldEdits / totalFieldsOnPublish) * 100
      : 0

  const durations: number[] = []
  for (const row of published) {
    const ms = (row.payload as { time_from_analysis_ms?: number } | null)
      ?.time_from_analysis_ms
    if (typeof ms === "number" && ms > 0) durations.push(ms)
  }
  durations.sort((a, b) => a - b)
  const medianMs = durations.length
    ? durations[Math.floor(durations.length / 2)]
    : 0
  const medianMinutes = medianMs > 0 ? medianMs / 1000 / 60 : 0

  const abandonmentRate =
    draftsCreated > 0 ? (abandoned / draftsCreated) * 100 : 0

  const publishedDraftIds = new Set(published.map((r) => r.draft_id))
  const postPublishDraftIds = new Set(
    postPublishEdits.map((r) => r.draft_id).filter((id): id is string => !!id),
  )
  const postPublishMatches = [...postPublishDraftIds].filter((id) =>
    publishedDraftIds.has(id),
  ).length
  const postPublishEditRate =
    publishCount > 0 ? (postPublishMatches / publishCount) * 100 : 0

  // Daily time series — bucket by created_at day.
  const dailyMap = new Map<string, DailyPoint>()
  const ensureDay = (key: string) => {
    if (!dailyMap.has(key))
      dailyMap.set(key, { date: key, analyses: 0, publishes: 0, fieldEdits: 0 })
    return dailyMap.get(key)!
  }
  for (const row of rows) {
    const key = dayKey(new Date(row.created_at))
    if (row.event_type === "analysis_started") ensureDay(key).analyses++
    if (row.event_type === "draft_published") ensureDay(key).publishes++
    if (row.event_type === "field_edited") ensureDay(key).fieldEdits++
  }
  const dailyTimeSeries = [...dailyMap.values()].sort((a, b) =>
    a.date < b.date ? -1 : 1,
  )

  return {
    range: { from: fromIso, to: toIso },
    fieldEditRate: {
      label: "Field edit rate",
      value: round1(editRateValue),
      unit: "%",
      target: 20,
      redFlag: 40,
      direction: "lower_better",
      status: statusFor(editRateValue, 20, 40, "lower_better"),
      description: "Share of fields dealers edited before publish. Lower is better.",
    },
    medianTimeToPublishMinutes: {
      label: "Median time to publish",
      value: round1(medianMinutes),
      unit: "min",
      target: 3,
      redFlag: 8,
      direction: "lower_better",
      status: statusFor(medianMinutes, 3, 8, "lower_better"),
      description: "Median minutes from analysis kickoff to publish.",
    },
    abandonmentRate: {
      label: "Draft abandonment",
      value: round1(abandonmentRate),
      unit: "%",
      target: 25,
      redFlag: 50,
      direction: "lower_better",
      status: statusFor(abandonmentRate, 25, 50, "lower_better"),
      description: "Drafts that never publish (expired, discarded, or still pending past TTL).",
    },
    postPublishEditRate: {
      label: "Post-publish edit rate",
      value: round1(postPublishEditRate),
      unit: "%",
      target: 30,
      redFlag: 60,
      direction: "lower_better",
      status: statusFor(postPublishEditRate, 30, 60, "lower_better"),
      description: "Published listings edited within 24h — signal of AI inaccuracy.",
    },
    totals: {
      draftsCreated,
      analyses: analysesCount,
      publishes: publishCount,
      fieldEdits,
      abandoned,
    },
    dailyTimeSeries,
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
