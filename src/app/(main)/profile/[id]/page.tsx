import { notFound } from 'next/navigation'
import { MapPin, Building2, Briefcase, Calendar, BadgeCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { TIER_LABELS } from '@/lib/constants'
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

  // Fetch user's active listings
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, category, price_cents, contact_for_price, condition, created_at')
    .eq('seller_id', id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(12)

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
            <AvatarImage src={profile.avatar_url || undefined} />
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
              {profile.industry && (
                <span className="flex items-center gap-1 font-body text-sm text-muted-foreground">
                  <Briefcase className="size-3.5" />
                  {profile.industry}
                </span>
              )}
              <span className="flex items-center gap-1 font-body text-sm text-muted-foreground">
                <Calendar className="size-3.5" />
                Member since {memberSince}
              </span>
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
            </div>
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
