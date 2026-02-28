'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getListingsForCompare } from '@/app/actions/compare'
import type { Tables } from '@/types/database'

type Listing = Tables<'listings'>

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <CompareContent />
    </Suspense>
  )
}

function CompareContent() {
  const searchParams = useSearchParams()
  const idsParam = searchParams.get('ids') || ''
  const ids = idsParam.split(',').filter(Boolean)

  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (ids.length < 2) {
      setLoading(false)
      return
    }
    getListingsForCompare(ids).then((result) => {
      if ('listings' in result) {
        setListings(result.listings ?? [])
      }
      setLoading(false)
    })
  }, [idsParam]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (listings.length < 2) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Compare Listings
        </h1>
        <p className="mt-2 font-body text-muted-foreground">
          Select 2-3 listings from search to compare them side by side.
        </p>
        <Button asChild className="mt-4 font-body">
          <Link href="/search">
            <ArrowLeft className="mr-2 size-4" />
            Back to Search
          </Link>
        </Button>
      </div>
    )
  }

  const specs = new Set<string>()
  listings.forEach((l) => {
    if (l.specifications) {
      Object.keys(l.specifications as Record<string, string>).forEach((k) =>
        specs.add(k)
      )
    }
  })

  const rows: { label: string; key: string }[] = [
    { label: 'Price', key: '_price' },
    { label: 'Category', key: '_category' },
    { label: 'Condition', key: '_condition' },
    { label: 'Industry', key: '_industry' },
    { label: 'Location', key: '_location' },
    { label: 'Views', key: '_views' },
    { label: 'Favorites', key: '_favorites' },
    ...Array.from(specs).map((s) => ({ label: s, key: `spec_${s}` })),
  ]

  function getCellValue(listing: Listing, key: string): string {
    switch (key) {
      case '_price':
        return listing.contact_for_price
          ? 'Contact'
          : listing.price_cents
            ? `$${(listing.price_cents / 100).toLocaleString()}`
            : 'Free'
      case '_category':
        return listing.category
      case '_condition':
        return listing.condition.replace('_', ' ')
      case '_industry':
        return listing.industry || '-'
      case '_location':
        return `${listing.location_city}, ${listing.location_state}`
      case '_views':
        return listing.views_count.toLocaleString()
      case '_favorites':
        return listing.favorites_count.toLocaleString()
      default: {
        if (key.startsWith('spec_')) {
          const specKey = key.replace('spec_', '')
          const specVal = (listing.specifications as Record<string, string>)?.[specKey]
          return specVal || '-'
        }
        return '-'
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/search">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Compare Listings
        </h1>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] border-collapse">
          <thead>
            <tr>
              <th className="w-32 border-b border-border p-3 text-left font-body text-xs text-muted-foreground" />
              {listings.map((listing) => (
                <th
                  key={listing.id}
                  className="border-b border-border p-3 text-left"
                >
                  <Link
                    href={`/listings/${listing.id}`}
                    className="font-display text-sm font-semibold text-foreground hover:text-primary"
                  >
                    {listing.title}
                  </Link>
                  <div className="mt-1 flex gap-1">
                    <Badge variant="outline" className="font-body text-[10px]">
                      {listing.status}
                    </Badge>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="hover:bg-surface/50">
                <td className="border-b border-border/50 p-3 font-body text-xs font-medium text-muted-foreground">
                  {row.label}
                </td>
                {listings.map((listing) => {
                  const value = getCellValue(listing, row.key)
                  const isPrice = row.key === '_price'
                  return (
                    <td
                      key={listing.id}
                      className={`border-b border-border/50 p-3 font-body text-sm ${
                        isPrice
                          ? 'font-display font-bold text-primary'
                          : 'text-foreground'
                      }`}
                    >
                      {value}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
