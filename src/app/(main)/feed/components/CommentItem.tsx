'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreHorizontal, Trash2, Flag, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
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
import { Skeleton } from '@/components/ui/skeleton'
import { ReplyInput } from './ReplyInput'
import { getReplies, deleteComment } from '@/app/actions/feed-comments'
import { reportFeedPost } from '@/app/actions/feed-posts'
import type { FeedComment, CommentWithReplyCount } from '@/app/actions/feed-comments'
import { formatRelativeTime } from '@/lib/utils/time'

interface CommentItemProps {
  comment: CommentWithReplyCount | (FeedComment & { reply_count?: number })
  postId: string
  postAuthorId: string
  currentUserId: string
  currentUser: { id: string; display_name: string; avatar_url: string | null }
  activeCompany: { id: string; name: string; slug: string; logo_url: string | null } | null
  isReply?: boolean
  isAdmin?: boolean
  onDeleted: (deletedId: string, deletedReplyCount: number, isReply: boolean) => void
}

const REPORT_REASONS = [
  'Spam',
  'Misinformation',
  'Inappropriate content',
  'Harassment',
  'Other',
]

export function CommentItem({
  comment,
  postId,
  postAuthorId,
  currentUserId,
  currentUser,
  activeCompany,
  isReply = false,
  isAdmin = false,
  onDeleted,
}: CommentItemProps) {
  const [replies, setReplies] = useState<FeedComment[]>([])
  const [repliesLoaded, setRepliesLoaded] = useState(false)
  const [repliesExpanded, setRepliesExpanded] = useState(false)
  const [loadingReplies, setLoadingReplies] = useState(false)
  const [replyCount, setReplyCount] = useState(comment.reply_count ?? 0)

  const [showReplyInput, setShowReplyInput] = useState(false)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const [reportOpen, setReportOpen] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [isReporting, setIsReporting] = useState(false)

  const isCommentAuthor = comment.author.id === currentUserId
  const isPostOwner = currentUserId === postAuthorId
  const canDelete = isCommentAuthor || isPostOwner || isAdmin

  const toggleReplies = async () => {
    if (repliesExpanded) {
      setRepliesExpanded(false)
      return
    }
    if (!repliesLoaded) {
      setLoadingReplies(true)
      try {
        const data = await getReplies(comment.id)
        setReplies(data)
        setRepliesLoaded(true)
      } catch {
        toast.error('Failed to load replies')
        setLoadingReplies(false)
        return
      } finally {
        setLoadingReplies(false)
      }
    }
    setRepliesExpanded(true)
  }

  const handleReplyAdded = (reply: FeedComment) => {
    setReplies((prev) => [...prev, reply])
    setReplyCount((c) => c + 1)
    setRepliesLoaded(true)
    setRepliesExpanded(true)
    setShowReplyInput(false)
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteComment(comment.id, currentUserId)
      onDeleted(comment.id, replyCount, isReply)
      toast.success(isReply ? 'Reply deleted' : 'Comment deleted')
    } catch {
      toast.error('Failed to delete')
    } finally {
      setIsDeleting(false)
      setDeleteOpen(false)
    }
  }

  const handleReport = async () => {
    if (!reportReason) return
    setIsReporting(true)
    try {
      await reportFeedPost(comment.id, currentUserId, reportReason)
      toast.success('Report submitted')
      setReportOpen(false)
      setReportReason('')
    } catch {
      toast.error('Failed to report')
    } finally {
      setIsReporting(false)
    }
  }

  const handleLocalReplyDeleted = (deletedId: string, _rc: number, _isReply: boolean) => {
    setReplies((prev) => prev.filter((r) => r.id !== deletedId))
    setReplyCount((c) => Math.max(0, c - 1))
  }

  return (
    <div className={isReply ? 'pl-8' : ''}>
      <div className="group flex items-start gap-2 py-1.5">
        <Link
          href={
            comment.company
              ? `/companies/${comment.company.slug}`
              : `/sellers/${comment.author.id}`
          }
        >
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
              href={
                comment.author.id === currentUserId ? '/profile' : `/sellers/${comment.author.id}`
              }
              className={`font-body text-xs ${comment.company ? 'text-muted-foreground' : 'font-display font-semibold text-foreground'} hover:underline`}
            >
              {comment.author.display_name}
            </Link>
            <span
              className="font-body text-[10px] text-muted-foreground"
              title={new Date(comment.created_at).toLocaleString()}
            >
              · {formatRelativeTime(comment.created_at)}
            </span>
          </div>
          <p className="mt-0.5 whitespace-pre-wrap font-body text-xs text-foreground">
            {comment.content}
          </p>

          {/* Action row */}
          <div className="mt-1 flex items-center gap-3">
            {!isReply && (
              <button
                type="button"
                onClick={() => setShowReplyInput((v) => !v)}
                className="font-display text-[11px] font-semibold text-muted-foreground hover:text-foreground"
              >
                Reply
              </button>
            )}
            {!isReply && replyCount > 0 && (
              <button
                type="button"
                onClick={toggleReplies}
                disabled={loadingReplies}
                className="flex items-center gap-0.5 font-body text-[11px] text-muted-foreground hover:text-foreground"
              >
                {loadingReplies ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : repliesExpanded ? (
                  <ChevronUp className="size-3" />
                ) : (
                  <ChevronDown className="size-3" />
                )}
                {repliesExpanded ? 'Hide' : 'View'} {replyCount}{' '}
                {replyCount === 1 ? 'reply' : 'replies'}
              </button>
            )}
          </div>
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
            {canDelete ? (
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-red-500 focus:text-red-500"
              >
                <Trash2 className="mr-2 size-3.5" />
                Delete {isReply ? 'reply' : 'comment'}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => setReportOpen(true)}>
                <Flag className="mr-2 size-3.5" />
                Report
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Inline reply input */}
      {!isReply && showReplyInput && (
        <div className="pl-8">
          <ReplyInput
            parentCommentId={comment.id}
            parentAuthorName={comment.author.display_name}
            currentUser={currentUser}
            activeCompany={activeCompany}
            onReplyAdded={handleReplyAdded}
            onCancel={() => setShowReplyInput(false)}
          />
        </div>
      )}

      {/* Replies list */}
      {!isReply && repliesExpanded && (
        <div className="space-y-0">
          {loadingReplies && replies.length === 0 ? (
            <div className="flex items-start gap-2 pl-8 py-1.5">
              <Skeleton className="size-6 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
          ) : (
            replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={{ ...reply, reply_count: 0 }}
                postId={postId}
                postAuthorId={postAuthorId}
                currentUserId={currentUserId}
                currentUser={currentUser}
                activeCompany={activeCompany}
                isReply
                isAdmin={isAdmin}
                onDeleted={handleLocalReplyDeleted}
              />
            ))
          )}
        </div>
      )}

      {/* Delete confirm dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              Delete {isReply ? 'reply' : 'comment'}?
            </DialogTitle>
          </DialogHeader>
          <p className="font-body text-sm text-muted-foreground">
            {!isReply && replyCount > 0
              ? `This comment and its ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'} will be permanently removed.`
              : 'This will be permanently removed.'}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              className="font-body"
            >
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
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              Report {isReply ? 'reply' : 'comment'}
            </DialogTitle>
          </DialogHeader>
          <select
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-body text-sm"
          >
            <option value="">Select a reason</option>
            {REPORT_REASONS.map((reason) => (
              <option key={reason} value={reason}>
                {reason}
              </option>
            ))}
          </select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportOpen(false)} className="font-body">
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
