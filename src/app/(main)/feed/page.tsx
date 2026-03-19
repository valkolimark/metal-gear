import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
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
import { getActiveTier } from '@/app/actions/tier'
import { FeedForYou } from './components/feed-for-you'
import { FeedSosSection } from './components/feed-sos-section'
import { FeedPriceDrops } from './components/feed-price-drops'
import { FeedSavedSearchSection } from './components/feed-saved-search-section'
import { FeedDemandSignals } from './components/feed-demand-signals'
import { FeedGeneral } from './components/feed-general'

export default async function FeedPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [forYou, activeSOS, priceDrops, savedSearchMatches, demandSignals, tier] =
    await Promise.all([
      getFeedForYouListings(user.id),
      getFeedActiveSOS(user.id),
      getFeedPriceDrops(user.id),
      getFeedSavedSearchMatches(user.id),
      getFeedDemandSignals(user.id),
      getActiveTier(user.id),
    ])

  const isPro = ['pro', 'business', 'enterprise', 'premium', 'boost'].includes(tier)

  // Check if we have any personalized content
  const hasPersonalized =
    (forYou.hasInterests && forYou.listings.length > 0) ||
    activeSOS.length > 0 ||
    priceDrops.length > 0 ||
    savedSearchMatches.listings.length > 0

  // If no personalized content, show the general feed
  if (!hasPersonalized) {
    const [generalListings, generalSOS, recentListings] = await Promise.all([
      getGeneralFeedListings(),
      getGeneralFeedSOS(),
      getGeneralFeedRecentListings(),
    ])

    return (
      <FeedGeneral
        listings={generalListings}
        sosList={generalSOS}
        recentListings={recentListings}
        hasInterests={forYou.hasInterests}
      />
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 space-y-10">
      <FeedForYou listings={forYou.listings} hasInterests={forYou.hasInterests} />
      {activeSOS.length > 0 && <FeedSosSection items={activeSOS} />}
      {priceDrops.length > 0 && <FeedPriceDrops items={priceDrops} />}
      {savedSearchMatches.listings.length > 0 && (
        <FeedSavedSearchSection
          listings={savedSearchMatches.listings}
          savedSearches={savedSearchMatches.savedSearches}
        />
      )}
      {isPro && demandSignals && <FeedDemandSignals data={demandSignals} />}
    </div>
  )
}
