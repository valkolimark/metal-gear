'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { getHiddenListingCount } from '@/app/actions/listing-media-gate'

interface Props {
  companyId: string
}

export function HiddenListingsAlert({ companyId }: Props) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    getHiddenListingCount(companyId).then(setCount).catch(() => {})
  }, [companyId])

  if (count === 0) return null

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
          {count === 1
            ? '1 listing is hidden from search'
            : `${count} listings are hidden from search`}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Listings need at least one photo or video to appear in browse and search results.
        </p>
      </div>
      <Link
        href="/listings?filter=no-media"
        className="shrink-0 text-xs font-medium text-amber-600 underline-offset-2 hover:underline dark:text-amber-400"
      >
        Fix now →
      </Link>
    </div>
  )
}
