'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Wrench,
  FileText,
  Play,
  FolderOpen,
  Radar,
  Globe,
  Lock,
  MapPin,
  Package,
  Plus,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RadarSaveButton } from '@/components/radar-save-button'

interface RadarPageClientProps {
  activeTab: string
  counts: { equipment: number; posts: number; videos: number }
  equipment: Array<{
    id: string
    created_at: string | null
    listing_id: string | null
    listings: {
      id: string
      title: string
      price_cents: number | null
      condition: string
      location_city: string
      location_state: string
      status: string
      has_media: boolean
      contact_for_price: boolean
      category: string
      listing_images: Array<{ url: string; position: number }>
    } | null
  }>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  posts: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  videos: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lists: any[]
  userId: string
}

const tabs = [
  { key: 'equipment', label: 'Equipment', icon: Wrench },
  { key: 'posts', label: 'Posts', icon: FileText },
  { key: 'videos', label: 'Videos', icon: Play },
  { key: 'lists', label: 'Lists', icon: FolderOpen },
] as const

export function RadarPageClient({
  activeTab,
  counts,
  equipment,
  posts,
  videos,
  lists,
  userId,
}: RadarPageClientProps) {
  const router = useRouter()

  function switchTab(key: string) {
    router.push(`/radar?tab=${key}`)
  }

  return (
    <>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          const count = tab.key === 'lists'
            ? lists.length
            : tab.key === 'posts'
              ? posts.length
              : counts[tab.key as keyof typeof counts]
          return (
            <button
              key={tab.key}
              onClick={() => switchTab(tab.key)}
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-body text-sm transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              )}
            >
              <tab.icon className="size-4" />
              {tab.label}
              {count > 0 && (
                <Badge variant="secondary" className="ml-1 font-body text-[10px] px-1.5 py-0">
                  {count}
                </Badge>
              )}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {activeTab === 'equipment' && (
        <EquipmentTab equipment={equipment} userId={userId} />
      )}
      {activeTab === 'posts' && <PostsTab posts={posts} userId={userId} />}
      {activeTab === 'videos' && <VideosTab videos={videos} />}
      {activeTab === 'lists' && <ListsTab lists={lists} />}
    </>
  )
}

