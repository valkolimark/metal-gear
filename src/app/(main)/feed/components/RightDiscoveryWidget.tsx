'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Zap } from 'lucide-react'

interface DiscoveryListing {
  id: string
  title: string
  price_cents: number | null
  contact_for_price: boolean | null
  location_city: string | null
  location_state: string | null
  listing_images: Array<{ url: string; position: number }> | null
}

interface RightDiscoveryWidgetProps {
  listings: DiscoveryListing[]
}

function formatPrice(cents: number | null, contactForPrice: boolean | null) {
  if (contactForPrice || !cents) return 'Contact for Price'
  return '$' + (cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })
}

const CARD_SHADOW = '0 1px 2px rgba(11,37,69,0.04), 0 4px 12px rgba(11,37,69,0.05)'

export function RightDiscoveryWidget({ listings }: RightDiscoveryWidgetProps) {
  return (
    <div
      className="rounded-2xl bg-card p-4"
      style={{ boxShadow: CARD_SHADOW }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Zap className="size-4 text-primary" />
        <h3 className="font-display text-[14.5px] font-bold text-foreground tracking-tight">
          Recently Listed For You
        </h3>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-4">
          <p className="font-body text-xs text-muted-foreground mb-2">
            No listings match your equipment interests yet.
          </p>
          <Link href="/profile" className="font-body text-xs text-primary hover:underline">
            Update interests &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-0">
          {listings.map((listing) => {
            const images = listing.listing_images ?? []
            const thumb = images.sort((a, b) => a.position - b.position)[0]?.url

            return (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="flex items-center gap-3 py-2.5 hover:bg-muted/50 rounded-lg transition-colors -mx-1 px-2"
              >
                <div className="size-12 shrink-0 rounded-lg overflow-hidden bg-muted">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={listing.title}
                      width={48}
                      height={48}
                      className="object-cover size-full"
                    />
                  ) : (
                    <div className="size-full flex items-center justify-center text-muted-foreground text-xs">
                      N/A
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-body text-sm font-medium text-foreground truncate">
                    {listing.title}
                  </p>
                  <p className="font-body text-xs text-muted-foreground">
                    {formatPrice(listing.price_cents, listing.contact_for_price)}
                    {listing.location_city && listing.location_state
                      ? ` · ${listing.location_city}, ${listing.location_state}`
                      : ''}
                  </p>
                </div>
              </Link>
            )
          })}
          <div className="pt-2 border-t border-border mt-2">
            <Link
              href="/search"
              className="font-body text-xs text-primary hover:underline"
            >
              Browse all equipment &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
