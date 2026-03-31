'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useImportStore } from '@/stores/import-store'
import { getImageFetchQuip, getStartToast } from '@/lib/import/humor'
import { toast } from 'sonner'

export type ImportProgressData = {
  id: string
  status: string
  total_rows: number
  processed_rows: number
  successful_rows: number
  failed_rows: number
  image_fetch_attempted: number
  image_fetch_succeeded: number
  image_fetch_failed: number
  error_log: { row: number; error: string }[] | null
}

interface ImportProgressBarProps {
  importId: string
  totalRows: number
  totalImages: number
  onComplete: (data: ImportProgressData) => void
}

type ActiveImportPhase =
  | 'pending'
  | 'importing'
  | 'fetching_images'
  | 'complete'
  | 'failed'

export function ImportProgressBar({
  importId,
  totalRows,
  totalImages,
  onComplete,
}: ImportProgressBarProps) {
  const { activeImport, startImport, updateProgress } = useImportStore()
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const initializedRef = useRef(false)
  const [startMs] = useState(() => Date.now())

  // Initialise store on mount (once)
  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    startImport(importId, totalRows, totalImages)

    toast(getStartToast(totalRows), {
      duration: totalRows > 100 ? 8000 : 4000,
    })
  }, [importId, totalRows, totalImages, startImport])

  // Polling loop — writes to store
  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/import/progress/${importId}`)
      if (!res.ok) return
      const data: ImportProgressData = await res.json()

      const attempted = data.image_fetch_attempted ?? 0

      // Compute time estimate
      let timeEstimate: string | null = null
      if (
        data.status === 'fetching_images' &&
        totalImages > 0 &&
        attempted > 0
      ) {
        const p2 = Math.min(attempted / totalImages, 1)
        if (p2 >= 0.1 && startMs > 0) {
          const elapsed = Date.now() - startMs
          const msPerImage = elapsed / attempted
          const remaining = totalImages - attempted
          const remainingMs = remaining * msPerImage
          const remainingMins = Math.max(0, Math.ceil(remainingMs / 60000))
          timeEstimate =
            remainingMins <= 1
              ? 'Less than a minute remaining'
              : `~${remainingMins} minute${remainingMins !== 1 ? 's' : ''} remaining`
        }
      }

      updateProgress({
        phase: data.status as ActiveImportPhase,
        successfulRows: data.successful_rows ?? 0,
        failedRows: data.failed_rows ?? 0,
        imagesAttempted: attempted,
        imagesFetched: data.image_fetch_succeeded ?? 0,
        imagesFailed: data.image_fetch_failed ?? 0,
        timeEstimate,
        errorMessage:
          data.error_log && data.error_log.length > 0
            ? data.error_log[0].error
            : null,
      })

      if (data.status === 'complete' || data.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current)
        updateProgress({ completedAt: Date.now() })
        onComplete(data)
      }
    } catch {
      // Swallow network errors — poll will retry on next tick
    }
  }, [importId, totalImages, startMs, updateProgress, onComplete])

  useEffect(() => {
    pollRef.current = setInterval(poll, 2000)
    poll()
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [poll])

  if (!activeImport) return null

  // ── Progress calculation ─────────────────────────────────────────────────
  const phase1Pct =
    totalRows > 0
      ? Math.min(
          (activeImport.successfulRows + activeImport.failedRows) / totalRows,
          1
        )
      : 0

  const phase2Pct =
    totalImages > 0 && activeImport.phase === 'fetching_images'
      ? Math.min(activeImport.imagesAttempted / totalImages, 1)
      : activeImport.phase === 'complete'
        ? 1
        : 0

  const overallPct =
    totalImages > 0 ? phase1Pct * 0.15 + phase2Pct * 0.85 : phase1Pct

  const displayPct = Math.round(overallPct * 100)

  // ── Phase 2 image quip ───────────────────────────────────────────────────
  const imageFetchQuip =
    activeImport.phase === 'fetching_images'
      ? getImageFetchQuip(totalImages, Math.round(phase2Pct * 100))
      : null

  // ── Phase label ──────────────────────────────────────────────────────────
  const phaseLabel = (() => {
    switch (activeImport.phase) {
      case 'pending':
        return 'Starting import...'
      case 'importing':
        return `Setting up the yard — ${activeImport.successfulRows} of ${totalRows} listings`
      case 'fetching_images':
        return totalImages > 0
          ? `Hauling photos — ${activeImport.imagesAttempted.toLocaleString()} of ${totalImages.toLocaleString()}`
          : 'Finishing up...'
      case 'complete':
        return 'All done!'
      case 'failed':
        return 'Import encountered an error'
      default:
        return 'Processing...'
    }
  })()

  return (
    <div className="space-y-4">
      {/* "You can leave" banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/40">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <span className="font-medium">
            This is running in the background.
          </span>{' '}
          You can safely leave this page — we&apos;ll send you a notification
          when your inventory is ready.
        </p>
      </div>

      {/* Combined progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-body text-muted-foreground">{phaseLabel}</span>
          <span className="font-body tabular-nums font-medium">
            {displayPct}%
          </span>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${displayPct}%` }}
          />
        </div>

        {/* Time estimate */}
        {activeImport.timeEstimate && (
          <p className="font-body text-xs text-muted-foreground">
            {activeImport.timeEstimate}
          </p>
        )}

        {/* Phase 2 image quip */}
        {imageFetchQuip && (
          <p className="font-body text-xs italic text-muted-foreground">
            {imageFetchQuip}
          </p>
        )}
      </div>

      {/* Phase breakdown (subtle secondary detail) */}
      {activeImport.phase === 'fetching_images' && totalImages > 0 && (
        <div className="flex gap-6 font-body text-xs text-muted-foreground">
          <span>
            &#10003; {activeImport.successfulRows} listings created
          </span>
          <span>
            {activeImport.imagesFetched.toLocaleString()} /{' '}
            {totalImages.toLocaleString()} images
          </span>
          {activeImport.imagesFailed > 0 && (
            <span className="text-destructive">
              {activeImport.imagesFailed} images failed
            </span>
          )}
        </div>
      )}
    </div>
  )
}
