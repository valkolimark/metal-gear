'use client'

import { useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'mg-photo-to-listing-dismissed'

interface PhotoToListingHintProps {
  className?: string
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function subscribeToNothing(_callback: () => void) {
  return () => {}
}
function getClientSnapshot() {
  if (!window.matchMedia('(min-width: 360px)').matches) return 'hidden'
  try {
    return localStorage.getItem(STORAGE_KEY) === '1' ? 'dismissed' : 'fresh'
  } catch {
    return 'fresh'
  }
}
function getServerSnapshot() {
  return 'ssr' as const
}

export function PhotoToListingHint({ className = '' }: PhotoToListingHintProps) {
  const clientState = useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot)
  const [dismissed, setDismissed] = useState(false)

  if (clientState === 'ssr') return null
  if (clientState === 'hidden') return null
  if (clientState === 'dismissed' || dismissed) return null

  return (
    <div
      className={`relative w-full max-w-[480px] rounded-lg border border-border bg-muted/30 px-4 py-3 ${className}`}
    >
      <button
        type="button"
        onClick={() => {
          setDismissed(true)
          try {
            localStorage.setItem(STORAGE_KEY, '1')
          } catch {
            // localStorage unavailable — no-op
          }
        }}
        className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>

      <div className="flex items-start justify-between gap-3 pr-7">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-body text-sm font-medium text-foreground">
              Try Photo-to-Listing
            </p>
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 font-body text-[10px] font-medium uppercase tracking-wide text-amber-700 dark:text-amber-300">
              experimental
            </span>
          </div>
          <p className="mt-0.5 font-body text-xs text-muted-foreground">
            Upload photos and we&apos;ll draft the listing &mdash; review and edit before publishing. Results vary.
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="shrink-0 font-body">
          <Link href="/listings/snap">Try it</Link>
        </Button>
      </div>
    </div>
  )
}
