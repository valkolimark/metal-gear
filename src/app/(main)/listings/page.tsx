'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Edit,
  Eye,
  Trash2,
  Loader2,
  Copy,
  CheckCircle,
  RotateCcw,
  MoreHorizontal,
  Share2,
  QrCode,
  RefreshCw,
  Clock,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { updateListingStatus, duplicateListing, renewListing, toggleAutoRenew } from './actions'
import { APP_URL } from '@/lib/constants'
import type { Listing } from '@/types/listings'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-500/20 text-yellow-400',
  active: 'bg-green-500/20 text-green-400',
  sold: 'bg-blue-500/20 text-blue-400',
  expired: 'bg-zinc-500/20 text-zinc-400',
  removed: 'bg-red-500/20 text-red-400',
}

export default function ListingsPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrListingId, setQrListingId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from('listings')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error('Failed to load listings')
          console.error(error)
        }
        setListings((data as Listing[]) ?? [])
        setLoading(false)
      })
  }, [user])

  async function handleStatusChange(
    id: string,
    status: 'active' | 'sold' | 'removed' | 'draft'
  ) {
    const result = await updateListingStatus(id, status)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status } : l))
    )
    const labels: Record<string, string> = {
      active: 'Listing reactivated',
      sold: 'Marked as sold',
      removed: 'Listing removed',
      draft: 'Moved to draft',
    }
    toast.success(labels[status] || 'Status updated')
  }

  async function handleDuplicate(id: string) {
    const result = await duplicateListing(id)
    if (result.error) {
      toast.error(result.error)
      return
    }
    if (result.listing) {
      toast.success('Listing duplicated as draft')
      router.push(`/listings/${result.listing.id}/edit`)
    }
  }

  function handleShare(listing: Listing) {
    const url = `${APP_URL}/listings/${listing.id}`
    const text = `Check out ${listing.title} on Metal Gear`

    if (navigator.share) {
      navigator
        .share({ title: listing.title, text, url })
        .catch(() => copyToClipboard(url))
    } else {
      copyToClipboard(url)
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    toast.success('Link copied to clipboard')
  }

  function showQrCode(id: string) {
    setQrListingId(id)
    setQrDialogOpen(true)
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            My Listings
          </h1>
          <p className="mt-1 font-body text-muted-foreground">
            Manage your equipment listings
          </p>
        </div>
        <Button asChild className="font-body">
          <Link href="/listings/new">
            <Plus className="mr-2 size-4" />
            Create Listing
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : listings.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <p className="font-display text-lg font-semibold text-foreground">
              No listings yet
            </p>
            <p className="max-w-md text-center font-body text-sm text-muted-foreground">
              Start selling your industrial equipment by creating your first
              listing.
            </p>
            <Button asChild className="font-body">
              <Link href="/listings/new">
                <Plus className="mr-2 size-4" />
                Create Your First Listing
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <Card key={listing.id} className="border-border bg-card">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-body font-medium text-foreground">
                      {listing.title}
                    </p>
                    <Badge
                      className={`text-xs ${STATUS_COLORS[listing.status] || ''}`}
                    >
                      {listing.status}
                    </Badge>
                  </div>
                  <p className="mt-1 font-body text-sm text-muted-foreground">
                    {listing.category} &middot;{' '}
                    {listing.contact_for_price
                      ? 'Contact for Price'
                      : listing.price_cents
                        ? `$${(listing.price_cents / 100).toLocaleString()}`
                        : 'Free'}
                    {' '}&middot; {listing.views_count} views &middot;{' '}
                    {listing.favorites_count} favorites
                    {listing.status === 'active' && listing.expires_at && (() => {
                      const daysLeft = Math.ceil((new Date(listing.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                      return daysLeft <= 7
                        ? <span className="text-yellow-400"> &middot; Expires in {daysLeft}d</span>
                        : <span> &middot; Expires in {daysLeft}d</span>
                    })()}
                    {listing.auto_renew && <span className="text-green-400"> &middot; Auto-renew</span>}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/listings/${listing.id}`}>
                      <Eye className="size-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/listings/${listing.id}/edit`}>
                      <Edit className="size-4" />
                    </Link>
                  </Button>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* Status actions */}
                      {listing.status === 'active' && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusChange(listing.id, 'sold')
                          }
                          className="font-body"
                        >
                          <CheckCircle className="mr-2 size-4 text-blue-400" />
                          Mark as Sold
                        </DropdownMenuItem>
                      )}
                      {(listing.status === 'sold' ||
                        listing.status === 'expired' ||
                        listing.status === 'draft') && (
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusChange(listing.id, 'active')
                          }
                          className="font-body"
                        >
                          <RotateCcw className="mr-2 size-4 text-green-400" />
                          {listing.status === 'draft'
                            ? 'Publish'
                            : 'Relist'}
                        </DropdownMenuItem>
                      )}

                      {listing.status === 'active' && (
                        <DropdownMenuItem
                          onClick={async () => {
                            const result = await toggleAutoRenew(listing.id, !listing.auto_renew)
                            if (result.error) toast.error(result.error)
                            else {
                              setListings((prev) =>
                                prev.map((l) =>
                                  l.id === listing.id ? { ...l, auto_renew: !l.auto_renew } : l
                                )
                              )
                              toast.success(listing.auto_renew ? 'Auto-renew disabled' : 'Auto-renew enabled')
                            }
                          }}
                          className="font-body"
                        >
                          <RefreshCw className="mr-2 size-4 text-secondary" />
                          {listing.auto_renew ? 'Disable Auto-Renew' : 'Enable Auto-Renew'}
                        </DropdownMenuItem>
                      )}

                      {listing.status === 'expired' && (
                        <DropdownMenuItem
                          onClick={async () => {
                            const result = await renewListing(listing.id)
                            if (result.error) toast.error(result.error)
                            else {
                              setListings((prev) =>
                                prev.map((l) =>
                                  l.id === listing.id
                                    ? { ...l, status: 'active', expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() }
                                    : l
                                )
                              )
                              toast.success('Listing renewed for 90 days')
                            }
                          }}
                          className="font-body"
                        >
                          <Clock className="mr-2 size-4 text-green-400" />
                          Renew (90 days)
                        </DropdownMenuItem>
                      )}

                      <DropdownMenuSeparator />

                      <DropdownMenuItem
                        onClick={() => handleDuplicate(listing.id)}
                        className="font-body"
                      >
                        <Copy className="mr-2 size-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleShare(listing)}
                        className="font-body"
                      >
                        <Share2 className="mr-2 size-4" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => showQrCode(listing.id)}
                        className="font-body"
                      >
                        <QrCode className="mr-2 size-4" />
                        QR Code
                      </DropdownMenuItem>

                      {listing.status !== 'removed' && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() =>
                              handleStatusChange(listing.id, 'removed')
                            }
                            className="font-body text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 size-4" />
                            Remove
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Listing QR Code</DialogTitle>
          </DialogHeader>
          {qrListingId && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="rounded-lg bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${APP_URL}/listings/${qrListingId}`)}&bgcolor=FFFFFF&color=0A0A0F`}
                  alt="QR Code"
                  width={200}
                  height={200}
                />
              </div>
              <p className="font-body text-xs text-muted-foreground">
                Scan to view listing
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  copyToClipboard(
                    `${APP_URL}/listings/${qrListingId}`
                  )
                }
                className="font-body"
              >
                Copy Link
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
