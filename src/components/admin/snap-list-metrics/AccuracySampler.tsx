"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { recordAccuracyReview } from "@/app/actions/snap-list-accuracy-sample"
import type { AccuracySampleDraft } from "@/app/actions/snap-list-accuracy-sample"

interface Props {
  drafts: AccuracySampleDraft[]
  aggregate: {
    totalReviews: number
    correctReviews: number
    accuracyPercent: number | null
  }
}

type LocalState = Record<string, Record<string, boolean>> // draftId → field → correct

const FIELDS: Array<{ key: keyof AccuracySampleDraft["fields"]; label: string }> = [
  { key: "manufacturer", label: "Manufacturer" },
  { key: "model", label: "Model" },
  { key: "serialNumber", label: "Serial #" },
  { key: "year", label: "Year" },
  { key: "condition", label: "Condition" },
]

export function AccuracySampler({ drafts, aggregate }: Props) {
  const [pending, startTransition] = useTransition()
  const [local, setLocal] = useState<LocalState>(() => {
    const out: LocalState = {}
    for (const d of drafts) {
      out[d.draftId] = {}
      for (const f of Object.entries(d.reviewsByField)) {
        out[d.draftId][f[0]] = f[1].correct
      }
    }
    return out
  })

  function submit(draftId: string, field: string, correct: boolean) {
    setLocal((prev) => ({
      ...prev,
      [draftId]: { ...(prev[draftId] ?? {}), [field]: correct },
    }))
    startTransition(async () => {
      const result = await recordAccuracyReview(draftId, field, correct)
      if ("error" in result) {
        toast.error(result.error)
      }
    })
  }

  return (
    <section className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="text-sm font-medium">Nameplate OCR accuracy (manual sample)</div>
        <div className="mt-1 text-xs text-muted-foreground">
          {aggregate.totalReviews > 0
            ? `${aggregate.correctReviews} / ${aggregate.totalReviews} field reviews correct — current accuracy ${aggregate.accuracyPercent}% (target ≥ 95%)`
            : "No reviews yet. Tap ✓ or ✗ on each field below to start building the sample."}
        </div>
      </div>

      <div className="grid gap-4">
        {drafts.length === 0 && (
          <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
            No published Snap & List drafts in the last 30 days yet.
          </div>
        )}
        {drafts.map((d) => {
          const imgUrl = d.nameplatePhotoUrl ?? d.firstPhotoUrl
          return (
            <article
              key={d.draftId}
              className="rounded-lg border bg-card p-4"
            >
              <div className="grid gap-4 md:grid-cols-[180px_1fr]">
                <div className="relative aspect-square overflow-hidden rounded-md bg-muted">
                  {imgUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imgUrl}
                      alt="Nameplate"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                      No photo
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Draft {d.draftId.slice(0, 8)}… · {new Date(d.createdAt).toLocaleDateString()}
                  </div>
                  {d.ocrText && (
                    <pre className="max-h-20 overflow-y-auto whitespace-pre-wrap rounded bg-muted p-2 text-[11px] leading-tight">
                      {d.ocrText}
                    </pre>
                  )}
                  <div className="space-y-2">
                    {FIELDS.map((f) => {
                      const value = d.fields[f.key]
                      const localMark = local[d.draftId]?.[f.key as string]
                      return (
                        <div
                          key={f.key as string}
                          className="flex items-center justify-between rounded border px-2 py-1.5 text-sm"
                        >
                          <div>
                            <span className="text-muted-foreground">{f.label}:</span>{" "}
                            <span className="font-medium">
                              {value ?? <em className="text-muted-foreground">null</em>}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant={localMark === true ? "default" : "outline"}
                              size="sm"
                              disabled={pending}
                              onClick={() => submit(d.draftId, f.key as string, true)}
                            >
                              ✓
                            </Button>
                            <Button
                              variant={localMark === false ? "default" : "outline"}
                              size="sm"
                              disabled={pending}
                              onClick={() => submit(d.draftId, f.key as string, false)}
                            >
                              ✗
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

// Next/Image unused export kept for future optimization — suppresses lint.
void Image
