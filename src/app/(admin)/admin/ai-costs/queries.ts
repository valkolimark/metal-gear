import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Cycle 62 — server-only query helpers backing /admin/ai-costs.
 *
 * Reads the `ai_usage_events` ledger via the service-role client. RLS is
 * enabled on the table; only the page (RBAC superadmin + analyst) calls
 * these. All queries scope to recent windows so the dashboard remains
 * sub-second even at high event volume.
 */

export interface AiCostKpis {
  totalCents7d: number
  totalCents30d: number
  totalCents24h: number
  /** % change of last 30d cost vs prior 30d. null when prior window is empty. */
  monthOverMonthPct: number | null
  /** Trailing 12-hour run rate, projected to a daily total in cents. */
  runRateCentsPerDay: number
  callCount30d: number
  successRate30d: number
  generatedAt: string
}

export interface DailyCostPoint {
  date: string // YYYY-MM-DD
  anthropicCents: number
  googleVisionCents: number
  otherCents: number
  totalCents: number
}

export interface SurfaceCostRow {
  surface: string
  calls: number
  totalCents: number
  meanCentsPerCall: number
  p95LatencyMs: number | null
  successRate: number
}

export interface TopUserRow {
  userId: string | null
  displayName: string | null
  email: string | null
  totalCents30d: number
  callCount30d: number
}

export interface AnomalyRow {
  surface: string
  cents24h: number
  averageDailyCents30d: number
  multiple: number
}

interface RawRow {
  occurred_at: string
  user_id: string | null
  surface: string
  vendor: string
  cost_cents: number | string
  latency_ms: number | null
  success: boolean
}

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

function parseCents(v: number | string | null | undefined): number {
  if (v == null) return 0
  if (typeof v === "number") return v
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

async function fetchEventsSince(sinceIso: string): Promise<RawRow[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data, error } = await admin
    .from("ai_usage_events")
    .select("occurred_at, user_id, surface, vendor, cost_cents, latency_ms, success")
    .gte("occurred_at", sinceIso)
    .order("occurred_at", { ascending: false })
    .limit(100_000)
  if (error || !data) return []
  return data as RawRow[]
}

export async function getAiCostKpis(): Promise<AiCostKpis> {
  const now = Date.now()
  const since60 = new Date(now - 60 * DAY_MS).toISOString()
  const rows = await fetchEventsSince(since60)
  const since7 = now - 7 * DAY_MS
  const since30 = now - 30 * DAY_MS
  const since60Ms = now - 60 * DAY_MS
  const since24 = now - DAY_MS
  const since12h = now - 12 * HOUR_MS

  let totalCents7d = 0
  let totalCents30d = 0
  let totalCents24h = 0
  let totalCentsPrev30 = 0
  let totalCents12h = 0
  let calls30d = 0
  let successes30d = 0

  for (const r of rows) {
    const t = new Date(r.occurred_at).getTime()
    const c = parseCents(r.cost_cents)
    if (t >= since7) totalCents7d += c
    if (t >= since30) {
      totalCents30d += c
      calls30d++
      if (r.success) successes30d++
    }
    if (t >= since24) totalCents24h += c
    if (t >= since12h) totalCents12h += c
    if (t < since30 && t >= since60Ms) totalCentsPrev30 += c
  }

  const runRateCentsPerDay = totalCents12h * 2

  const monthOverMonthPct =
    totalCentsPrev30 > 0
      ? Math.round(((totalCents30d - totalCentsPrev30) / totalCentsPrev30) * 1000) / 10
      : null

  return {
    totalCents7d: round4(totalCents7d),
    totalCents30d: round4(totalCents30d),
    totalCents24h: round4(totalCents24h),
    monthOverMonthPct,
    runRateCentsPerDay: round4(runRateCentsPerDay),
    callCount30d: calls30d,
    successRate30d: calls30d > 0 ? Math.round((successes30d / calls30d) * 1000) / 10 : 100,
    generatedAt: new Date().toISOString(),
  }
}

export async function getDailyCostSeries(daysBack = 30): Promise<DailyCostPoint[]> {
  const now = Date.now()
  const since = new Date(now - daysBack * DAY_MS).toISOString()
  const rows = await fetchEventsSince(since)

  const buckets = new Map<
    string,
    { anthropic: number; google_vision: number; other: number }
  >()
  // pre-seed every day so the chart shows zero days as zeros
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(now - i * DAY_MS).toISOString().slice(0, 10)
    buckets.set(d, { anthropic: 0, google_vision: 0, other: 0 })
  }

  for (const r of rows) {
    const day = r.occurred_at.slice(0, 10)
    const slot = buckets.get(day)
    if (!slot) continue
    const c = parseCents(r.cost_cents)
    if (r.vendor === "anthropic") slot.anthropic += c
    else if (r.vendor === "google_vision") slot.google_vision += c
    else slot.other += c
  }

  return Array.from(buckets.entries()).map(([date, v]) => ({
    date,
    anthropicCents: round4(v.anthropic),
    googleVisionCents: round4(v.google_vision),
    otherCents: round4(v.other),
    totalCents: round4(v.anthropic + v.google_vision + v.other),
  }))
}

