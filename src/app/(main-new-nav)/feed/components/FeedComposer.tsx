'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { ImagePlus, Video, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { createFeedPost } from '@/app/actions/feed-posts'
import { createStreamDirectUpload } from '@/app/actions/stream'
import type { FeedPostWithDetails } from '@/app/actions/feed-posts'
import { MentionAutocomplete } from './MentionAutocomplete'

const STREAM_CUSTOMER_SUBDOMAIN = 'customer-305dqqczrx52n91m.cloudflarestream.com'

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
  const isUploading = media.some((m) => m.status === 'uploading')

  const extractHashtags = (text: string): string[] => {
    const matches = text.match(/#[\w]+/g)
    return matches ? [...new Set(matches.map((t) => t.slice(1).toLowerCase()))] : []
  }

  const tempPostIdRef = useRef(crypto.randomUUID())

  // Upload IMAGE via XHR to our API route (small files, proxied through Vercel)
  const uploadImage = useCallback(
    async (file: File) => {
      const entry: UploadedMedia = {
        url: '',
        mediaType: 'image',
        status: 'uploading',
        progress: 0,
        file,
      }
      setMedia((prev) => [...prev, entry])
      const index = media.length

      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'image')
        formData.append('postId', tempPostIdRef.current)

        const result = await new Promise<{ url: string }>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100)
              setMedia((prev) =>
                prev.map((m, i) => (i === index ? { ...m, progress: pct } : m))
              )
            }
          })
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText))
            } else {
              try {
                reject(new Error(JSON.parse(xhr.responseText).error || `Upload failed (${xhr.status})`))
              } catch {
                reject(new Error(`Upload failed (${xhr.status})`))
              }
            }
          })
          xhr.addEventListener('error', () => reject(new Error('Upload failed')))
          xhr.open('POST', '/api/feed/upload-media')
          xhr.send(formData)
        })

        setMedia((prev) =>
          prev.map((m, i) =>
            i === index ? { ...m, url: result.url, status: 'ready' as const, progress: 100 } : m
          )
        )
      } catch (err) {
        setMedia((prev) =>
          prev.map((m, i) => (i === index ? { ...m, status: 'error' as const } : m))
        )
        toast.error(err instanceof Error ? err.message : 'Upload failed')
      }
    },
    [media.length]
  )

  // Upload VIDEO directly to Cloudflare (large files, bypasses Vercel)
  const uploadVideo = useCallback(
    async (file: File) => {
      const entry: UploadedMedia = {
        url: '',
        mediaType: 'video',
        status: 'uploading',
        progress: 0,
        file,
      }
      setMedia((prev) => [...prev, entry])
      const index = media.length

      try {
        // Step 1: Get a one-time upload URL from Cloudflare (tiny server action call)
        const directUpload = await createStreamDirectUpload()
        if ('error' in directUpload) {
          throw new Error(directUpload.error)
        }

        // Step 2: POST video directly to Cloudflare (bypasses Vercel — no size limit)
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100)
              setMedia((prev) =>
                prev.map((m, i) => (i === index ? { ...m, progress: pct } : m))
              )
            }
          })
          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 400) {
              resolve()
            } else {
              reject(new Error(`Cloudflare upload failed (${xhr.status})`))
            }
          })
          xhr.addEventListener('error', () => reject(new Error('Network error during video upload')))

          const fd = new FormData()
          fd.append('file', file)
          xhr.open('POST', directUpload.uploadUrl)
          xhr.send(fd)
        })

        // Step 3: Upload complete — video is now processing at Cloudflare
        const embedUrl = `https://iframe.videodelivery.net/${directUpload.uid}`
        const thumbnailUrl = `https://${STREAM_CUSTOMER_SUBDOMAIN}/${directUpload.uid}/thumbnails/thumbnail.jpg`

        setMedia((prev) =>
          prev.map((m, i) =>
            i === index
              ? {
                  ...m,
                  url: embedUrl,
                  streamVideoId: directUpload.uid,
                  thumbnailUrl,
                  status: 'processing' as const,
                  progress: 100,
                }
              : m
          )
        )

        // Poll for video processing status
        const pollInterval = setInterval(async () => {
          try {
            const res = await fetch(
              `/api/feed/upload-media?streamVideoId=${directUpload.uid}`
            )
            const data = await res.json()
            if (data.status === 'ready' || data.status === 'error') {
              clearInterval(pollInterval)
              setMedia((prev) =>
                prev.map((m, i) =>
                  i === index ? { ...m, status: data.status as 'ready' | 'error' } : m
                )
              )
            }
          } catch {
            clearInterval(pollInterval)
          }
        }, 3000)

        // Video uploaded — tile shows "Ready to post", user can submit now
      } catch (err) {
        setMedia((prev) =>
          prev.map((m, i) => (i === index ? { ...m, status: 'error' as const } : m))
        )
        toast.error(err instanceof Error ? err.message : 'Video upload failed')
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
      uploadImage(file)
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
    uploadVideo(file)
    e.target.value = ''
  }

  const removeMedia = (index: number) => {
    setMedia((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    const trimmed = content.trim()
    const readyMedia = media.filter((m) => m.status === 'ready' || m.status === 'processing')
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
          status: m.mediaType === 'video' ? 'processing' as const : 'ready' as const,
        })),
      })

      const hadVideo = readyMedia.some((m) => m.mediaType === 'video')
      onPostCreated(post)
      setContent('')
      setMedia([])
      setMentionedEntities([])
      tempPostIdRef.current = crypto.randomUUID()
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
      if (hadVideo) {
        toast.success('Post is live! Your video will appear once processing finishes (~1 min).', { duration: 6000 })
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
      setMentionedEntities((prev) =>
        prev.filter((m) => val.includes(`@${m.displayName}`))
      )
    }
    const ta = e.target
    ta.style.height = 'auto'
    ta.style.height = ta.scrollHeight + 'px'
  }

  const hashtags = extractHashtags(content)
  const canPost = (content.trim().length > 0 || media.some((m) => m.status === 'ready' || m.status === 'processing')) && content.length <= MAX_CHARS && !isUploading && !isSubmitting

  return (
    <div
      className="rounded-2xl bg-card p-4"
      style={{
        boxShadow: '0 1px 2px rgba(11,37,69,0.04), 0 4px 12px rgba(11,37,69,0.05)',
      }}
    >
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
              placeholder="Share an update, equipment tip, or industry insight..."
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
                textareaRef.current?.focus()
              }}
            />
          </div>

          {hashtags.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1">
              {hashtags.map((tag) => (
                <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 font-body text-xs text-primary">
                  #{tag}
                </span>
              ))}
            </div>
          )}

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
                        <Video className={`mx-auto size-8 ${m.status === 'processing' ? 'text-green-500' : 'text-muted-foreground'}`} />
                        <p className={`mt-1 font-body text-xs ${m.status === 'processing' ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}`}>
                          {m.status === 'uploading'
                            ? `Uploading ${m.progress}%`
                            : m.status === 'processing'
                            ? 'Ready to post'
                            : m.status === 'error'
                            ? 'Upload failed'
                            : 'Ready'}
                        </p>
                        {m.status === 'processing' && (
                          <p className="mt-0.5 font-body text-[10px] text-muted-foreground">
                            Video will finish processing after you post
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {m.status === 'uploading' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                      <div className="h-full bg-primary transition-all" style={{ width: `${m.progress}%` }} />
                    </div>
                  )}

                  <button
                    className="absolute right-0 top-0 flex size-11 items-center justify-center"
                    onClick={() => removeMedia(i)}
                  >
                    <span className="flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
                      <X className="size-3.5" />
                    </span>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-3 flex items-center justify-between">
            <div className="flex gap-1">
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageSelect} />
              <Button
                variant="ghost" size="sm"
                className="gap-1.5 font-body text-xs text-muted-foreground"
                onClick={() => fileInputRef.current?.click()}
                disabled={hasVideo || media.filter((m) => m.mediaType === 'image').length >= MAX_IMAGES}
              >
                <ImagePlus className="size-4" />
                Photo
              </Button>

              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
              <Button
                variant="ghost" size="sm"
                className="gap-1.5 font-body text-xs text-muted-foreground"
                onClick={() => videoInputRef.current?.click()}
                disabled={hasImages || hasVideo}
              >
                <Video className="size-4" />
                Video
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {content.length > 800 && (
                <span className={`font-body text-xs ${content.length > 950 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {MAX_CHARS - content.length} remaining
                </span>
              )}
              <Button size="sm" className="font-body text-xs" disabled={!canPost} onClick={handleSubmit}>
                {isSubmitting ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : null}
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
