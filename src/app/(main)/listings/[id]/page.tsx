'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Share2,
  Edit,
  MapPin,
  Eye,
  MessageSquare,
  Loader2,
  Calendar,
  QrCode,
  DollarSign,
  Check,
  X,
  ArrowLeftRight,
  Bell,
  BellOff,
  TrendingDown,
  ClipboardCheck,
  ChevronDown,
  ShieldCheck,
  FolderPlus,
  Plus,
  CalendarDays,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'
import { startConversation } from '@/app/(main)/messages/actions'
import { recordListingView } from '@/app/actions/analytics'
import { getConditionReport } from '@/app/actions/condition-reports'
import {
  makeOffer,
  getListingOffers,
  respondToOffer,
  respondToCounter,
  withdrawOffer,
} from '@/app/actions/offers'
import { togglePriceWatch, getPriceWatch, getPriceHistory, setPriceAlert } from '@/app/actions/compare'
import {
  getListingCollections,
  addToCollection,
  removeFromCollection,
  createCollection,
} from '@/app/actions/collections'
import { requestViewing, getSellerAvailability } from '@/app/actions/scheduling'
import { getRelatedListings, getMoreFromSeller, getBuyersAlsoViewed, recordViewSession } from '@/app/actions/related'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth-store'
import { APP_URL } from '@/lib/constants'
import { OfferCoach } from '@/components/listings/OfferCoach'
import type { Tables } from '@/types/database'

