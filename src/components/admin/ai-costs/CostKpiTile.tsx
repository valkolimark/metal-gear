interface Props {
  label: string
  /** Cents (USD * 100). Will be rendered as $X.XX. */
  cents?: number
  /** Direct string override (used for "% MoM" tile). */
  text?: string
  hint?: string
}

export function CostKpiTile({ label, cents, text, hint }: Props) {
  const display = text ?? formatCents(cents ?? 0)
  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{display}</div>
      {hint ? (
        <div className="mt-2 text-xs text-muted-foreground">{hint}</div>
      ) : null}
    </div>
  )
}

function formatCents(cents: number): string {
  const dollars = cents / 100
  if (dollars >= 1000) return `$${dollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
  if (dollars >= 1) return `$${dollars.toFixed(2)}`
  if (cents >= 1) return `${cents.toFixed(1)}¢`
  return `${cents.toFixed(2)}¢`
}
