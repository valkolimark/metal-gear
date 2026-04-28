import { redirect } from "next/navigation"
import { requireSuperadminOrAnalyst } from "@/lib/admin/permissions"
import { getSnapListMetrics } from "@/app/actions/snap-list-metrics"
import {
  getAccuracySamplerDrafts,
  getAccuracyAggregate,
} from "@/app/actions/snap-list-accuracy-sample"
import { MetricCard } from "@/components/admin/snap-list-metrics/MetricCard"
import { MetricsTrendChart } from "@/components/admin/snap-list-metrics/MetricsTrendChart"
import { AccuracySampler } from "@/components/admin/snap-list-metrics/AccuracySampler"

export const dynamic = "force-dynamic"

export default async function SnapListMetricsPage() {
  try {
    await requireSuperadminOrAnalyst()
  } catch {
    redirect("/admin")
  }

  const to = new Date()
  const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [metrics, drafts, aggregate] = await Promise.all([
    getSnapListMetrics({ from, to }),
    getAccuracySamplerDrafts(30),
    getAccuracyAggregate(),
  ])

  return (
    <div className="space-y-6 p-6" data-section="admin">
      <header>
        <h1 className="text-2xl font-semibold">Snap &amp; List — Pilot Metrics</h1>
        <p className="text-sm text-muted-foreground">
          Last 30 days · the five targets below determine whether Cycle 59 consolidates SOS and the existing analyzer onto this same pipeline.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard metric={metrics.fieldEditRate} />
        <MetricCard metric={metrics.medianTimeToPublishMinutes} />
        <MetricCard metric={metrics.abandonmentRate} />
        <MetricCard metric={metrics.postPublishEditRate} />
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <TotalCard label="Drafts created" value={metrics.totals.draftsCreated} />
        <TotalCard label="Analyses run" value={metrics.totals.analyses} />
        <TotalCard label="Published" value={metrics.totals.publishes} />
        <TotalCard label="Field edits" value={metrics.totals.fieldEdits} />
      </div>

      <MetricsTrendChart data={metrics.dailyTimeSeries} />

      <AccuracySampler drafts={drafts} aggregate={aggregate} />

      <p className="text-xs text-muted-foreground">
        Looking for AI cost dollars? See{" "}
        <a href="/admin/ai-costs" className="font-medium underline">
          AI Costs
        </a>{" "}
        for the platform-wide spend ledger.
      </p>
    </div>
  )
}

function TotalCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  )
}
