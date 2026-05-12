'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Hash, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FeedPost } from '../../components/FeedPost'
import { getHashtagPosts } from '@/app/actions/feed-posts'
import type { FeedPostWithDetails } from '@/app/actions/feed-posts'

interface HashtagFeedClientProps {
  tag: string
  initialPosts: FeedPostWithDetails[]
  initialNextCursor: string | null
  totalCount: number
  currentUserId: string
}

export function HashtagFeedClient({
  tag,
  initialPosts,
  initialNextCursor,
  totalCount,
  currentUserId,
}: HashtagFeedClientProps) {
  const router = useRouter()
  const [posts, setPosts] = useState<FeedPostWithDetails[]>(initialPosts)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const result = await getHashtagPosts({ tag, cursor: nextCursor, limit: 10 })
      setPosts((prev) => [...prev, ...result.posts])
      setNextCursor(result.nextCursor)
    } catch {
      // Silent fail
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handleDeleted = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  const handleEdited = (updated: FeedPostWithDetails) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="mb-2 gap-1.5 font-body text-xs text-muted-foreground"
          onClick={() => router.push('/feed')}
        >
          <ArrowLeft className="size-3.5" />
          Back to Feed
        </Button>

        <div className="flex items-center gap-2">
          <Hash className="size-6 text-primary" />
          <h1 className="font-display text-2xl font-bold text-foreground">{tag}</h1>
        </div>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          {totalCount} post{totalCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <Hash className="mx-auto size-8 text-muted-foreground" />
          <p className="mt-2 font-body text-sm text-muted-foreground">
            No posts tagged #{tag} yet. Be the first.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <FeedPost
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onDeleted={handleDeleted}
              onEdited={handleEdited}
            />
          ))}
        </div>
      )}

      {/* Load more */}
      {nextCursor && (
        <div className="flex justify-center py-4">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="font-body"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
