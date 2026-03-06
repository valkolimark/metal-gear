'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  MapPin,
  Eye,
  Heart,
  Calendar,
  Share2,
  QrCode,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { APP_URL } from '@/lib/constants'
import type { Tables } from '@/types/database'

type Listing = Tables<'listings'>
type Profile = Tables<'profiles'>

interface Props {
  listing: Listing
  seller: Profile
}

export function ListingMainContent({ listing, seller }: Props) {
  const [descriptionExpanded, setDescriptionExpanded] = useState(false)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)

  const conditionLabel = listing.condition.replace('_', ' ')
  const formattedDate = new Date(listing.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const shareUrl = `${APP_URL}/listings/${listing.id}`

  function handleCopyLink() {
    navigator.clipboard.writeText(shareUrl)
    toast.success('Link copied to clipboard')
  }

  const descriptionTruncated =
    listing.description && listing.description.length > 600 && !descriptionExpanded

  return (
    <div className="space-y-6">
      {/* Title + badges */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {listing.title}
          </h1>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="size-9 shrink-0">
                <Share2 className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyLink} className="font-body">
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  window.open(
                    `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
                    '_blank'
                  )
                }
                className="font-body"
              >
                Share on Facebook
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  window.open(
                    `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
                    '_blank'
                  )
                }
                className="font-body"
              >
                Share on LinkedIn
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  window.open(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${listing.title} on Metal Gear`)}&url=${encodeURIComponent(shareUrl)}`,
                    '_blank'
                  )
                }
                className="font-body"
              >
                Share on X/Twitter
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setQrDialogOpen(true)} className="font-body">
                <QrCode className="mr-2 size-4" />
                QR Code
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline" className="font-body">{listing.category}</Badge>
          {listing.industry && (
            <Badge variant="outline" className="font-body">{listing.industry}</Badge>
          )}
          <Badge variant="outline" className="font-body capitalize">{conditionLabel}</Badge>
          <Badge
            variant="outline"
            className={`font-body ${
              listing.status === 'active' ? 'border-green-500/50 text-green-500 dark:text-green-400' : ''
            }`}
          >
            {listing.status}
          </Badge>
        </div>

        {/* Meta info */}
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

        {/* Mobile price (visible below lg) */}
        <p className="mt-3 font-display text-3xl font-bold text-primary lg:hidden">
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
      </div>

      {/* Description */}
      {listing.description && (
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground mb-3">
            Description
          </h2>
          <div className="relative">
            <p
              className={`whitespace-pre-wrap font-body text-sm text-muted-foreground ${
                descriptionTruncated ? 'line-clamp-[12]' : ''
              }`}
            >
              {listing.description}
            </p>
            {listing.description.length > 600 && (
              <button
                onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                className="mt-1 font-body text-sm font-medium text-[#3A8FD4] hover:underline"
              >
                {descriptionExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* QR Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Listing QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="rounded-lg bg-white p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}&bgcolor=FFFFFF&color=0A0A0F`}
                alt="QR Code"
                width={200}
                height={200}
              />
            </div>
            <p className="text-center font-body text-xs text-muted-foreground">
              Scan to view this listing
            </p>
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="font-body">
              Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
