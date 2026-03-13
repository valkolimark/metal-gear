'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Shield, Eye, Heart, AlertTriangle, Trash2, Flag } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  getAdminListingDetail,
  adminUpdateListing,
  adminFlagListing,
  adminClearFraudFlag,
  adminDeleteListing,
} from '../../actions'

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  draft: 'bg-zinc-500/20 text-zinc-400',
  flagged: 'bg-red-500/20 text-red-400',
  pending_review: 'bg-amber-500/20 text-amber-400',
  expired: 'bg-zinc-500/20 text-zinc-400',
  sold: 'bg-blue-500/20 text-blue-400',
}

export default function AdminListingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const listingId = params.id as string

  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminListingDetail>> | null>(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [status, setStatus] = useState('')
  const [featured, setFeatured] = useState(false)
  const [adminBoost, setAdminBoost] = useState('0')
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    async function loadData() {
      const result = await getAdminListingDetail(listingId)
      setData(result)
      if (result.listing) {
        setStatus(result.listing.status)
        setFeatured(result.listing.is_featured)
        setAdminBoost(String(result.listing.admin_boost))
      }
    }
    loadData()
  }, [listingId])

  async function handleSave() {
    setSaving(true)
    try {
      await adminUpdateListing(listingId, {
        status,
        is_featured: featured,
        admin_boost: Math.min(100, Math.max(0, parseInt(adminBoost) || 0)),
      })
      toast.success('Listing updated')
      const result = await getAdminListingDetail(listingId)
      setData(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    }
    setSaving(false)
  }

  async function handleFlag() {
    const reason = prompt('Enter flag reason:')
    if (!reason) return
    try {
      await adminFlagListing(listingId, reason)
      toast.success('Listing flagged')
      const result = await getAdminListingDetail(listingId)
      setData(result)
      if (result.listing) {
        setStatus(result.listing.status)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to flag')
    }
  }

  async function handleClearFraud() {
    try {
      await adminClearFraudFlag(listingId)
      toast.success('Fraud flag cleared')
      const result = await getAdminListingDetail(listingId)
      setData(result)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear flag')
    }
  }

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    try {
      await adminDeleteListing(listingId)
      toast.success('Listing deleted')
      router.push('/admin/listings')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete')
    }
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="font-body text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const { listing, images, seller, viewCount, auditLog } = data

  if (!listing) {
    return (
      <div className="py-20 text-center">
        <p className="font-body text-muted-foreground">Listing not found</p>
      </div>
    )
  }

  const specs = listing.specifications as Record<string, string> | null

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="font-display text-2xl font-bold text-foreground truncate">
          {listing.title}
        </h1>
        <Badge className={`border-0 text-xs uppercase ${STATUS_COLORS[listing.status] || 'bg-zinc-500/20 text-zinc-400'}`}>
          {listing.status.replace('_', ' ')}
        </Badge>
      </div>

      {/* 3-column grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ─── Left Column (2/3 width) ─────────────────────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Image Gallery */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Images</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {images.length > 0 ? (
                <>
                  <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={images[selectedImage].url}
                      alt={listing.title}
                      fill
                      className="object-contain"
                    />
                  </div>
                  {images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto">
                      {images.map((img, i) => (
                        <button
                          key={img.id}
                          onClick={() => setSelectedImage(i)}
                          className={`relative size-16 shrink-0 overflow-hidden rounded-md border-2 ${
                            i === selectedImage ? 'border-primary' : 'border-transparent'
                          }`}
                        >
                          <Image
                            src={img.url}
                            alt=""
                            fill
                            className="object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex aspect-video items-center justify-center rounded-lg bg-muted">
                  <p className="font-body text-sm text-muted-foreground">No images</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Fraud Flag Banner */}
          {listing.ai_fraud_flagged && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-400" />
              <div className="flex-1">
                <p className="font-display text-sm font-semibold text-red-400">
                  AI Fraud Flag
                </p>
                <p className="mt-1 font-body text-sm text-red-300/80">
                  {listing.ai_fraud_reason || 'No reason provided'}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="shrink-0 border-red-500/30 text-red-400 hover:bg-red-500/20"
                onClick={handleClearFraud}
              >
                Clear Flag
              </Button>
            </div>
          )}

          {/* Listing Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-body text-xs text-muted-foreground">Description</p>
                <p className="mt-1 font-body text-sm text-foreground whitespace-pre-wrap">
                  {listing.description || 'No description'}
                </p>
              </div>

              <div className="h-px bg-border" />

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="font-body text-xs text-muted-foreground">Category</p>
                  <p className="mt-0.5 font-body text-sm text-foreground">
                    {listing.category?.replace(/_/g, ' ') || '--'}
                  </p>
                </div>
                <div>
                  <p className="font-body text-xs text-muted-foreground">Condition</p>
                  <p className="mt-0.5 font-body text-sm text-foreground">
                    {listing.condition?.replace(/_/g, ' ') || '--'}
                  </p>
                </div>
                <div>
                  <p className="font-body text-xs text-muted-foreground">Price</p>
                  <p className="mt-0.5 font-body text-sm text-foreground">
                    {listing.contact_for_price
                      ? 'Contact for price'
                      : listing.price_cents
                        ? `$${(listing.price_cents / 100).toLocaleString()}`
                        : '--'}
                  </p>
                </div>
                <div>
                  <p className="font-body text-xs text-muted-foreground">Quantity</p>
                  <p className="mt-0.5 font-body text-sm text-foreground">{listing.quantity}</p>
                </div>
                <div>
                  <p className="font-body text-xs text-muted-foreground">Location</p>
                  <p className="mt-0.5 font-body text-sm text-foreground">
                    {listing.location_city}, {listing.location_state}
                  </p>
                </div>
                <div>
                  <p className="font-body text-xs text-muted-foreground">Industry</p>
                  <p className="mt-0.5 font-body text-sm text-foreground">
                    {listing.industry?.replace(/_/g, ' ') || '--'}
                  </p>
                </div>
                <div>
                  <p className="font-body text-xs text-muted-foreground">Created</p>
                  <p className="mt-0.5 font-body text-sm text-foreground">
                    {new Date(listing.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="font-body text-xs text-muted-foreground">SKU</p>
                  <p className="mt-0.5 font-body text-sm text-foreground">
                    {listing.sku || '--'}
                  </p>
                </div>
              </div>

              {/* Specifications */}
              {specs && Object.keys(specs).length > 0 && (
                <>
                  <div className="h-px bg-border" />
                  <div>
                    <p className="font-body text-xs text-muted-foreground mb-2">Specifications</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(specs).map(([key, value]) => (
                        <div key={key} className="rounded-md bg-muted px-3 py-2">
                          <p className="font-body text-[10px] text-muted-foreground uppercase">
                            {key.replace(/_/g, ' ')}
                          </p>
                          <p className="font-body text-sm text-foreground">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Right Column (1/3 width) ────────────────────────────── */}
        <div className="space-y-6">
          {/* Seller Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Seller</CardTitle>
            </CardHeader>
            <CardContent>
              {seller ? (
                <Link
                  href={`/admin/users/${seller.id}`}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent"
                >
                  <div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-muted">
                    {seller.avatar_url ? (
                      <Image
                        src={seller.avatar_url}
                        alt=""
                        width={40}
                        height={40}
                        className="size-full object-cover"
                      />
                    ) : (
                      <span className="font-display text-sm text-muted-foreground">
                        {(seller.full_name || '?')[0]}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-body text-sm font-medium text-foreground">
                      {seller.full_name || 'Unknown'}
                    </p>
                    <Badge className="mt-0.5 border-0 bg-primary/20 text-primary font-body text-[10px] uppercase">
                      {seller.subscription_tier || 'free'}
                    </Badge>
                  </div>
                </Link>
              ) : (
                <p className="font-body text-sm text-muted-foreground">Seller not found</p>
              )}
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Stats</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted p-3 text-center">
                <Eye className="mx-auto mb-1 size-4 text-blue-400" />
                <p className="font-display text-lg font-bold">{viewCount}</p>
                <p className="font-body text-[10px] text-muted-foreground">Views</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <Heart className="mx-auto mb-1 size-4 text-red-400" />
                <p className="font-display text-lg font-bold">{listing.favorites_count}</p>
                <p className="font-body text-[10px] text-muted-foreground">Favorites</p>
              </div>
            </CardContent>
          </Card>

          {/* Action Panel */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div className="space-y-1.5">
                <p className="font-body text-xs text-muted-foreground">Status</p>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="font-body text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="flagged">Flagged</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Featured Toggle */}
              <div className="flex items-center justify-between">
                <p className="font-body text-xs text-muted-foreground">Featured</p>
                <button
                  onClick={() => setFeatured(!featured)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    featured ? 'bg-primary' : 'bg-white/10'
                  }`}
                >
                  <span
                    className={`inline-block size-3.5 transform rounded-full bg-white transition-transform ${
                      featured ? 'translate-x-[18px]' : 'translate-x-[3px]'
                    }`}
                  />
                </button>
              </div>

              {/* Admin Boost */}
              <div className="space-y-1.5">
                <p className="font-body text-xs text-muted-foreground">Admin Boost (0-100)</p>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={adminBoost}
                  onChange={(e) => setAdminBoost(e.target.value)}
                  className="font-body text-sm"
                />
              </div>

              <Button
                size="sm"
                className="w-full bg-primary text-white hover:bg-primary/90"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>

              <div className="h-px bg-border" />

              {/* Flag */}
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={handleFlag}
              >
                <Flag className="mr-1.5 size-3" />
                Flag Listing
              </Button>

              {/* Delete */}
              <Button
                size="sm"
                variant="destructive"
                className="w-full"
                onClick={handleDelete}
              >
                <Trash2 className="mr-1.5 size-3" />
                {confirmDelete ? 'Confirm Delete' : 'Delete Listing'}
              </Button>
              {confirmDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-muted-foreground"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Admin Notes */}
          {listing.admin_flag_reason && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="font-display text-base">Admin Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-body text-sm text-foreground whitespace-pre-wrap">
                  {listing.admin_flag_reason}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ─── Below Grid: Audit Log ──────────────────────────────────── */}
      {auditLog.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Shield className="size-4 text-purple-400" />
              Audit Log
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded px-3 py-2 hover:bg-accent"
                >
                  <div>
                    <p className="font-body text-sm text-foreground">{entry.action}</p>
                    {entry.metadata && typeof entry.metadata === 'object' && (
                      <p className="font-body text-xs text-muted-foreground mt-0.5">
                        {JSON.stringify(entry.metadata)}
                      </p>
                    )}
                  </div>
                  <p className="font-body text-xs text-muted-foreground shrink-0 ml-4">
                    {new Date(entry.created_at || '').toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
