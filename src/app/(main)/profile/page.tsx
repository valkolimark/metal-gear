import { redirect } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  TrustStripCard,
  ProfileTabsNav,
  CoverGrid,
  ActivityFeed,
  ListingsGridModule,
  type CoverChip,
  type ProfileTabSpec,
} from '@/components/profile-shared'
import { MapPin, Briefcase, Calendar, Building2 } from 'lucide-react'
import ProfileEditor from './components/ProfileEditor'
import { SellerRecentReviews } from '@/app/(main)/sellers/[id]/components/SellerRecentReviews'
import { getViewerProfilePageData } from './data'

const VALID_TABS = ['about', 'listings', 'posts', 'reviews', 'sos'] as const
type TabId = (typeof VALID_TABS)[number]
const DEFAULT_TAB: TabId = 'about'

function normalizeTab(raw: string | undefined): TabId {
  return (VALID_TABS as readonly string[]).includes(raw ?? '')
    ? (raw as TabId)
    : DEFAULT_TAB
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: rawTab } = await searchParams
  const tab = normalizeTab(rawTab)

  const data = await getViewerProfilePageData()
  if (!data) redirect('/login?next=/profile')

  const {
    userId,
    profile,
    industries,
    storefront,
    coverPhotos,
    trustMetrics,
    listings,
    totalListingsCount,
    reviews,
    reviewsTotal,
    reviewsAverage,
    ratingDistribution,
    sosResponsesCount,
    activity,
  } = data

  const displayName =
    profile.display_name || profile.full_name || 'Your profile'
  const initials =
    (profile.full_name || profile.display_name || 'MG')
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const chips: CoverChip[] = [
    { label: 'MEMBER · YOUR PROFILE', variant: 'category' },
    ...(profile.is_verified_dealer
      ? [{ label: 'ID + INSURANCE VERIFIED', variant: 'verified' as const }]
      : []),
  ]

  const tabs: ProfileTabSpec[] = [
    { id: 'about', label: 'About' },
    { id: 'listings', label: 'My listings', count: totalListingsCount },
    { id: 'posts', label: 'Posts', disabled: true },
    { id: 'reviews', label: 'Reviews', count: reviewsTotal },
    { id: 'sos', label: 'SOS history', count: sosResponsesCount },
  ]

  const sosActivity = activity.filter(
    (entry) =>
      entry.type === 'sos_responded' || entry.type === 'transaction_completed',
  )

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Cover hero */}
      <div className="relative">
        <CoverGrid
          bannerUrl={storefront?.banner_url ?? null}
          photoUrls={coverPhotos}
          chips={chips}
          editable
          editHref={`/sellers/${userId}`}
          alt={`${displayName} cover`}
        />
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

      {/* Identity row */}
      <div className="flex flex-col gap-4 pt-14 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            {displayName}
          </h1>
          {storefront?.tagline && (
            <p className="mt-1 font-body text-lg text-muted-foreground">
              {storefront.tagline}
            </p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {profile.company_name && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <Building2 className="size-3.5" />
                {profile.company_name}
              </span>
            )}
            {(profile.location_city || profile.location_state) && (
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5" />
                {[profile.location_city, profile.location_state]
                  .filter(Boolean)
                  .join(', ')}
              </span>
            )}
            {industries.length > 0 && (
              <span className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <Briefcase className="size-3.5" />
                {industries.slice(0, 3).map((ind, i) => (
                  <Badge
                    key={`${ind}-${i}`}
                    variant="secondary"
                    className="text-xs"
                  >
                    {ind}
                  </Badge>
                ))}
              </span>
            )}
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="size-3.5" />
              Member since {memberSince}
            </span>
          </div>
        </div>
      </div>

      {/* Trust strip */}
      <TrustStripCard metrics={trustMetrics} variant="profile-own" />

      {/* Tab nav */}
      <ProfileTabsNav tabs={tabs} defaultTab={DEFAULT_TAB} />

      {/* Tab content */}
      {tab === 'about' && (
        <div className="space-y-6">
          {/* Recent activity overview at top of About tab */}
          {activity.length > 0 && (
            <section className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(11,37,69,0.04),0_4px_12px_rgba(11,37,69,0.05)]">
              <header className="border-b border-border px-5 py-4">
                <h3 className="font-display text-[15px] font-bold tracking-tight text-foreground">
                  Recent activity
                </h3>
              </header>
              <div className="px-5 py-3">
                <ActivityFeed entries={activity} />
              </div>
            </section>
          )}

          {/* Compliance placeholder — defer to Cycle 70 */}
          <section className="rounded-2xl bg-card p-5 shadow-[0_1px_2px_rgba(11,37,69,0.04),0_4px_12px_rgba(11,37,69,0.05)]">
            <h3 className="font-display text-[15px] font-bold tracking-tight text-foreground">
              Certifications & compliance
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Coming soon — track your insurance, EIN, and trade certifications
              in one place.
            </p>
          </section>

          {/* Existing editor — settings live here for now */}
          <ProfileEditor />
        </div>
      )}

      {tab === 'listings' && (
        <ListingsGridModule
          title="My listings"
          subtitle={`${totalListingsCount} active`}
          listings={listings}
          columns={6}
          totalCount={totalListingsCount}
          seeAllHref="/listings"
          emptyState="No active listings yet. Create one to get started."
        />
      )}

      {tab === 'posts' && (
        <section className="rounded-2xl bg-card p-8 text-center shadow-[0_1px_2px_rgba(11,37,69,0.04),0_4px_12px_rgba(11,37,69,0.05)]">
          <h3 className="font-display text-[16px] font-bold text-foreground">
            Posts
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Your feed posts will appear here. Coming in Cycle 70.
          </p>
        </section>
      )}

      {tab === 'reviews' && (
        <SellerRecentReviews
          reviews={reviews.map((r) => ({
            id: r.id,
            rating: r.rating,
            comment: r.comment,
            created_at: r.created_at ?? new Date().toISOString(),
            reviewer: null,
          }))}
          total={reviewsTotal}
          average={reviewsAverage}
          distribution={ratingDistribution}
        />
      )}

      {tab === 'sos' && (
        <section className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(11,37,69,0.04),0_4px_12px_rgba(11,37,69,0.05)]">
          <header className="border-b border-border px-5 py-4">
            <h3 className="font-display text-[15px] font-bold tracking-tight text-foreground">
              SOS history
            </h3>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              {sosResponsesCount} SOS response{sosResponsesCount === 1 ? '' : 's'} lifetime
            </p>
          </header>
          <div className="px-5 py-3">
            <ActivityFeed
              entries={sosActivity}
              emptyState="No SOS responses yet."
            />
          </div>
        </section>
      )}
    </div>
  )
}
