import { redirect } from "next/navigation"
import { requireSuperadminOrAnalyst } from "@/lib/admin/permissions"
import {
  getAiCostKpis,
  getDailyCostSeries,
  getCostBySurface,
  getTopUsers,
  getAnomalies,
} from "./queries"
import { CostKpiTile } from "@/components/admin/ai-costs/CostKpiTile"
import { CostByVendorChart } from "@/components/admin/ai-costs/CostByVendorChart"
import { CostBySurfaceTable } from "@/components/admin/ai-costs/CostBySurfaceTable"
import { TopUsersTable } from "@/components/admin/ai-costs/TopUsersTable"
import { AnomalyCallout } from "@/components/admin/ai-costs/AnomalyCallout"

export const dynamic = "force-dynamic"

export default async function AiCostsPage() {
  try {
    await requireSuperadminOrAnalyst()
  } catch {
    redirect("/admin")
  }

  const [kpis, daily, bySurface, topUsers, anomalies] = await Promise.all([
    getAiCostKpis(),
    getDailyCostSeries(30),
    getCostBySurface(),
    getTopUsers(20),
    getAnomalies(),
  ])

  const momText =
    kpis.monthOverMonthPct == null
      ? "—"
      : `${kpis.monthOverMonthPct >= 0 ? "+" : ""}${kpis.monthOverMonthPct}%`

  return (
    <div className="space-y-6 p-6" data-section="admin">
      <header>
        <h1 className="text-2xl font-semibold">AI Cost &amp; Usage</h1>
        <p className="text-sm text-muted-foreground">
          Internal observability ledger. Best-effort estimates only — authoritative billing
          comes from the Anthropic and Google Cloud consoles.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <CostKpiTile label="Last 7 days" cents={kpis.totalCents7d} hint={`${kpis.callCount30d.toLocaleString()} total calls (30d)`} />
        <CostKpiTile label="Last 30 days" cents={kpis.totalCents30d} hint={`${kpis.successRate30d}% success rate`} />
        <CostKpiTile label="Month-over-month" text={momText} hint="vs. prior 30-day window" />
        <CostKpiTile
          label="Daily run-rate"
          cents={kpis.runRateCentsPerDay}
          hint="extrapolated from last 12h"
        />
      </div>

      <AnomalyCallout rows={anomalies} />

      <CostByVendorChart data={daily} />

      <div className="grid gap-3 lg:grid-cols-2">
        <CostBySurfaceTable rows={bySurface} />
        <TopUsersTable rows={topUsers} />
      </div>

      <footer className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-muted-foreground">
        <p>
          <strong className="text-foreground">Best-effort estimates.</strong> Token-derived
          Anthropic costs use the published rate card (Sonnet 4: $3 / $15 per 1M I/O,
          Haiku 4.5: $1 / $5, Opus 4: $15 / $75). Google Cloud Vision uses $1.50/1k for
          DOCUMENT_TEXT_DETECTION and $3.50/1k for WEB_DETECTION. Free tier is not subtracted.
          Authoritative billing comes from the Anthropic and Google Cloud consoles. Last refreshed:{" "}
          {kpis.generatedAt}.
        </p>
      </footer>
    </div>
  )
}
