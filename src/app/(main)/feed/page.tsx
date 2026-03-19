import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  getFeedForYouListings,
  getFeedActiveSOS,
  getFeedPriceDrops,
  getFeedSavedSearchMatches,
  getFeedDemandSignals,
} from '@/app/actions/feed'
import { getActiveTier } from '@/app/actions/tier'
import { FeedForYou } from './components/feed-for-you'
import { FeedSosSection } from './components/feed-sos-section'
import { FeedPriceDrops } from './components/feed-price-drops'
import { FeedSavedSearchSection } from './components/feed-saved-search-section'
import { FeedDemandSignals } from './components/feed-demand-signals'
import { FeedEmptyState } from './components/feed-empty-state'

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
  const hasAnyContent = forYou.hasInterests || activeSOS.length > 0

  if (!hasAnyContent) {
    return <FeedEmptyState />
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
