import { notFound } from 'next/navigation'
import {
  MapPin,
  Building2,
  Briefcase,
  Calendar,
  BadgeCheck,
  Star,
  Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { TIER_LABELS } from '@/lib/constants'
import {
  getSellerReviews,
  getSellerResponseTime,
} from '@/app/actions/reputation'
import { Button } from '@/components/ui/button'
import { ReportButton } from './report-button'
import type { SubscriptionTier } from '@/lib/constants'

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .single()

  if (!profile) notFound()

  // Fetch listings, reviews, response time, business profile in parallel
  const [listingsRes, reviewsData, responseData, bizProfileRes] = await Promise.all([
    supabase
      .from('listings')
      .select(
        'id, title, category, price_cents, contact_for_price, condition, created_at'
      )
      .eq('seller_id', id)
      .eq('status', 'active')
      .eq('has_media', true)
      .order('created_at', { ascending: false })
      .limit(12),
    getSellerReviews(id),
    getSellerResponseTime(id),
    supabase
      .from('user_business_profiles')
      .select('industries')
      .eq('user_id', id)
      .maybeSingle(),
  ])

  const listings = listingsRes.data

  // Industries: prefer canonical array, fall back to legacy singleton.
  const sellerIndustries: string[] = (() => {
    const arr = (bizProfileRes.data as { industries?: string[] } | null)?.industries
    if (Array.isArray(arr) && arr.length > 0) {
      return arr.filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
    }
    return profile.industry ? [profile.industry] : []
  })()

  const initials =
    profile.full_name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'MG'

  const memberSince = new Date(profile.created_at).toLocaleDateString(
    'en-US',
    { month: 'long', year: 'numeric' }
  )

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Profile Header */}
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-start">
          <Avatar className="size-24">
            <AvatarImage
              src={profile.avatar_url || undefined}
              crossOrigin="anonymous"
            />
            <AvatarFallback className="bg-primary/20 font-display text-2xl text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <h1 className="font-display text-2xl font-bold text-foreground">
                {profile.display_name || profile.full_name || 'Anonymous'}
              </h1>
              {profile.is_verified_dealer && (
                <BadgeCheck className="size-5 text-secondary" />
              )}
            </div>

            {profile.company_name && (
              <p className="mt-1 flex items-center justify-center gap-1.5 font-body text-muted-foreground sm:justify-start">
                <Building2 className="size-4" />
                {profile.company_name}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-center gap-3 sm:justify-start">
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
              {responseData.responseTime && (
                <span className="flex items-center gap-1 font-body text-sm text-muted-foreground">
                  <Clock className="size-3.5" />
                  Usually responds {responseData.responseTime}
                </span>
              )}
            </div>

            <div className="mt-3 flex items-center justify-center gap-2 sm:justify-start">
              <Badge
                variant="outline"
                className="font-body text-xs capitalize"
              >
                {TIER_LABELS[profile.subscription_tier as SubscriptionTier]}
              </Badge>
              {profile.is_verified_dealer && (
                <Badge className="bg-secondary/20 font-body text-xs text-secondary">
                  Verified Dealer
                </Badge>
              )}
              {reviewsData.totalReviews > 0 && (
                <Badge
                  variant="outline"
                  className="font-body text-xs"
                >
                  <Star className="mr-1 size-3 fill-yellow-400 text-yellow-400" />
                  {reviewsData.averageRating} ({reviewsData.totalReviews})
                </Badge>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" asChild className="font-body">
              <a href={`/sellers/${id}`}>Visit Storefront</a>
            </Button>
            {/* Report button */}
            <ReportButton targetType="user" targetId={id} />
          </div>
        </CardContent>
      </Card>

      {/* Bio */}
      {profile.bio && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap font-body text-sm text-muted-foreground">
              {profile.bio}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Reviews */}
      {reviewsData.totalReviews > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Star className="size-5 fill-yellow-400 text-yellow-400" />
              Reviews ({reviewsData.totalReviews})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Rating summary */}
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
              <span className="font-body text-sm text-muted-foreground">
                {reviewsData.totalReviews} review
                {reviewsData.totalReviews !== 1 ? 's' : ''}
              </span>
            </div>

            <Separator />

            {/* Individual reviews */}
            <div className="space-y-4">
              {reviewsData.reviews.map(
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
                            {new Date(
                              review.created_at
                            ).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
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

      {/* Active Listings */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Active Listings ({listings?.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {listings && listings.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {listings.map((listing) => (
                <a
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-surface"
                >
                  <div>
                    <p className="font-body text-sm font-medium text-foreground">
                      {listing.title}
                    </p>
                    <p className="font-body text-xs text-muted-foreground">
                      {listing.category} &middot;{' '}
                      {listing.condition.replace('_', ' ')}
                    </p>
                  </div>
                  <p className="font-body text-sm font-semibold text-primary">
                    {listing.contact_for_price
                      ? 'Contact'
                      : listing.price_cents
                        ? `$${(listing.price_cents / 100).toLocaleString()}`
                        : 'Free'}
                  </p>
                </a>
              ))}
            </div>
          ) : (
            <p className="font-body text-sm text-muted-foreground">
              No active listings yet.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
