'use client'

import dynamic from 'next/dynamic'
import { Loader2 } from 'lucide-react'

export const DynamicListingMap = dynamic(
  () => import('./listing-map').then((mod) => mod.ListingMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center rounded-lg bg-surface">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    ),
  }
)
