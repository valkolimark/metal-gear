'use client'

import { useState, Fragment } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart, MessageCircle, Share2, MoreHorizontal, Pencil, Trash2, Flag } from 'lucide-react'
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
import { FeedPostMedia } from './FeedPostMedia'
import { formatRelativeTime } from '@/lib/utils/time'
import {
  toggleFeedPostReaction,
  editFeedPost,
  deleteFeedPost,
  reportFeedPost,
} from '@/app/actions/feed-posts'
import type { FeedPostWithDetails } from '@/app/actions/feed-posts'

interface FeedPostProps {
  post: FeedPostWithDetails
  currentUserId: string
  onDeleted: (id: string) => void
  onEdited: (post: FeedPostWithDetails) => void
}

const REPORT_REASONS = [
  'Spam',
  'Misinformation',
  'Inappropriate content',
  'Harassment',
  'Other',
]

export function FeedPost({ post, currentUserId, onDeleted, onEdited }: FeedPostProps) {
  const router = useRouter()
  const isOwner = post.author.id === currentUserId
  const canEdit = isOwner && new Date(post.created_at).getTime() > Date.now() - 15 * 60 * 1000

  // Like state
  const [reacted, setReacted] = useState(post.viewer_has_reacted)
  const [reactionsCount, setReactionsCount] = useState(post.reactions_count)
  const [isReacting, setIsReacting] = useState(false)

  // Edit state
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content)
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Report dialog
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [isReporting, setIsReporting] = useState(false)

  const handleLike = async () => {
    if (isReacting) return
    setIsReacting(true)

    // Optimistic update
    const prevReacted = reacted
    const prevCount = reactionsCount
    setReacted(!reacted)
    setReactionsCount(reacted ? reactionsCount - 1 : reactionsCount + 1)

    try {
      const result = await toggleFeedPostReaction(post.id, currentUserId)
      setReactionsCount(result.newCount)
      setReacted(result.reacted)
    } catch {
      setReacted(prevReacted)
      setReactionsCount(prevCount)
      toast.error('Failed to update reaction')
    } finally {
      setIsReacting(false)
    }
  }

  const handleSaveEdit = async () => {
    setIsSavingEdit(true)
    try {
      const hashtags = editContent.match(/#[\w]+/g)?.map((t) => t.slice(1).toLowerCase()) ?? []
      await editFeedPost({
        postId: post.id,
        authorId: currentUserId,
        content: editContent,
        hashtags,
        taggedUserIds: post.tagged_user_ids,
      })
      onEdited({
        ...post,
        content: editContent.trim(),
        hashtags,
        edited_at: new Date().toISOString(),
      })
      setIsEditing(false)
      toast.success('Post updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to edit post')
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteFeedPost(post.id, currentUserId)
      onDeleted(post.id)
      toast.success('Post deleted')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete post')
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleReport = async () => {
    if (!reportReason) return
    setIsReporting(true)
    try {
      await reportFeedPost(post.id, currentUserId, reportReason)
      toast.success('Report submitted')
      setShowReportDialog(false)
      setReportReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to report post')
    } finally {
      setIsReporting(false)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/feed#post-${post.id}`
    await navigator.clipboard.writeText(url)
    toast.success('Link copied')
  }

  // Render content with highlighted hashtags and mentions
  const renderContent = (text: string) => {
    const tokens = text.split(/(\s+)/)
    return tokens.map((token, i) => {
      if (token.startsWith('#') && token.length > 1) {
        const tag = token.slice(1).toLowerCase()
        return (
          <span
            key={i}
            className="cursor-pointer font-medium text-primary"
            onClick={() => router.push(`/feed/hashtag/${tag}`)}
          >
            {token}
          </span>
        )
      }
      if (token.startsWith('@') && token.length > 1) {
        // TODO 27a-2: resolve tagged_user_ids to display names; replace @word spans with
        // linked spans navigating to /companies/[slug] or /sellers/[id]
        return (
          <span key={i} className="font-medium text-primary">
            {token}
          </span>
        )
      }
      return <Fragment key={i}>{token}</Fragment>
    })
  }

  return (
    <div id={`post-${post.id}`} className="rounded-xl border border-border bg-card">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-0">
        <div className="flex items-center gap-3">
          <Link href={post.company ? `/companies/${post.company.slug}` : isOwner ? '/profile' : `/sellers/${post.author.id}`}>
            <Avatar className="size-10">
              {post.company?.logo_url ? (
                <AvatarImage src={post.company.logo_url} alt={post.company.name} />
              ) : post.author.avatar_url ? (
                <AvatarImage src={post.author.avatar_url} alt={post.author.display_name} />
              ) : null}
              <AvatarFallback className="font-display text-xs">
                {(post.company?.name ?? post.author.display_name)?.[0]?.toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            {post.company && (
              <Link
                href={`/companies/${post.company.slug}`}
                className="font-display text-sm font-semibold text-foreground hover:underline"
              >
                {post.company.name}
              </Link>
            )}
            <div className="flex items-center gap-1.5">
              <Link
                href={isOwner ? '/profile' : `/sellers/${post.author.id}`}
                className={`font-body text-xs ${post.company ? 'text-muted-foreground' : 'font-display text-sm font-semibold text-foreground'} hover:underline`}
              >
                {post.author.display_name}
              </Link>
              <span className="text-xs text-muted-foreground">
                · {formatRelativeTime(post.created_at)}
              </span>
              {post.edited_at && (
                <span className="text-xs text-muted-foreground">· Edited</span>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="size-8 p-0">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canEdit && (
              <DropdownMenuItem onClick={() => { setIsEditing(true); setEditContent(post.content) }}>
                <Pencil className="mr-2 size-4" />
                Edit post
              </DropdownMenuItem>
            )}
            {isOwner && (
              <DropdownMenuItem
                onClick={() => setShowDeleteDialog(true)}
                className="text-red-500 focus:text-red-500"
              >
                <Trash2 className="mr-2 size-4" />
                Delete post
              </DropdownMenuItem>
            )}
            {!isOwner && (
              <DropdownMenuItem onClick={() => setShowReportDialog(true)}>
                <Flag className="mr-2 size-4" />
                Report post
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="px-4 pt-3">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => {
                if (e.target.value.length <= 1000) setEditContent(e.target.value)
              }}
              className="w-full resize-none rounded-lg border border-border bg-background p-2 font-body text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              rows={3}
            />
            <div className="flex items-center justify-between">
              <span className={`font-body text-xs ${editContent.length > 900 ? 'text-red-400' : 'text-muted-foreground'}`}>
                {editContent.length}/1000
              </span>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="font-body text-xs"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="font-body text-xs"
                  disabled={isSavingEdit}
                  onClick={handleSaveEdit}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          post.content && (
            <p className="whitespace-pre-wrap font-body text-sm text-foreground">
              {renderContent(post.content)}
            </p>
          )
        )}
      </div>

      {/* Media */}
      {post.media.length > 0 && (
        <div className="px-4">
          <FeedPostMedia media={post.media} />
        </div>
      )}

      {/* Reaction counts */}
      <div className="flex items-center gap-4 px-4 pt-3">
        {reactionsCount > 0 && (
          <span className="font-body text-xs text-muted-foreground">
            <Heart className="mr-1 inline-block size-3 fill-red-500 text-red-500" />
            {reactionsCount}
          </span>
        )}
        {post.comments_count > 0 && (
          <span className="font-body text-xs text-muted-foreground">
            {post.comments_count} comment{post.comments_count !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Action bar */}
      <div className="border-t border-border mx-4 mt-2" />
      <div className="flex items-center px-2 py-1">
        <Button
          variant="ghost"
          size="sm"
          className={`flex-1 gap-1.5 font-body text-xs ${reacted ? 'text-red-500' : 'text-muted-foreground'}`}
          onClick={handleLike}
        >
          <Heart className={`size-4 ${reacted ? 'fill-current' : ''}`} />
          Like
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 gap-1.5 font-body text-xs text-muted-foreground"
          onClick={() => toast.info('Comments coming soon')}
        >
          <MessageCircle className="size-4" />
          Comment
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 gap-1.5 font-body text-xs text-muted-foreground"
          onClick={handleShare}
        >
          <Share2 className="size-4" />
          Share
        </Button>
      </div>

      {/* Delete dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Delete post?</DialogTitle>
          </DialogHeader>
          <p className="font-body text-sm text-muted-foreground">
            This action cannot be undone. Your post will be permanently removed.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="font-body">
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
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Report post</DialogTitle>
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
            <Button variant="outline" onClick={() => setShowReportDialog(false)} className="font-body">
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
