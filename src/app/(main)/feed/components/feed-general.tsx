'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Package, AlertTriangle, Clock, Sparkles } from 'lucide-react'
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

interface RecentListing {
  id: string
  title: string
  price_cents: number | null
  contact_for_price: boolean
  category: string
  condition: string
  created_at: string
  listing_images: Array<{ url: string; position: number }> | null
}

interface SOSItem {
  id: string
  title: string
  equipment_category: string
  urgency: string | null
  created_at: string | null
  requester_id: string
}

interface FeedGeneralProps {
  listings: Listing[]
  sosList: SOSItem[]
  recentListings: RecentListing[]
  hasInterests: boolean
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function FeedGeneral({ listings, sosList, recentListings, hasInterests }: FeedGeneralProps) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-10">
      {/* Personalization prompt */}
      {!hasInterests && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Sparkles className="size-5 text-primary flex-shrink-0" />
            <p className="text-sm text-foreground">
              <span className="font-semibold">Personalize your feed</span>
              {' — '}set your equipment interests to see listings tailored to you.
            </p>
          </div>
          <Link
            href="/profile"
            className="inline-flex items-center rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors flex-shrink-0"
          >
            Set Interests
          </Link>
        </div>
      )}

      {/* Latest Listings */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Latest Listings</h2>
          <Link href="/search" className="text-sm text-primary hover:underline">
            Browse all &rarr;
          </Link>
        </div>
        {listings.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Package className="mx-auto mb-3 size-10 text-muted-foreground/40" />
            <p className="text-muted-foreground">No listings yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((listing) => {
              const image = listing.listing_images
                ?.sort((a, b) => a.position - b.position)[0]
                ?.url
              return (
                <Link key={listing.id} href={`/listings/${listing.id}`}>
                  <Card className="h-full overflow-hidden border-border bg-card transition-colors hover:border-primary/50">
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

      {/* Active SOSs */}
      {sosList.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Active SOS Requests</h2>
            <Link href="/sos" className="text-sm text-primary hover:underline">
              View all &rarr;
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {sosList.map((sos) => (
              <Link key={sos.id} href={`/sos/${sos.id}`} className="flex-shrink-0">
                <Card className="w-72 border-[#FF6B2B]/30 bg-[#FF6B2B]/5 transition-colors hover:border-[#FF6B2B]/50">
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center gap-2">
                      <AlertTriangle className="size-4 text-[#FF6B2B]" />
                      {sos.urgency === 'critical' && (
                        <Badge className="bg-red-500/20 text-[11px] text-red-400">Critical</Badge>
                      )}
                    </div>
                    <p className="mb-1 truncate font-body text-sm font-semibold text-foreground">
                      {sos.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sos.equipment_category.replace(/_/g, ' ')}
                    </p>
                    <div className="mt-3 flex items-center justify-end text-xs text-muted-foreground">
                      {sos.created_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="size-3" />
                          {timeAgo(sos.created_at)}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Recently Added */}
      {recentListings.length > 0 && (
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Added This Week</h2>
            <Link href="/search" className="text-sm text-primary hover:underline">
              Browse all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recentListings.map((listing) => {
              const image = listing.listing_images
                ?.sort((a, b) => a.position - b.position)[0]
                ?.url
              return (
                <Link key={listing.id} href={`/listings/${listing.id}`}>
                  <Card className="h-full overflow-hidden border-border bg-card transition-colors hover:border-primary/50">
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
      )}
    </div>
  )
}
