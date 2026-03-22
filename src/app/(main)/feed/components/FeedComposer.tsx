'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { ImagePlus, Video, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { createFeedPost } from '@/app/actions/feed-posts'
import type { FeedPostWithDetails } from '@/app/actions/feed-posts'
import { MentionAutocomplete } from './MentionAutocomplete'

interface FeedComposerProps {
  currentUserId: string
  currentUserName: string
  currentUserAvatar: string | null
  activeCompanyId: string | null
  activeCompanyName: string | null
  activeCompanyLogo: string | null
  onPostCreated: (post: FeedPostWithDetails) => void
}

interface UploadedMedia {
  url: string
  mediaType: 'image' | 'video'
  streamVideoId?: string
  thumbnailUrl?: string
  status: 'uploading' | 'processing' | 'ready' | 'error'
  progress: number
  file: File
}

const MAX_CHARS = 1000
const MAX_IMAGES = 4

export function FeedComposer({
  currentUserId,
  currentUserName,
  currentUserAvatar,
  activeCompanyId,
  activeCompanyName,
  activeCompanyLogo,
  onPostCreated,
}: FeedComposerProps) {
  const [content, setContent] = useState('')
  const [media, setMedia] = useState<UploadedMedia[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mentionedEntities, setMentionedEntities] = useState<
    Array<{ id: string; type: 'user' | 'company'; displayName: string }>
  >([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const hasVideo = media.some((m) => m.mediaType === 'video')
  const hasImages = media.some((m) => m.mediaType === 'image')
  const isUploading = media.some((m) => m.status === 'uploading' || m.status === 'processing')

  // Extract hashtags from content
  const extractHashtags = (text: string): string[] => {
    const matches = text.match(/#[\w]+/g)
    return matches ? [...new Set(matches.map((t) => t.slice(1).toLowerCase()))] : []
  }

  // Generate a temporary post ID for upload keying
  const tempPostIdRef = useRef(crypto.randomUUID())

  const uploadFile = useCallback(
    async (file: File, type: 'image' | 'video') => {
      const entry: UploadedMedia = {
        url: '',
        mediaType: type,
        status: 'uploading',
        progress: 0,
        file,
      }
      setMedia((prev) => [...prev, entry])
      const index = media.length

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', type)
        formData.append('postId', tempPostIdRef.current)

        const xhr = new XMLHttpRequest()
        const uploadPromise = new Promise<{
          url: string
          streamVideoId?: string
          thumbnailUrl?: string
          status: string
        }>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100)
              setMedia((prev) =>
                prev.map((m, i) =>
                  i === index ? { ...m, progress: pct } : m
                )
              )
            }
          })

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText))
            } else {
              reject(new Error(xhr.responseText || 'Upload failed'))
            }
          })

          xhr.addEventListener('error', () => reject(new Error('Upload failed')))

          xhr.open('POST', '/api/feed/upload-media')
          xhr.send(formData)
        })

        const result = await uploadPromise

        setMedia((prev) =>
          prev.map((m, i) =>
            i === index
              ? {
                  ...m,
                  url: result.url,
                  streamVideoId: result.streamVideoId,
                  thumbnailUrl: result.thumbnailUrl,
                  status: result.status === 'ready' ? 'ready' : 'processing',
                  progress: 100,
                }
              : m
          )
        )

        // Poll for video processing status
        if (type === 'video' && result.status === 'processing' && result.streamVideoId) {
          const pollInterval = setInterval(async () => {
            try {
              const res = await fetch(
                `/api/feed/upload-media?streamVideoId=${result.streamVideoId}`
              )
              const { status } = await res.json()
              if (status === 'ready' || status === 'error') {
                clearInterval(pollInterval)
                setMedia((prev) =>
                  prev.map((m, i) =>
                    i === index ? { ...m, status: status as 'ready' | 'error' } : m
                  )
                )
              }
            } catch {
              clearInterval(pollInterval)
            }
          }, 3000)
        }
      } catch (err) {
        setMedia((prev) =>
          prev.map((m, i) =>
            i === index ? { ...m, status: 'error' } : m
          )
        )
        toast.error(err instanceof Error ? err.message : 'Upload failed')
      }
    },
    [media.length]
  )

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const remaining = MAX_IMAGES - media.filter((m) => m.mediaType === 'image').length
    const toUpload = files.slice(0, remaining)
    for (const file of toUpload) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 10MB limit`)
        continue
      }
      uploadFile(file, 'image')
    }
    e.target.value = ''
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 200 * 1024 * 1024) {
      toast.error('Video exceeds 200MB limit')
      return
    }
    uploadFile(file, 'video')
    e.target.value = ''
  }

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    const trimmed = content.trim()
    const readyMedia = media.filter((m) => m.status === 'ready')
    if (!trimmed && readyMedia.length === 0) return

    setIsSubmitting(true)
    try {
      const hashtags = extractHashtags(trimmed)
      const { post } = await createFeedPost({
        authorId: currentUserId,
        companyId: activeCompanyId,
        content: trimmed,
        hashtags,
        taggedUserIds: mentionedEntities.map((m) => m.id),
        media: readyMedia.map((m, i) => ({
          mediaUrl: m.url,
          mediaType: m.mediaType,
          streamVideoId: m.streamVideoId,
          thumbnailUrl: m.thumbnailUrl,
          sortOrder: i,
        })),
      })

      onPostCreated(post)
      setContent('')
      setMedia([])
      setMentionedEntities([])
      tempPostIdRef.current = crypto.randomUUID()
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create post')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    if (val.length <= MAX_CHARS) {
      setContent(val)
      // Remove mentions that are no longer in the text
      setMentionedEntities((prev) =>
        prev.filter((m) => val.includes(`@${m.displayName}`))
      )
    }
    // Auto-resize
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
  }

  const hashtags = extractHashtags(content)
  const canPost = (content.trim().length > 0 || media.some((m) => m.status === 'ready')) && !isUploading && !isSubmitting

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex gap-3">
        <Avatar className="size-10 shrink-0">
          {activeCompanyLogo ? (
            <AvatarImage src={activeCompanyLogo} alt={activeCompanyName ?? ''} />
          ) : currentUserAvatar ? (
            <AvatarImage src={currentUserAvatar} alt={currentUserName} />
          ) : null}
          <AvatarFallback className="font-display text-xs">
            {(activeCompanyName ?? currentUserName)?.[0]?.toUpperCase() ?? '?'}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          {activeCompanyName && (
            <p className="mb-1 font-display text-xs font-semibold text-foreground">
              {activeCompanyName}
            </p>
          )}

          <div className="relative">
            <textarea
              ref={textareaRef}
              data-feed-composer
              value={content}
              onChange={handleTextareaChange}
              placeholder="Share an update with the community..."
              className="w-full resize-none bg-transparent font-body text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              rows={2}
            />
            <MentionAutocomplete
              textareaRef={textareaRef}
              value={content}
              onSelect={({ newValue, mention }) => {
                setContent(newValue)
                setMentionedEntities((prev) => {
                  if (prev.some((m) => m.id === mention.id)) return prev
                  return [...prev, mention]
                })
                // Re-focus textarea
                textareaRef.current?.focus()
              }}
            />
          </div>

          {/* Hashtag preview */}
          {hashtags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {hashtags.map((tag) => (
                <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 font-body text-xs text-primary">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Media previews */}
          {media.length > 0 && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {media.map((m, i) => (
                <div key={i} className="relative overflow-hidden rounded-lg bg-muted">
                  {m.mediaType === 'image' && m.url ? (
                    <Image
                      src={m.url}
                      alt={`Upload ${i + 1}`}
                      width={300}
                      height={200}
                      className="aspect-video w-full object-cover"
                    />
                  ) : m.mediaType === 'image' ? (
                    <div className="flex aspect-video items-center justify-center">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="flex aspect-video items-center justify-center">
                      <div className="text-center">
                        <Video className="mx-auto size-8 text-muted-foreground" />
                        <p className="mt-1 font-body text-xs text-muted-foreground">
                          {m.status === 'uploading'
                            ? `Uploading ${m.progress}%`
                            : m.status === 'processing'
                            ? 'Processing...'
                            : m.status === 'error'
                            ? 'Error'
                            : 'Ready'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Progress bar */}
                  {m.status === 'uploading' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${m.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Remove button */}
                  <button
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                    onClick={() => removeMedia(i)}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageSelect}
              />
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 font-body text-xs text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={hasVideo || media.filter((m) => m.mediaType === 'image').length >= MAX_IMAGES}
              >
                <ImagePlus className="size-4" />
                Photo
              </Button>

              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoSelect}
              />
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 font-body text-xs text-muted-foreground"
                onClick={() => videoInputRef.current?.click()}
                disabled={hasImages || hasVideo}
              >
                <Video className="size-4" />
                Video
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <span className={`font-body text-xs ${content.length > MAX_CHARS * 0.9 ? 'text-red-400' : 'text-muted-foreground'}`}>
                {content.length}/{MAX_CHARS}
              </span>
              <Button
                size="sm"
                className="font-body text-xs"
                disabled={!canPost}
                onClick={handleSubmit}
              >
                {isSubmitting ? (
                  <Loader2 className="mr-1 size-3.5 animate-spin" />
                ) : null}
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
