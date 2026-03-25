import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  getFeedForYouListings,
  getFeedActiveSOS,
  getFeedPriceDrops,
  getFeedSavedSearchMatches,
  getFeedDemandSignals,
  getFeedSOSAlerts,
  getGeneralFeedListings,
  getGeneralFeedSOS,
  getGeneralFeedRecentListings,
} from '@/app/actions/feed'
import { getFeedPosts } from '@/app/actions/feed-posts'
import { getActiveTier } from '@/app/actions/tier'
import { getUserCompanies } from '@/app/actions/company'
import { FeedForYou } from './components/feed-for-you'
import { FeedSosSection } from './components/feed-sos-section'
import { FeedPriceDrops } from './components/feed-price-drops'
import { FeedSavedSearchSection } from './components/feed-saved-search-section'
import { FeedDemandSignals } from './components/feed-demand-signals'
import { FeedGeneral } from './components/feed-general'
import { FeedPageClient } from './FeedPageClient'
import { FeedLeftSidebar } from './components/FeedLeftSidebar'
import { FeedActiveSOSRow } from './components/FeedActiveSOSRow'
import { FeedRightSidebar } from './components/FeedRightSidebar'
import { FeedSOSBanner } from '@/components/feed/FeedSOSBanner'

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function FeedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Fetch active company from cookie
  const cookieStore = await cookies()
  const activeCompanyId = cookieStore.get('active_company_id')?.value ?? null

  // Parallel fetch: social posts + discovery data + user profile + company + sidebar data
  const [
    initialPostsResult,
    forYou,
    activeSOS,
    priceDrops,
    savedSearchMatches,
    demandSignals,
    tier,
    profileResult,
    companyResult,
    sosAlerts,
    userCompanies,
    unreadResult,
  ] = await Promise.all([
    getFeedPosts(user.id, { filter: 'all', limit: 10 }),
    getFeedForYouListings(user.id),
    getFeedActiveSOS(user.id),
    getFeedPriceDrops(user.id),
    getFeedSavedSearchMatches(user.id),
    getFeedDemandSignals(user.id),
    getActiveTier(user.id),
    admin
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', user.id)
      .single(),
    activeCompanyId
      ? admin
          .from('company_profiles')
          .select('id, name, slug, logo_url')
          .eq('id', activeCompanyId)
          .single()
      : Promise.resolve({ data: null }),
    getFeedSOSAlerts(user.id),
    getUserCompanies(user.id),
    // Unread messages count
    (async () => {
      const { data: userConvs } = await admin
        .from('conversations')
        .select('id')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      const convIds = (userConvs ?? []).map((c: { id: string }) => c.id)
      if (convIds.length === 0) return 0
      const { count } = await admin
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .neq('sender_id', user.id)
        .is('read_at', null)
      return count ?? 0
    })(),
  ])

  const isPro = ['pro', 'business', 'enterprise', 'premium', 'boost'].includes(tier)

  // Build discovery blocks as React elements
  const discoveryBlocks: React.ReactNode[] = []

  const hasPersonalized =
    (forYou.hasInterests && forYou.listings.length > 0) ||
    activeSOS.length > 0 ||
    priceDrops.length > 0 ||
    savedSearchMatches.listings.length > 0

  if (hasPersonalized) {
    if (forYou.hasInterests && forYou.listings.length > 0) {
      discoveryBlocks.push(
        <FeedForYou key="for-you" listings={forYou.listings} hasInterests={forYou.hasInterests} />
      )
    }
    if (activeSOS.length > 0) {
      discoveryBlocks.push(<FeedSosSection key="sos" items={activeSOS} />)
    }
    if (priceDrops.length > 0) {
      discoveryBlocks.push(<FeedPriceDrops key="drops" items={priceDrops} />)
    }
    if (savedSearchMatches.listings.length > 0) {
      discoveryBlocks.push(
        <FeedSavedSearchSection
          key="saved"
          listings={savedSearchMatches.listings}
          savedSearches={savedSearchMatches.savedSearches}
        />
      )
    }
    if (isPro && demandSignals) {
      discoveryBlocks.push(<FeedDemandSignals key="demand" data={demandSignals} />)
    }
  } else {
    // General feed fallback for discovery blocks
    const [generalListings, generalSOS, recentListings] = await Promise.all([
      getGeneralFeedListings(),
      getGeneralFeedSOS(),
      getGeneralFeedRecentListings(),
    ])

    discoveryBlocks.push(
      <FeedGeneral
        key="general"
        listings={generalListings}
        sosList={generalSOS}
        recentListings={recentListings}
        hasInterests={forYou.hasInterests}
      />
    )
  }

  // Prepare active company data for sidebar
  const activeCompanyData = companyResult.data
    ? {
        id: companyResult.data.id,
        name: companyResult.data.name,
        slug: companyResult.data.slug,
        logo_url: companyResult.data.logo_url,
      }
    : null

  // Map userCompanies to sidebar format
  const sidebarCompanies = userCompanies.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    logo_url: c.logo_url,
  }))

  return (
    <div className="flex min-h-screen">
      {/* Left sidebar — desktop xl only */}
      <FeedLeftSidebar
        profile={profileResult.data}
        activeCompany={activeCompanyData}
        userCompanies={sidebarCompanies}
        unreadCount={unreadResult}
        userId={user.id}
        className="hidden xl:flex"
      />

      {/* Center + Right wrapper */}
      <div className="flex flex-1 justify-center gap-6 px-4 py-4 xl:pl-0">
        {/* Center column */}
        <main className="w-full max-w-[680px] min-w-0">
          {/* SOS banner — mobile only, dismissible */}
          <FeedSOSBanner />

          {/* Active SOS row above composer — desktop only */}
          <div className="hidden md:block">
            <FeedActiveSOSRow activeSOS={activeSOS} hasInterests={forYou.hasInterests} />
          </div>

          <FeedPageClient
            initialPosts={initialPostsResult.posts}
            initialNextCursor={initialPostsResult.nextCursor}
            currentUserId={user.id}
            currentUserName={profileResult.data?.display_name ?? 'User'}
            currentUserAvatar={profileResult.data?.avatar_url ?? null}
            activeCompanyId={companyResult.data?.id ?? null}
            activeCompanyName={companyResult.data?.name ?? null}
            activeCompanyLogo={companyResult.data?.logo_url ?? null}
            activeCompanySlug={companyResult.data?.slug ?? null}
            discoveryBlocks={discoveryBlocks}
          />
        </main>

        {/* Right sidebar — lg and up */}
        <FeedRightSidebar
          sosAlerts={sosAlerts}
          discoveryListings={forYou.listings.slice(0, 5)}
          className="hidden lg:flex lg:flex-col"
        />
      </div>
    </div>
  )
}
