"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { getDraft } from "@/app/actions/snap-list-draft"
import { AnalysisStage } from "./AnalysisStage"
import { AlertTriangle, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { SnapListAnalysisStage, SnapListDraftStatus } from "@/lib/snap-list/types"

interface Props {
  draftId: string
  initialStatus: SnapListDraftStatus
  initialStage: SnapListAnalysisStage | null
  initialError: string | null
}

const STAGE_ORDER: SnapListAnalysisStage[] = [
  "uploading",
  "identifying",
  "pricing",
  "coaching",
  "complete",
]

const STAGE_LABELS: Record<SnapListAnalysisStage, { label: string; icon: string }> = {
  uploading: { label: "Reading photos…", icon: "🔍" },
  ocr: { label: "Reading the nameplate…", icon: "🏷️" },
  identifying: { label: "Identifying the equipment…", icon: "🏷️" },
  categorizing: { label: "Categorizing…", icon: "📂" },
  pricing: { label: "Finding comparable listings…", icon: "💵" },
  writing: { label: "Writing your description…", icon: "✍️" },
  coaching: { label: "Reviewing photo quality…", icon: "📸" },
  complete: { label: "Draft ready", icon: "✓" },
}

export function AnalysisStream({
  draftId,
  initialStatus,
  initialStage,
  initialError,
}: Props) {
  const router = useRouter()
  const [status, setStatus] = useState<SnapListDraftStatus>(initialStatus)
  const [stage, setStage] = useState<SnapListAnalysisStage | null>(initialStage)
  const [error, setError] = useState<string | null>(initialError)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (status === "ready") {
      router.push(`/listings/snap/review/${draftId}`)
      return
    }
    if (status === "failed") {
      if (pollRef.current) clearInterval(pollRef.current)
      return
    }

    pollRef.current = setInterval(async () => {
      const draft = await getDraft(draftId)
      if (!draft) return
      setStatus(draft.status)
      setStage(draft.analysisStage)
      setError(draft.errorMessage)
    }, 400)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [draftId, router, status])

  const activeIdx = stage ? STAGE_ORDER.indexOf(stage) : 0

  return (
    <div className="mx-auto max-w-xl space-y-4 p-6">
      <header className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5 animate-pulse" /> Analyzing
        </div>
        <h1 className="mt-3 text-2xl font-semibold">
          Working on your listing…
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This usually takes 8–12 seconds. You can leave this page and come back — we&apos;ll keep going.
        </p>
      </header>

      <div className="space-y-2">
        {STAGE_ORDER.filter((s) => s !== "complete").map((s, idx) => {
          const labelEntry = STAGE_LABELS[s]
          const computed: "pending" | "active" | "complete" =
            status === "ready"
              ? "complete"
              : idx < activeIdx
                ? "complete"
                : idx === activeIdx && status === "analyzing"
                  ? "active"
                  : "pending"
          return (
            <AnalysisStage
              key={s}
              label={labelEntry.label}
              state={computed}
              icon={labelEntry.icon}
            />
          )
        })}
      </div>

      {status === "failed" && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-600" />
            <div className="flex-1 space-y-2">
              <div className="font-medium text-rose-900 dark:text-rose-200">
                Analysis hit a snag
              </div>
              <p className="text-sm text-rose-800/80 dark:text-rose-200/80">
                {error ?? "We couldn't complete the analysis. Your draft is saved — you can review what we got or try again."}
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    router.push(`/listings/snap/review/${draftId}`)
                  }
                >
                  Review what we got
                </Button>
                <Button
                  size="sm"
                  onClick={() => router.push("/listings/snap")}
                >
                  Try again
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
