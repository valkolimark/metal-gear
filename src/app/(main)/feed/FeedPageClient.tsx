'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { FeedComposer } from './components/FeedComposer'
import { FeedPost } from './components/FeedPost'
import { FeedFeedToggle } from './components/FeedFeedToggle'
import { FeedPostSkeleton } from './components/FeedPostSkeleton'
import { getFeedPosts } from '@/app/actions/feed-posts'
import type { FeedPostWithDetails } from '@/app/actions/feed-posts'

interface FeedPageClientProps {
  initialPosts: FeedPostWithDetails[]
  initialNextCursor: string | null
  currentUserId: string
  currentUserName: string
  currentUserAvatar: string | null
  activeCompanyId: string | null
  activeCompanyName: string | null
  activeCompanyLogo: string | null
  activeCompanySlug: string | null
  discoveryBlocks: React.ReactNode[]
  radarPostIds?: string[]
}

export function FeedPageClient({
  initialPosts,
  initialNextCursor,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  activeCompanyId,
  activeCompanyName,
  activeCompanyLogo,
  activeCompanySlug,
  discoveryBlocks,
  radarPostIds = [],
}: FeedPageClientProps) {
  const radarPostIdSet = new Set(radarPostIds)
  const [posts, setPosts] = useState<FeedPostWithDetails[]>(initialPosts)
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor)
  const [filter, setFilter] = useState<'all' | 'for-you'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('mg-feed-filter') as 'all' | 'for-you') || 'all'
    }
    return 'all'
  })
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [isChangingFilter, setIsChangingFilter] = useState(false)

  const handleFilterChange = useCallback(async (newFilter: 'all' | 'for-you') => {
    setFilter(newFilter)
    localStorage.setItem('mg-feed-filter', newFilter)
    setIsChangingFilter(true)
    try {
      const result = await getFeedPosts(currentUserId, { filter: newFilter, limit: 10 })
      setPosts(result.posts)
      setNextCursor(result.nextCursor)
    } catch {
      // Keep existing posts on error
    } finally {
      setIsChangingFilter(false)
    }
  }, [currentUserId])

  const searchParams = useSearchParams()
  const composeRouter = useRouter()

  // Scroll restoration when returning to feed
  useEffect(() => {
    const savedPosition = sessionStorage.getItem('feed-scroll-position')
    if (savedPosition) {
      window.scrollTo(0, parseInt(savedPosition))
      sessionStorage.removeItem('feed-scroll-position')
    }
  }, [])

  // Save scroll position before navigating away
  useEffect(() => {
    const handleBeforeNav = () => {
      sessionStorage.setItem('feed-scroll-position', window.scrollY.toString())
    }
    // Listen for clicks on links within the feed
    const feedEl = document.querySelector('[data-feed-container]')
    if (!feedEl) return
    const handler = (e: Event) => {
      const target = (e.target as HTMLElement).closest('a[href]')
      if (target && !target.getAttribute('href')?.startsWith('#')) {
        handleBeforeNav()
      }
    }
    feedEl.addEventListener('click', handler)
    return () => feedEl.removeEventListener('click', handler)
  }, [])

  // Handle ?compose=true — focus the composer textarea
  useEffect(() => {
    if (searchParams.get('compose') === 'true') {
      const composer = document.querySelector<HTMLTextAreaElement>('[data-feed-composer]')
      if (composer) {
        composer.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setTimeout(() => composer.focus(), 300)
      }
      composeRouter.replace('/feed')
    }
  }, [searchParams, composeRouter])

  // On mount, if stored filter differs from 'all', refetch
  useEffect(() => {
    const stored = localStorage.getItem('mg-feed-filter') as 'all' | 'for-you' | null
    if (stored && stored !== 'all') {
      handleFilterChange(stored)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLoadMore = async () => {
    if (!nextCursor || isLoadingMore) return
    setIsLoadingMore(true)
    try {
      const result = await getFeedPosts(currentUserId, {
        filter,
        cursor: nextCursor,
        limit: 10,
      })
      setPosts((prev) => [...prev, ...result.posts])
      setNextCursor(result.nextCursor)
    } catch {
      // Silent fail
    } finally {
      setIsLoadingMore(false)
    }
  }

  const handlePostCreated = (post: FeedPostWithDetails) => {
    setPosts((prev) => [post, ...prev])
  }

  const handleDeleted = (id: string) => {
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  const handleEdited = (updated: FeedPostWithDetails) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  // Interleave posts with discovery blocks
  const renderFeed = () => {
    const elements: React.ReactNode[] = []

    // Group 1: posts 0-4
    const group1 = posts.slice(0, 5)
    group1.forEach((post) => {
      elements.push(
        <FeedPost
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          activeCompany={activeCompanyId ? { id: activeCompanyId, name: activeCompanyName ?? '', slug: activeCompanySlug ?? '', logo_url: activeCompanyLogo } : null}
          onDeleted={handleDeleted}
          onEdited={handleEdited}
          initialRadarSaved={radarPostIdSet.has(post.id)}
        />
      )
    })

    // Discovery block 0 after first 5 posts
    if (discoveryBlocks[0] && posts.length > 0) {
      elements.push(<div key="discovery-0">{discoveryBlocks[0]}</div>)
    }

    // Group 2: posts 5-9
    const group2 = posts.slice(5, 10)
    group2.forEach((post) => {
      elements.push(
        <FeedPost
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          activeCompany={activeCompanyId ? { id: activeCompanyId, name: activeCompanyName ?? '', slug: activeCompanySlug ?? '', logo_url: activeCompanyLogo } : null}
          onDeleted={handleDeleted}
          onEdited={handleEdited}
          initialRadarSaved={radarPostIdSet.has(post.id)}
        />
      )
    })

    // Discovery block 1
    if (discoveryBlocks[1] && posts.length > 5) {
      elements.push(<div key="discovery-1">{discoveryBlocks[1]}</div>)
    }

    // Group 3: posts 10-14
    const group3 = posts.slice(10, 15)
    group3.forEach((post) => {
      elements.push(
        <FeedPost
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          activeCompany={activeCompanyId ? { id: activeCompanyId, name: activeCompanyName ?? '', slug: activeCompanySlug ?? '', logo_url: activeCompanyLogo } : null}
          onDeleted={handleDeleted}
          onEdited={handleEdited}
          initialRadarSaved={radarPostIdSet.has(post.id)}
        />
      )
    })

    // Discovery block 2
    if (discoveryBlocks[2] && posts.length > 10) {
      elements.push(<div key="discovery-2">{discoveryBlocks[2]}</div>)
    }

    // Remaining posts
    const remaining = posts.slice(15)
    remaining.forEach((post) => {
      elements.push(
        <FeedPost
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          activeCompany={activeCompanyId ? { id: activeCompanyId, name: activeCompanyName ?? '', slug: activeCompanySlug ?? '', logo_url: activeCompanyLogo } : null}
          onDeleted={handleDeleted}
          onEdited={handleEdited}
          initialRadarSaved={radarPostIdSet.has(post.id)}
        />
      )
    })

    return elements
  }

  return (
    <div data-feed-container className="min-w-0 space-y-4">
      <FeedComposer
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        activeCompanyId={activeCompanyId}
        activeCompanyName={activeCompanyName}
        activeCompanyLogo={activeCompanyLogo}
        onPostCreated={handlePostCreated}
      />

      <FeedFeedToggle value={filter} onChange={handleFilterChange} />

      {isChangingFilter ? (
        <div className="space-y-4">
          <FeedPostSkeleton />
          <FeedPostSkeleton />
          <FeedPostSkeleton />
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="font-body text-sm text-muted-foreground">
            No posts yet. Be the first to share something!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {renderFeed()}
        </div>
      )}

      {nextCursor && !isChangingFilter && (
        <div className="py-4">
          {isLoadingMore ? (
            <div className="space-y-4">
              <FeedPostSkeleton />
              <FeedPostSkeleton />
            </div>
          ) : (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                className="font-body"
              >
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
