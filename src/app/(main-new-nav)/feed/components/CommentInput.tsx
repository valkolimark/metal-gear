'use client'

import { useState, useRef } from 'react'
import { Send, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { addComment } from '@/app/actions/feed-comments'
import type { FeedComment } from '@/app/actions/feed-comments'

interface CommentInputProps {
  postId: string
  currentUser: { id: string; display_name: string; avatar_url: string | null }
  activeCompany: { id: string; name: string; slug: string; logo_url: string | null } | null
  onCommentAdded: (comment: FeedComment) => void
}

const MAX_CHARS = 500

export function CommentInput({ postId, currentUser, activeCompany, onCommentAdded }: CommentInputProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    if (val.length <= MAX_CHARS) {
      setContent(val)
    }
    // Auto-resize up to 3 rows
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 72) + 'px'
  }

  const handleSubmit = async () => {
    const trimmed = content.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    const savedContent = content
    try {
      const comment = await addComment({
        postId,
        authorId: currentUser.id,
        companyId: activeCompany?.id ?? null,
        content: trimmed,
      })
      onCommentAdded(comment)
      setContent('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch {
      setContent(savedContent)
      toast.error('Failed to post comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const showCounter = content.length > MAX_CHARS - 50

  return (
    <div className="flex items-start gap-2 px-4 pb-3">
      <Avatar className="size-6 shrink-0">
        {activeCompany?.logo_url ? (
          <AvatarImage src={activeCompany.logo_url} alt={activeCompany.name} />
        ) : currentUser.avatar_url ? (
          <AvatarImage src={currentUser.avatar_url} alt={currentUser.display_name} />
        ) : null}
        <AvatarFallback className="font-display text-[10px]">
          {(activeCompany?.name ?? currentUser.display_name)?.[0]?.toUpperCase() ?? '?'}
        </AvatarFallback>
      </Avatar>

      <div className="flex min-w-0 flex-1 items-end gap-1">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment..."
            disabled={isSubmitting}
            rows={1}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-1.5 font-body text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          {showCounter && (
            <span className={`absolute bottom-0.5 right-2 font-body text-[10px] ${content.length > MAX_CHARS - 20 ? 'text-red-400' : 'text-muted-foreground'}`}>
              {content.length}/{MAX_CHARS}
            </span>
          )}
        </div>

        {content.trim().length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="size-7 shrink-0 p-0 text-primary"
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Send className="size-3.5" />
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
