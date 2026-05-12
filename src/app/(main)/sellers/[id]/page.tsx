import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  MapPin,
  Building2,
  Briefcase,
  Calendar,
  BadgeCheck,
  Star,
  Package,
  MessageSquare,
  ShoppingCart,
  Clock,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStorefront, getSellerStats } from '@/app/actions/storefront'
import { getSellerReviews } from '@/app/actions/reputation'
import { ReputationSummary } from '@/components/reputation-summary'
import { APP_URL } from '@/lib/constants'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, display_name, company_name, bio')
    .eq('id', id)
    .single()

  if (!profile) return { title: 'Seller Not Found' }

  const name = profile.display_name || profile.full_name || 'Seller'
  const company = profile.company_name ? ` — ${profile.company_name}` : ''
  const description = profile.bio?.slice(0, 160) ||
    `View ${name}'s storefront on Metal Gear — industrial equipment marketplace.`

  return {
    title: `${name}${company} | Metal Gear`,
    description,
    alternates: {
      canonical: `${APP_URL}/sellers/${id}`,
    },
    openGraph: {
      title: `${name}${company}`,
      description,
      url: `${APP_URL}/sellers/${id}`,
      siteName: 'Metal Gear',
    },
  }
}

export default async function SellerStorefrontPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  // Fetch storefront, stats, listings, reviews, business profile in parallel
  const [storefrontRes, stats, listingsRes, reviewsData, bizProfileRes] = await Promise.all([
    getStorefront(id),
    getSellerStats(id),
    admin
      .from('listings')
      .select('id, title, category, price_cents, contact_for_price, condition, views_count, favorites_count, created_at, listing_images(url, position)')
      .eq('seller_id', id)
      .eq('status', 'active')
      .eq('has_media', true)
      .order('created_at', { ascending: false }),
    getSellerReviews(id),
    admin
      .from('user_business_profiles')
      .select('industries')
      .eq('user_id', id)
      .maybeSingle(),
  ])

  // Industries: prefer canonical array from user_business_profiles, fall back
  // to legacy profiles.industry singleton.
  const sellerIndustries: string[] = (() => {
    const arr = bizProfileRes.data?.industries
    if (Array.isArray(arr) && arr.length > 0) {
      return arr.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    }
    return profile.industry ? [profile.industry] : []
  })()

  const storefront = storefrontRes.storefront
  const listings = listingsRes.data || []

  // Get featured listings
  const featuredIds = storefront?.featured_listing_ids || []
  const featuredListings = listings.filter((l) => featuredIds.includes(l.id))
  const regularListings = listings.filter((l) => !featuredIds.includes(l.id))

  const initials =
    profile.full_name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'MG'

  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const name = profile.display_name || profile.full_name || 'Seller'
  const company = profile.company_name

  // JSON-LD Organization schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: company || name,
    description: profile.bio || `Industrial equipment seller on Metal Gear`,
    url: `${APP_URL}/sellers/${id}`,
    ...(profile.avatar_url ? { logo: profile.avatar_url } : {}),
    address: {
      '@type': 'PostalAddress',
      addressLocality: profile.location_city || 'Houston',
      addressRegion: profile.location_state || 'TX',
      addressCountry: 'US',
    },
    ...(reviewsData.totalReviews > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: reviewsData.averageRating,
            reviewCount: reviewsData.totalReviews,
          },
        }
      : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Cover grid — design-handoff_inner_pages/sellers/SellersShared.jsx */}
        <div className="relative">
          <div
            className="relative grid overflow-hidden rounded-2xl"
            style={{
              height: 280,
              gridTemplateColumns: '2fr 1fr 1fr',
              gridTemplateRows: '1fr 1fr',
              gap: 4,
              background: '#0A1628',
            }}
          >
            {/* Large left tile */}
            <div
              className="relative overflow-hidden"
              style={{
                gridRow: '1 / span 2',
                background: storefront?.banner_url
                  ? '#0A1628'
                  : 'linear-gradient(135deg, #1E3A8A 0%, #1877F2 60%, #3D9BD6 100%)',
              }}
            >
              {storefront?.banner_url ? (
                <img
                  src={storefront.banner_url}
                  alt={`${name}'s storefront banner`}
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <>
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18) 0%, transparent 60%)',
                    }}
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      backgroundImage:
                        'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 24px)',
                    }}
                  />
                </>
              )}
              {/* Cover chips */}
              <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 flex-wrap">
                <span
                  className="text-[10px] font-bold uppercase px-2 h-[22px] inline-flex items-center"
                  style={{
                    background: 'rgba(255,255,255,0.16)',
                    color: '#fff',
                    borderRadius: 4,
                    letterSpacing: '0.10em',
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  INDIVIDUAL · STOREFRONT
                </span>
                {profile.is_verified_dealer && (
                  <span
                    className="text-[10px] font-bold uppercase px-2 h-[22px] inline-flex items-center gap-1"
                    style={{
                      background: 'rgba(34,197,94,0.20)',
                      color: '#86EFAC',
                      borderRadius: 4,
                      letterSpacing: '0.10em',
                      fontFamily: 'var(--font-jetbrains-mono), monospace',
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    VERIFIED DEALER
                  </span>
                )}
              </div>
            </div>
            {/* Three gradient tiles on the right */}
            {[
              'linear-gradient(135deg, #155E75 0%, #0EA5E9 100%)',
              'linear-gradient(135deg, #831843 0%, #DB2777 100%)',
              'linear-gradient(135deg, #1F2937 0%, #4B5563 100%)',
            ].map((bg, i) => (
              <div
                key={i}
                className="relative overflow-hidden"
                style={{ background: bg }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 16px)',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Avatar overlay */}
          <div className="absolute -bottom-12 left-6">
            <Avatar className="size-24 border-4 border-background shadow-[0_8px_24px_rgba(11,37,69,0.18)]">
              <AvatarImage
                src={profile.avatar_url || undefined}
                crossOrigin="anonymous"
              />
              <AvatarFallback className="bg-primary/20 font-display text-2xl text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Profile Info */}
        <div className="pt-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-display text-3xl font-bold text-foreground">
                  {name}
                </h1>
                {profile.is_verified_dealer && (
                  <BadgeCheck className="size-6 text-secondary" />
                )}
              </div>

              {storefront?.tagline && (
                <p className="mt-1 font-body text-lg text-muted-foreground">
                  {storefront.tagline}
                </p>
              )}

              {company && (
                <p className="mt-2 flex items-center gap-1.5 font-body text-muted-foreground">
                  <Building2 className="size-4" />
                  {company}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-3">
                {(profile.location_city || profile.location_state) && (
                  <span className="flex items-center gap-1 font-body text-sm text-muted-foreground">
                    <MapPin className="size-3.5" />
                    {[profile.location_city, profile.location_state]
                      .filter(Boolean)
                      .join(', ')}
                  </span>
                )}
                {sellerIndustries.length > 0 && (
                  <span className="flex flex-wrap items-center gap-1.5 font-body text-sm text-muted-foreground">
                    <Briefcase className="size-3.5" />
                    {sellerIndustries.map((ind, i) => (
                      <Badge
                        key={`${ind}-${i}`}
                        variant="secondary"
                        className="font-body text-xs"
                      >
                        {ind}
                      </Badge>
                    ))}
                  </span>
                )}
                <span className="flex items-center gap-1 font-body text-sm text-muted-foreground">
                  <Calendar className="size-3.5" />
                  Member since {memberSince}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {profile.is_verified_dealer && (
                  <Badge className="bg-secondary/20 font-body text-xs text-secondary">
                    Verified Dealer
                  </Badge>
                )}
                {reviewsData.totalReviews > 0 && (
                  <Badge variant="outline" className="font-body text-xs">
                    <Star className="mr-1 size-3 fill-yellow-400 text-yellow-400" />
                    {reviewsData.averageRating} ({reviewsData.totalReviews})
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatBox icon={Package} label="Listings" value={stats.totalListings} />
          <StatBox
            icon={Star}
            label="Avg Rating"
            value={stats.avgRating > 0 ? stats.avgRating.toString() : 'N/A'}
          />
          <StatBox
            icon={MessageSquare}
            label="Reviews"
            value={stats.totalReviews}
          />
          <StatBox icon={Clock} label="Response" value={stats.avgResponseTime} />
          <StatBox icon={ShoppingCart} label="Sales" value={stats.totalSales} />
        </div>

        {/* Bio */}
        {profile.bio && (
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">About</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap font-body text-sm leading-relaxed text-muted-foreground">
                {profile.bio}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Featured Listings */}
        {featuredListings.length > 0 && (
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">
                Featured Listings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featuredListings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} featured />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* AI Reputation Summary */}
        {reviewsData.totalReviews > 0 && (
          <ReputationSummary sellerId={id} />
        )}

        {/* Reviews */}
        {reviewsData.totalReviews > 0 && (
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Star className="size-5 fill-yellow-400 text-yellow-400" />
                Reviews ({reviewsData.totalReviews})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="font-display text-3xl font-bold text-foreground">
                  {reviewsData.averageRating}
                </span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`size-5 ${
                        star <= Math.round(reviewsData.averageRating)
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-muted-foreground'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                {reviewsData.reviews.slice(0, 5).map(
                  (review: {
                    id: string
                    rating: number
                    comment: string | null
                    created_at: string
                    reviewer: {
                      full_name: string
                      display_name: string | null
                      avatar_url: string | null
                    } | null
                  }) => (
                    <div key={review.id} className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="size-8">
                          <AvatarImage
                            src={review.reviewer?.avatar_url || undefined}
                            crossOrigin="anonymous"
                          />
                          <AvatarFallback className="bg-primary/20 font-body text-xs text-primary">
                            {(
                              review.reviewer?.display_name ||
                              review.reviewer?.full_name ||
                              '?'
                            )
                              .split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-body text-sm font-medium text-foreground">
                            {review.reviewer?.display_name ||
                              review.reviewer?.full_name ||
                              'Anonymous'}
                          </p>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`size-3 ${
                                  star <= review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-muted-foreground'
                                }`}
                              />
                            ))}
                            <span className="ml-1 font-body text-[10px] text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString(
                                'en-US',
                                { month: 'short', day: 'numeric', year: 'numeric' }
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                      {review.comment && (
                        <p className="font-body text-sm text-muted-foreground">
                          {review.comment}
                        </p>
                      )}
                    </div>
                  )
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Listings */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              All Listings ({listings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {regularListings.length > 0 || featuredListings.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {(featuredListings.length > 0 ? regularListings : listings).map(
                  (listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  )
                )}
              </div>
            ) : (
              <p className="py-8 text-center font-body text-sm text-muted-foreground">
                No active listings yet.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function StatBox({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: number | string
}) {
  return (
    <Card className="bg-card">
      <CardContent className="flex flex-col items-center gap-1 p-4">
        <Icon className="size-5 text-primary" />
        <p className="font-display text-xl font-bold text-foreground">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="font-body text-[10px] text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

function ListingCard({
  listing,
  featured,
}: {
  listing: {
    id: string
    title: string
    category: string
    price_cents: number | null
    contact_for_price: boolean
    condition: string
    views_count: number
    favorites_count: number
    listing_images: { url: string; position: number }[] | null
  }
  featured?: boolean
}) {
  const image = listing.listing_images
    ?.sort((a, b) => a.position - b.position)[0]?.url

  return (
    <Link
      href={`/listings/${listing.id}`}
      className={`group overflow-hidden rounded-lg border transition-colors hover:border-primary/50 ${
        featured ? 'border-primary/30 bg-primary/5' : 'border-border bg-surface'
      }`}
    >
      <div className="aspect-[16/10] w-full overflow-hidden bg-card">
        {image ? (
          <img
            src={image}
            alt={listing.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="size-8 text-muted-foreground/40" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="truncate font-body text-sm font-medium text-foreground">
          {listing.title}
        </p>
        <p className="mt-0.5 font-body text-[10px] text-muted-foreground">
          {listing.category} &middot; {listing.condition.replace('_', ' ')}
        </p>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-display text-sm font-bold text-primary">
            {listing.contact_for_price
              ? 'Contact'
              : listing.price_cents
                ? `$${(listing.price_cents / 100).toLocaleString()}`
                : 'Free'}
          </span>
          <span className="flex items-center gap-2 font-body text-[10px] text-muted-foreground">
            <span>{listing.views_count} views</span>
            <span>{listing.favorites_count} favs</span>
          </span>
        </div>
        {featured && (
          <Badge className="mt-2 bg-primary/20 font-body text-[10px] text-primary">
            Featured
          </Badge>
        )}
      </div>
    </Link>
  )
}
