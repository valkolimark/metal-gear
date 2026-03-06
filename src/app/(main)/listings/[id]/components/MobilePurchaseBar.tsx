'use client'

import { useState } from 'react'
import { DollarSign } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { ListingPurchasePanel } from './ListingPurchasePanel'
import { AnonInteractionGate } from '@/components/AnonInteractionGate'
import type { Tables } from '@/types/database'
import type { User } from '@supabase/supabase-js'

interface Props {
  listing: Tables<'listings'>
  seller: Tables<'profiles'>
  currentUser: User | null
  isFavorited: boolean
}

export function MobilePurchaseBar({ listing, seller, currentUser, isFavorited }: Props) {
  const [gateOpen, setGateOpen] = useState(false)

  const price = listing.contact_for_price
    ? 'Contact'
    : listing.price_cents
      ? `$${(listing.price_cents / 100).toLocaleString()}`
      : 'Free'

  const conditionLabel = listing.condition.replace('_', ' ')

  const handleOfferClick = () => {
    if (!currentUser) {
      setGateOpen(true)
      return
    }
    // Sheet will handle via ListingPurchasePanel
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 lg:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur px-4 py-3 flex items-center justify-between z-40 safe-area-bottom">
        <div>
          <div className="font-display text-xl font-bold text-foreground">{price}</div>
          <div className="font-body text-xs text-muted-foreground capitalize">
            {conditionLabel} &middot; {listing.location_city}, {listing.location_state}
          </div>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <button className="bg-[#FF6B2B] hover:bg-[#e55e25] text-white px-6 py-2.5 rounded-lg font-body font-semibold text-sm transition-colors">
              <DollarSign className="inline-block size-4 mr-1 -mt-0.5" />
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
                isFavorited={isFavorited}
                onToggleFavorite={() => {}}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <AnonInteractionGate open={gateOpen} onClose={() => setGateOpen(false)} action="offer" />
    </>
  )
}