export async function getCostBySurface(): Promise<SurfaceCostRow[]> {
  const since30 = new Date(Date.now() - 30 * DAY_MS).toISOString()
  const rows = await fetchEventsSince(since30)

  const map = new Map<
    string,
    { calls: number; cost: number; successes: number; latencies: number[] }
  >()
  for (const r of rows) {
    const m = map.get(r.surface) ?? {
      calls: 0,
      cost: 0,
      successes: 0,
      latencies: [],
    }
    m.calls++
    m.cost += parseCents(r.cost_cents)
    if (r.success) m.successes++
    if (typeof r.latency_ms === "number") m.latencies.push(r.latency_ms)
    map.set(r.surface, m)
  }

  return Array.from(map.entries())
    .map(([surface, v]) => ({
      surface,
      calls: v.calls,
      totalCents: round4(v.cost),
      meanCentsPerCall: v.calls > 0 ? round4(v.cost / v.calls) : 0,
      p95LatencyMs: percentile(v.latencies, 0.95),
      successRate: v.calls > 0 ? Math.round((v.successes / v.calls) * 1000) / 10 : 100,
    }))
    .sort((a, b) => b.totalCents - a.totalCents)
}

export async function getTopUsers(limit = 20): Promise<TopUserRow[]> {
  const since30 = new Date(Date.now() - 30 * DAY_MS).toISOString()
  const rows = await fetchEventsSince(since30)

  const map = new Map<string, { cents: number; calls: number }>()
  for (const r of rows) {
    if (!r.user_id) continue
    const m = map.get(r.user_id) ?? { cents: 0, calls: 0 }
    m.cents += parseCents(r.cost_cents)
    m.calls++
    map.set(r.user_id, m)
  }

  const top = Array.from(map.entries())
    .map(([userId, v]) => ({
      userId,
      cents: round4(v.cents),
      calls: v.calls,
    }))
    .sort((a, b) => b.cents - a.cents)
    .slice(0, limit)

  if (top.length === 0) return []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const admin = createAdminClient() as any
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, display_name")
    .in(
      "id",
      top.map((t) => t.userId),
    )

  const profileMap = new Map<string, { full_name: string | null; display_name: string | null }>(
    (profiles || []).map((p: { id: string; full_name: string | null; display_name: string | null }) => [
      p.id,
      { full_name: p.full_name, display_name: p.display_name },
    ]),
  )

  return top.map((t) => {
    const p = profileMap.get(t.userId)
    return {
      userId: t.userId,
      displayName: p?.display_name ?? p?.full_name ?? null,
      email: null, // we deliberately do not surface emails on the dashboard
      totalCents30d: t.cents,
      callCount30d: t.calls,
    }
  })
}

export async function getAnomalies(): Promise<AnomalyRow[]> {
  const since30 = new Date(Date.now() - 30 * DAY_MS).toISOString()
  const rows = await fetchEventsSince(since30)

  const dailyBySurface = new Map<string, Map<string, number>>()
  const last24BySurface = new Map<string, number>()
  const since24 = Date.now() - DAY_MS

  for (const r of rows) {
    const day = r.occurred_at.slice(0, 10)
    const c = parseCents(r.cost_cents)
    const inner = dailyBySurface.get(r.surface) ?? new Map<string, number>()
    inner.set(day, (inner.get(day) ?? 0) + c)
    dailyBySurface.set(r.surface, inner)

    if (new Date(r.occurred_at).getTime() >= since24) {
      last24BySurface.set(r.surface, (last24BySurface.get(r.surface) ?? 0) + c)
    }
  }

  const anomalies: AnomalyRow[] = []
  for (const [surface, last24] of last24BySurface.entries()) {
    const days = dailyBySurface.get(surface)
    if (!days) continue
    const total = Array.from(days.values()).reduce((s, n) => s + n, 0)
    const avg = total / 30
    if (avg <= 0) continue
    const multiple = last24 / avg
    if (multiple >= 3 && last24 > 5 /* >5¢ */) {
      anomalies.push({
        surface,
        cents24h: round4(last24),
        averageDailyCents30d: round4(avg),
        multiple: Math.round(multiple * 10) / 10,
      })
    }
  }

  return anomalies.sort((a, b) => b.multiple - a.multiple)
}

function percentile(arr: number[], p: number): number | null {
  if (arr.length === 0) return null
  const sorted = [...arr].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.floor(p * sorted.length))
  return sorted[idx]
}

function round4(c: number): number {
  if (!Number.isFinite(c) || c < 0) return 0
  return Math.round(c * 10000) / 10000
}
