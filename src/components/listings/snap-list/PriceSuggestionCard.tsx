"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PriceSuggestion } from "@/lib/snap-list/types"

function formatCents(cents: number | null): string {
  if (cents == null) return "—"
  return `$${Math.round(cents / 100).toLocaleString()}`
}

export function PriceSuggestionCard({ price }: { price: PriceSuggestion | null }) {
  const [expanded, setExpanded] = useState(false)
  if (!price) return null

  if (!price.hasEnoughData) {
    return (
      <div className="rounded-lg border border-dashed bg-muted/30 p-4">
        <div className="text-sm font-medium">Suggested price</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {price.context ?? "Not enough comparable listings yet — price based on your knowledge of the equipment."}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">Suggested price range</div>
          <div className="mt-1 text-2xl font-semibold">
            {formatCents(price.rangeLow)} – {formatCents(price.rangeHigh)}
          </div>
          <div className="text-xs text-muted-foreground">
            Median {formatCents(price.median)} · {price.context}
            {price.conditionAdjusted ? " · condition-adjusted" : ""}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="rounded px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
        >
          <ChevronDown
            className={cn("h-4 w-4 transition-transform", expanded && "rotate-180")}
          />
        </button>
      </div>
      {expanded && (
        <div className="mt-3 rounded bg-muted/50 p-3 text-xs text-muted-foreground">
          Based on {price.comparableCount} comparable listings. Prices adjusted by condition:
          excellent ×1.15, good ×1.00, fair ×0.80, poor ×0.65.
        </div>
      )}
    </div>
  )
}
