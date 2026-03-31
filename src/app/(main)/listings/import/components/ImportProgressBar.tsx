'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

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
  hasImageUrls: boolean
  onComplete: (data: ImportProgressData) => void
}

export function ImportProgressBar({
  importId,
  totalRows,
  hasImageUrls,
  onComplete,
}: ImportProgressBarProps) {
  const [progress, setProgress] = useState<ImportProgressData | null>(null)

  useEffect(() => {
    let cancelled = false

    const poll = async () => {
      try {
        const res = await fetch(`/api/import/progress/${importId}`)
        if (!res.ok) return
        const data: ImportProgressData = await res.json()
        if (cancelled) return
        setProgress(data)

        if (data.status === 'complete' || data.status === 'failed') {
          onComplete(data)
          return
        }
      } catch {
        // Retry on next interval
      }

      if (!cancelled) {
        setTimeout(poll, 2000)
      }
    }

    poll()

    return () => {
      cancelled = true
    }
  }, [importId, onComplete])

  const isImporting = !progress || progress.status === 'importing'
  const isFetchingImages = progress?.status === 'fetching_images'

  const listingProgress = isImporting
    ? ((progress?.processed_rows || 0) / totalRows) * 100
    : 100

  const imageProgress = isFetchingImages && progress?.image_fetch_attempted
    ? (progress.processed_rows / progress.image_fetch_attempted) * 100
    : 0

  return (
    <Card className="border-border bg-card">
      <CardContent className="space-y-6 py-12">
        {/* Phase 1: Creating Listings */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {isImporting ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <Check className="size-4 text-green-400" />
            )}
            <span className="font-body text-sm font-medium text-foreground">
              {isImporting ? 'Creating listings...' : 'Listings created'}
            </span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{ width: `${Math.min(listingProgress, 100)}%` }}
            />
          </div>

          <p className="font-body text-xs text-muted-foreground">
            {isImporting
              ? `${progress?.processed_rows || 0} of ${totalRows}`
              : `${progress?.successful_rows || 0} of ${totalRows} (${progress?.failed_rows || 0} failed)`}
          </p>
        </div>

        {/* Phase 2: Fetching Images */}
        {hasImageUrls && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              {isFetchingImages ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : isImporting ? (
                <div className="size-4 rounded-full border-2 border-muted" />
              ) : (
                <Check className="size-4 text-green-400" />
              )}
              <span
                className={`font-body text-sm font-medium ${
                  isImporting
                    ? 'text-muted-foreground'
                    : 'text-foreground'
                }`}
              >
                {isFetchingImages
                  ? 'Fetching images...'
                  : isImporting
                    ? 'Fetching images'
                    : 'Images fetched'}
              </span>
            </div>

            {(isFetchingImages || (!isImporting && !isFetchingImages)) && (
              <>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300"
                    style={{
                      width: `${Math.min(
                        isFetchingImages ? imageProgress : 100,
                        100
                      )}%`,
                    }}
                  />
                </div>

                <p className="font-body text-xs text-muted-foreground">
                  {isFetchingImages
                    ? `${progress?.processed_rows || 0} of ${progress?.image_fetch_attempted || 0} images`
                    : `${progress?.image_fetch_succeeded || 0} imported, ${progress?.image_fetch_failed || 0} failed`}
                </p>
              </>
            )}
          </div>
        )}

        <p className="text-center font-body text-xs text-muted-foreground">
          Please don&apos;t close this page while the import is running.
        </p>
      </CardContent>
    </Card>
  )
}
