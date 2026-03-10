'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Eye,
  CheckCircle,
  Flag,
  Star,
  StarOff,
  Zap,
  Clock,
  Trash2,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  getAdminListings,
  adminUpdateListing,
  adminBulkUpdateListings,
  adminDeleteListing,
  adminClearFraudFlag,
  adminFlagListing,
} from '../actions'

// ─── Status badge colors ────────────────────────────────────────────

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  draft: 'bg-zinc-500/20 text-zinc-400',
  pending_review: 'bg-amber-500/20 text-amber-400',
  flagged: 'bg-red-500/20 text-red-400',
  sold: 'bg-blue-500/20 text-blue-400',
  expired: 'bg-zinc-500/10 text-zinc-500',
}

// ─── Types ──────────────────────────────────────────────────────────

type ListingRow = {
  id: string
  title: string
  status: string
  price_cents: number | null
  condition: string
  category: string
  created_at: string
  seller_id: string
  seller_name: string
  ai_fraud_flagged: boolean
  ai_fraud_reason: string | null
  admin_reviewed_at: string | null
  is_featured: boolean
  admin_boost: number
  specifications: Record<string, unknown> | null
}

type ActiveTab = 'all' | 'fraud'

// ─── Helpers ────────────────────────────────────────────────────────

function formatPrice(cents: number | null): string {
  if (cents === null || cents === 0) return 'Contact'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function formatCondition(condition: string): string {
  return condition
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatCategory(category: string): string {
  return category
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Component ──────────────────────────────────────────────────────

export default function AdminListingsPage() {
  // All Listings tab state
  const [listings, setListings] = useState<ListingRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [fraudFilter, setFraudFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Fraud Queue tab state
  const [fraudQueue, setFraudQueue] = useState<ListingRow[]>([])
  const [fraudLoading, setFraudLoading] = useState(true)
  const [fraudRefreshKey, setFraudRefreshKey] = useState(0)

  // UI state
  const [activeTab, setActiveTab] = useState<ActiveTab>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  // ─── Data fetching: All Listings ──────────────────────────────────

  useEffect(() => {
    let cancelled = false
    async function fetchListings() {
      setLoading(true)
      try {
        const fraudParam =
          fraudFilter === 'flagged'
            ? true
            : fraudFilter === 'clean'
              ? false
              : undefined
        const result = await getAdminListings({
          page,
          search: search || undefined,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          ai_fraud_flagged: fraudParam,
        })
        if (!cancelled) {
          setListings(result.listings as ListingRow[])
          setTotal(result.total)
          setTotalPages(result.totalPages)
        }
      } catch {
        if (!cancelled) toast.error('Failed to load listings')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchListings()
    return () => {
      cancelled = true
    }
  }, [page, search, statusFilter, fraudFilter, refreshKey])

  // ─── Data fetching: Fraud Queue ───────────────────────────────────

  useEffect(() => {
    let cancelled = false
    async function fetchFraudQueue() {
      setFraudLoading(true)
      try {
        const result = await getAdminListings({
          page: 1,
          ai_fraud_flagged: true,
        })
        if (!cancelled) {
          // Filter to only unreviewed fraud-flagged listings
          const unreviewed = (result.listings as ListingRow[]).filter(
            (l) => !l.admin_reviewed_at
          )
          setFraudQueue(unreviewed)
        }
      } catch {
        if (!cancelled) toast.error('Failed to load fraud queue')
      } finally {
        if (!cancelled) setFraudLoading(false)
      }
    }
    fetchFraudQueue()
    return () => {
      cancelled = true
    }
  }, [fraudRefreshKey])

  // ─── Actions ──────────────────────────────────────────────────────

  function refresh() {
    setRefreshKey((k) => k + 1)
  }

  function refreshFraud() {
    setFraudRefreshKey((k) => k + 1)
  }

  function handleSearch() {
    setPage(1)
    refresh()
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === listings.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(listings.map((l) => l.id)))
    }
  }

  async function handleBulkAction(action: 'approve' | 'flag' | 'feature' | 'expire') {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    setBulkLoading(true)
    try {
      switch (action) {
        case 'approve':
          await adminBulkUpdateListings(ids, { status: 'active' })
          toast.success(`${ids.length} listing(s) approved`)
          break
        case 'flag':
          await adminBulkUpdateListings(ids, { status: 'flagged' })
          toast.success(`${ids.length} listing(s) flagged`)
          break
        case 'feature':
          await adminBulkUpdateListings(ids, { is_featured: true })
          toast.success(`${ids.length} listing(s) featured`)
          break
        case 'expire':
          await adminBulkUpdateListings(ids, { status: 'expired' })
          toast.success(`${ids.length} listing(s) expired`)
          break
      }
      setSelectedIds(new Set())
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Bulk action failed')
    } finally {
      setBulkLoading(false)
    }
  }

  async function handleApprove(id: string) {
    try {
      await adminUpdateListing(id, { status: 'active' })
      toast.success('Listing approved')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to approve')
    }
  }

  async function handleFlag(id: string) {
    const reason = window.prompt('Enter flag reason:')
    if (!reason) return
    try {
      await adminFlagListing(id, reason)
      toast.success('Listing flagged')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to flag')
    }
  }

  async function handleFeature(id: string, featured: boolean) {
    try {
      await adminUpdateListing(id, { is_featured: featured })
      toast.success(featured ? 'Listing featured' : 'Listing unfeatured')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update feature')
    }
  }

  async function handleSetBoost(id: string) {
    const input = window.prompt('Set boost value (0-100):', '0')
    if (input === null) return
    const boost = parseInt(input, 10)
    if (isNaN(boost) || boost < 0 || boost > 100) {
      toast.error('Boost must be a number between 0 and 100')
      return
    }
    try {
      await adminUpdateListing(id, { admin_boost: boost })
      toast.success(`Boost set to ${boost}`)
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to set boost')
    }
  }

  async function handleForceExpire(id: string) {
    try {
      await adminUpdateListing(id, { status: 'expired' })
      toast.success('Listing expired')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to expire')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Permanently delete this listing? This cannot be undone.')) return
    try {
      await adminDeleteListing(id)
      toast.success('Listing deleted')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  async function handleClearFraud(id: string) {
    try {
      await adminClearFraudFlag(id)
      toast.success('Fraud flag cleared')
      refresh()
      refreshFraud()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear fraud flag')
    }
  }

  async function handleFlagAndNotify(id: string) {
    try {
      await adminFlagListing(id, 'AI fraud detected — flagged by admin')
      toast.success('Listing flagged and seller notified')
      refreshFraud()
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to flag')
    }
  }

  async function handleFraudDelete(id: string) {
    if (!window.confirm('Permanently delete this fraud-flagged listing?')) return
    try {
      await adminDeleteListing(id)
      toast.success('Listing deleted')
      refreshFraud()
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">
          Listing Management
        </h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="font-body">
            {total} listings
          </Badge>
          {fraudQueue.length > 0 && (
            <Badge className="border-0 bg-red-500/20 text-red-400 font-body">
              {fraudQueue.length} fraud
            </Badge>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-[#0D0D14] p-1 border border-white/5 w-fit">
        <button
          onClick={() => setActiveTab('all')}
          className={`rounded-md px-4 py-2 font-body text-sm font-medium transition-colors ${
            activeTab === 'all'
              ? 'bg-white/10 text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          All Listings
        </button>
        <button
          onClick={() => { setActiveTab('fraud'); refreshFraud() }}
          className={`flex items-center gap-2 rounded-md px-4 py-2 font-body text-sm font-medium transition-colors ${
            activeTab === 'fraud'
              ? 'bg-white/10 text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Fraud Queue
          {fraudQueue.length > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-red-500/20 text-[10px] text-red-400">
              {fraudQueue.length}
            </span>
          )}
        </button>
      </div>

      {/* ─── All Listings Tab ──────────────────────────────────────── */}
      {activeTab === 'all' && (
        <>
          {/* Filters */}
          <Card className="border-white/5 bg-[#0D0D14]">
            <CardContent className="flex flex-wrap items-end gap-3 p-4">
              <div className="flex-1 min-w-[200px]">
                <Input
                  placeholder="Search listings..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="font-body"
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v)
                  setPage(1)
                  refresh()
                }}
              >
                <SelectTrigger className="w-[160px] font-body">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending_review">Pending Review</SelectItem>
                  <SelectItem value="flagged">Flagged</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={fraudFilter}
                onValueChange={(v) => {
                  setFraudFilter(v)
                  setPage(1)
                  refresh()
                }}
              >
                <SelectTrigger className="w-[160px] font-body">
                  <SelectValue placeholder="AI Fraud" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All fraud status</SelectItem>
                  <SelectItem value="flagged">Fraud flagged</SelectItem>
                  <SelectItem value="clean">Clean</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleSearch}>
                <Search className="mr-1 size-4" />
                Search
              </Button>
            </CardContent>
          </Card>

          {/* Bulk actions bar */}
          {selectedIds.size > 0 && (
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="flex items-center gap-3 p-3">
                <span className="font-body text-sm text-foreground">
                  {selectedIds.size} selected
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={bulkLoading}
                    onClick={() => handleBulkAction('approve')}
                    className="font-body text-xs"
                  >
                    <CheckCircle className="mr-1 size-3.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={bulkLoading}
                    onClick={() => handleBulkAction('flag')}
                    className="font-body text-xs"
                  >
                    <Flag className="mr-1 size-3.5" />
                    Flag
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={bulkLoading}
                    onClick={() => handleBulkAction('feature')}
                    className="font-body text-xs"
                  >
                    <Star className="mr-1 size-3.5" />
                    Feature
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={bulkLoading}
                    onClick={() => handleBulkAction('expire')}
                    className="font-body text-xs"
                  >
                    <Clock className="mr-1 size-3.5" />
                    Expire
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedIds(new Set())}
                  className="ml-auto font-body text-xs text-muted-foreground"
                >
                  Clear selection
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Listings Table */}
          <Card className="border-white/5 bg-[#0D0D14]">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-3 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={
                            listings.length > 0 &&
                            selectedIds.size === listings.length
                          }
                          onChange={toggleSelectAll}
                          className="size-4 rounded border-white/20 bg-transparent accent-primary"
                        />
                      </th>
                      <th className="px-3 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                        Title
                      </th>
                      <th className="px-3 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                        Seller
                      </th>
                      <th className="px-3 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                        Category
                      </th>
                      <th className="px-3 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                        Price
                      </th>
                      <th className="px-3 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                        Condition
                      </th>
                      <th className="px-3 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                        Status
                      </th>
                      <th className="px-3 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                        AI Fraud
                      </th>
                      <th className="px-3 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                        Posted
                      </th>
                      <th className="px-3 py-3 text-right font-body text-xs font-medium text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center">
                          <p className="font-body text-sm text-muted-foreground">
                            Loading listings...
                          </p>
                        </td>
                      </tr>
                    ) : listings.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="px-4 py-12 text-center">
                          <p className="font-body text-sm text-muted-foreground">
                            No listings found
                          </p>
                        </td>
                      </tr>
                    ) : (
                      listings.map((listing) => (
                        <tr
                          key={listing.id}
                          className={`border-b border-white/5 hover:bg-white/[0.02] transition-colors ${
                            selectedIds.has(listing.id)
                              ? 'bg-primary/[0.03]'
                              : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="px-3 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(listing.id)}
                              onChange={() => toggleSelect(listing.id)}
                              className="size-4 rounded border-white/20 bg-transparent accent-primary"
                            />
                          </td>

                          {/* Title */}
                          <td className="px-3 py-3 max-w-[240px]">
                            <Link
                              href={`/admin/listings/${listing.id}`}
                              className="font-body text-sm text-foreground hover:text-primary transition-colors line-clamp-1"
                            >
                              {listing.title}
                            </Link>
                            {listing.is_featured && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-amber-400">
                                <Star className="size-3 fill-amber-400" />
                                Featured
                              </span>
                            )}
                            {listing.admin_boost > 0 && (
                              <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-primary">
                                <Zap className="size-3" />
                                {listing.admin_boost}
                              </span>
                            )}
                          </td>

                          {/* Seller */}
                          <td className="px-3 py-3">
                            <span className="font-body text-sm text-muted-foreground">
                              {listing.seller_name}
                            </span>
                          </td>

                          {/* Category */}
                          <td className="px-3 py-3">
                            <span className="font-body text-xs text-muted-foreground">
                              {formatCategory(listing.category)}
                            </span>
                          </td>

                          {/* Price */}
                          <td className="px-3 py-3">
                            <span className="font-body text-sm font-medium text-foreground">
                              {formatPrice(listing.price_cents)}
                            </span>
                          </td>

                          {/* Condition */}
                          <td className="px-3 py-3">
                            <span className="font-body text-xs text-muted-foreground">
                              {formatCondition(listing.condition)}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-3 py-3">
                            <Badge
                              className={`border-0 font-body text-[10px] uppercase ${
                                STATUS_STYLES[listing.status] ||
                                'bg-zinc-500/20 text-zinc-400'
                              }`}
                            >
                              {listing.status.replace(/_/g, ' ')}
                            </Badge>
                          </td>

                          {/* AI Fraud */}
                          <td className="px-3 py-3">
                            {listing.ai_fraud_flagged ? (
                              <Badge className="border-0 bg-red-500/20 text-red-400 font-body text-[10px]">
                                <AlertTriangle className="mr-1 size-3" />
                                Flagged
                              </Badge>
                            ) : (
                              <span className="font-body text-xs text-zinc-500">
                                Clean
                              </span>
                            )}
                          </td>

                          {/* Posted */}
                          <td className="px-3 py-3">
                            <span className="font-body text-xs text-muted-foreground">
                              {new Date(listing.created_at).toLocaleDateString()}
                            </span>
                          </td>

                          {/* Actions dropdown */}
                          <td className="px-3 py-3 text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="size-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem asChild>
                                  <Link
                                    href={`/listings/${listing.id}`}
                                    target="_blank"
                                    className="flex items-center"
                                  >
                                    <ExternalLink className="mr-2 size-4" />
                                    View listing
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() =>
                                    window.open(
                                      `/admin/listings/${listing.id}`,
                                      '_self'
                                    )
                                  }
                                >
                                  <Eye className="mr-2 size-4" />
                                  Admin detail
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleApprove(listing.id)}
                                >
                                  <CheckCircle className="mr-2 size-4" />
                                  Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleFlag(listing.id)}
                                >
                                  <Flag className="mr-2 size-4" />
                                  Flag (enter reason)
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleFeature(
                                      listing.id,
                                      !listing.is_featured
                                    )
                                  }
                                >
                                  {listing.is_featured ? (
                                    <>
                                      <StarOff className="mr-2 size-4" />
                                      Unfeature
                                    </>
                                  ) : (
                                    <>
                                      <Star className="mr-2 size-4" />
                                      Feature
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleSetBoost(listing.id)}
                                >
                                  <Zap className="mr-2 size-4" />
                                  Set boost (0-100)
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleForceExpire(listing.id)}
                                >
                                  <Clock className="mr-2 size-4" />
                                  Force expire
                                </DropdownMenuItem>
                                {listing.ai_fraud_flagged && (
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleClearFraud(listing.id)
                                    }
                                  >
                                    <ShieldCheck className="mr-2 size-4" />
                                    Clear fraud flag
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(listing.id)}
                                  className="text-red-400 focus:text-red-400"
                                >
                                  <Trash2 className="mr-2 size-4" />
                                  Delete (superadmin)
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
                  <p className="font-body text-xs text-muted-foreground">
                    Page {page} of {totalPages} ({total} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="size-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="size-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* ─── Fraud Queue Tab ───────────────────────────────────────── */}
      {activeTab === 'fraud' && (
        <div className="space-y-4">
          {fraudLoading ? (
            <Card className="border-white/5 bg-[#0D0D14]">
              <CardContent className="p-8 text-center">
                <p className="font-body text-sm text-muted-foreground">
                  Loading fraud queue...
                </p>
              </CardContent>
            </Card>
          ) : fraudQueue.length === 0 ? (
            <Card className="border-white/5 bg-[#0D0D14]">
              <CardContent className="flex flex-col items-center gap-3 p-12">
                <ShieldCheck className="size-10 text-green-400/60" />
                <p className="font-body text-sm text-muted-foreground">
                  No unreviewed fraud-flagged listings. All clear.
                </p>
              </CardContent>
            </Card>
          ) : (
            fraudQueue.map((listing) => (
              <Card
                key={listing.id}
                className="border-red-500/10 bg-[#0D0D14] hover:border-red-500/20 transition-colors"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="size-4 text-red-400" />
                        <CardTitle className="font-display text-base text-foreground">
                          {listing.title}
                        </CardTitle>
                      </div>
                      <p className="font-body text-xs text-muted-foreground">
                        Seller: {listing.seller_name} | Posted:{' '}
                        {new Date(listing.created_at).toLocaleDateString()} |{' '}
                        {formatPrice(listing.price_cents)}
                      </p>
                    </div>
                    <Badge className="border-0 bg-red-500/20 text-red-400 font-body text-[10px] uppercase shrink-0">
                      AI Flagged
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Fraud reason */}
                  <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3">
                    <p className="font-body text-xs font-medium text-red-400 mb-1">
                      Fraud Reason
                    </p>
                    <p className="font-body text-sm text-muted-foreground">
                      {listing.ai_fraud_reason || 'No reason provided by AI analysis.'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleClearFraud(listing.id)}
                      className="font-body text-xs border-green-500/20 text-green-400 hover:bg-green-500/10"
                    >
                      <ShieldCheck className="mr-1.5 size-3.5" />
                      Clear
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFlagAndNotify(listing.id)}
                      className="font-body text-xs border-amber-500/20 text-amber-400 hover:bg-amber-500/10"
                    >
                      <Flag className="mr-1.5 size-3.5" />
                      Flag & Notify
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFraudDelete(listing.id)}
                      className="font-body text-xs border-red-500/20 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="mr-1.5 size-3.5" />
                      Delete
                    </Button>
                    <Link
                      href={`/admin/listings/${listing.id}`}
                      className="ml-auto"
                    >
                      <Button
                        size="sm"
                        variant="ghost"
                        className="font-body text-xs text-muted-foreground"
                      >
                        <Eye className="mr-1.5 size-3.5" />
                        View Detail
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  )
}
