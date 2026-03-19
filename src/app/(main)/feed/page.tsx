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
  getGeneralFeedListings,
  getGeneralFeedSOS,
  getGeneralFeedRecentListings,
} from '@/app/actions/feed'
import { getFeedPosts } from '@/app/actions/feed-posts'
import { getActiveTier } from '@/app/actions/tier'
import { FeedForYou } from './components/feed-for-you'
import { FeedSosSection } from './components/feed-sos-section'
import { FeedPriceDrops } from './components/feed-price-drops'
import { FeedSavedSearchSection } from './components/feed-saved-search-section'
import { FeedDemandSignals } from './components/feed-demand-signals'
import { FeedGeneral } from './components/feed-general'
import { FeedPageClient } from './FeedPageClient'

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

  // Parallel fetch: social posts + discovery data + user profile + company
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <FeedPageClient
        initialPosts={initialPostsResult.posts}
        initialNextCursor={initialPostsResult.nextCursor}
        currentUserId={user.id}
        currentUserName={profileResult.data?.display_name ?? 'User'}
        currentUserAvatar={profileResult.data?.avatar_url ?? null}
        activeCompanyId={companyResult.data?.id ?? null}
        activeCompanyName={companyResult.data?.name ?? null}
        activeCompanyLogo={companyResult.data?.logo_url ?? null}
        discoveryBlocks={discoveryBlocks}
      />
    </div>
  )
}
