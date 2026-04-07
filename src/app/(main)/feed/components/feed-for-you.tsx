'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Package } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Listing {
  id: string
  title: string
  price_cents: number | null
  contact_for_price: boolean
  condition: string
  category: string
  location_city: string
  location_state: string
  created_at: string
  listing_quality_score: number | null
  is_featured: boolean
  views_count: number
  favorites_count: number
  negotiable: boolean
  listing_images: Array<{ url: string; position: number }> | null
  company_profiles: { name: string; logo_url: string | null } | null
}

interface FeedForYouProps {
  listings: Listing[]
  hasInterests: boolean
}

export function FeedForYou({ listings, hasInterests }: FeedForYouProps) {
  if (!hasInterests) {
    return (
      <section>
        <h2 className="mb-4 font-display text-xl font-semibold">For You</h2>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="mb-3 text-muted-foreground">
            Set your equipment interests to see personalized listings here.
          </p>
          <Link href="/profile" className="text-sm font-medium text-primary hover:underline">
            Update Interests &rarr;
          </Link>
        </div>
      </section>
    )
  }

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">For You</h2>
        <Link href="/search" className="text-sm text-primary hover:underline">
          Browse all &rarr;
        </Link>
      </div>
      {listings.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No new listings in your categories yet. Check back soon.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                        sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                        unoptimized
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <Package className="size-10 text-muted-foreground/40" />
                      </div>
                    )}
                    {listing.is_featured && (
                      <Badge className="absolute left-2 top-2 bg-primary/90 font-body text-[11px] text-white">
                        Featured
                      </Badge>
                    )}
                  </div>
                  <CardContent className="flex flex-col p-4">
                    <p className="truncate font-body font-medium text-foreground">
                      {listing.title}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="font-body text-[11px]">
                        {listing.category.replace(/_/g, ' ')}
                      </Badge>
                      <Badge variant="outline" className="font-body text-[11px] capitalize">
                        {listing.condition.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="mt-auto pt-3">
                      <p className="font-display text-lg font-bold text-primary">
                        {listing.contact_for_price
                          ? 'Contact'
                          : listing.price_cents
                            ? `$${(listing.price_cents / 100).toLocaleString()}`
                            : 'Contact'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
