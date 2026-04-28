import type { SurfaceCostRow } from "@/app/(admin)/admin/ai-costs/queries"

const SURFACE_LABELS: Record<string, string> = {
  photo_to_listing_analysis: "Photo-to-Listing analysis",
  sos_analysis: "SOS analysis",
  listing_analyzer_helper: "Listing analyzer helper",
  listing_freshness_cron: "Listing freshness cron",
  weekly_brief_cron: "Weekly brief cron",
  demand_insights_cron: "Demand insights cron",
  ask_metal_gear: "Ask Metal Gear",
  ai_search: "AI search",
  dispute_mediation: "Dispute mediation",
  churn_scoring_cron: "Churn scoring cron",
  registry_seeding: "Registry seeding",
  registry_disambiguation: "Registry disambiguation",
  other: "Other",
}

export function CostBySurfaceTable({ rows }: { rows: SurfaceCostRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
        No events in the last 30 days.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="border-b px-4 py-3 text-sm font-medium">
        Cost by surface — last 30 days
      </div>
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Surface</th>
            <th className="px-4 py-2 font-medium tabular-nums">Calls</th>
            <th className="px-4 py-2 font-medium tabular-nums">Total</th>
            <th className="px-4 py-2 font-medium tabular-nums">$/call</th>
            <th className="px-4 py-2 font-medium tabular-nums">P95 latency</th>
            <th className="px-4 py-2 font-medium tabular-nums">Success</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.surface} className="border-t">
              <td className="px-4 py-2">
                <div className="font-medium">
                  {SURFACE_LABELS[r.surface] ?? r.surface}
                </div>
                <div className="text-xs text-muted-foreground">{r.surface}</div>
              </td>
              <td className="px-4 py-2 tabular-nums">{r.calls.toLocaleString()}</td>
              <td className="px-4 py-2 tabular-nums">{formatCents(r.totalCents)}</td>
              <td className="px-4 py-2 tabular-nums">
                {formatCents(r.meanCentsPerCall)}
              </td>
              <td className="px-4 py-2 tabular-nums">
                {r.p95LatencyMs == null ? "—" : `${r.p95LatencyMs} ms`}
              </td>
              <td className="px-4 py-2 tabular-nums">{r.successRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatCents(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1) return `$${dollars.toFixed(4)}`
  return `${cents.toFixed(4)}¢`
}
