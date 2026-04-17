"use client"

import { Camera, Sparkles, TrendingUp } from "lucide-react"
import { logSnapListEvent } from "@/lib/snap-list/events"
import type { PhotoCoachOutput } from "@/lib/snap-list/types"

interface Props {
  draftId: string
  ownerId: string
  coach: PhotoCoachOutput | null
  onAddPhoto?: () => void
}

export function PhotoCoachCard({ draftId, ownerId, coach, onAddPhoto }: Props) {
  if (!coach || coach.suggestions.length === 0) return null

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Photo coach
          </div>
          <div className="mt-1 text-sm font-medium">
            Want more responses? Add these shots:
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <TrendingUp className="h-3.5 w-3.5" />
          {coach.currentQualityScore} → {coach.projectedWithAllSuggestions}
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {coach.suggestions.map((s) => (
          <li
            key={s.id}
            className="flex items-start gap-3 rounded-md border bg-background p-3 text-sm"
          >
            <Camera className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div className="flex-1">
              <div className="font-medium">{s.title}</div>
              <div className="text-xs text-muted-foreground">{s.description}</div>
            </div>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300">
              +{s.projectedQualityLift}
            </span>
          </li>
        ))}
      </ul>

      {onAddPhoto && (
        <button
          type="button"
          onClick={() => {
            void logSnapListEvent({
              type: "photo_coach_suggestion_acted",
              draftId,
              ownerId,
              payload: { suggestion_count: coach.suggestions.length },
            })
            onAddPhoto()
          }}
          className="mt-3 inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground"
        >
          Add photos
        </button>
      )}
    </div>
  )
}