type Listing = Tables<'listings'>
type ListingImage = Tables<'listing_images'>
type ListingVideo = Tables<'listing_videos'>
type Profile = Tables<'profiles'>

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()

  const [listing, setListing] = useState<Listing | null>(null)
  const [images, setImages] = useState<ListingImage[]>([])
  const [seller, setSeller] = useState<Profile | null>(null)
  const [videos, setVideos] = useState<ListingVideo[]>([])
  const [similar, setSimilar] = useState<Listing[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [relatedListings, setRelatedListings] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [moreFromSeller, setMoreFromSeller] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [alsoViewed, setAlsoViewed] = useState<any[]>([])
  const [isFavorited, setIsFavorited] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentImage, setCurrentImage] = useState(0)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [offerDialogOpen, setOfferDialogOpen] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerMessage, setOfferMessage] = useState('')
  const [submittingOffer, setSubmittingOffer] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [offers, setOffers] = useState<any[]>([])
  const [isSeller, setIsSeller] = useState(false)
  const [counterAmount, setCounterAmount] = useState('')
  const [counterMessage, setCounterMessage] = useState('')
  const [counteringOfferId, setCounteringOfferId] = useState<string | null>(null)
  const [isWatching, setIsWatching] = useState(false)
  const [watchLoading, setWatchLoading] = useState(false)
  const [priceAlertOpen, setPriceAlertOpen] = useState(false)
  const [targetPrice, setTargetPrice] = useState('')
  const [targetPriceCents, setTargetPriceCents] = useState<number | null>(null)
  const [settingAlert, setSettingAlert] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [priceHistory, setPriceHistory] = useState<any[]>([])
   
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [conditionReport, setConditionReport] = useState<any>(null)
  const [reportExpanded, setReportExpanded] = useState(false)
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(false)
  const [userCollections, setUserCollections] = useState<
    { id: string; name: string; hasListing: boolean }[]
  >([])
  const [newCollectionName, setNewCollectionName] = useState('')
  const [viewingDialogOpen, setViewingDialogOpen] = useState(false)
  const [viewingDate, setViewingDate] = useState('')
  const [viewingTime, setViewingTime] = useState('10:00')
  const [viewingMessage, setViewingMessage] = useState('')
  const [submittingViewing, setSubmittingViewing] = useState(false)
  const [sellerHasAvailability, setSellerHasAvailability] = useState(false)

  // Touch swipe state for image gallery
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)
  const galleryRef = useRef<HTMLDivElement>(null)

  const handleSwipe = useCallback(() => {
    const diff = touchStartX.current - touchEndX.current
    const threshold = 50
    if (Math.abs(diff) < threshold) return
    if (diff > 0) {
      // Swiped left → next
      setCurrentImage((p) => (p === images.length - 1 ? 0 : p + 1))
    } else {
      // Swiped right → prev
      setCurrentImage((p) => (p === 0 ? images.length - 1 : p - 1))
    }
  }, [images.length])

  const isOwner = user?.id === listing?.seller_id

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      // Fetch listing
      const { data: listingData, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !listingData) {
        toast.error('Listing not found')
        router.push('/listings')
        return
      }

      setListing(listingData)

      // Fetch images, videos, seller, favorite status, similar in parallel
      const [imagesRes, videosRes, sellerRes, favRes, similarRes] = await Promise.all([
        supabase
          .from('listing_images')
          .select('*')
          .eq('listing_id', id)
          .order('position'),
        supabase
          .from('listing_videos')
          .select('*')
          .eq('listing_id', id)
          .order('position'),
        supabase
          .from('profiles')
          .select('*')
          .eq('id', listingData.seller_id)
          .single(),
        user
          ? supabase
              .from('favorites')
              .select('id')
              .eq('user_id', user.id)
              .eq('listing_id', id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from('listings')
          .select('*')
          .eq('category', listingData.category)
          .eq('status', 'active')
          .neq('id', id)
          .limit(4),
      ])

      setImages(imagesRes.data ?? [])
      setVideos((videosRes.data ?? []) as ListingVideo[])
      setSeller(sellerRes.data)
      setIsFavorited(!!favRes.data)
      setSimilar((similarRes.data ?? []) as Listing[])

      // Record view event (fire and forget)
      recordListingView(id).catch(console.error)

      // Load offers
      if (user) {
        getListingOffers(id).then((result) => {
          if ('offers' in result) {
            setOffers(result.offers ?? [])
            setIsSeller(result.isSeller ?? false)
          }
        })
        // Load price watch status
        getPriceWatch(id).then((result) => {
          setIsWatching(result.watching ?? false)
          if (result.targetPriceCents) {
            setTargetPriceCents(result.targetPriceCents)
            setTargetPrice(String(result.targetPriceCents / 100))
          }
        })
      }

      // Load price history
      getPriceHistory(id).then((result) => {
        if ('history' in result) {
          setPriceHistory(result.history ?? [])
        }
      })

      // Load condition report
      getConditionReport(id).then((result) => {
        if (result.report) setConditionReport(result.report)
      })

      // Check if seller has availability set
      getSellerAvailability(listingData.seller_id).then((result) => {
        if (result.slots.length > 0) setSellerHasAvailability(true)
      })

      // Load user collections
      if (user) {
        getListingCollections(id).then((result) => {
          if ('collections' in result) {
            setUserCollections(result.collections ?? [])
          }
        })
      }

      // Load related listings (async, non-blocking)
      getRelatedListings(id).then((result) => {
        setRelatedListings(result.listings ?? [])
      })
      getMoreFromSeller(listingData.seller_id, id).then((result) => {
        setMoreFromSeller(result.listings ?? [])
      })
      getBuyersAlsoViewed(id).then((result) => {
        setAlsoViewed(result.listings ?? [])
      })

      // Record view session for co-view analysis
      const sessionId = sessionStorage.getItem('mg_session') || `s_${Date.now()}_${Math.random().toString(36).slice(2)}`
      sessionStorage.setItem('mg_session', sessionId)
      recordViewSession(id, sessionId).catch(console.error)

      setLoading(false)
    }

    load()
  }, [id, user, router, isOwner])

  async function toggleFavorite() {
    if (!user || !listing) {
      toast.error('Sign in to save favorites')
      return
    }

    const supabase = createClient()

    if (isFavorited) {
      await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', listing.id)
      setIsFavorited(false)
      toast.success('Removed from favorites')
    } else {
      await supabase
        .from('favorites')
        .insert({ user_id: user.id, listing_id: listing.id })
      setIsFavorited(true)
      toast.success('Added to favorites')
    }
  }

  function getShareUrl() {
    return `${APP_URL}/listings/${id}`
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(getShareUrl())
    toast.success('Link copied to clipboard')
  }

  function shareToFacebook() {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(getShareUrl())}`,
      '_blank'
    )
  }

  function shareToLinkedIn() {
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getShareUrl())}`,
      '_blank'
    )
  }

  function shareToTwitter() {
    const text = listing
      ? `Check out ${listing.title} on Metal Gear`
      : 'Check this out on Metal Gear'
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(getShareUrl())}`,
      '_blank'
    )
  }

  async function handleContact() {
    if (!user || !listing) return

    const result = await startConversation(listing.id)

    if (result.error) {
      toast.error(result.error)
      if (result.error.includes('limit')) router.push('/pricing')
      return
    }

    if (result.conversationId) {
      router.push(`/messages?conversation=${result.conversationId}`)
    }
  }

  async function handleMakeOffer() {
    if (!user || !listing) return
    const cents = Math.round(parseFloat(offerAmount) * 100)
    if (isNaN(cents) || cents <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setSubmittingOffer(true)
    const result = await makeOffer(listing.id, cents, offerMessage)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Offer submitted!')
      setOfferDialogOpen(false)
      setOfferAmount('')
      setOfferMessage('')
      // Reload offers
      const updated = await getListingOffers(listing.id)
      if ('offers' in updated) setOffers(updated.offers ?? [])
    }
    setSubmittingOffer(false)
  }

  async function handleOfferAction(offerId: string, action: 'accept' | 'reject' | 'counter') {
    if (action === 'counter') {
      setCounteringOfferId(offerId)
      return
    }
    const result = await respondToOffer(offerId, action)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success(`Offer ${action === 'accept' ? 'accepted' : 'declined'}`)
      if (listing) {
        const updated = await getListingOffers(listing.id)
        if ('offers' in updated) setOffers(updated.offers ?? [])
      }
    }
  }

  async function handleSubmitCounter() {
    if (!counteringOfferId) return
    const cents = Math.round(parseFloat(counterAmount) * 100)
    if (isNaN(cents) || cents <= 0) {
      toast.error('Enter a valid counter amount')
      return
    }
    const result = await respondToOffer(counteringOfferId, 'counter', cents, counterMessage)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Counter-offer sent')
      setCounteringOfferId(null)
      setCounterAmount('')
      setCounterMessage('')
      if (listing) {
        const updated = await getListingOffers(listing.id)
        if ('offers' in updated) setOffers(updated.offers ?? [])
      }
    }
  }

  async function handleCounterResponse(offerId: string, action: 'accept' | 'reject') {
    const result = await respondToCounter(offerId, action)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success(action === 'accept' ? 'Counter-offer accepted!' : 'Counter-offer declined')
      if (listing) {
        const updated = await getListingOffers(listing.id)
        if ('offers' in updated) setOffers(updated.offers ?? [])
      }
    }
  }

  async function handleWithdrawOffer(offerId: string) {
    const result = await withdrawOffer(offerId)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Offer withdrawn')
      if (listing) {
        const updated = await getListingOffers(listing.id)
        if ('offers' in updated) setOffers(updated.offers ?? [])
      }
    }
  }

  async function handleTogglePriceWatch() {
    if (!user || !listing) {
      toast.error('Sign in to watch prices')
      return
    }
    setWatchLoading(true)
    const result = await togglePriceWatch(listing.id)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      setIsWatching(result.watching ?? false)
      toast.success(result.watching ? 'Price watch enabled' : 'Price watch removed')
    }
    setWatchLoading(false)
  }

  async function handleSetPriceAlert() {
    if (!user || !listing) return
    setSettingAlert(true)
    const cents = targetPrice ? Math.round(parseFloat(targetPrice) * 100) : null
    const result = await setPriceAlert(listing.id, cents)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      setTargetPriceCents(cents)
      if (result.watching) setIsWatching(true)
      toast.success(cents ? `Price alert set for $${parseFloat(targetPrice).toLocaleString()}` : 'Target price removed')
      setPriceAlertOpen(false)
    }
    setSettingAlert(false)
  }

  async function handleCollectionToggle(collectionId: string, hasListing: boolean) {
    if (!listing) return
    if (hasListing) {
      const result = await removeFromCollection(collectionId, listing.id)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
    } else {
      const result = await addToCollection(collectionId, listing.id)
      if ('error' in result) {
        toast.error(result.error)
        return
      }
    }
    setUserCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId ? { ...c, hasListing: !hasListing } : c
      )
    )
    toast.success(hasListing ? 'Removed from collection' : 'Added to collection')
  }

  async function handleRequestViewing() {
    if (!listing || !viewingDate || !viewingTime) return
    setSubmittingViewing(true)
    const datetime = `${viewingDate}T${viewingTime}:00`
    const result = await requestViewing(listing.id, datetime, viewingMessage || undefined)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Viewing request sent!')
      setViewingDialogOpen(false)
      setViewingDate('')
      setViewingTime('10:00')
      setViewingMessage('')
    }
    setSubmittingViewing(false)
  }

  async function handleQuickCreateCollection() {
    if (!newCollectionName.trim() || !listing) return
    const result = await createCollection(newCollectionName.trim())
    if ('error' in result) {
      toast.error(result.error)
      return
    }
    // Add listing to new collection
    if (result.collection) {
      await addToCollection(result.collection.id, listing.id)
      setUserCollections((prev) => [
        ...prev,
        { id: result.collection.id, name: newCollectionName.trim(), hasListing: true },
      ])
    }
    setNewCollectionName('')
    toast.success('Collection created & listing added')
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!listing) return null

  const conditionLabel = listing.condition.replace('_', ' ')
  const formattedDate = new Date(listing.created_at).toLocaleDateString(
    'en-US',
    { month: 'long', day: 'numeric', year: 'numeric' }
  )

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
      availability: listing.status === 'active'
        ? 'https://schema.org/InStock'
        : listing.status === 'sold'
          ? 'https://schema.org/SoldOut'
          : 'https://schema.org/OutOfStock',
      itemCondition: listing.condition === 'new'
        ? 'https://schema.org/NewCondition'
        : 'https://schema.org/UsedCondition',
    },
    ...(images.length > 0 ? { image: images.map((img) => img.url) } : {}),
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Photo Gallery */}
      {images.length > 0 ? (
        <div
          ref={galleryRef}
          className="relative overflow-hidden rounded-xl touch-pan-y"
          onTouchStart={(e) => {
            touchStartX.current = e.changedTouches[0].screenX
          }}
          onTouchEnd={(e) => {
            touchEndX.current = e.changedTouches[0].screenX
            handleSwipe()
          }}
        >
          <div className="relative aspect-[16/9] sm:aspect-[2/1]">
            <Image
              src={images[currentImage]?.url}
              alt={listing.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
              priority
            />
          </div>
          {images.length > 1 && (
            <>
              <button
                onClick={() =>
                  setCurrentImage((p) =>
                    p === 0 ? images.length - 1 : p - 1
                  )
                }
                className="absolute left-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                onClick={() =>
                  setCurrentImage((p) =>
                    p === images.length - 1 ? 0 : p + 1
                  )
                }
                className="absolute right-3 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
              >
                <ChevronRight className="size-5" />
              </button>
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImage(i)}
                    className={`size-2 rounded-full transition-colors ${
                      i === currentImage ? 'bg-white' : 'bg-white/40'
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex aspect-[16/9] items-center justify-center rounded-xl bg-surface sm:aspect-[2/1]">
          <p className="font-body text-muted-foreground">No photos</p>
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Videos ({videos.length})
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {videos.map((vid) => (
              <div key={vid.id} className="overflow-hidden rounded-xl border border-border">
                <video
                  src={vid.url}
                  controls
                  preload="metadata"
                  className="aspect-video w-full bg-black"
                >
                  Your browser does not support video playback.
                </video>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Title & badges */}
          <div>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                {listing.title}
              </h1>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleFavorite}
                  className={isFavorited ? 'text-red-500' : ''}
                >
                  <Heart
                    className={`size-4 ${isFavorited ? 'fill-current' : ''}`}
                  />
                </Button>
                {user && !isOwner && (
                  <DropdownMenu open={collectionMenuOpen} onOpenChange={setCollectionMenuOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" title="Add to collection">
                        <FolderPlus className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {userCollections.length > 0 && (
                        <>
                          {userCollections.map((col) => (
                            <DropdownMenuItem
                              key={col.id}
                              onClick={() => handleCollectionToggle(col.id, col.hasListing)}
                              className="font-body"
                            >
                              <Check
                                className={`mr-2 size-3.5 ${
                                  col.hasListing ? 'opacity-100' : 'opacity-0'
                                }`}
                              />
                              {col.name}
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
                      <div className="border-t border-border p-2">
                        <div className="flex gap-1">
                          <Input
                            value={newCollectionName}
                            onChange={(e) => setNewCollectionName(e.target.value)}
                            placeholder="New collection..."
                            className="h-8 font-body text-xs"
                            onKeyDown={(e) => {
                              e.stopPropagation()
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleQuickCreateCollection()
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Button
                            size="sm"
                            className="h-8 px-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleQuickCreateCollection()
                            }}
                            disabled={!newCollectionName.trim()}
                          >
                            <Plus className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Share2 className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCopyLink} className="font-body">
                      Copy Link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={shareToFacebook} className="font-body">
                      Share on Facebook
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={shareToLinkedIn} className="font-body">
                      Share on LinkedIn
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={shareToTwitter} className="font-body">
                      Share on X/Twitter
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setQrDialogOpen(true)} className="font-body">
                      <QrCode className="mr-2 size-4" />
                      QR Code
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {isOwner && (
                  <Button variant="outline" size="icon" asChild>
                    <Link href={`/listings/${listing.id}/edit`}>
                      <Edit className="size-4" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>

            <p className="mt-2 font-display text-2xl font-bold text-primary">
              {listing.contact_for_price
                ? 'Contact for Price'
                : listing.price_cents
                  ? `$${(listing.price_cents / 100).toLocaleString()}`
                  : 'Free'}
              {listing.negotiable && !listing.contact_for_price && (
                <span className="ml-2 font-body text-sm font-normal text-muted-foreground">
                  (Negotiable)
                </span>
              )}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline" className="font-body">
                {listing.category}
              </Badge>
              {listing.industry && (
                <Badge variant="outline" className="font-body">
                  {listing.industry}
                </Badge>
              )}
              <Badge variant="outline" className="font-body capitalize">
                {conditionLabel}
              </Badge>
              <Badge
                variant="outline"
                className={`font-body ${
                  listing.status === 'active'
                    ? 'border-green-500/50 text-green-400'
                    : ''
                }`}
              >
                {listing.status}
              </Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-4 font-body text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" />
                {listing.location_city}, {listing.location_state}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="size-3.5" />
                {listing.views_count} views
              </span>
              <span className="flex items-center gap-1">
                <Heart className="size-3.5" />
                {listing.favorites_count} favorites
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Description */}
          {listing.description && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="font-display text-lg">
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap font-body text-sm text-muted-foreground">
                  {listing.description}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Specifications */}
          {listing.specifications &&
            Object.keys(listing.specifications as Record<string, string>).length > 0 && (
              <Card className="border-border bg-card">
                <CardHeader>
                  <CardTitle className="font-display text-lg">
                    Specifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {Object.entries(
                      listing.specifications as Record<string, string>
                    ).map(([k, v]) => (
                      <div key={k}>
                        <dt className="font-body text-xs text-muted-foreground">
                          {k}
                        </dt>
                        <dd className="font-body text-sm font-medium text-foreground">
                          {v}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </CardContent>
              </Card>
            )}

          {/* Inspection Report */}
          {conditionReport && (
            <Card className="border-border bg-card">
              <CardHeader>
                <button
                  onClick={() => setReportExpanded(!reportExpanded)}
                  className="flex w-full items-center justify-between"
                >
                  <CardTitle className="flex items-center gap-2 font-display text-lg">
                    <ClipboardCheck className="size-5 text-primary" />
                    Inspection Report
                    <Badge
                      className={`ml-1 font-display text-sm ${
                        conditionReport.overall_grade === 'A'
                          ? 'bg-green-500/20 text-green-400'
                          : conditionReport.overall_grade === 'B'
                            ? 'bg-blue-500/20 text-blue-400'
                            : conditionReport.overall_grade === 'C'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : conditionReport.overall_grade === 'D'
                                ? 'bg-orange-500/20 text-orange-400'
                                : 'bg-red-500/20 text-red-400'
                      }`}
                    >
                      Grade {conditionReport.overall_grade}
                    </Badge>
                    {conditionReport.creator?.is_verified && (
                      <Badge variant="outline" className="gap-1 border-green-500/50 font-body text-[10px] text-green-400">
                        <ShieldCheck className="size-3" />
                        Verified Inspection
                      </Badge>
                    )}
                  </CardTitle>
                  <ChevronDown
                    className={`size-5 text-muted-foreground transition-transform ${
                      reportExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </CardHeader>
              {reportExpanded && (
                <CardContent className="space-y-4">
                  {/* Scores */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Mechanical', score: conditionReport.mechanical_score },
                      { label: 'Cosmetic', score: conditionReport.cosmetic_score },
                      { label: 'Electrical', score: conditionReport.electrical_score },
                    ].map(({ label, score }) => (
                      <div key={label} className="text-center">
                        <p className="font-body text-xs text-muted-foreground">{label}</p>
                        <p className={`font-display text-2xl font-bold ${
                          score >= 8 ? 'text-green-400' : score >= 5 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {score}/10
                        </p>
                        <div className="mx-auto mt-1 h-1.5 w-full rounded-full bg-surface">
                          <div
                            className={`h-1.5 rounded-full ${
                              score >= 8 ? 'bg-green-500' : score >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${score * 10}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Separator />

                  {/* Details */}
                  <div className="grid grid-cols-2 gap-3">
                    {conditionReport.hours_of_use != null && (
                      <div>
                        <p className="font-body text-xs text-muted-foreground">Hours of Use</p>
                        <p className="font-body text-sm font-medium text-foreground">
                          {conditionReport.hours_of_use.toLocaleString()}
                        </p>
                      </div>
                    )}
                    {conditionReport.last_service_date && (
                      <div>
                        <p className="font-body text-xs text-muted-foreground">Last Service</p>
                        <p className="font-body text-sm font-medium text-foreground">
                          {new Date(conditionReport.last_service_date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {conditionReport.notes && (
                    <div>
                      <p className="font-body text-xs text-muted-foreground">Inspector Notes</p>
                      <p className="mt-1 whitespace-pre-wrap font-body text-sm text-foreground">
                        {conditionReport.notes}
                      </p>
                    </div>
                  )}

                  {/* Photos */}
                  {conditionReport.photo_urls?.length > 0 && (
                    <div>
                      <p className="mb-2 font-body text-xs text-muted-foreground">Condition Photos</p>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {conditionReport.photo_urls.map((url: string, i: number) => (
                          <div key={i} className="relative aspect-square overflow-hidden rounded-md border border-border">
                            <Image
                              src={url}
                              alt={`Condition photo ${i + 1}`}
                              fill
                              className="object-cover"
                              sizes="100px"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="font-body text-[10px] text-muted-foreground">
                    Report created {new Date(conditionReport.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </p>
                </CardContent>
              )}
            </Card>
          )}

          {/* Price History */}
          {priceHistory.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-lg">
                  <TrendingDown className="size-5 text-primary" />
                  Price History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {priceHistory.map((entry, i) => {
                    const prevPrice = i > 0 ? priceHistory[i - 1].price_cents : null
                    const isDropped = prevPrice !== null && entry.price_cents < prevPrice
                    const isRaised = prevPrice !== null && entry.price_cents > prevPrice
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-display text-sm font-bold ${
                              isDropped
                                ? 'text-green-400'
                                : isRaised
                                  ? 'text-red-400'
                                  : 'text-foreground'
                            }`}
                          >
                            ${(entry.price_cents / 100).toLocaleString()}
                          </span>
                          {isDropped && (
                            <Badge variant="outline" className="border-green-500/50 font-body text-[10px] text-green-400">
                              -{Math.round(((prevPrice - entry.price_cents) / prevPrice) * 100)}%
                            </Badge>
                          )}
                          {isRaised && (
                            <Badge variant="outline" className="border-red-500/50 font-body text-[10px] text-red-400">
                              +{Math.round(((entry.price_cents - prevPrice) / prevPrice) * 100)}%
                            </Badge>
                          )}
                        </div>
                        <span className="font-body text-xs text-muted-foreground">
                          {new Date(entry.changed_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Seller Card */}
          {seller && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="font-display text-lg">Seller</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link
                  href={`/profile/${seller.id}`}
                  className="flex items-center gap-3 transition-colors hover:text-primary"
                >
                  <Avatar className="size-12">
                    <AvatarImage src={seller.avatar_url || undefined} crossOrigin="anonymous" />
                    <AvatarFallback className="bg-primary/20 font-display text-sm text-primary">
                      {seller.full_name
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || 'MG'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-body font-medium text-foreground">
                      {seller.display_name || seller.full_name || 'Anonymous'}
                    </p>
                    {seller.company_name && (
                      <p className="font-body text-xs text-muted-foreground">
                        {seller.company_name}
                      </p>
                    )}
                    <p className="font-body text-xs text-muted-foreground">
                      {seller.location_city}, {seller.location_state}
                    </p>
                  </div>
                </Link>

                <Link
                  href={`/sellers/${seller.id}`}
                  className="flex items-center gap-1.5 font-body text-xs text-secondary transition-colors hover:text-secondary/80"
                >
                  Visit Storefront →
                </Link>

                {!isOwner && (
                  <div className="space-y-2">
                    <Button
                      onClick={handleContact}
                      className="w-full font-body"
                    >
                      <MessageSquare className="mr-2 size-4" />
                      Contact Seller
                    </Button>
                    {listing.negotiable && !listing.contact_for_price && (
                      <Button
                        variant="outline"
                        onClick={() => setOfferDialogOpen(true)}
                        className="w-full font-body"
                      >
                        <DollarSign className="mr-2 size-4" />
                        Make an Offer
                      </Button>
                    )}
                    {listing.price_cents && !listing.contact_for_price && (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleTogglePriceWatch}
                          disabled={watchLoading}
                          className={`w-full font-body ${isWatching ? 'border-primary text-primary' : ''}`}
                        >
                          {watchLoading ? (
                            <Loader2 className="mr-2 size-4 animate-spin" />
                          ) : isWatching ? (
                            <BellOff className="mr-2 size-4" />
                          ) : (
                            <Bell className="mr-2 size-4" />
                          )}
                          {isWatching ? 'Stop Watching' : 'Watch Price'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setPriceAlertOpen(true)}
                          className={`w-full font-body text-xs ${targetPriceCents ? 'border-green-500/50 text-green-400' : ''}`}
                        >
                          <TrendingDown className="mr-2 size-4" />
                          {targetPriceCents
                            ? `Alert at $${(targetPriceCents / 100).toLocaleString()}`
                            : 'Set Price Alert'}
                        </Button>
                      </>
                    )}
                    {sellerHasAvailability && (
                      <Button
                        variant="outline"
                        onClick={() => setViewingDialogOpen(true)}
                        className="w-full font-body"
                      >
                        <CalendarDays className="mr-2 size-4" />
                        Request Viewing
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Offers section */}
          {offers.length > 0 && (
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-lg">
                  <DollarSign className="size-5 text-primary" />
                  {isSeller ? 'Incoming Offers' : 'Your Offers'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {offers.map((offer) => {
                  const statusColors: Record<string, string> = {
                    pending: 'border-yellow-500/50 text-yellow-400',
                    accepted: 'border-green-500/50 text-green-400',
                    rejected: 'border-red-500/50 text-red-400',
                    countered: 'border-blue-500/50 text-blue-400',
                    expired: 'border-muted text-muted-foreground',
                    withdrawn: 'border-muted text-muted-foreground',
                  }
                  return (
                    <div key={offer.id} className="rounded-lg border border-border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="font-display text-lg font-bold text-primary">
                          ${(offer.amount_cents / 100).toLocaleString()}
                        </p>
                        <Badge variant="outline" className={`font-body text-[10px] ${statusColors[offer.status] || ''}`}>
                          {offer.status}
                        </Badge>
                      </div>
                      {isSeller && offer.buyer && (
                        <p className="font-body text-xs text-muted-foreground">
                          from {offer.buyer.display_name || offer.buyer.full_name}
                        </p>
                      )}
                      {offer.message && (
                        <p className="font-body text-xs text-muted-foreground">
                          &ldquo;{offer.message}&rdquo;
                        </p>
                      )}
                      {offer.status === 'countered' && offer.counter_amount_cents && (
                        <div className="rounded bg-surface p-2">
                          <p className="font-body text-xs text-muted-foreground">Counter-offer:</p>
                          <p className="font-display font-bold text-blue-400">
                            ${(offer.counter_amount_cents / 100).toLocaleString()}
                          </p>
                          {offer.counter_message && (
                            <p className="font-body text-xs text-muted-foreground">{offer.counter_message}</p>
                          )}
                        </div>
                      )}
                      {/* Action buttons */}
                      {isSeller && offer.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 font-body text-xs" onClick={() => handleOfferAction(offer.id, 'accept')}>
                            <Check className="mr-1 size-3" />Accept
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 font-body text-xs" onClick={() => handleOfferAction(offer.id, 'counter')}>
                            <ArrowLeftRight className="mr-1 size-3" />Counter
                          </Button>
                          <Button size="sm" variant="outline" className="font-body text-xs text-destructive" onClick={() => handleOfferAction(offer.id, 'reject')}>
                            <X className="size-3" />
                          </Button>
                        </div>
                      )}
                      {!isSeller && offer.status === 'pending' && (
                        <Button size="sm" variant="outline" className="w-full font-body text-xs" onClick={() => handleWithdrawOffer(offer.id)}>
                          Withdraw Offer
                        </Button>
                      )}
                      {!isSeller && offer.status === 'countered' && (
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1 font-body text-xs" onClick={() => handleCounterResponse(offer.id, 'accept')}>
                            <Check className="mr-1 size-3" />Accept Counter
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 font-body text-xs text-destructive" onClick={() => handleCounterResponse(offer.id, 'reject')}>
                            <X className="mr-1 size-3" />Decline
                          </Button>
                        </div>
                      )}
                      <p className="font-body text-[10px] text-muted-foreground">
                        {new Date(offer.created_at).toLocaleDateString()}
                        {offer.status === 'pending' && (
                          <> &middot; expires {new Date(offer.expires_at).toLocaleDateString()}</>
                        )}
                      </p>
                      {/* AI Deal Coach — private, per-side */}
                      {(offer.status === 'pending' || offer.status === 'countered') && listing && (() => {
                        const listingAge = Math.floor(
                          (new Date().getTime() - new Date(listing.created_at).getTime()) / (1000 * 60 * 60 * 24)
                        )
                        return (
                          <OfferCoach
                            side={isSeller ? 'seller' : 'buyer'}
                            listingId={listing.id}
                            askPrice={(listing.price_cents || 0) / 100}
                            offerPrice={
                              offer.status === 'countered' && offer.counter_amount_cents
                                ? offer.counter_amount_cents / 100
                                : offer.amount_cents / 100
                            }
                            offerCount={1}
                            daysOnMarket={listingAge}
                            condition={listing.condition}
                            subcategory={listing.category}
                          />
                        )
                      })()}
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}

          {/* Counter offer inline form */}
          {counteringOfferId && (
            <Card className="border-blue-500/50 bg-card">
              <CardHeader>
                <CardTitle className="font-display text-sm">Counter Offer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label className="font-body text-xs">Your counter price ($)</Label>
                  <Input
                    type="number"
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    placeholder="e.g. 5000"
                    className="font-body"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="font-body text-xs">Message (optional)</Label>
                  <Input
                    value={counterMessage}
                    onChange={(e) => setCounterMessage(e.target.value)}
                    placeholder="Why this price?"
                    className="font-body"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 font-body" onClick={handleSubmitCounter}>
                    Send Counter
                  </Button>
                  <Button size="sm" variant="outline" className="font-body" onClick={() => setCounteringOfferId(null)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Thumbnail strip */}
          {images.length > 1 && (
            <Card className="border-border bg-card">
              <CardContent className="p-3">
                <div className="grid grid-cols-4 gap-2">
                  {images.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => setCurrentImage(i)}
                      className={`relative aspect-square overflow-hidden rounded-md border-2 transition-colors ${
                        i === currentImage
                          ? 'border-primary'
                          : 'border-transparent'
                      }`}
                    >
                      <Image
                        src={img.url}
                        alt={`Thumbnail ${i + 1}`}
                        fill
                        className="object-cover"
                        sizes="100px"
                      />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Related Equipment */}
      {relatedListings.length > 0 && (
        <div>
          <Separator className="my-6" />
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">
            Related Equipment
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedListings.map((item) => (
              <Link key={item.id} href={`/listings/${item.id}`}>
                <Card className="border-border bg-card transition-colors hover:border-primary/50">
                  <div className="aspect-[16/10] w-full overflow-hidden bg-surface">
                    {item.listing_images?.[0]?.url ? (
                      <img src={item.listing_images.sort((a: {position: number}, b: {position: number}) => a.position - b.position)[0].url} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><Package className="size-8 text-muted-foreground/30" /></div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="truncate font-body text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 font-body text-xs text-muted-foreground">{item.category}</p>
                    <p className="mt-1 font-display text-sm font-bold text-primary">
                      {item.contact_for_price ? 'Contact' : item.price_cents ? `$${(item.price_cents / 100).toLocaleString()}` : 'Free'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* More from This Seller */}
      {moreFromSeller.length > 0 && (
        <div>
          <Separator className="my-6" />
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">
            More from This Seller
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {moreFromSeller.map((item) => (
              <Link key={item.id} href={`/listings/${item.id}`}>
                <Card className="border-border bg-card transition-colors hover:border-primary/50">
                  <div className="aspect-[16/10] w-full overflow-hidden bg-surface">
                    {item.listing_images?.[0]?.url ? (
                      <img src={item.listing_images.sort((a: {position: number}, b: {position: number}) => a.position - b.position)[0].url} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><Package className="size-8 text-muted-foreground/30" /></div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="truncate font-body text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 font-display text-sm font-bold text-primary">
                      {item.contact_for_price ? 'Contact' : item.price_cents ? `$${(item.price_cents / 100).toLocaleString()}` : 'Free'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Buyers Also Viewed */}
      {alsoViewed.length > 0 && (
        <div>
          <Separator className="my-6" />
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">
            Buyers Also Viewed
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {alsoViewed.map((item) => (
              <Link key={item.id} href={`/listings/${item.id}`}>
                <Card className="border-border bg-card transition-colors hover:border-primary/50">
                  <div className="aspect-[16/10] w-full overflow-hidden bg-surface">
                    {item.listing_images?.[0]?.url ? (
                      <img src={item.listing_images.sort((a: {position: number}, b: {position: number}) => a.position - b.position)[0].url} alt={item.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center"><Package className="size-8 text-muted-foreground/30" /></div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <p className="truncate font-body text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 font-display text-sm font-bold text-primary">
                      {item.contact_for_price ? 'Contact' : item.price_cents ? `$${(item.price_cents / 100).toLocaleString()}` : 'Free'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Make an Offer Dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Make an Offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {listing.price_cents && (
              <p className="font-body text-sm text-muted-foreground">
                Listed price: <span className="font-bold text-foreground">
                  ${(listing.price_cents / 100).toLocaleString()}
                </span>
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="offer-amount" className="font-body">
                Your offer ($)
              </Label>
              <Input
                id="offer-amount"
                type="number"
                value={offerAmount}
                onChange={(e) => setOfferAmount(e.target.value)}
                placeholder="e.g. 5000"
                className="font-body"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-message" className="font-body">
                Message (optional)
              </Label>
              <Input
                id="offer-message"
                value={offerMessage}
                onChange={(e) => setOfferMessage(e.target.value)}
                placeholder="I'm interested in this equipment..."
                className="font-body"
              />
            </div>
            <p className="font-body text-[10px] text-muted-foreground">
              Offers expire after 72 hours if the seller doesn&apos;t respond.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 font-body"
              onClick={() => setOfferDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 font-body"
              onClick={handleMakeOffer}
              disabled={submittingOffer || !offerAmount}
            >
              {submittingOffer ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <DollarSign className="mr-2 size-4" />
              )}
              Submit Offer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Listing QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="rounded-lg bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(getShareUrl())}&bgcolor=FFFFFF&color=0A0A0F`}
                alt="QR Code"
                width={200}
                height={200}
              />
            </div>
            <p className="text-center font-body text-xs text-muted-foreground">
              Scan to view this listing
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="font-body"
            >
              Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Price Alert Dialog */}
      <Dialog open={priceAlertOpen} onOpenChange={setPriceAlertOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Set Price Alert</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="font-body text-sm text-muted-foreground">
              Get notified when the price drops to your target. Current price:{' '}
              <span className="font-semibold text-foreground">
                ${listing?.price_cents ? (listing.price_cents / 100).toLocaleString() : '—'}
              </span>
            </p>
            <div className="space-y-2">
              <Label htmlFor="target-price" className="font-body">
                Target Price ($)
              </Label>
              <Input
                id="target-price"
                type="number"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="e.g., 25000"
                className="font-body"
                min="0"
                step="100"
              />
            </div>
            {listing?.price_cents && targetPrice && parseFloat(targetPrice) >= listing.price_cents / 100 && (
              <p className="font-body text-xs text-yellow-400">
                Target should be below the current price for a useful alert.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {targetPriceCents && (
              <Button
                variant="ghost"
                className="font-body text-muted-foreground"
                onClick={() => {
                  setTargetPrice('')
                  handleSetPriceAlert()
                }}
              >
                Remove Alert
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="outline"
              className="font-body"
              onClick={() => setPriceAlertOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="font-body"
              onClick={handleSetPriceAlert}
              disabled={settingAlert || !targetPrice}
            >
              {settingAlert ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <TrendingDown className="mr-2 size-4" />
              )}
              Set Alert
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Viewing Dialog */}
      <Dialog open={viewingDialogOpen} onOpenChange={setViewingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Request Viewing</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="font-body text-sm text-muted-foreground">
              Request an in-person viewing of this equipment. The seller will confirm your appointment.
            </p>
            <div className="space-y-2">
              <Label htmlFor="viewing-date" className="font-body">
                Preferred Date
              </Label>
              <Input
                id="viewing-date"
                type="date"
                value={viewingDate}
                onChange={(e) => setViewingDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="font-body"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="viewing-time" className="font-body">
                Preferred Time (CT)
              </Label>
              <Input
                id="viewing-time"
                type="time"
                value={viewingTime}
                onChange={(e) => setViewingTime(e.target.value)}
                className="font-body"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="viewing-msg" className="font-body">
                Message (optional)
              </Label>
              <Input
                id="viewing-msg"
                value={viewingMessage}
                onChange={(e) => setViewingMessage(e.target.value)}
                placeholder="Any notes for the seller..."
                className="font-body"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 font-body"
              onClick={() => setViewingDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 font-body"
              onClick={handleRequestViewing}
              disabled={submittingViewing || !viewingDate}
            >
              {submittingViewing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <CalendarDays className="mr-2 size-4" />
              )}
              Send Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
