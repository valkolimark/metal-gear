'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Bookmark, Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Listing {
  id: string
  title: string
  price_cents: number | null
  contact_for_price: boolean
  category: string
  condition: string
  created_at: string
  listing_images: Array<{ url: string; position: number }> | null
}

interface SavedSearch {
  id: string
  name: string
}

interface FeedSavedSearchSectionProps {
  listings: Listing[]
  savedSearches: SavedSearch[]
}

export function FeedSavedSearchSection({ listings, savedSearches }: FeedSavedSearchSectionProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <Bookmark className="size-5 text-primary" />
          New From Your Saved Searches
        </h2>
        <Link href="/search" className="text-sm text-primary hover:underline">
          Manage searches &rarr;
        </Link>
      </div>
      {savedSearches.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {savedSearches.map((s) => (
            <span
              key={s.id}
              className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
            >
              {s.name}
            </span>
          ))}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => {
          const image = listing.listing_images
            ?.sort((a, b) => a.position - b.position)[0]
            ?.url
          return (
            <Link key={listing.id} href={`/listings/${listing.id}`}>
              <Card className="h-full overflow-hidden border-border bg-card py-0 gap-0 transition-colors hover:border-primary/50">
                <div className="relative aspect-[16/10] bg-muted">
                  {image ? (
                    <Image
                      src={image}
                      alt={listing.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      unoptimized
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Package className="size-8 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <p className="truncate font-body text-sm font-medium text-foreground">
                    {listing.title}
                  </p>
                  <p className="mt-1 font-display text-base font-bold text-primary">
                    {listing.contact_for_price
                      ? 'Contact'
                      : listing.price_cents
                        ? `$${(listing.price_cents / 100).toLocaleString()}`
                        : 'Contact'}
                  </p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
