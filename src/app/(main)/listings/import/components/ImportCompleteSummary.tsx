'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Check, X, ImageIcon, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { ImportProgressData } from './ImportProgressBar'

interface ImportCompleteSummaryProps {
  data: ImportProgressData
  onReset: () => void
}

export function ImportCompleteSummary({ data, onReset }: ImportCompleteSummaryProps) {
  const [showErrors, setShowErrors] = useState(false)

  const errors = (data.error_log || []) as { row: number; error: string }[]
  const hasErrors = errors.length > 0
  const hasImageFetches = data.image_fetch_attempted > 0

  return (
    <Card className="border-border bg-card">
      <CardContent className="flex flex-col items-center gap-4 py-12">
        <div className="flex size-16 items-center justify-center rounded-full bg-green-500/20">
          <Check className="size-8 text-green-400" />
        </div>

        <h2 className="font-display text-xl font-bold text-foreground">
          Import Complete
        </h2>

        {/* Stats */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Badge className="bg-green-500/20 font-body text-green-400">
            <Check className="mr-1 size-3" />
            {data.successful_rows} listing{data.successful_rows !== 1 ? 's' : ''} created
          </Badge>
          {data.failed_rows > 0 && (
            <Badge className="bg-red-500/20 font-body text-red-400">
              <X className="mr-1 size-3" />
              {data.failed_rows} row{data.failed_rows !== 1 ? 's' : ''} failed
            </Badge>
          )}
          {hasImageFetches && (
            <>
              <Badge className="bg-blue-500/20 font-body text-blue-400">
                <ImageIcon className="mr-1 size-3" />
                {data.image_fetch_succeeded} image{data.image_fetch_succeeded !== 1 ? 's' : ''} imported
              </Badge>
              {data.image_fetch_failed > 0 && (
                <Badge className="bg-yellow-500/20 font-body text-yellow-400">
                  {data.image_fetch_failed} image fetch{data.image_fetch_failed !== 1 ? 'es' : ''} failed
                </Badge>
              )}
            </>
          )}
        </div>

        {/* Hidden listings warning */}
        {(data.hidden_listing_count ?? 0) > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
            <p className="font-body text-xs text-amber-600 dark:text-amber-400">
              {data.hidden_listing_count} listing{data.hidden_listing_count !== 1 ? 's' : ''} hidden from search — add photos to make them visible
            </p>
            <Link
              href="/listings?filter=no-media"
              className="shrink-0 font-body text-xs font-medium text-amber-600 underline-offset-2 hover:underline dark:text-amber-400"
            >
              Fix now →
            </Link>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={onReset} className="font-body">
            Import More
          </Button>
          <Button asChild className="font-body">
            <Link href="/listings">View Listings</Link>
          </Button>
        </div>

        {/* Error Details */}
        {hasErrors && (
          <div className="mt-4 w-full max-w-lg">
            <button
              onClick={() => setShowErrors(!showErrors)}
              className="flex w-full items-center justify-between rounded-lg border border-border p-3 font-body text-sm text-muted-foreground hover:bg-muted/30"
            >
              <span>Error Details ({errors.length})</span>
              {showErrors ? (
                <ChevronUp className="size-4" />
              ) : (
                <ChevronDown className="size-4" />
              )}
            </button>
            {showErrors && (
              <div className="mt-2 max-h-60 space-y-1 overflow-y-auto rounded-lg border border-border bg-muted/20 p-3">
                {errors.map((err, idx) => (
                  <p key={idx} className="font-body text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      Row {err.row}:
                    </span>{' '}
                    {err.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
