'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { addReply } from '@/app/actions/feed-comments'
import type { FeedComment } from '@/app/actions/feed-comments'

interface ReplyInputProps {
  parentCommentId: string
  parentAuthorName: string
  currentUser: { id: string; display_name: string; avatar_url: string | null }
  activeCompany: { id: string; name: string; slug: string; logo_url: string | null } | null
  onReplyAdded: (reply: FeedComment) => void
  onCancel: () => void
}

const MAX_CHARS = 500

export function ReplyInput({
  parentCommentId,
  parentAuthorName,
  currentUser,
  activeCompany,
  onReplyAdded,
  onCancel,
}: ReplyInputProps) {
  const [content, setContent] = useState(`@${parentAuthorName} `)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
      const len = textareaRef.current.value.length
      textareaRef.current.setSelectionRange(len, len)
    }
  }, [])

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    if (val.length <= MAX_CHARS) setContent(val)
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 72) + 'px'
  }

  const handleSubmit = async () => {
    const trimmed = content.trim()
    if (!trimmed || isSubmitting) return

    setIsSubmitting(true)
    try {
      const reply = await addReply({
        parentCommentId,
        authorId: currentUser.id,
        companyId: activeCompany?.id ?? null,
        content: trimmed,
      })
      onReplyAdded(reply)
      setContent('')
    } catch {
      toast.error('Failed to post reply')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  const showCounter = content.length > MAX_CHARS - 50

  return (
    <div className="flex items-start gap-2 py-2">
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
            placeholder="Write a reply..."
            disabled={isSubmitting}
            rows={1}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-1.5 font-body text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          {showCounter && (
            <span
              className={`absolute bottom-0.5 right-2 font-body text-[10px] ${content.length > MAX_CHARS - 20 ? 'text-red-400' : 'text-muted-foreground'}`}
            >
              {content.length}/{MAX_CHARS}
            </span>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="size-7 shrink-0 p-0 text-muted-foreground"
          disabled={isSubmitting}
          onClick={onCancel}
          aria-label="Cancel reply"
        >
          <X className="size-3.5" />
        </Button>

        {content.trim().length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="size-7 shrink-0 p-0 text-primary"
            disabled={isSubmitting}
            onClick={handleSubmit}
            aria-label="Post reply"
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
