"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { MultiPhotoUploader } from "@/components/upload/MultiPhotoUploader"
import { Button } from "@/components/ui/button"
import { Camera, Sparkles } from "lucide-react"
import { analyzePhotos } from "@/app/actions/snap-list"
import { QuotaBanner } from "./QuotaBanner"
import type { SnapListQuotaStatus } from "@/app/actions/snap-list-usage"

interface Props {
  quota: SnapListQuotaStatus
}

export function SnapUploadZone({ quota }: Props) {
  const router = useRouter()
  const [urls, setUrls] = useState<string[]>([])
  const [isStarting, startTransition] = useTransition()
  const [localDraftId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `snap-${Date.now()}`,
  )

  const canStart = urls.length > 0 && !isStarting && quota.allowed

  const startAnalysis = () => {
    if (!canStart) return
    startTransition(async () => {
      const res = await analyzePhotos(urls)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      router.push(`/listings/snap/analyzing/${res.draftId}`)
    })
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4">
      <header className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
          <Sparkles className="h-3.5 w-3.5" /> experimental
        </div>
        <h1 className="mt-3 text-2xl font-semibold md:text-3xl">
          Photo-to-Listing
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload photos and we&apos;ll draft a listing you can review and edit. Include a nameplate shot if you have one — we&apos;ll pull manufacturer, model, and serial number when we can. Results vary.
        </p>
      </header>

      <QuotaBanner remaining={quota.remaining} limit={quota.limit} tier={quota.tier} />

      <div className="rounded-xl border bg-card p-4 shadow-sm">
        <MultiPhotoUploader
          maxFiles={10}
          uploadUrl="/api/listings/upload-media"
          uploadFields={{ listingId: localDraftId }}
          onComplete={setUrls}
          label={urls.length === 0 ? "Upload equipment photos" : "Add more photos"}
          disabled={!quota.allowed}
        />

        <p className="mt-3 text-xs text-muted-foreground">
          Got a photo of the nameplate? Great. No nameplate? Also fine — we&apos;ll identify it from the equipment itself.
        </p>
      </div>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button
          size="lg"
          onClick={startAnalysis}
          disabled={!canStart}
          className="shadow-lg"
        >
          {isStarting ? (
            <>Starting…</>
          ) : urls.length === 0 ? (
            <>
              <Camera className="mr-2 h-4 w-4" /> Add photos first
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" /> Draft from {urls.length} photo
              {urls.length === 1 ? "" : "s"}
            </>
          )}
        </Button>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        Prefer the step-by-step form?{" "}
        <Link
          href="/listings/new"
          className="underline underline-offset-2 hover:text-foreground"
        >
          Use the manual form
        </Link>
      </div>
    </div>
  )
}
