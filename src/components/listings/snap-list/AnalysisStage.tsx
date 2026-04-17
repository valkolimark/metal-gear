import { Check, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface Props {
  label: string
  state: "pending" | "active" | "complete"
  icon?: string
}

export function AnalysisStage({ label, state, icon }: Props) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-all",
        state === "complete" && "border-emerald-500/50",
        state === "active" && "border-primary/50 shadow-sm",
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          state === "complete" && "bg-emerald-500/15 text-emerald-600",
          state === "active" && "bg-primary/15 text-primary",
          state === "pending" && "bg-muted text-muted-foreground",
        )}
      >
        {state === "complete" ? (
          <Check className="h-4 w-4" />
        ) : state === "active" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : icon ? (
          <span className="text-sm">{icon}</span>
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
        )}
      </div>
      <div
        className={cn(
          "text-sm",
          state === "active" ? "font-medium text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </div>
    </div>
  )
}
