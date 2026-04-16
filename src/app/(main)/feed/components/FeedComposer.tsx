'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { ImagePlus, Video, X, Loader2, Play } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { createFeedPost } from '@/app/actions/feed-posts'
import { createStreamDirectUpload } from '@/app/actions/stream'
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
const MAX_VIDEO_DURATION = 600 // 10 min

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

  // Upload image via XHR (existing pattern)
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
              ? { ...m, url: result.url, status: 'ready' as const, progress: 100 }
              : m
          )
        )
      } catch (err) {
        setMedia((prev) =>
          prev.map((m, i) =>
            i === index ? { ...m, status: 'error' as const } : m
          )
        )
        toast.error(err instanceof Error ? err.message : 'Upload failed')
      }
    },
    [media.length]
  )

  // Upload video via TUS direct to Cloudflare Stream
  const uploadVideo = useCallback(
    async (file: File) => {
      // Client-side duration check
      const duration = await getVideoDuration(file)
      if (duration > MAX_VIDEO_DURATION) {
        toast.error('Video must be under 10 minutes')
        return
      }

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
        // 1. Get direct upload URL from our server
        const directUpload = await createStreamDirectUpload()
        if ('error' in directUpload) {
          throw new Error(directUpload.error)
        }

        // 2. Capture first frame as client-side thumbnail
        let clientThumbnailUrl: string | undefined
        try {
          const thumbnailBlob = await captureVideoFirstFrame(file)
          if (thumbnailBlob) {
            const thumbFd = new FormData()
            thumbFd.append('file', thumbnailBlob, 'poster.jpg')
            thumbFd.append('type', 'image')
            thumbFd.append('postId', tempPostIdRef.current)
            const thumbRes = await fetch('/api/feed/upload-media', { method: 'POST', body: thumbFd })
            if (thumbRes.ok) {
              const thumbData = await thumbRes.json()
              clientThumbnailUrl = thumbData.url
            }
          }
        } catch {
          // Skip thumbnail silently if it fails
        }

        // Update entry with thumbnail
        if (clientThumbnailUrl) {
          setMedia((prev) =>
            prev.map((m, i) =>
              i === index ? { ...m, thumbnailUrl: clientThumbnailUrl } : m
            )
          )
        }

        // 3. Upload via TUS — use uploadUrl (not endpoint) because Cloudflare
        // Direct Creator Uploads return a pre-created upload URL
        const { Upload: TusUpload } = await import('tus-js-client')

        await new Promise<void>((resolve, reject) => {
          const upload = new TusUpload(file, {
            uploadUrl: directUpload.uploadUrl,
            chunkSize: 5 * 1024 * 1024, // 5MB chunks
            retryDelays: [0, 1000, 3000],
            metadata: {
              filename: file.name,
              filetype: file.type,
            },
            onProgress: (bytesUploaded, bytesTotal) => {
              const pct = Math.round((bytesUploaded / bytesTotal) * 100)
              setMedia((prev) =>
                prev.map((m, i) =>
                  i === index ? { ...m, progress: pct } : m
                )
              )
            },
            onSuccess: () => resolve(),
            onError: (err) => reject(err),
          })
          upload.start()
        })

        // 4. Upload complete — video is now processing at Cloudflare
        const embedUrl = `https://iframe.videodelivery.net/${directUpload.uid}`
        const thumbnailUrl = clientThumbnailUrl || `https://customer-305dqqczrx52n91m.cloudflarestream.com/${directUpload.uid}/thumbnails/thumbnail.jpg`

        setMedia((prev) =>
          prev.map((m, i) =>
            i === index
              ? {
                  ...m,
                  url: embedUrl,
                  streamVideoId: directUpload.uid,
                  thumbnailUrl,
                  status: 'ready' as const,
                  progress: 100,
                }
              : m
          )
        )

        toast.success('Video uploaded! It will finish processing in ~1 min.')
      } catch (err) {
        setMedia((prev) =>
          prev.map((m, i) =>
            i === index ? { ...m, status: 'error' as const } : m
          )
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
          status: m.mediaType === 'video' ? 'processing' as const : 'ready' as const,
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

      if (readyMedia.some((m) => m.mediaType === 'video')) {
        toast.success('Your post is live! Video will appear in ~1 min.')
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
  const canPost = (content.trim().length > 0 || media.some((m) => m.status === 'ready')) && content.length <= MAX_CHARS && !isUploading && !isSubmitting

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
                  ) : m.thumbnailUrl ? (
                    <div className="relative flex aspect-video items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.thumbnailUrl} alt="Video preview" className="h-full w-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        {m.status === 'uploading' ? (
                          <div className="text-center">
                            <div className="mx-auto mb-1 h-1 w-16 overflow-hidden rounded-full bg-white/30">
                              <div className="h-full bg-white transition-all" style={{ width: `${m.progress}%` }} />
                            </div>
                            <p className="font-body text-xs text-white">Uploading {m.progress}%</p>
                          </div>
                        ) : (
                          <Play className="size-8 text-white/80" fill="currentColor" />
                        )}
                      </div>
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

                  {/* Progress bar for images */}
                  {m.mediaType === 'image' && m.status === 'uploading' && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${m.progress}%` }}
                      />
                    </div>
                  )}

                  {/* Remove button — 44px touch target */}
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
              {content.length > 800 && (
                <span className={`font-body text-xs ${content.length > 950 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {MAX_CHARS - content.length} remaining
                </span>
              )}
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

/** Get video duration via HTMLVideoElement */
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src)
      resolve(video.duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      resolve(0) // Let it through — server will validate
    }
    video.src = URL.createObjectURL(file)
  })
}

/** Capture the first frame of a video as a JPEG blob */
function captureVideoFirstFrame(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true

    video.onloadeddata = () => {
      video.currentTime = 0.1
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(null)
          return
        }
        ctx.drawImage(video, 0, 0)
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(video.src)
            resolve(blob)
          },
          'image/jpeg',
          0.8
        )
      } catch {
        URL.revokeObjectURL(video.src)
        resolve(null)
      }
    }

    video.onerror = () => {
      URL.revokeObjectURL(video.src)
      resolve(null)
    }

    video.src = URL.createObjectURL(file)
  })
}
