'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DollarSign, MessageSquare, Heart, Loader2, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ListingPurchasePanel } from './ListingPurchasePanel'
import { AnonInteractionGate } from '@/components/AnonInteractionGate'
import { startConversation } from '@/app/(main)/messages/actions'
import { toggleFavoriteAction } from './favorite-action'
import type { Tables } from '@/types/database'
import type { User } from '@supabase/supabase-js'

type CompanyProfileRow = Tables<'company_profiles'>

interface Props {
  listing: Tables<'listings'>
  seller: Tables<'profiles'>
  currentUser: User | null
  isFavorited: boolean
  company?: CompanyProfileRow | null
  sellerContact?: {
    canSee: boolean
    phone: string | null
    email: string | null
    visibility: string
  } | null
}

export function MobilePurchaseBar({ listing, seller, currentUser, isFavorited, company, sellerContact }: Props) {
  const router = useRouter()
  const [gateOpen, setGateOpen] = useState(false)
  const [gateAction, setGateAction] = useState<'offer' | 'contact' | 'save'>('offer')
  const [contacting, setContacting] = useState(false)
  const [favorited, setFavorited] = useState(isFavorited)

  const isOwner = currentUser?.id === listing.seller_id
  const isDisabled = listing.status === 'sold' || listing.status === 'expired'

  const price = listing.contact_for_price
    ? 'Contact'
    : listing.price_cents
      ? `$${(listing.price_cents / 100).toLocaleString()}`
      : 'Free'

  const conditionLabel = listing.condition.replace('_', ' ')

  const handleOfferClick = () => {
    if (!currentUser) {
      setGateAction('offer')
      setGateOpen(true)
    }
    // Sheet will handle via ListingPurchasePanel
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
    const result = await toggleFavoriteAction(listing.id)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      setFavorited(result.favorited)
      toast.success(result.favorited ? 'Added to Radar' : 'Removed from Radar')
    }
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 lg:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur z-40 safe-area-bottom">
        {/* Price row with sheet trigger */}
        <Sheet>
          <SheetTrigger asChild>
            <button className="flex w-full items-center justify-between px-4 pt-2 pb-1">
              <div className="text-left">
                <div className="font-display text-lg font-bold text-foreground">{price}</div>
                <div className="font-body text-[11px] text-muted-foreground capitalize">
                  {conditionLabel} &middot; {listing.location_city}, {listing.location_state}
                </div>
              </div>
              <ChevronUp className="size-4 text-muted-foreground" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
            <SheetHeader>
              <SheetTitle className="font-display">Purchase Options</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              <ListingPurchasePanel
                listing={listing}
                seller={seller}
                currentUser={currentUser}
                isFavorited={favorited}
                company={company}
                sellerContact={sellerContact}
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Action buttons row */}
        {!isOwner && !isDisabled && (
          <div className="flex items-center gap-2 px-4 pb-3 pt-1">
            {/* Make Offer — primary */}
            <Sheet>
              <SheetTrigger asChild>
                <button
                  onClick={handleOfferClick}
                  className="flex-1 bg-[#FF6B2B] hover:bg-[#FF6B2B]/90 text-white px-4 py-2.5 rounded-lg font-body font-semibold text-sm transition-colors flex items-center justify-center gap-1.5"
                >
                  <DollarSign className="size-4" />
                  Make Offer
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
                <SheetHeader>
                  <SheetTitle className="font-display">Purchase Options</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <ListingPurchasePanel
                    listing={listing}
                    seller={seller}
                    currentUser={currentUser}
                    isFavorited={favorited}
                    company={company}
                    sellerContact={sellerContact}
                  />
                </div>
              </SheetContent>
            </Sheet>

            {/* Contact Seller — secondary */}
            <button
              onClick={handleContact}
              disabled={contacting}
              className="flex-1 border border-primary text-primary hover:bg-primary/10 px-4 py-2.5 rounded-lg font-body font-semibold text-sm transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {contacting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <MessageSquare className="size-4" />
              )}
              Contact
            </button>

            {/* Save to Radar — icon button */}
            <button
              onClick={handleSave}
              className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors hover:bg-accent"
              aria-label={favorited ? 'Remove from Radar' : 'Save to Radar'}
            >
              <Heart
                className={`size-5 ${favorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
              />
            </button>
          </div>
        )}
      </div>

      <AnonInteractionGate open={gateOpen} onClose={() => setGateOpen(false)} action={gateAction} />
    </>
  )
}
