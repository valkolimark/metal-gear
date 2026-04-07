'use client'

import Link from 'next/link'
import Image from 'next/image'
import { TrendingDown, Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PriceDropListing {
  id: string
  title: string
  price_cents: number | null
  contact_for_price: boolean
  condition: string
  category: string
  listing_images: Array<{ url: string; position: number }> | null
  oldPriceCents: number
}

interface FeedPriceDropsProps {
  items: PriceDropListing[]
}

export function FeedPriceDrops({ items }: FeedPriceDropsProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <TrendingDown className="size-5 text-green-500" />
          Recently Reduced
        </h2>
        <Link href="/search" className="text-sm text-primary hover:underline">
          Browse all &rarr;
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((listing) => {
          const image = listing.listing_images
            ?.sort((a, b) => a.position - b.position)[0]
            ?.url
          const dropPercent =
            listing.price_cents && listing.oldPriceCents
              ? Math.round(
                  ((listing.oldPriceCents - listing.price_cents) / listing.oldPriceCents) * 100
                )
              : 0
          return (
            <Link key={listing.id} href={`/listings/${listing.id}`} className="flex-shrink-0">
              <Card className="w-64 overflow-hidden border-border bg-card py-0 gap-0 transition-colors hover:border-primary/50">
                <div className="relative aspect-[16/10] bg-muted">
                  {image ? (
                    <Image
                      src={image}
                      alt={listing.title}
                      fill
                      className="object-cover"
                      sizes="256px"
                      unoptimized
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <Package className="size-8 text-muted-foreground/40" />
                    </div>
                  )}
                  {dropPercent > 0 && (
                    <Badge className="absolute right-2 top-2 bg-green-600 font-body text-[11px] text-white">
                      -{dropPercent}%
                    </Badge>
                  )}
                </div>
                <CardContent className="p-3">
                  <p className="truncate font-body text-sm font-medium text-foreground">
                    {listing.title}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="font-display text-base font-bold text-primary">
                      ${listing.price_cents ? (listing.price_cents / 100).toLocaleString() : '—'}
                    </span>
                    <span className="text-xs text-muted-foreground line-through">
                      ${(listing.oldPriceCents / 100).toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
