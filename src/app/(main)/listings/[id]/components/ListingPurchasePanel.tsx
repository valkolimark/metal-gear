'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Radar,
  MessageSquare,
  DollarSign,
  ShieldCheck,
  Star,
  Edit,
  BarChart3,
  Loader2,
  MapPin,
  CheckCircle,
  Clock,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AnonInteractionGate } from '@/components/AnonInteractionGate'
import { CompanyAvatar } from '@/components/company/CompanyAvatar'
import { startConversation } from '@/app/(main)/messages/actions'
import { makeOffer } from '@/app/actions/offers'
import { revealContactInfo } from '@/app/actions/credits'
import { toggleRadarListing } from '@/app/actions/radar'
import type { Tables } from '@/types/database'
import type { User } from '@supabase/supabase-js'

type Listing = Tables<'listings'>
type Profile = Tables<'profiles'>
type CompanyProfileRow = Tables<'company_profiles'>

interface SellerContact {
  canSee: boolean
  phone: string | null
  email: string | null
  visibility: string
  alreadyRevealed?: boolean
}

interface CreditBalanceInfo {
  creditsRemaining: number
  creditsUsedThisMonth: number
  monthlyAllowance: number
  tier: string
}

interface Props {
  listing: Listing
  seller: Profile
  currentUser: User | null
  isFavorited: boolean
  company?: CompanyProfileRow | null
  sellerContact?: SellerContact | null
  creditBalance?: CreditBalanceInfo | null
}

