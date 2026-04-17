import type { PilotMetric } from "@/app/actions/snap-list-metrics"
import { cn } from "@/lib/utils"

interface Props {
  metric: PilotMetric
}

const STATUS_STYLES: Record<string, string> = {
  green: "border-l-emerald-500",
  yellow: "border-l-amber-500",
  red: "border-l-rose-500",
}

const STATUS_LABEL: Record<string, string> = {
  green: "On target",
  yellow: "Watching",
  red: "Red flag",
}

export function MetricCard({ metric }: Props) {
  const formattedValue =
    metric.unit === "%"
      ? `${metric.value}%`
      : metric.unit === "min"
        ? `${metric.value} min`
        : `${metric.value}`
  const formattedTarget =
    metric.unit === "%"
      ? `≤ ${metric.target}%`
      : metric.unit === "min"
        ? `≤ ${metric.target} min`
        : `≤ ${metric.target}`
  const formattedRedFlag =
    metric.unit === "%"
      ? `≥ ${metric.redFlag}%`
      : metric.unit === "min"
        ? `≥ ${metric.redFlag} min`
        : `≥ ${metric.redFlag}`
  const statusClass = STATUS_STYLES[metric.status] ?? "border-l-muted"

  return (
    <div
      className={cn(
        "rounded-lg border border-l-4 bg-card p-4 shadow-sm",
        statusClass,
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {metric.label}
          </div>
          <div className="mt-2 text-3xl font-semibold">{formattedValue}</div>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            metric.status === "green" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            metric.status === "yellow" && "bg-amber-500/10 text-amber-700 dark:text-amber-300",
            metric.status === "red" && "bg-rose-500/10 text-rose-700 dark:text-rose-300",
          )}
        >
          {STATUS_LABEL[metric.status] ?? metric.status}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
        <div>
          <div className="font-medium text-foreground/80">Target</div>
          <div>{formattedTarget}</div>
        </div>
        <div>
          <div className="font-medium text-foreground/80">Red flag</div>
          <div>{formattedRedFlag}</div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {metric.description}
      </p>
    </div>
  )
}