function EquipmentTab({
  equipment,
  userId,
}: {
  equipment: RadarPageClientProps['equipment']
  userId: string
}) {
  if (equipment.length === 0) {
    return (
      <EmptyTab
        icon={Radar}
        title="Nothing saved yet"
        message="Hit the radar icon on any listing to save it here"
        actionLabel="Browse Equipment"
        actionHref="/search"
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {equipment.map((item) => {
        const listing = item.listings
        if (!listing) {
          return (
            <Card key={item.id} className="border-border bg-card opacity-60">
              <CardContent className="flex flex-col items-center gap-2 p-6">
                <Package className="size-8 text-muted-foreground" />
                <p className="font-body text-sm text-muted-foreground">
                  This listing is no longer available
                </p>
                <RadarSaveButton
                  itemType="listing"
                  itemId={item.listing_id!}
                  initialSaved={true}
                  userId={userId}
                  size="sm"
                />
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
          <div key={item.id} className="relative">
            <Link href={`/listings/${listing.id}`}>
              <Card className="h-full overflow-hidden border-border bg-card py-0 gap-0 transition-colors hover:border-primary/50">
                <CardContent className="flex flex-col p-0">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={imageUrl}
                      alt={listing.title}
                      className="h-40 w-full rounded-t-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-40 w-full items-center justify-center rounded-t-xl bg-surface">
                      <Package className="size-10 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="p-4">
                    <p className="truncate font-body text-sm font-medium text-foreground">
                      {listing.title}
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <Badge variant="outline" className="font-body text-[10px]">
                        {listing.category}
                      </Badge>
                      <Badge variant="outline" className="font-body text-[10px] capitalize">
                        {listing.condition.replace('_', ' ')}
                      </Badge>
                      {listing.status !== 'active' && (
                        <Badge variant="outline" className="font-body text-[10px] capitalize text-amber-500">
                          {listing.status}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 font-display text-lg font-bold text-primary">{price}</p>
                    <p className="mt-0.5 flex items-center gap-1 font-body text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {listing.location_city}, {listing.location_state}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <div className="absolute right-2 top-2 z-10">
              <RadarSaveButton
                itemType="listing"
                itemId={listing.id}
                initialSaved={true}
                userId={userId}
                size="sm"
                className="bg-black/40 hover:bg-black/60 text-white hover:text-white backdrop-blur-sm"
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function PostsTab({
  posts,
  userId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  posts: any[]
  userId: string
}) {
  if (posts.length === 0) {
    return (
      <EmptyTab
        icon={FileText}
        title="No posts saved"
        message="Hit the radar icon on any feed post to save it here"
        actionLabel="Go to Feed"
        actionHref="/feed"
      />
    )
  }

  return (
    <div className="space-y-3">
      {posts.map((item) => {
        const post = item.feed_posts
        if (!post || post.is_deleted) {
          return (
            <Card key={item.id} className="border-border bg-card py-0 gap-0 opacity-60">
              <CardContent className="p-4">
                <p className="font-body text-sm text-muted-foreground">
                  This post is no longer available
                </p>
              </CardContent>
            </Card>
          )
        }

        const media = post.feed_post_media?.[0]
        const author = post.author
        const company = post.company

        return (
          <Card key={item.id} className="border-border bg-card py-0 gap-0 transition-colors hover:border-primary/50">
            <CardContent className="flex gap-4 p-4">
              {media && (
                <div className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={media.thumbnail_url || media.url}
                    alt=""
                    className="size-16 rounded-lg object-cover ring-1 ring-border"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                {author && (
                  <p className="mb-1 truncate font-body text-xs font-medium text-foreground">
                    {author.display_name}
                    {company && (
                      <span className="ml-1 text-muted-foreground">· {company.name}</span>
                    )}
                  </p>
                )}
                <p className="line-clamp-3 font-body text-sm text-foreground whitespace-pre-wrap">
                  {post.content}
                </p>
                <div className="mt-2 flex items-center gap-3 font-body text-xs text-muted-foreground">
                  <span>{post.reactions_count} likes</span>
                  <span>{post.comments_count} comments</span>
                </div>
              </div>
              <div className="shrink-0">
                <RadarSaveButton
                  itemType="feed_post"
                  itemId={post.id}
                  initialSaved={true}
                  userId={userId}
                  size="sm"
                />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function VideosTab({
  videos,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  videos: any[]
}) {
  if (videos.length === 0) {
    return (
      <EmptyTab
        icon={Play}
        title="No videos saved yet"
        message="Hit the radar icon on any video to save it here"
        actionLabel="Browse Equipment"
        actionHref="/search"
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((item) => {
        const linkHref = item.video_listing_id
          ? `/listings/${item.video_listing_id}`
          : item.video_post_id
            ? `/feed#post-${item.video_post_id}`
            : '#'
        const sourceLabel = item.video_source_type === 'listing_video' ? 'From listing' : 'From post'

        return (
          <Link key={item.id} href={linkHref}>
            <Card className="h-full overflow-hidden border-border bg-card py-0 gap-0 transition-colors hover:border-primary/50">
              <CardContent className="p-0">
                {item.video_thumbnail_url ? (
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.video_thumbnail_url}
                      alt={item.video_title || 'Video'}
                      className="h-40 w-full rounded-t-xl object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="flex size-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
                        <Play className="size-5 fill-white text-white" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-40 w-full items-center justify-center rounded-t-xl bg-surface">
                    <Play className="size-10 text-muted-foreground/30" />
                  </div>
                )}
                <div className="p-3">
                  <p className="truncate font-body text-sm font-medium text-foreground">
                    {item.video_title || 'Untitled video'}
                  </p>
                  <p className="mt-0.5 font-body text-xs text-muted-foreground">{sourceLabel}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

function ListsTab({
  lists,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  lists: any[]
}) {
  if (lists.length === 0) {
    return (
      <EmptyTab
        icon={FolderOpen}
        title="No custom lists"
        message="Create a list to organize your radar saves"
        actionLabel="Create Radar List"
        actionHref="/collections"
      />
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {lists.map((list) => {
        const itemCount = list.collection_items?.[0]?.count ?? 0
        return (
          <Link key={list.id} href={`/radar/${list.id}`}>
            <Card className="h-full border-border bg-card transition-colors hover:border-primary/50">
              <CardContent className="flex flex-col p-5">
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <FolderOpen className="size-5 text-primary" />
                  </div>
                  <Badge variant="outline" className="gap-1 font-body text-[10px]">
                    {list.is_public ? <Globe className="size-2.5" /> : <Lock className="size-2.5" />}
                    {list.is_public ? 'Public' : 'Private'}
                  </Badge>
                </div>
                <p className="mt-3 font-display text-lg font-semibold text-foreground">
                  {list.name}
                </p>
                {list.description && (
                  <p className="mt-1 line-clamp-2 font-body text-sm text-muted-foreground">
                    {list.description}
                  </p>
                )}
                <p className="mt-auto pt-3 font-body text-xs text-muted-foreground">
                  {itemCount} item{itemCount !== 1 ? 's' : ''}
                </p>
              </CardContent>
            </Card>
          </Link>
        )
      })}
    </div>
  )
}

function EmptyTab({
  icon: Icon,
  title,
  message,
  actionLabel,
  actionHref,
}: {
  icon: React.ElementType
  title: string
  message: string
  actionLabel: string
  actionHref: string
}) {
  return (
    <Card className="bg-card">
      <CardContent className="flex flex-col items-center gap-4 py-16">
        <Icon className="size-12 text-muted-foreground" />
        <p className="font-display text-lg font-semibold text-foreground">{title}</p>
        <p className="max-w-md text-center font-body text-sm text-muted-foreground">{message}</p>
        <Button asChild className="font-body">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}
