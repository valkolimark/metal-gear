import { notFound } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { getConditionReport } from '@/app/actions/condition-reports'
import { getSellerReviews } from '@/app/actions/reputation'
import { isListingInRadar } from '@/app/actions/radar'
import { recordListingView } from '@/app/actions/analytics'
import { getActiveTier } from '@/app/actions/tier'
import { getCreditBalance, getRevealedContacts } from '@/app/actions/credits'
import { JsonLd } from '@/components/json-ld'
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

  // Fetch company profile if listing has company_id
  const companyPromise = listing.company_id
    ? admin.from('company_profiles').select('*').eq('id', listing.company_id).maybeSingle()
    : Promise.resolve({ data: null })

  // Fetch all related data in parallel
  const [
    { data: images },
    { data: videos },
    { data: seller },
    { data: company },
    conditionResult,
    reviewsResult,
    radarResult,
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
    companyPromise,
    getConditionReport(id),
    getSellerReviews(listing.seller_id),
    currentUser
      ? isListingInRadar(currentUser.id, id)
      : Promise.resolve(false),
  ])

  if (!seller) notFound()

  // Compute seller contact visibility + credit state server-side
  const sellerVisibility = (seller as { contact_visibility?: string }).contact_visibility ?? 'pro_plus'
  const isSelf = currentUser?.id === seller.id

  let sellerContact: {
    canSee: boolean
    phone: string | null
    email: string | null
    visibility: string
    alreadyRevealed?: boolean
  } | null = null

  let creditBalance: {
    creditsRemaining: number
    creditsUsedThisMonth: number
    monthlyAllowance: number
    tier: string
  } | null = null

  if (sellerVisibility !== 'hidden') {
    let canSee = isSelf

    if (!canSee && currentUser && sellerVisibility === 'public') {
      canSee = true
    }

    let alreadyRevealed = false
    if (!canSee && currentUser && sellerVisibility === 'pro_plus') {
      // Check if already revealed this month
      const revealedContacts = await getRevealedContacts(currentUser.id)
      alreadyRevealed = revealedContacts.includes(seller.id)
      if (alreadyRevealed) canSee = true

      // Enterprise gets unlimited
      if (!canSee) {
        const viewerTier = await getActiveTier(currentUser.id)
        if (viewerTier === 'enterprise') canSee = true
      }
    }

    // Fetch credit balance for non-enterprise users who haven't revealed yet
    if (currentUser && !canSee && sellerVisibility === 'pro_plus') {
      const balance = await getCreditBalance(currentUser.id)
      if (balance) {
        creditBalance = {
          creditsRemaining: balance.creditsRemaining,
          creditsUsedThisMonth: balance.creditsUsedThisMonth,
          monthlyAllowance: balance.monthlyAllowance,
          tier: balance.tier,
        }
      }
    }

    const contactPhone = seller.phone || null
    const contactEmail = (seller as { contact_email?: string | null }).contact_email || null

    sellerContact = {
      canSee,
      phone: canSee ? contactPhone : null,
      email: canSee ? contactEmail : null,
      visibility: sellerVisibility,
      alreadyRevealed,
    }
  }

  // Record view (fire and forget, server-side)
  recordListingView(id).catch(() => {})

  const productSchema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description || undefined,
    sku: listing.id,
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
      url: `https://metal-gear-five.vercel.app/listings/${listing.id}`,
      seller: {
        '@type': 'Organization',
        name: company?.name ?? seller.company_name ?? seller.full_name ?? 'Metal Gear Seller',
      },
    },
    ...(images && images.length > 0 ? { image: images.map((img) => img.url) } : {}),
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 py-6 pb-24 lg:pb-6">
      <JsonLd data={productSchema} />

      {/* Breadcrumb */}
      <nav className="mb-4 font-body text-sm text-muted-foreground">
        <a href="/search" className="hover:text-foreground transition-colors">Search</a>
        <span className="mx-2">/</span>
        <span className="text-foreground">{listing.title}</span>
      </nav>

      {/* Seller warning: listing hidden due to no media */}
      {listing.status === 'active' && !listing.has_media && isSelf && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              This listing is hidden from search and browse
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Add at least one photo or video to make it visible to buyers.
            </p>
          </div>
          <Link
            href={`/listings/${listing.id}/edit?step=photos`}
            className="shrink-0 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
          >
            Add Photos
          </Link>
        </div>
      )}

      {/* Three-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[460px_1fr_320px] gap-x-8 items-start">
        {/* Col 1: Gallery + AskMetalGear (desktop) */}
        <div>
          <ListingGallery
            images={(images ?? []) as ListingImage[]}
            videos={(videos ?? []) as ListingVideo[]}
            title={listing.title}
          />
          <div className="hidden lg:block mt-4">
            <AskMetalGear listing={listing} currentUser={currentUser} />
          </div>
        </div>

        {/* Col 2: Main content */}
        <div className="min-w-0 space-y-10 mt-6 lg:mt-0">
          <ListingMainContent listing={listing} seller={seller} />
          <ListingSpecs
            specs={listing.specifications as Record<string, string> | null}
            conditionReport={conditionResult.report as Parameters<typeof ListingSpecs>[0]['conditionReport'] ?? null}
          />
          {/* Mobile: AskMetalGear below main content */}
          <div className="lg:hidden">
            <AskMetalGear listing={listing} currentUser={currentUser} />
          </div>
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
              isFavorited={!!radarResult}
              company={company}
              sellerContact={sellerContact}
              creditBalance={creditBalance}
            />
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom bar + purchase panel */}
      <MobilePurchaseBar
        listing={listing}
        seller={seller}
        currentUser={currentUser}
        isFavorited={!!radarResult}
        company={company}
        sellerContact={sellerContact}
        creditBalance={creditBalance}
      />
    </div>
  )
}
