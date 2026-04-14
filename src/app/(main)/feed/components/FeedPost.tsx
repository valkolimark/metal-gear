'use client'

import { useState, useEffect, Fragment } from 'react'
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
import { cn } from '@/lib/utils'
import { RadarSaveButton } from '@/components/radar-save-button'
import { FeedPostMedia } from './FeedPostMedia'
import { CommentSection } from './CommentSection'
import { formatRelativeTime, formatActivityStatus } from '@/lib/utils/time'
import {
  toggleFeedPostReaction,
  editFeedPost,
  deleteFeedPost,
  reportFeedPost,
  resolveMentionedUsers,
} from '@/app/actions/feed-posts'
import type { FeedPostWithDetails } from '@/app/actions/feed-posts'

interface FeedPostProps {
  post: FeedPostWithDetails
  currentUserId: string
  activeCompany?: { id: string; name: string; slug: string; logo_url: string | null } | null
  onDeleted: (id: string) => void
  onEdited: (post: FeedPostWithDetails) => void
  initialRadarSaved?: boolean
}

const REPORT_REASONS = [
  'Spam',
  'Misinformation',
  'Inappropriate content',
  'Harassment',
  'Other',
]

export function FeedPost({ post, currentUserId, activeCompany, onDeleted, onEdited, initialRadarSaved = false }: FeedPostProps) {
  const router = useRouter()
  const isOwner = post.author.id === currentUserId
  const canEdit = isOwner && new Date(post.created_at).getTime() > Date.now() - 15 * 60 * 1000

  // Profile link: company page if available, otherwise seller page
  const profileUrl = post.company?.slug
    ? `/companies/${post.company.slug}`
    : `/sellers/${post.author.id}`

  // Activity status
  const activity = formatActivityStatus(post.author.last_active_at ?? null)

  // Like state
  const [reacted, setReacted] = useState(post.viewer_has_reacted)
  const [reactionsCount, setReactionsCount] = useState(post.reactions_count)
  const [isReacting, setIsReacting] = useState(false)

  // Comments state
  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [commentsCount, setCommentsCount] = useState(post.comments_count)

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

  // Mention resolution
  const [resolvedMentions, setResolvedMentions] = useState<
    Array<{ id: string; display_name: string; slug?: string; type: 'user' | 'company' }>
  >([])

  useEffect(() => {
    if (post.tagged_user_ids.length === 0) return
    resolveMentionedUsers(post.tagged_user_ids).then(setResolvedMentions)
  }, [post.id, post.tagged_user_ids])

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

  // Linkify plain text URLs (not hashtags/mentions)
  const linkifyText = (text: string, keyPrefix: string): React.ReactNode[] => {
    const urlRegex = /https?:\/\/[^\s]+/g
    const parts = text.split(urlRegex)
    const urls = text.match(urlRegex) ?? []

    return parts.reduce<React.ReactNode[]>((acc, part, i) => {
      if (part) acc.push(<Fragment key={`${keyPrefix}-t${i}`}>{part}</Fragment>)
      if (urls[i]) {
        const cleanUrl = urls[i].replace(/[.,!?;:]+$/, '')
        const trailing = urls[i].slice(cleanUrl.length)
        acc.push(
          <a
            key={`${keyPrefix}-u${i}`}
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline break-all"
          >
            {cleanUrl}
          </a>
        )
        if (trailing) acc.push(<Fragment key={`${keyPrefix}-p${i}`}>{trailing}</Fragment>)
      }
      return acc
    }, [])
  }

  // Render content with highlighted hashtags, resolved mentions, and linkified URLs
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
        const word = token.slice(1)
        const mention = resolvedMentions.find(
          (m) => m.display_name.toLowerCase() === word.toLowerCase() ||
                 m.display_name.toLowerCase().startsWith(word.toLowerCase())
        )
        if (mention) {
          const href = mention.type === 'company'
            ? `/companies/${mention.slug}`
            : `/sellers/${mention.id}`
          return (
            <span
              key={i}
              className="cursor-pointer font-medium text-primary hover:underline"
              onClick={() => router.push(href)}
            >
              {token}
            </span>
          )
        }
        return (
          <span key={i} className="font-medium text-primary">
            {token}
          </span>
        )
      }
      // Linkify URLs in plain text tokens
      if (/https?:\/\//.test(token)) {
        return <Fragment key={i}>{linkifyText(token, `${i}`)}</Fragment>
      }
      return <Fragment key={i}>{token}</Fragment>
    })
  }

  const commentButtonLabel = commentsCount === 0
    ? 'Comment'
    : `Comment${commentsCount > 0 ? ` (${commentsCount})` : ''}`

  return (
    <div id={`post-${post.id}`} className="overflow-hidden rounded-xl border border-border bg-card hover:bg-muted/30 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between p-4 pb-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Link href={profileUrl}>
              <Avatar className="size-10 cursor-pointer hover:opacity-80 transition-opacity">
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
            {activity.isRecent && (
              <span
                className={cn(
                  'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background',
                  activity.color === 'green' && 'bg-green-500',
                  activity.color === 'yellow' && 'bg-yellow-400',
                )}
                title={activity.label}
              />
            )}
          </div>
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
                href={profileUrl}
                className={`font-body text-xs ${post.company ? 'text-muted-foreground' : 'font-display text-sm font-semibold text-foreground'} hover:underline`}
              >
                {post.author.display_name}
              </Link>
              <span className="text-xs text-muted-foreground" title={new Date(post.created_at).toLocaleString()}>
                · {formatRelativeTime(post.created_at)}
              </span>
              {post.edited_at && (
                <span className="text-xs text-muted-foreground">· Edited</span>
              )}
            </div>
            {activity.isRecent && (
              <span className="text-xs text-muted-foreground">{activity.label}</span>
            )}
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
        {commentsCount > 0 && (
          <button
            className="font-body text-xs text-muted-foreground hover:underline"
            onClick={() => setIsCommentsOpen(!isCommentsOpen)}
          >
            {commentsCount} comment{commentsCount !== 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Action bar */}
      <div className="border-t border-border mx-4 mt-2" />
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="sm"
            className={`gap-1.5 font-body text-xs ${reacted ? 'text-red-500' : 'text-muted-foreground'}`}
            onClick={handleLike}
          >
            <Heart className={`size-4 ${reacted ? 'fill-current' : ''}`} />
            Like
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={`gap-1.5 font-body text-xs ${isCommentsOpen ? 'text-primary' : 'text-muted-foreground'}`}
            onClick={() => setIsCommentsOpen(!isCommentsOpen)}
          >
            <MessageCircle className="size-4" />
            {commentButtonLabel}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 font-body text-xs text-muted-foreground"
            onClick={handleShare}
          >
            <Share2 className="size-4" />
            Share
          </Button>
        </div>
        <RadarSaveButton
          itemType="feed_post"
          itemId={post.id}
          initialSaved={initialRadarSaved}
          userId={currentUserId}
          size="sm"
        />
      </div>

      {/* Comment section */}
      <CommentSection
        postId={post.id}
        postAuthorId={post.author.id}
        initialCommentsCount={post.comments_count}
        currentUserId={currentUserId}
        currentUser={{
          id: currentUserId,
          display_name: post.author.id === currentUserId ? post.author.display_name : 'You',
          avatar_url: post.author.id === currentUserId ? post.author.avatar_url : null,
        }}
        activeCompany={activeCompany ?? null}
        isOpen={isCommentsOpen}
        onCountChange={setCommentsCount}
      />

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