export function ListingPurchasePanel({
  listing,
  seller,
  currentUser,
  isFavorited,
  company,
  sellerContact,
  creditBalance,
}: Props) {
  const router = useRouter()
  const [gateOpen, setGateOpen] = useState(false)
  const [gateAction, setGateAction] = useState<'offer' | 'contact' | 'save'>('offer')
  const [offerDialogOpen, setOfferDialogOpen] = useState(false)
  const [offerAmount, setOfferAmount] = useState('')
  const [offerMessage, setOfferMessage] = useState('')
  const [submittingOffer, setSubmittingOffer] = useState(false)
  const [contacting, setContacting] = useState(false)
  const [favorited, setFavorited] = useState(isFavorited)

  // Credit reveal state
  const [revealing, setRevealing] = useState(false)
  const [revealedPhone, setRevealedPhone] = useState<string | null>(sellerContact?.phone ?? null)
  const [revealedEmail, setRevealedEmail] = useState<string | null>(sellerContact?.email ?? null)
  const [isRevealed, setIsRevealed] = useState(sellerContact?.canSee ?? false)
  const [remainingCredits, setRemainingCredits] = useState(creditBalance?.creditsRemaining ?? 0)

  const isOwner = currentUser?.id === listing.seller_id
  const isDisabled = listing.status === 'sold' || listing.status === 'expired'
  const price = listing.contact_for_price
    ? 'Contact for Price'
    : listing.price_cents
      ? `$${(listing.price_cents / 100).toLocaleString()}`
      : 'Free'

  const handleMakeOffer = () => {
    if (!currentUser) {
      setGateAction('offer')
      setGateOpen(true)
      return
    }
    setOfferDialogOpen(true)
  }

  const handleContact = async () => {
    if (!currentUser) {
      setGateAction('contact')
      setGateOpen(true)
      return
    }
    setContacting(true)
    const result = await startConversation(listing.id)
    if (result.error) {
      toast.error(result.error)
      if (result.error.includes('limit')) router.push('/pricing')
    } else if (result.conversationId) {
      router.push(`/messages?conversation=${result.conversationId}`)
    }
    setContacting(false)
  }

  const handleSave = async () => {
    if (!currentUser) {
      setGateAction('save')
      setGateOpen(true)
      return
    }
    const result = await toggleRadarListing(listing.id)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      setFavorited(result.saved)
      toast.success(result.saved ? 'Added to Radar' : 'Removed from Radar')
    }
  }

  const handleRevealContact = async () => {
    if (!currentUser) {
      setGateAction('contact')
      setGateOpen(true)
      return
    }
    setRevealing(true)
    const result = await revealContactInfo(seller.id, listing.id)
    if (result.error === 'insufficient_credits') {
      toast.error('Not enough credits')
    } else if (result.error) {
      toast.error(result.error)
    } else {
      setRevealedPhone(result.phone)
      setRevealedEmail(result.email)
      setIsRevealed(true)
      if (result.creditsRemaining !== undefined) {
        setRemainingCredits(result.creditsRemaining)
      }
      toast.success('Contact info revealed!')
    }
    setRevealing(false)
  }

  const handleSubmitOffer = async () => {
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
    }
    setSubmittingOffer(false)
  }

  const conditionGrade = listing.condition === 'new' ? 'New'
    : listing.condition === 'like_new' ? 'Like New'
    : listing.condition === 'excellent' ? 'Excellent'
    : listing.condition === 'good' ? 'Good'
    : listing.condition === 'fair' ? 'Fair'
    : listing.condition === 'poor' ? 'Poor'
    : listing.condition

  // Determine contact section state
  const isEnterprise = creditBalance?.monthlyAllowance === -1 || creditBalance?.tier === 'enterprise'
  const isPublicVisibility = sellerContact?.visibility === 'public'
  const isFreeUser = creditBalance?.monthlyAllowance === 0 && creditBalance?.tier === 'free'

  return (
    <>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white/90 dark:bg-zinc-900/80 p-5 space-y-4">
        {/* Price */}
        <div>
          <p className="font-display text-3xl font-bold text-foreground">
            {price}
          </p>
          {listing.negotiable && !listing.contact_for_price && (
            <span className="font-body text-xs text-muted-foreground">(Negotiable)</span>
          )}
          <div className="mt-1 flex items-center gap-2 font-body text-sm text-muted-foreground">
            {listing.status === 'active' ? (
              <span className="flex items-center gap-1 text-green-500 dark:text-green-400">
                <CheckCircle className="size-3.5" />
                In Stock
              </span>
            ) : (
              <Badge variant="outline" className="text-xs capitalize">
                {listing.status}
              </Badge>
            )}
            <span className="text-zinc-400 dark:text-zinc-600">&middot;</span>
            <span className="flex items-center gap-1">
              <MapPin className="size-3.5" />
              {listing.location_city}, {listing.location_state}
            </span>
          </div>
        </div>

        {/* Condition */}
        <div className="border-t border-zinc-200 dark:border-zinc-700/60 pt-3">
          <div className="flex items-center justify-between">
            <span className="font-body text-sm text-muted-foreground">Condition</span>
            <span className="font-body text-sm font-medium text-foreground capitalize">{conditionGrade}</span>
          </div>
          {listing.listing_quality_score != null && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="font-body text-xs text-muted-foreground">Quality Score</span>
                <span className="font-display text-sm font-bold text-foreground">{listing.listing_quality_score}/100</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
                <div
                  className="h-1.5 rounded-full bg-primary"
                  style={{ width: `${listing.listing_quality_score}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* CTAs */}
        <div className="border-t border-zinc-200 dark:border-zinc-700/60 pt-3 space-y-2">
          {isOwner ? (
            <>
              <Button asChild className="w-full font-body">
                <Link href={`/listings/${listing.id}/edit`}>
                  <Edit className="mr-2 size-4" />
                  Edit Listing
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full font-body">
                <Link href={`/dashboard?tab=analytics&listing=${listing.id}`}>
                  <BarChart3 className="mr-2 size-4" />
                  View Analytics
                </Link>
              </Button>
            </>
          ) : isDisabled ? (
            <div className="text-center">
              <Badge variant="outline" className="mb-2 capitalize">{listing.status}</Badge>
              <p className="font-body text-xs text-muted-foreground">
                This listing is no longer available for purchase.
              </p>
            </div>
          ) : (
            <>
              <Button
                onClick={handleMakeOffer}
                className="w-full bg-primary hover:bg-primary/90 font-body text-white"
              >
                <DollarSign className="mr-2 size-4" />
                Make an Offer
              </Button>
              <Button
                onClick={handleContact}
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary/10 font-body"
                disabled={contacting}
              >
                {contacting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <MessageSquare className="mr-2 size-4" />
                )}
                Contact Seller
              </Button>
              <Button
                onClick={handleSave}
                variant="ghost"
                className="w-full font-body"
              >
                <Radar
                  className={`mr-2 size-4 ${favorited ? 'text-primary' : ''}`}
                />
                {favorited ? 'Saved' : 'Save to Radar'}
              </Button>
            </>
          )}
        </div>

        {/* Seller info */}
        <div className="border-t border-zinc-200 dark:border-zinc-700/60 pt-3">
          <Link
            href={company ? `/companies/${company.slug}` : `/sellers/${seller.id}`}
            className="flex items-center gap-3 transition-colors hover:text-primary"
          >
            {company ? (
              <CompanyAvatar name={company.name} logoUrl={company.logo_url} size={40} />
            ) : (
              <Avatar className="size-10">
                <AvatarImage src={seller.avatar_url || undefined} crossOrigin="anonymous" />
                <AvatarFallback className="bg-primary/20 font-display text-xs text-primary">
                  {seller.full_name
                    ?.split(' ')
                    .map((n) => n[0])
                    .join('')
                    .toUpperCase()
                    .slice(0, 2) || 'MG'}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate font-body text-sm font-medium text-foreground">
                {company?.name || seller.company_name || seller.display_name || seller.full_name || 'Seller'}
              </p>
              {company && (
                <p className="truncate font-body text-xs text-muted-foreground">
                  Listed by {seller.display_name || seller.full_name}
                </p>
              )}
              <div className="flex items-center gap-1.5 font-body text-xs text-muted-foreground">
                {seller.trust_score != null && (
                  <>
                    <Star className="size-3 fill-yellow-500 text-yellow-500" />
                    <span>{(seller.trust_score / 20).toFixed(1)}</span>
                  </>
                )}
                {seller.is_verified_dealer && (
                  <Badge variant="outline" className="h-4 gap-0.5 px-1 text-[9px] border-green-500/50 text-green-500 dark:text-green-400">
                    <ShieldCheck className="size-2.5" />
                    Verified
                  </Badge>
                )}
                {seller.location_city && <span>&middot; {seller.location_city}</span>}
              </div>
            </div>
          </Link>
          <div className="mt-2 flex items-center gap-1 font-body text-xs text-muted-foreground">
            <Clock className="size-3" />
            Responds in ~2 hours
          </div>
          <Button asChild variant="link" className="mt-1 h-auto p-0 font-body text-xs text-primary">
            <Link href={`/sellers/${seller.id}`}>
              View Storefront &rarr;
            </Link>
          </Button>
        </div>

        {/* Seller contact info — credit-based reveal */}
        {sellerContact && sellerContact.visibility !== 'hidden' && (
          <div className="border-t border-zinc-200 dark:border-zinc-700/60 pt-3">
            {isRevealed || isEnterprise || isPublicVisibility ? (
              // Revealed state — show contact info
              (revealedPhone || revealedEmail) ? (
                <div className="space-y-1.5">
                  {revealedPhone && (
                    <p className="flex items-center gap-2 font-body text-sm text-muted-foreground">
                      <span>📞</span>
                      <span className="text-foreground">{revealedPhone}</span>
                    </p>
                  )}
                  {revealedEmail && (
                    <p className="flex items-center gap-2 font-body text-sm text-muted-foreground">
                      <span>✉️</span>
                      <span className="text-foreground">{revealedEmail}</span>
                    </p>
                  )}
                </div>
              ) : null
            ) : (
              // Not yet revealed — show credit reveal UI
              <div className="space-y-2">
                <p className="flex items-center gap-2 font-body text-sm text-muted-foreground">
                  <span>📞</span>
                  <span className="tracking-wider">••••••••••</span>
                </p>
                <p className="flex items-center gap-2 font-body text-sm text-muted-foreground">
                  <span>✉️</span>
                  <span className="tracking-wider">••••••••••</span>
                </p>

                {isFreeUser ? (
                  // Free user — upgrade prompt
                  <Link
                    href="/pricing"
                    className="flex items-center justify-center gap-2 w-full rounded-lg border border-primary bg-primary/5 px-4 py-2.5 font-body text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    Upgrade to Pro for 25 monthly credits →
                  </Link>
                ) : remainingCredits > 0 ? (
                  // Has credits — reveal button
                  <>
                    <Button
                      onClick={handleRevealContact}
                      disabled={revealing}
                      className="w-full font-body"
                      variant="outline"
                    >
                      {revealing ? (
                        <Loader2 className="mr-2 size-4 animate-spin" />
                      ) : (
                        <Eye className="mr-2 size-4" />
                      )}
                      Reveal Contact Info — 1 credit
                    </Button>
                    <p className="text-center font-body text-xs text-muted-foreground">
                      You have {remainingCredits} credit{remainingCredits !== 1 ? 's' : ''} remaining
                    </p>
                  </>
                ) : (
                  // No credits — buy more or upgrade
                  <>
                    <Button
                      onClick={handleRevealContact}
                      disabled
                      className="w-full font-body"
                      variant="outline"
                    >
                      <Eye className="mr-2 size-4" />
                      Reveal Contact Info — 1 credit
                    </Button>
                    <p className="text-center font-body text-xs text-muted-foreground">
                      You have 0 credits.{' '}
                      <Link href="/credits" className="text-primary hover:underline">Buy more credits</Link>
                      {' or '}
                      <Link href="/pricing" className="text-primary hover:underline">Upgrade plan</Link>
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Buyer protection */}
        <div className="border-t border-zinc-200 dark:border-zinc-700/60 pt-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-green-500 dark:text-green-400" />
            <span className="font-body text-sm font-medium text-foreground">Buyer Protection</span>
          </div>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            Stripe escrow payments &middot; AI-assisted dispute mediation
          </p>
        </div>
      </div>

      {/* Make Offer Dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={setOfferDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Make an Offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {listing.price_cents && (
              <p className="font-body text-sm text-muted-foreground">
                Listed price:{' '}
                <span className="font-bold text-foreground">
                  ${(listing.price_cents / 100).toLocaleString()}
                </span>
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="offer-amount" className="font-body">Your offer ($)</Label>
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
              <Label htmlFor="offer-message" className="font-body">Message (optional)</Label>
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
            <Button variant="outline" className="flex-1 font-body" onClick={() => setOfferDialogOpen(false)}>
              Cancel
            </Button>
            <Button className="flex-1 font-body" onClick={handleSubmitOffer} disabled={submittingOffer || !offerAmount}>
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

      <AnonInteractionGate open={gateOpen} onClose={() => setGateOpen(false)} action={gateAction} />
    </>
  )
}
