import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import {
  MapPin,
  Building2,
  Briefcase,
  Calendar,
  BadgeCheck,
  Package,
  MessageSquare,
  ChevronRight,
  Share2,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { APP_URL } from '@/lib/constants'
import {
  TrustStripCard,
  ProfileTabsNav,
  CoverGrid,
  ActivityFeed,
  ListingsGridModule,
  type CoverChip,
  type ProfileTabSpec,
} from '@/components/profile-shared'
import { FollowButton } from '@/components/profile-shared/FollowButton'
import { ReputationSummary } from '@/components/reputation-summary'
import { SellerRecentReviews } from './components/SellerRecentReviews'
import { getSellerPageData, type SellerPageReview } from './data'
import type {
  ActivityEntry,
} from '@/components/profile-shared/types'
import type { ListingsGridModuleListing } from '@/components/profile-shared/ListingsGridModule'
import type { getSellerStats } from '@/app/actions/storefront'

const VALID_TABS = [
  'storefront',
  'listings',
  'services',
  'reviews',
  'about',
  'locations',
] as const
type TabId = (typeof VALID_TABS)[number]
const DEFAULT_TAB: TabId = 'storefront'

function normalizeTab(raw: string | undefined): TabId {
  return (VALID_TABS as readonly string[]).includes(raw ?? '')
    ? (raw as TabId)
    : DEFAULT_TAB
}

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
  const description =
    profile.bio?.slice(0, 160) ||
    `View ${name}'s storefront on Metal Gear — industrial equipment marketplace.`

  return {
    title: `${name}${company} | Metal Gear`,
    description,
    alternates: { canonical: `${APP_URL}/sellers/${id}` },
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
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab: rawTab } = await searchParams
  const tab = normalizeTab(rawTab)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const data = await getSellerPageData(id, user?.id ?? null)
  if (!data) notFound()

  const {
    profile,
    storefront,
    industries,
    coverPhotos,
    trustMetrics,
    listings,
    featuredListings,
    moreListings,
    totalListingsCount,
    reviewsRecent,
    reviewsTotal,
    reviewsAverage,
    ratingDistribution,
    activity,
    legacyStats,
    viewerIsOwner,
    viewerIsFollowing,
  } = data

  const name = profile.display_name || profile.full_name || 'Seller'
  const company = profile.company_name
  const initials =
    profile.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'MG'
  const memberSince = new Date(profile.created_at).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  const chips: CoverChip[] = [
    { label: 'INDIVIDUAL · STOREFRONT', variant: 'category' },
    ...(profile.is_verified_dealer
      ? [{ label: 'VERIFIED DEALER', variant: 'verified' as const }]
      : []),
  ]

  const tabs: ProfileTabSpec[] = [
    { id: 'storefront', label: 'Storefront' },
    { id: 'listings', label: 'Listings', count: totalListingsCount },
    // Services + Locations are placeholder tabs — surfaces still TBD
    // (Cycle 70). Disabling keeps the IA visible without surfacing fake counts.
    { id: 'services', label: 'Services', disabled: true },
    { id: 'reviews', label: 'Reviews', count: reviewsTotal },
    { id: 'about', label: 'About' },
    { id: 'locations', label: 'Locations', disabled: true },
  ]

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
    ...(reviewsTotal > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: reviewsAverage,
            reviewCount: reviewsTotal,
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

      <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav
          aria-label="Breadcrumb"
          className="hidden items-center gap-1.5 text-[12px] text-muted-foreground md:flex"
        >
          <Link href="/search" className="font-semibold hover:text-foreground">
            Sellers
          </Link>
          {industries[0] && (
            <>
              <ChevronRight className="size-3" />
              <Link
                href={`/search?industries=${encodeURIComponent(industries[0])}`}
                className="font-semibold hover:text-foreground"
              >
                {industries[0]}
              </Link>
            </>
          )}
          <ChevronRight className="size-3" />
          <span className="font-bold text-foreground">{name}</span>
        </nav>

        {/* Cover grid */}
        <div className="relative">
          <CoverGrid
            bannerUrl={storefront?.banner_url ?? null}
            photoUrls={coverPhotos}
            chips={chips}
            alt={`${name} storefront cover`}
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
            <div className="flex items-center gap-2">
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
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

          {!viewerIsOwner && (
            <div className="flex shrink-0 items-center gap-2 pb-3">
              <FollowButton
                sellerProfileId={profile.id}
                initialFollowing={viewerIsFollowing}
              />
              <Link
                href={`/messages?recipient=${profile.id}`}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-background px-4 text-[13px] font-bold text-foreground hover:bg-muted"
                style={{ border: '1px solid var(--border)' }}
              >
                <MessageSquare className="size-4" />
                Message
              </Link>
              <Link
                href={`/sos/create?seller=${profile.id}`}
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#FF6B2B] px-4 text-[13px] font-bold text-white hover:bg-[#E6541F]"
              >
                Send SOS
              </Link>
            </div>
          )}
          {viewerIsOwner && (
            <div className="flex shrink-0 items-center gap-2 pb-3">
              <Link
                href="/profile"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-background px-4 text-[13px] font-bold text-foreground hover:bg-muted"
                style={{ border: '1px solid var(--border)' }}
              >
                Edit storefront
              </Link>
              <button
                type="button"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-background px-4 text-[13px] font-bold text-foreground hover:bg-muted"
                style={{ border: '1px solid var(--border)' }}
              >
                <Share2 className="size-4" />
                Share
              </button>
            </div>
          )}
        </div>

        {/* Trust strip */}
        <TrustStripCard metrics={trustMetrics} variant="seller" />

        {/* Tab nav */}
        <ProfileTabsNav tabs={tabs} defaultTab={DEFAULT_TAB} />

        {/* Tab content */}
        {tab === 'storefront' && (
          <StorefrontTabContent
            sellerId={id}
            profileBio={profile.bio}
            industries={industries}
            featuredListings={featuredListings}
            moreListings={moreListings}
            totalListingsCount={totalListingsCount}
            reviewsRecent={reviewsRecent}
            reviewsTotal={reviewsTotal}
            reviewsAverage={reviewsAverage}
            ratingDistribution={ratingDistribution}
            activity={activity}
            legacyStats={legacyStats}
          />
        )}

        {tab === 'listings' && (
          <ListingsGridModule
            title="All listings"
            subtitle={`${totalListingsCount} active`}
            listings={listings}
            columns={4}
            emptyState="No active listings yet."
          />
        )}

        {tab === 'reviews' && (
          <SellerRecentReviews
            reviews={reviewsRecent}
            total={reviewsTotal}
            average={reviewsAverage}
            distribution={ratingDistribution}
          />
        )}

        {tab === 'about' && (
          <AboutTabContent
            bio={profile.bio}
            industries={industries}
            company={company}
            memberSince={memberSince}
            locationCity={profile.location_city}
            locationState={profile.location_state}
          />
        )}

        {(tab === 'services' || tab === 'locations') && (
          <PlaceholderTab tab={tab} />
        )}
      </div>
    </>
  )
}

