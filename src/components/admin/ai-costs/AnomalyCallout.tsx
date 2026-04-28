import type { AnomalyRow } from "@/app/(admin)/admin/ai-costs/queries"

export function AnomalyCallout({ rows }: { rows: AnomalyRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 text-sm">
        No surfaces are spiking. Last 24h cost is within 3× the 30-day average for every surface.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Anomalies — surfaces spiking in the last 24h</div>
      {rows.map((r) => (
        <div
          key={r.surface}
          className="rounded-lg border border-rose-500/40 bg-rose-500/5 px-4 py-3 text-sm"
        >
          <div className="flex items-baseline justify-between gap-3">
            <div className="font-medium">{r.surface}</div>
            <div className="font-mono text-rose-700 dark:text-rose-300">
              {r.multiple}× normal
            </div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            24h: {formatCents(r.cents24h)} · 30d daily avg:{" "}
            {formatCents(r.averageDailyCents30d)}
          </div>
        </div>
      ))}
    </div>
  )
}

function formatCents(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1) return `$${dollars.toFixed(2)}`
  return `${cents.toFixed(2)}¢`
}
