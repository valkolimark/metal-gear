import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getConditionReport } from '@/app/actions/condition-reports'
import { getSellerReviews } from '@/app/actions/reputation'
import { recordListingView } from '@/app/actions/analytics'
import { ListingGallery } from './components/ListingGallery'
import { ListingPurchasePanel } from './components/ListingPurchasePanel'
import { ListingSpecs } from './components/ListingSpecs'
import { AskMetalGear } from './components/AskMetalGear'
import { ListingReviews } from './components/ListingReviews'
import { ListingMainContent } from './components/ListingMainContent'
import { MobilePurchaseBar } from './components/MobilePurchaseBar'
import type { Tables } from '@/types/database'

type ListingImage = Tables<'listing_images'>
type ListingVideo = Tables<'listing_videos'>

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = createAdminClient()

  // Get session without redirecting on anon
  let currentUser = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    currentUser = user
  } catch {
    // Anonymous access — no user
  }

  // Fetch listing
  const { data: listing, error } = await admin
    .from('listings')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !listing) notFound()

  // Draft listings require auth
  if (listing.status === 'draft' && (!currentUser || currentUser.id !== listing.seller_id)) {
    notFound()
  }

  // Fetch all related data in parallel
  const [
    { data: images },
    { data: videos },
    { data: seller },
    conditionResult,
    reviewsResult,
    favoriteResult,
  ] = await Promise.all([
    admin
      .from('listing_images')
      .select('*')
      .eq('listing_id', id)
      .order('position'),
    admin
      .from('listing_videos')
      .select('*')
      .eq('listing_id', id)
      .order('position'),
    admin
      .from('profiles')
      .select('*')
      .eq('id', listing.seller_id)
      .single(),
    getConditionReport(id),
    getSellerReviews(listing.seller_id),
    currentUser
      ? admin
          .from('favorites')
          .select('id')
          .eq('user_id', currentUser.id)
          .eq('listing_id', id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  if (!seller) notFound()

  // Record view (fire and forget, server-side)
  recordListingView(id).catch(() => {})

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description || undefined,
    category: listing.category,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: listing.price_cents ? (listing.price_cents / 100).toFixed(2) : undefined,
      availability:
        listing.status === 'active'
          ? 'https://schema.org/InStock'
          : listing.status === 'sold'
            ? 'https://schema.org/SoldOut'
            : 'https://schema.org/OutOfStock',
      itemCondition:
        listing.condition === 'new'
          ? 'https://schema.org/NewCondition'
          : 'https://schema.org/UsedCondition',
    },
    ...(images && images.length > 0 ? { image: images.map((img) => img.url) } : {}),
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 pb-24 lg:pb-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb */}
      <nav className="mb-4 font-body text-sm text-muted-foreground">
        <a href="/search" className="hover:text-foreground transition-colors">Search</a>
        <span className="mx-2">/</span>
        <span className="text-foreground">{listing.title}</span>
      </nav>

      {/* Three-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[460px_1fr_320px] gap-x-8 items-start">
        {/* Col 1: Gallery */}
        <div>
          <ListingGallery
            images={(images ?? []) as ListingImage[]}
            videos={(videos ?? []) as ListingVideo[]}
            title={listing.title}
          />
        </div>

        {/* Col 2: Main content */}
        <div className="min-w-0 space-y-10 mt-6 lg:mt-0">
          <ListingMainContent listing={listing} seller={seller} />
          <ListingSpecs
            specs={listing.specifications as Record<string, string> | null}
            conditionReport={conditionResult.report as Parameters<typeof ListingSpecs>[0]['conditionReport'] ?? null}
          />
          <AskMetalGear listing={listing} currentUser={currentUser} />
          <ListingReviews
            reviews={reviewsResult.reviews ?? []}
            averageRating={reviewsResult.averageRating ?? 0}
            totalReviews={reviewsResult.totalReviews ?? 0}
            seller={seller}
          />
        </div>

        {/* Col 3: Sticky purchase panel (desktop only) */}
        <div className="hidden lg:block">
          <div className="sticky top-20">
            <ListingPurchasePanel
              listing={listing}
              seller={seller}
              currentUser={currentUser}
              isFavorited={!!favoriteResult.data}
            />
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar + purchase panel */}
      <MobilePurchaseBar
        listing={listing}
        seller={seller}
        currentUser={currentUser}
        isFavorited={!!favoriteResult.data}
      />
    </div>
  )
}
