'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Trash2, Flag } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { CommentInput } from './CommentInput'
import { getPostComments, deleteComment, reportFeedPost } from '@/app/actions/feed-posts'
import { formatRelativeTime } from '@/lib/utils/time'
import type { FeedComment } from '@/app/actions/feed-posts'

interface CommentSectionProps {
  postId: string
  initialCommentsCount: number
  currentUserId: string
  currentUser: { id: string; display_name: string; avatar_url: string | null }
  activeCompany: { id: string; name: string; slug: string; logo_url: string | null } | null
  isOpen: boolean
  onCountChange: (count: number) => void
}

const REPORT_REASONS = [
  'Spam',
  'Misinformation',
  'Inappropriate content',
  'Harassment',
  'Other',
]

export function CommentSection({
  postId,
  initialCommentsCount,
  currentUserId,
  currentUser,
  activeCompany,
  isOpen,
  onCountChange,
}: CommentSectionProps) {
  const [comments, setComments] = useState<FeedComment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [commentsCount, setCommentsCount] = useState(initialCommentsCount)

  // Delete state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Report state
  const [reportCommentId, setReportCommentId] = useState<string | null>(null)
  const [reportReason, setReportReason] = useState('')
  const [isReporting, setIsReporting] = useState(false)

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
    setComments((prev) => [...prev, comment])
    const newCount = commentsCount + 1
    setCommentsCount(newCount)
    onCountChange(newCount)
  }

  const handleDelete = async () => {
    if (!deleteConfirmId) return
    setIsDeleting(true)
    try {
      await deleteComment(deleteConfirmId, currentUserId)
      setComments((prev) => prev.filter((c) => c.id !== deleteConfirmId))
      const newCount = Math.max(0, commentsCount - 1)
      setCommentsCount(newCount)
      onCountChange(newCount)
      toast.success('Comment deleted')
    } catch {
      toast.error('Failed to delete comment')
    } finally {
      setIsDeleting(false)
      setDeleteConfirmId(null)
    }
  }

  const handleReport = async () => {
    if (!reportCommentId || !reportReason) return
    setIsReporting(true)
    try {
      await reportFeedPost(reportCommentId, currentUserId, reportReason)
      toast.success('Report submitted')
      setReportCommentId(null)
      setReportReason('')
    } catch {
      toast.error('Failed to report')
    } finally {
      setIsReporting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="border-t border-border">
      {/* Comments list */}
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
          {comments.length > 50 && (
            <p className="mb-2 font-body text-xs text-muted-foreground">
              Showing first 50 comments
            </p>
          )}
          {comments.map((comment) => (
            <div key={comment.id} className="group flex items-start gap-2 py-1.5">
              <Link href={comment.company ? `/companies/${comment.company.slug}` : `/sellers/${comment.author.id}`}>
                <Avatar className="size-6 shrink-0">
                  {comment.company?.logo_url ? (
                    <AvatarImage src={comment.company.logo_url} alt={comment.company.name} />
                  ) : comment.author.avatar_url ? (
                    <AvatarImage src={comment.author.avatar_url} alt={comment.author.display_name} />
                  ) : null}
                  <AvatarFallback className="font-display text-[10px]">
                    {(comment.company?.name ?? comment.author.display_name)?.[0]?.toUpperCase() ?? '?'}
                  </AvatarFallback>
                </Avatar>
              </Link>

              <div className="min-w-0 flex-1">
                <div className="inline rounded-lg bg-muted/50 px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5">
                    {comment.company && (
                      <Link
                        href={`/companies/${comment.company.slug}`}
                        className="font-display text-xs font-semibold text-foreground hover:underline"
                      >
                        {comment.company.name}
                      </Link>
                    )}
                    <Link
                      href={comment.author.id === currentUserId ? '/profile' : `/sellers/${comment.author.id}`}
                      className={`font-body text-xs ${comment.company ? 'text-muted-foreground' : 'font-display font-semibold text-foreground'} hover:underline`}
                    >
                      {comment.author.display_name}
                    </Link>
                  </div>
                  <p className="whitespace-pre-wrap font-body text-xs text-foreground">
                    {comment.content}
                  </p>
                </div>
                <span className="ml-2 font-body text-[10px] text-muted-foreground">
                  {formatRelativeTime(comment.created_at)}
                </span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="size-6 shrink-0 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <MoreHorizontal className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {comment.author.id === currentUserId ? (
                    <DropdownMenuItem
                      onClick={() => setDeleteConfirmId(comment.id)}
                      className="text-red-500 focus:text-red-500"
                    >
                      <Trash2 className="mr-2 size-3.5" />
                      Delete
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => setReportCommentId(comment.id)}>
                      <Flag className="mr-2 size-3.5" />
                      Report
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      ) : hasLoaded ? (
        <div className="px-4 py-3">
          <p className="font-body text-xs text-muted-foreground">No comments yet</p>
        </div>
      ) : null}

      {/* Comment input */}
      <CommentInput
        postId={postId}
        currentUser={currentUser}
        activeCompany={activeCompany}
        onCommentAdded={handleCommentAdded}
      />

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Delete comment?</DialogTitle>
          </DialogHeader>
          <p className="font-body text-sm text-muted-foreground">
            This comment will be permanently removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)} className="font-body">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
              className="font-body"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report dialog */}
      <Dialog open={!!reportCommentId} onOpenChange={(open) => !open && setReportCommentId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Report comment</DialogTitle>
          </DialogHeader>
          <Select value={reportReason} onValueChange={setReportReason}>
            <SelectTrigger className="font-body">
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              {REPORT_REASONS.map((reason) => (
                <SelectItem key={reason} value={reason} className="font-body">
                  {reason}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportCommentId(null)} className="font-body">
              Cancel
            </Button>
            <Button
              onClick={handleReport}
              disabled={!reportReason || isReporting}
              className="font-body"
            >
              {isReporting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
