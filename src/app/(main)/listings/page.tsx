'use client'

import Link from 'next/link'
import { useEffect, useState, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Plus,
  Edit,
  Pencil,
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
  Square,
  CheckSquare,
  AlertTriangle,
  Search,
  Table2,
  X,
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
import { bulkDeleteListings } from '@/app/actions/import'
import { getActiveTier } from '@/app/actions/tier'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { APP_URL, LISTING_CONDITIONS, EQUIPMENT_CATEGORIES } from '@/lib/constants'
import { BulkEditPanel } from './components/bulk-edit-panel'
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
  const searchParams = useSearchParams()
  const filterNoMedia = searchParams.get('filter') === 'no-media'
  const { user } = useAuthStore()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [qrListingId, setQrListingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkEditOpen, setBulkEditOpen] = useState(false)
  const [isPro, setIsPro] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [conditionFilter, setConditionFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')

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
    // Check tier for bulk edit
    getActiveTier(user.id).then((tier) => {
      setIsPro(['pro', 'business', 'enterprise', 'premium', 'boost'].includes(tier))
    })
  }, [user])

  const displayListings = useMemo(() => {
    let result = listings
    if (filterNoMedia) result = result.filter(l => l.status === 'active' && !l.has_media)
    const q = searchQuery.toLowerCase().trim()
    if (q) result = result.filter(l => l.title.toLowerCase().includes(q))
    if (statusFilter !== 'all') result = result.filter(l => l.status === statusFilter)
    if (conditionFilter !== 'all') result = result.filter(l => l.condition === conditionFilter)
    if (categoryFilter !== 'all') result = result.filter(l => l.category === categoryFilter)
    return result
  }, [listings, filterNoMedia, searchQuery, statusFilter, conditionFilter, categoryFilter])

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || conditionFilter !== 'all' || categoryFilter !== 'all'

  const selectableListings = listings.filter(l => l.status !== 'removed')
  const allSelected = selectableListings.length > 0 && selectableListings.every(l => selectedIds.has(l.id))

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(selectableListings.map(l => l.id)))
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    try {
      const result = await bulkDeleteListings(Array.from(selectedIds))
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(`${result.deletedCount} listing${result.deletedCount !== 1 ? 's' : ''} removed`)
        setListings(prev => prev.map(l =>
          selectedIds.has(l.id) ? { ...l, status: 'removed' } : l
        ))
        setSelectedIds(new Set())
      }
    } catch {
      toast.error('Failed to delete listings')
    }
    setBulkDeleting(false)
  }

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

      {filterNoMedia && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          <p className="flex-1 text-sm font-medium text-amber-600 dark:text-amber-400">
            Showing listings hidden from search (no photos or videos)
          </p>
          <Link href="/listings" className="shrink-0 text-xs font-medium text-muted-foreground hover:text-foreground">
            Show all
          </Link>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      {!loading && listings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-56">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search your listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 font-body text-sm"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 font-body text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-body">All Status</SelectItem>
              <SelectItem value="active" className="font-body">Active</SelectItem>
              <SelectItem value="draft" className="font-body">Draft</SelectItem>
              <SelectItem value="sold" className="font-body">Sold</SelectItem>
              <SelectItem value="expired" className="font-body">Expired</SelectItem>
              <SelectItem value="removed" className="font-body">Removed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={conditionFilter} onValueChange={setConditionFilter}>
            <SelectTrigger className="w-32 font-body text-sm">
              <SelectValue placeholder="Condition" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-body">All Condition</SelectItem>
              {LISTING_CONDITIONS.map((c) => (
                <SelectItem key={c.value} value={c.value} className="font-body">
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44 font-body text-sm">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="font-body">All Categories</SelectItem>
              {EQUIPMENT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c} className="font-body">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearchQuery('')
                setStatusFilter('all')
                setConditionFilter('all')
                setCategoryFilter('all')
              }}
              className="flex items-center gap-1 font-body text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" />
              Clear filters
            </button>
          )}
          <Button variant="outline" size="sm" asChild className="ml-auto font-body">
            <Link href="/listings/bulk-edit">
              <Table2 className="mr-1.5 size-3.5" />
              Bulk Edit Listings
            </Link>
          </Button>
        </div>
      )}

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
              <Link href="/listings/create">
                <Plus className="mr-2 size-4" />
                Create Your First Listing
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {/* Bulk Actions Bar */}
          {listings.length > 1 && (
            <div className="flex items-center gap-3">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 rounded-md px-2 py-1 font-body text-sm text-muted-foreground hover:text-foreground"
              >
                {allSelected ? (
                  <CheckSquare className="size-4 text-primary" />
                ) : (
                  <Square className="size-4" />
                )}
                {selectedIds.size > 0
                  ? `${selectedIds.size} selected`
                  : 'Select all'}
              </button>
              {selectedIds.size > 0 && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setBulkEditOpen(true)}
                    className="font-body"
                  >
                    <Pencil className="mr-1.5 size-3" />
                    Edit {selectedIds.size} listing{selectedIds.size !== 1 ? 's' : ''}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="font-body"
                  >
                    {bulkDeleting ? (
                      <Loader2 className="mr-1.5 size-3 animate-spin" />
                    ) : (
                      <Trash2 className="mr-1.5 size-3" />
                    )}
                    Remove {selectedIds.size} listing{selectedIds.size !== 1 ? 's' : ''}
                  </Button>
                </>
              )}
            </div>
          )}

          {displayListings.map((listing) => (
            <Card key={listing.id} className="border-border bg-card">
              <CardContent className="flex items-center gap-4 p-4">
                {/* Select Checkbox */}
                {listing.status !== 'removed' && listings.length > 1 && (
                  <button
                    onClick={() => toggleSelect(listing.id)}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    {selectedIds.has(listing.id) ? (
                      <CheckSquare className="size-5 text-primary" />
                    ) : (
                      <Square className="size-5" />
                    )}
                  </button>
                )}

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
                    {!listing.has_media && listing.status === 'active' && (
                      <Link href={`/listings/${listing.id}/edit?step=photos`}>
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          No media — hidden
                        </span>
                      </Link>
                    )}
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
                    {listing.listing_quality_score != null && (
                      <span> &middot; Score: {listing.listing_quality_score}</span>
                    )}
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

      {/* Bulk Edit Panel */}
      <BulkEditPanel
        open={bulkEditOpen}
        onClose={() => setBulkEditOpen(false)}
        selectedIds={Array.from(selectedIds)}
        selectedListings={listings
          .filter((l) => selectedIds.has(l.id))
          .map((l) => ({
            id: l.id,
            title: l.title,
            price_cents: l.price_cents,
            condition: l.condition,
          }))}
        isPro={isPro}
        onSuccess={() => {
          setSelectedIds(new Set())
          router.refresh()
        }}
      />

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