function StorefrontTabContent({
  sellerId,
  profileBio,
  industries,
  featuredListings,
  moreListings,
  totalListingsCount,
  reviewsRecent,
  reviewsTotal,
  reviewsAverage,
  ratingDistribution,
  activity,
  legacyStats,
}: {
  sellerId: string
  profileBio: string | null
  industries: string[]
  featuredListings: ListingsGridModuleListing[]
  moreListings: ListingsGridModuleListing[]
  totalListingsCount: number
  reviewsRecent: SellerPageReview[]
  reviewsTotal: number
  reviewsAverage: number
  ratingDistribution: Record<number, number>
  activity: ActivityEntry[]
  legacyStats: Awaited<ReturnType<typeof getSellerStats>>
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-5">
        {/* About card */}
        <section className="rounded-2xl bg-card p-5 shadow-[0_1px_2px_rgba(11,37,69,0.04),0_4px_12px_rgba(11,37,69,0.05)]">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-[15px] font-bold tracking-tight text-foreground">
              About this seller
            </h3>
          </div>
          {profileBio ? (
            <p className="mt-3 text-[13.5px] leading-relaxed text-foreground/90">
              {profileBio}
            </p>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              This seller hasn&apos;t added a bio yet.
            </p>
          )}
          {industries.length > 0 && (
            <div className="mt-4">
              <div
                className="mb-1.5 text-[10.5px] font-bold uppercase tracking-[0.10em] text-muted-foreground"
                style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
              >
                Industries served
              </div>
              <div className="flex flex-wrap gap-1.5">
                {industries.map((ind, i) => (
                  <Badge key={`${ind}-${i}`} variant="secondary" className="text-xs">
                    {ind}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Featured listings */}
        {featuredListings.length > 0 && (
          <ListingsGridModule
            title="Featured listings"
            subtitle={`${featuredListings.length} of ${totalListingsCount}`}
            listings={featuredListings}
            columns={3}
            showFeaturedBadge
            seeAllHref={`/sellers/${sellerId}?tab=listings`}
            totalCount={totalListingsCount}
          />
        )}

        {/* More from this seller */}
        {moreListings.length > 0 && (
          <ListingsGridModule
            title="More from this seller"
            subtitle={`${moreListings.length} shown`}
            listings={moreListings.slice(0, 8)}
            columns={4}
            seeAllHref={`/sellers/${sellerId}?tab=listings`}
            totalCount={totalListingsCount}
          />
        )}

        {/* AI reputation summary (if reviews exist) */}
        {reviewsTotal > 0 && <ReputationSummary sellerId={sellerId} />}

        {/* Recent reviews */}
        <SellerRecentReviews
          reviews={reviewsRecent}
          total={reviewsTotal}
          average={reviewsAverage}
          distribution={ratingDistribution}
          seeAllHref={`/sellers/${sellerId}?tab=reviews`}
        />
      </div>

      <aside className="space-y-4">
        {/* SOS-orange emergency card */}
        <section className="overflow-hidden rounded-2xl bg-card shadow-[0_1px_2px_rgba(11,37,69,0.04),0_4px_12px_rgba(11,37,69,0.05)]">
          <div
            className="px-4 py-4"
            style={{
              background: 'linear-gradient(135deg, #FF6B2B 0%, #FB923C 100%)',
              color: '#fff',
            }}
          >
            <div
              className="text-[10.5px] font-bold uppercase"
              style={{
                letterSpacing: '0.10em',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              EMERGENCY?
            </div>
            <div className="mt-0.5 font-display text-[16px] font-bold">
              Send an SOS request
            </div>
            <div className="mt-1 text-[11.5px] leading-snug text-white/90">
              Responses tracked, response time {legacyStats.avgResponseTime ?? '—'}.
            </div>
            <Link
              href={`/sos/create?seller=${sellerId}`}
              className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-[#0A1628] text-[12.5px] font-bold text-white"
            >
              Open SOS form
            </Link>
          </div>
        </section>

        {/* Recent activity */}
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

        {/* Certifications placeholder — defer to Cycle 70 */}
        <section className="rounded-2xl bg-card p-5 shadow-[0_1px_2px_rgba(11,37,69,0.04),0_4px_12px_rgba(11,37,69,0.05)]">
          <h3 className="font-display text-[15px] font-bold tracking-tight text-foreground">
            Certifications
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Coming soon — verified business credentials and compliance badges.
          </p>
        </section>
      </aside>
    </div>
  )
}

function AboutTabContent({
  bio,
  industries,
  company,
  memberSince,
  locationCity,
  locationState,
}: {
  bio: string | null
  industries: string[]
  company: string | null
  memberSince: string
  locationCity: string | null
  locationState: string | null
}) {
  return (
    <section className="rounded-2xl bg-card p-6 shadow-[0_1px_2px_rgba(11,37,69,0.04),0_4px_12px_rgba(11,37,69,0.05)]">
      <h3 className="font-display text-[18px] font-bold tracking-tight text-foreground">
        About
      </h3>
      <div className="mt-4 space-y-4">
        {bio ? (
          <p className="text-[14px] leading-relaxed text-foreground/90">{bio}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No bio yet.</p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          {company && (
            <Field icon={<Building2 className="size-4" />} label="Company">
              {company}
            </Field>
          )}
          {(locationCity || locationState) && (
            <Field icon={<MapPin className="size-4" />} label="Location">
              {[locationCity, locationState].filter(Boolean).join(', ')}
            </Field>
          )}
          <Field icon={<Calendar className="size-4" />} label="Member since">
            {memberSince}
          </Field>
          {industries.length > 0 && (
            <Field icon={<Briefcase className="size-4" />} label="Industries">
              <span className="flex flex-wrap gap-1.5">
                {industries.map((ind, i) => (
                  <Badge key={`${ind}-${i}`} variant="secondary" className="text-xs">
                    {ind}
                  </Badge>
                ))}
              </span>
            </Field>
          )}
        </div>
      </div>
    </section>
  )
}

function Field({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div
        className="mb-1.5 inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
        style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
      >
        {icon}
        {label}
      </div>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  )
}

function PlaceholderTab({ tab }: { tab: 'services' | 'locations' }) {
  const meta: Record<'services' | 'locations', { title: string; copy: string; icon: React.ReactNode }> = {
    services: {
      title: 'Services',
      copy: 'Rebuilding, machining, transport, and rigging services will live here. Coming in Cycle 70.',
      icon: <Package className="size-5" />,
    },
    locations: {
      title: 'Locations',
      copy: 'Yards, branches, and service areas will live here. Coming in Cycle 70.',
      icon: <MapPin className="size-5" />,
    },
  }
  const { title, copy, icon } = meta[tab]
  return (
    <section className="rounded-2xl bg-card p-8 text-center shadow-[0_1px_2px_rgba(11,37,69,0.04),0_4px_12px_rgba(11,37,69,0.05)]">
      <div className="mx-auto inline-flex size-10 items-center justify-center rounded-full bg-muted">
        {icon}
      </div>
      <h3 className="mt-3 font-display text-[16px] font-bold text-foreground">
        {title}
      </h3>
      <p className="mt-2 text-sm text-muted-foreground">{copy}</p>
    </section>
  )
}

