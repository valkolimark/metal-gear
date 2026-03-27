'use client'

import Link from 'next/link'
import { Bell, Package, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { SnipeListing } from '@/app/actions/team-activity'

function formatTimeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function isNew(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < 6 * 60 * 60 * 1000
}

export function NewListingsSnipeFeed({
  listings,
}: {
  listings: SnipeListing[]
}) {
  if (listings.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader className="flex flex-row items-center gap-2">
          <Bell className="size-5 text-primary" />
          <CardTitle className="flex-1 font-display text-lg">
            New For You
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center">
            <Package className="mx-auto mb-3 size-10 text-muted-foreground/40" />
            <p className="font-body text-sm text-muted-foreground">
              No new listings in your categories yet
            </p>
            <p className="mt-1 font-body text-xs text-muted-foreground">
              We&apos;ll surface new listings here as soon as they&apos;re posted
            </p>
            <Link
              href="/profile"
              className="mt-3 inline-block font-body text-sm text-primary hover:underline"
            >
              Update your interests &rarr;
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center gap-2">
        <Bell className="size-5 text-primary" />
        <div className="flex-1">
          <CardTitle className="font-display text-lg">New For You</CardTitle>
          <p className="font-body text-xs text-muted-foreground">
            Based on your equipment interests · Last 72 hours
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {listings.map((listing) => (
          <Link
            key={listing.id}
            href={`/listings/${listing.id}`}
            className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface"
          >
            {/* Image */}
            {listing.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={listing.imageUrl}
                alt={listing.title}
                className="size-16 shrink-0 rounded object-cover ring-1 ring-border"
              />
            ) : (
              <div className="flex size-16 shrink-0 items-center justify-center rounded bg-surface ring-1 ring-border">
                <Package className="size-6 text-muted-foreground/40" />
              </div>
            )}

            {/* Info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-body text-sm font-medium text-foreground">
                  {listing.title}
                </p>
                {isNew(listing.createdAt) && (
                  <Badge className="shrink-0 bg-primary font-body text-[10px] text-white">
                    NEW
                  </Badge>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-2">
                <Badge variant="outline" className="font-body text-[10px]">
                  {listing.condition}
                </Badge>
                {listing.city && listing.state && (
                  <span className="font-body text-xs text-muted-foreground">
                    {listing.city}, {listing.state}
                  </span>
                )}
              </div>
              <p className="mt-0.5 font-body text-xs text-muted-foreground">
                {listing.companyName && `${listing.companyName} · `}
                {formatTimeAgo(listing.createdAt)}
              </p>
            </div>

            {/* Price */}
            <div className="shrink-0 text-right">
              <p className="font-display text-sm font-bold text-primary">
                {listing.contactForPrice
                  ? 'Contact'
                  : listing.price
                    ? `$${(listing.price / 100).toLocaleString()}`
                    : 'N/A'}
              </p>
            </div>
          </Link>
        ))}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2">
          <Link
            href="/search"
            className="font-body text-xs text-primary hover:underline"
          >
            Browse all equipment &rarr;
          </Link>
          <Link
            href="/feed"
            className="flex items-center gap-1 font-body text-xs text-muted-foreground hover:text-foreground"
          >
            See full feed
            <ArrowRight className="size-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
