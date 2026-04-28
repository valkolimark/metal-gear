import type { FeedbackBreakdownResult } from '../queries-feedback'

interface FeedbackBreakdownProps {
  data: FeedbackBreakdownResult
}

function pct(n: number, total: number): string {
  if (total === 0) return '—'
  return `${Math.round((n / total) * 100)}%`
}

export function FeedbackBreakdown({ data }: FeedbackBreakdownProps) {
  const { rows, totals, windowDays } = data

  return (
    <section className="rounded-lg border bg-card p-4">
      <header className="flex items-baseline justify-between">
        <div>
          <h2 className="text-lg font-semibold">User feedback on AI suggestions</h2>
          <p className="text-xs text-muted-foreground">
            Last {windowDays} days · latest action per user/field wins. Combines `ai_suggestion_feedback` (non-registry) and `registry_match_feedback` (manufacturer/model).
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Total</div>
          <div className="text-2xl font-semibold">{totals.total}</div>
        </div>
      </header>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryTile label="Accepted" value={totals.accepted} total={totals.total} accent="emerald" />
        <SummaryTile label="Rejected" value={totals.rejected} total={totals.total} accent="rose" />
        <SummaryTile label="Overridden" value={totals.overridden} total={totals.total} accent="amber" />
        <SummaryTile label="Not sure" value={totals.unsure} total={totals.total} accent="muted" />
      </div>

      <div className="mt-4 overflow-hidden rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Field</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Accepted</th>
              <th className="px-3 py-2 text-right">Rejected</th>
              <th className="px-3 py-2 text-right">Overridden</th>
              <th className="px-3 py-2 text-right">Not sure</th>
              <th className="px-3 py-2 text-right">Reject rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  No feedback recorded yet in this window.
                </td>
              </tr>
            )}
            {rows.map((row) => {
              const rejectShare = row.rejected + row.overridden
              const rejectRate = pct(rejectShare, row.total)
              const isHot =
                row.total >= 5 && rejectShare / Math.max(1, row.total) >= 0.4
              return (
                <tr key={row.field} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{row.field}</td>
                  <td className="px-3 py-2 text-right">{row.total}</td>
                  <td className="px-3 py-2 text-right text-emerald-600 dark:text-emerald-400">{row.accepted}</td>
                  <td className="px-3 py-2 text-right text-rose-600 dark:text-rose-400">{row.rejected}</td>
                  <td className="px-3 py-2 text-right text-amber-600 dark:text-amber-400">{row.overridden}</td>
                  <td className="px-3 py-2 text-right text-muted-foreground">{row.unsure}</td>
                  <td className={`px-3 py-2 text-right ${isHot ? 'font-semibold text-rose-600 dark:text-rose-400' : ''}`}>
                    {rejectRate}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        High reject rates on a manufacturer/model field signal a registry alias gap or tier misclassification. High reject rates on free-text fields signal a Claude prompt issue.
      </p>
    </section>
  )
}

function SummaryTile({
  label,
  value,
  total,
  accent,
}: {
  label: string
  value: number
  total: number
  accent: 'emerald' | 'rose' | 'amber' | 'muted'
}) {
  const tone =
    accent === 'emerald'
      ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/5'
      : accent === 'rose'
        ? 'text-rose-700 dark:text-rose-300 bg-rose-500/5'
        : accent === 'amber'
          ? 'text-amber-700 dark:text-amber-300 bg-amber-500/5'
          : 'text-muted-foreground bg-muted/30'
  return (
    <div className={`rounded-md p-3 ${tone}`}>
      <div className="text-xs uppercase tracking-wide opacity-80">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-2">
        <span className="text-xl font-semibold">{value}</span>
        <span className="text-xs opacity-70">{pct(value, total)}</span>
      </div>
    </div>
  )
}
