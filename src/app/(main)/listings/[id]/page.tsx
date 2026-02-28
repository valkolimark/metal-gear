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
} from 'lucide-react'
import { toast } from 'sonner'
import { startConversation } from '@/app/(main)/messages/actions'
import { recordListingView } from '@/app/actions/analytics'
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
import { useAuthStore } from '@/stores/auth-store'
import { APP_URL } from '@/lib/constants'
import type { Tables } from '@/types/database'

type Listing = Tables<'listings'>
type ListingImage = Tables<'listing_images'>
type Profile = Tables<'profiles'>

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()

  const [listing, setListing] = useState<Listing | null>(null)
  const [images, setImages] = useState<ListingImage[]>([])
  const [seller, setSeller] = useState<Profile | null>(null)
  const [similar, setSimilar] = useState<Listing[]>([])
  const [isFavorited, setIsFavorited] = useState(false)
  const [loading, setLoading] = useState(true)
  const [currentImage, setCurrentImage] = useState(0)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)

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

      // Fetch images, seller, favorite status, similar in parallel
      const [imagesRes, sellerRes, favRes, similarRes] = await Promise.all([
        supabase
          .from('listing_images')
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
      setSeller(sellerRes.data)
      setIsFavorited(!!favRes.data)
      setSimilar((similarRes.data ?? []) as Listing[])

      // Record view event (fire and forget)
      recordListingView(id).catch(console.error)

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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
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

                {!isOwner && (
                  <Button
                    onClick={handleContact}
                    className="w-full font-body"
                  >
                    <MessageSquare className="mr-2 size-4" />
                    Contact Seller
                  </Button>
                )}
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

      {/* Similar Listings */}
      {similar.length > 0 && (
        <div>
          <Separator className="my-6" />
          <h2 className="mb-4 font-display text-xl font-bold text-foreground">
            Similar Listings
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {similar.map((item) => (
              <Link key={item.id} href={`/listings/${item.id}`}>
                <Card className="border-border bg-card transition-colors hover:border-primary/50">
                  <CardContent className="p-4">
                    <p className="truncate font-body font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="mt-1 font-body text-sm text-muted-foreground">
                      {item.category}
                    </p>
                    <p className="mt-2 font-display text-lg font-bold text-primary">
                      {item.contact_for_price
                        ? 'Contact'
                        : item.price_cents
                          ? `$${(item.price_cents / 100).toLocaleString()}`
                          : 'Free'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

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
    </div>
  )
}
