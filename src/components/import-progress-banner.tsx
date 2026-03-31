'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { X, Package } from 'lucide-react'
import { useImportStore } from '@/stores/import-store'
import {
  getBannerLabel,
  getCompletionMessage,
  getFailureMessage,
} from '@/lib/import/humor'
import { toast } from 'sonner'

/**
 * Floating bottom-left progress pill that persists across navigation.
 * Mounts globally in (main)/layout.tsx via ImportProgressBannerClient.
 * Reads from importStore — no server data, no props.
 */
export function ImportProgressBanner() {
  const { activeImport, dismissBanner, clearImport } = useImportStore()

  // Fire toast and clear store when job finishes
  useEffect(() => {
    if (!activeImport) return

    if (activeImport.phase === 'complete' && activeImport.completedAt) {
      const { title, body } = getCompletionMessage(
        activeImport.successfulRows,
        activeImport.failedRows,
        activeImport.imagesFailed
      )
      toast.success(title, {
        description: body,
        duration: 8000,
        action: {
          label: 'View Listings',
          onClick: () => {
            window.location.href = '/listings'
          },
        },
      })
      setTimeout(clearImport, 3000)
    }

    if (activeImport.phase === 'failed' && activeImport.completedAt) {
      const { title, body } = getFailureMessage(
        activeImport.errorMessage ?? undefined
      )
      toast.error(title, {
        description: body,
        duration: 10000,
        action: {
          label: 'View History',
          onClick: () => {
            window.location.href = '/listings/import'
          },
        },
      })
      setTimeout(clearImport, 3000)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeImport?.phase, activeImport?.completedAt])

  // Don't render if no import, dismissed, or terminal state handled above
  if (
    !activeImport ||
    activeImport.dismissed ||
    activeImport.phase === 'complete' ||
    activeImport.phase === 'failed'
  ) {
    return null
  }

  const { totalRows, totalImages } = activeImport

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
      : 0

  const overallPct =
    totalImages > 0 ? phase1Pct * 0.15 + phase2Pct * 0.85 : phase1Pct

  const displayPct = Math.round(overallPct * 100)

  const label = getBannerLabel(
    activeImport.successfulRows,
    activeImport.totalRows,
    activeImport.phase as 'importing' | 'fetching_images',
    activeImport.imagesFetched,
    activeImport.totalImages
  )

  return (
    <div
      className="fixed bottom-20 left-4 z-50 w-72 overflow-hidden rounded-xl border border-border bg-card shadow-lg md:bottom-6"
      role="status"
      aria-live="polite"
      aria-label={`Import progress: ${displayPct}%`}
    >
      {/* Progress bar strip at top */}
      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${displayPct}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Package className="h-4 w-4 text-primary" />
        </div>

        {/* Label + pct */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">
            {label}
          </p>
          <p className="text-xs text-muted-foreground">
            {displayPct}% complete
          </p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/listings/import"
            className="rounded px-1.5 py-0.5 text-xs text-primary hover:underline"
          >
            View
          </Link>
          <button
            onClick={dismissBanner}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss import progress banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
