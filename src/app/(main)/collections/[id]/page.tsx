'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  FolderOpen,
  Loader2,
  MapPin,
  Trash2,
  Globe,
  Lock,
  ArrowLeft,
  Share2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useAuthStore } from '@/stores/auth-store'
import {
  getCollection,
  removeFromCollection,
} from '@/app/actions/collections'
import { APP_URL } from '@/lib/constants'

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [collection, setCollection] = useState<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const isOwner = user?.id === collection?.user_id

  useEffect(() => {
    async function load() {
      const result = await getCollection(id)
      if ('error' in result) {
        toast.error(result.error)
        router.push('/collections')
        return
      }
      setCollection(result.collection)
      setItems(result.items || [])
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleRemoveItem(listingId: string) {
    const result = await removeFromCollection(id, listingId)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      setItems((prev) => prev.filter((i) => i.listing_id !== listingId))
      toast.success('Removed from collection')
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(`${APP_URL}/collections/${id}`)
    toast.success('Link copied to clipboard')
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!collection) return null

  const owner = collection.owner

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Back */}
      {isOwner && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/collections')}
          className="font-body text-muted-foreground"
        >
          <ArrowLeft className="mr-1 size-3.5" />
          Back to Collections
        </Button>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <FolderOpen className="size-7 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
              {collection.name}
            </h1>
            {collection.description && (
              <p className="mt-1 font-body text-muted-foreground">
                {collection.description}
              </p>
            )}
            <div className="mt-2 flex items-center gap-3">
              <Badge
                variant="outline"
                className="gap-1 font-body text-[11px]"
              >
                {collection.is_public ? (
                  <Globe className="size-2.5" />
                ) : (
                  <Lock className="size-2.5" />
                )}
                {collection.is_public ? 'Public' : 'Private'}
              </Badge>
              <span className="font-body text-xs text-muted-foreground">
                {items.length} item{items.length !== 1 ? 's' : ''}
              </span>
              {owner && !isOwner && (
                <Link
                  href={`/profile/${collection.user_id}`}
                  className="flex items-center gap-1.5 font-body text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Avatar className="size-4">
                    <AvatarImage src={owner.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-[8px] text-primary">
                      {(owner.display_name || owner.full_name || '?')[0]}
                    </AvatarFallback>
                  </Avatar>
                  by {owner.display_name || owner.full_name}
                </Link>
              )}
            </div>
          </div>
        </div>
        {collection.is_public && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="font-body"
          >
            <Share2 className="mr-1.5 size-3.5" />
            Share
          </Button>
        )}
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <FolderOpen className="size-12 text-muted-foreground" />
            <p className="font-display text-lg font-semibold text-foreground">
              This collection is empty
            </p>
            <p className="max-w-md text-center font-body text-sm text-muted-foreground">
              {isOwner
                ? 'Add listings to this collection from listing pages.'
                : 'No items have been added yet.'}
            </p>
            {isOwner && (
              <Button asChild className="font-body">
                <Link href="/search">Browse Equipment</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const listing = item.listings
            if (!listing) return null
            return (
              <Card
                key={item.id}
                className="group relative border-border bg-card transition-colors hover:border-primary/50"
              >
                <Link href={`/listings/${listing.id}`}>
                  <CardContent className="flex flex-col p-4">
                    <p className="truncate pr-8 font-body font-medium text-foreground">
                      {listing.title}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className="font-body text-[11px]"
                      >
                        {listing.category}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="font-body text-[11px] capitalize"
                      >
                        {listing.condition.replace('_', ' ')}
                      </Badge>
                    </div>
                    {item.notes && (
                      <p className="mt-2 line-clamp-2 font-body text-xs italic text-muted-foreground">
                        &ldquo;{item.notes}&rdquo;
                      </p>
                    )}
                    <p className="mt-3 font-display text-lg font-bold text-primary">
                      {listing.contact_for_price
                        ? 'Contact'
                        : listing.price_cents
                          ? `$${(listing.price_cents / 100).toLocaleString()}`
                          : 'Free'}
                    </p>
                    <p className="mt-1 flex items-center gap-1 font-body text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {listing.location_city}, {listing.location_state}
                    </p>
                  </CardContent>
                </Link>
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(listing.id)}
                    className="absolute right-2 top-2 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
