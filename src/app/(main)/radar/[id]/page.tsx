import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import {
  FolderOpen,
  Globe,
  Lock,
  ArrowLeft,
  Share2,
  MapPin,
  Wrench,
  FileText,
  Play,
  Package,
  Trash2,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { RadarListActions } from './components/radar-list-actions'

export default async function RadarListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  // Fetch collection
  const { data: collection, error } = await admin
    .from('collections')
    .select('*, profiles:user_id (display_name, full_name, avatar_url)')
    .eq('id', id)
    .single()

  if (error || !collection) notFound()

  // Only owner or public lists are accessible
  const isOwner = user.id === collection.user_id
  if (!isOwner && !collection.is_public) notFound()

  // Fetch items with listing data
  const { data: items } = await admin
    .from('collection_items')
    .select(`
      id,
      added_at,
      item_type,
      listing_id,
      feed_post_id,
      video_ref_id,
      video_source_type,
      video_thumbnail_url,
      video_title,
      video_listing_id,
      video_post_id,
      notes,
      listings!collection_items_listing_id_fkey (
        id, title, price_cents, condition, location_city, location_state,
        status, category, contact_for_price,
        listing_images (url, position)
      ),
      feed_posts!collection_items_feed_post_id_fkey (
        id, content, created_at, reactions_count, comments_count, is_deleted,
        feed_post_media (url, media_type, thumbnail_url, sort_order)
      )
    `)
    .eq('collection_id', id)
    .order('added_at', { ascending: false })

  const owner = (collection as { profiles: { display_name: string | null; full_name: string | null; avatar_url: string | null } | null }).profiles

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Back */}
      {isOwner && (
        <Button
          variant="ghost"
          size="sm"
          asChild
          className="font-body text-muted-foreground"
        >
          <Link href="/radar?tab=lists">
            <ArrowLeft className="mr-1 size-3.5" />
            Back to Radar
          </Link>
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
              <Badge variant="outline" className="gap-1 font-body text-[11px]">
                {collection.is_public ? <Globe className="size-2.5" /> : <Lock className="size-2.5" />}
                {collection.is_public ? 'Public' : 'Private'}
              </Badge>
              <span className="font-body text-xs text-muted-foreground">
                {(items ?? []).length} item{(items ?? []).length !== 1 ? 's' : ''}
              </span>
              {owner && !isOwner && (
                <span className="flex items-center gap-1.5 font-body text-xs text-muted-foreground">
                  <Avatar className="size-4">
                    <AvatarImage src={owner.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/20 text-[8px] text-primary">
                      {(owner.display_name || owner.full_name || '?')[0]}
                    </AvatarFallback>
                  </Avatar>
                  by {owner.display_name || owner.full_name}
                </span>
              )}
            </div>
          </div>
        </div>
        <RadarListActions
          collectionId={id}
          isPublic={!!collection.is_public}
          isOwner={isOwner}
        />
      </div>

      {/* Items */}
      {(items ?? []).length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <FolderOpen className="size-12 text-muted-foreground" />
            <p className="font-display text-lg font-semibold text-foreground">
              This radar list is empty
            </p>
            <p className="max-w-md text-center font-body text-sm text-muted-foreground">
              {isOwner
                ? 'Add listings to this radar list from listing pages.'
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
        <div className="space-y-2">
          {(items ?? []).map((item) => {
            if (item.item_type === 'listing') {
              const listing = item.listings as { id: string; title: string; price_cents: number | null; condition: string; location_city: string; location_state: string; status: string; category: string; contact_for_price: boolean; listing_images: Array<{ url: string; position: number }> } | null
              if (!listing) {
                return (
                  <Card key={item.id} className="border-border bg-card opacity-60">
                    <CardContent className="flex items-center gap-3 p-4">
                      <Wrench className="size-4 text-muted-foreground" />
                      <p className="font-body text-sm text-muted-foreground">
                        This listing is no longer available
                      </p>
                    </CardContent>
                  </Card>
                )
              }
              const imageUrl = listing.listing_images?.sort((a, b) => a.position - b.position)?.[0]?.url
              const price = listing.contact_for_price
                ? 'Contact'
                : listing.price_cents
                  ? `$${(listing.price_cents / 100).toLocaleString()}`
                  : 'Free'

              return (
                <Link key={item.id} href={`/listings/${listing.id}`}>
                  <Card className="border-border bg-card transition-colors hover:border-primary/50">
                    <CardContent className="flex items-center gap-4 p-3">
                      <Wrench className="size-4 shrink-0 text-muted-foreground" />
                      {imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={imageUrl}
                          alt={listing.title}
                          className="size-12 shrink-0 rounded-lg object-cover ring-1 ring-border"
                        />
                      ) : (
                        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface ring-1 ring-border">
                          <Package className="size-5 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body text-sm font-medium text-foreground">
                          {listing.title}
                        </p>
                        <p className="mt-0.5 flex items-center gap-1 font-body text-xs text-muted-foreground">
                          <MapPin className="size-3" />
                          {listing.location_city}, {listing.location_state}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-display text-sm font-bold text-primary">{price}</p>
                        <Badge variant="outline" className="mt-0.5 font-body text-[10px] capitalize">
                          {listing.condition.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            }

            if (item.item_type === 'feed_post') {
              const post = item.feed_posts as { id: string; content: string; created_at: string; reactions_count: number; comments_count: number; is_deleted: boolean } | null
              if (!post || post.is_deleted) {
                return (
                  <Card key={item.id} className="border-border bg-card opacity-60">
                    <CardContent className="flex items-center gap-3 p-4">
                      <FileText className="size-4 text-muted-foreground" />
                      <p className="font-body text-sm text-muted-foreground">
                        This post is no longer available
                      </p>
                    </CardContent>
                  </Card>
                )
              }

              return (
                <Link key={item.id} href={`/feed#post-${post.id}`}>
                  <Card className="border-border bg-card transition-colors hover:border-primary/50">
                    <CardContent className="flex items-center gap-4 p-3">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 font-body text-sm text-foreground whitespace-pre-wrap">
                          {post.content}
                        </p>
                        <div className="mt-1 flex items-center gap-3 font-body text-xs text-muted-foreground">
                          <span>{post.reactions_count} likes</span>
                          <span>{post.comments_count} comments</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            }

            if (item.item_type === 'video') {
              const linkHref = item.video_listing_id
                ? `/listings/${item.video_listing_id}`
                : item.video_post_id
                  ? `/feed#post-${item.video_post_id}`
                  : '#'

              return (
                <Link key={item.id} href={linkHref}>
                  <Card className="border-border bg-card transition-colors hover:border-primary/50">
                    <CardContent className="flex items-center gap-4 p-3">
                      <Play className="size-4 shrink-0 text-muted-foreground" />
                      {item.video_thumbnail_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.video_thumbnail_url}
                          alt={item.video_title || 'Video'}
                          className="h-12 w-20 shrink-0 rounded-lg object-cover ring-1 ring-border"
                        />
                      ) : (
                        <div className="flex h-12 w-20 shrink-0 items-center justify-center rounded-lg bg-surface ring-1 ring-border">
                          <Play className="size-5 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body text-sm font-medium text-foreground">
                          {item.video_title || 'Untitled video'}
                        </p>
                        <p className="mt-0.5 font-body text-xs text-muted-foreground">
                          {item.video_source_type === 'listing_video' ? 'From listing' : 'From post'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            }

            return null
          })}
        </div>
      )}
    </div>
  )
}
