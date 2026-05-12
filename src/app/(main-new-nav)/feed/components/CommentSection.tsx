'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'
import { CommentInput } from './CommentInput'
import { CommentItem } from './CommentItem'
import { getPostComments } from '@/app/actions/feed-comments'
import type { FeedComment, CommentWithReplyCount } from '@/app/actions/feed-comments'

interface CommentSectionProps {
  postId: string
  postAuthorId: string
  initialCommentsCount: number
  currentUserId: string
  currentUser: { id: string; display_name: string; avatar_url: string | null }
  activeCompany: { id: string; name: string; slug: string; logo_url: string | null } | null
  isOpen: boolean
  isAdmin?: boolean
  onCountChange: (count: number) => void
}

export function CommentSection({
  postId,
  postAuthorId,
  initialCommentsCount,
  currentUserId,
  currentUser,
  activeCompany,
  isOpen,
  isAdmin = false,
  onCountChange,
}: CommentSectionProps) {
  const [comments, setComments] = useState<CommentWithReplyCount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount)

  const loadComments = useCallback(async () => {
    if (hasLoaded) return
    setIsLoading(true)
    try {
      const data = await getPostComments(postId)
      setComments(data.slice(0, 50))
      setHasLoaded(true)
    } catch {
      toast.error('Failed to load comments')
    } finally {
      setIsLoading(false)
    }
  }, [postId, hasLoaded])

  // Load on first open
  if (isOpen && !hasLoaded && !isLoading) {
    loadComments()
  }

  const handleCommentAdded = (comment: FeedComment) => {
    setComments((prev) => [...prev, { ...comment, reply_count: 0 }])
    const newCount = commentsCount + 1
    setCommentsCount(newCount)
    onCountChange(newCount)
  }

  const handleDeleted = (deletedId: string, deletedReplyCount: number, isReply: boolean) => {
    if (isReply) {
      // Reply deleted from within a parent — just decrement total
      const newCount = Math.max(0, commentsCount - 1)
      setCommentsCount(newCount)
      onCountChange(newCount)
      return
    }
    setComments((prev) => prev.filter((c) => c.id !== deletedId))
    const newCount = Math.max(0, commentsCount - (1 + deletedReplyCount))
    setCommentsCount(newCount)
    onCountChange(newCount)
  }

  if (!isOpen) return null

  return (
    <div className="border-t border-border">
      {isLoading ? (
        <div className="space-y-3 px-4 py-3">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-start gap-2">
              <Skeleton className="size-6 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-0 px-4 py-3">
          {comments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              postAuthorId={postAuthorId}
              currentUserId={currentUserId}
              currentUser={currentUser}
              activeCompany={activeCompany}
              isAdmin={isAdmin}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      ) : hasLoaded ? (
        <div className="px-4 py-3">
          <p className="font-body text-xs text-muted-foreground">No comments yet</p>
        </div>
      ) : null}

      <CommentInput
        postId={postId}
        currentUser={currentUser}
        activeCompany={activeCompany}
        onCommentAdded={handleCommentAdded}
      />
    </div>
  )
}
