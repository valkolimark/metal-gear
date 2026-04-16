'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Play, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { RadarSaveButton } from '@/components/radar-save-button'

interface RadarProps {
  userId: string | null
  videoRefId: string
  videoSourceType: 'listing_video' | 'feed_post_video'
  videoThumbnailUrl: string
  videoTitle: string
  videoListingId?: string
  videoPostId?: string
  initialSaved: boolean
}

interface VideoPlayerProps {
  videoId?: string
  embedUrl?: string
  thumbnailUrl?: string
  title?: string
  radarProps?: RadarProps
}

export function VideoPlayer({ videoId, embedUrl, thumbnailUrl, title, radarProps }: VideoPlayerProps) {
  const [showIframe, setShowIframe] = useState(false)
  const [iframeError, setIframeError] = useState(false)
  const iframeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const src = embedUrl || (videoId ? `https://iframe.videodelivery.net/${videoId}` : null)

  const handlePlay = useCallback(() => {
    setShowIframe(true)
    setIframeError(false)
    iframeTimeoutRef.current = setTimeout(() => {
      setIframeError(true)
      setShowIframe(false)
    }, 10000)
  }, [])

  const handleIframeLoad = useCallback(() => {
    if (iframeTimeoutRef.current) {
      clearTimeout(iframeTimeoutRef.current)
      iframeTimeoutRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (iframeTimeoutRef.current) clearTimeout(iframeTimeoutRef.current)
    }
  }, [])

  if (!src) return null

  // Iframe is playing
  if (showIframe && !iframeError) {
    const iframeSrc = `${src}?autoplay=true&muted=true${thumbnailUrl ? `&poster=${encodeURIComponent(thumbnailUrl)}` : ''}`
    return (
      <div className="relative w-full overflow-hidden rounded-xl border border-border" style={{ aspectRatio: '16/9' }}>
        <iframe
          src={iframeSrc}
          title={title || 'Video'}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
          onLoad={handleIframeLoad}
        />
        {radarProps && (
          <div className="absolute top-2 right-2 z-10">
            <RadarSaveButton
              itemType="video"
              itemId={radarProps.videoRefId}
              userId={radarProps.userId}
              initialSaved={radarProps.initialSaved}
              videoData={{
                videoRefId: radarProps.videoRefId,
                videoSourceType: radarProps.videoSourceType,
                videoThumbnailUrl: radarProps.videoThumbnailUrl,
                videoTitle: radarProps.videoTitle,
                videoListingId: radarProps.videoListingId,
                videoPostId: radarProps.videoPostId,
              }}
              className="bg-black/50 hover:bg-black/70 text-white hover:text-white backdrop-blur-sm"
              size="sm"
            />
          </div>
        )}
      </div>
    )
  }

  // Poster-first: show thumbnail with play button
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-muted" style={{ aspectRatio: '16/9' }}>
      {thumbnailUrl ? (
        <Image
          src={thumbnailUrl}
          alt={title || 'Video thumbnail'}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      ) : (
        <Skeleton className="absolute inset-0" />
      )}
      {iframeError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
          <button
            onClick={handlePlay}
            className="flex items-center gap-2 rounded-full bg-black/70 px-4 py-2 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
            aria-label="Retry loading video"
          >
            <RefreshCw className="size-4" />
            <span className="font-body text-sm">Tap to retry</span>
          </button>
        </div>
      ) : (
        <button
          onClick={handlePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
          aria-label="Play video"
        >
          <div className="flex size-14 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-transform hover:scale-110">
            <Play className="ml-1 size-6" fill="currentColor" />
          </div>
        </button>
      )}
      {radarProps && (
        <div className="absolute top-2 right-2 z-10">
          <RadarSaveButton
            itemType="video"
            itemId={radarProps.videoRefId}
            userId={radarProps.userId}
            initialSaved={radarProps.initialSaved}
            videoData={{
              videoRefId: radarProps.videoRefId,
              videoSourceType: radarProps.videoSourceType,
              videoThumbnailUrl: radarProps.videoThumbnailUrl,
              videoTitle: radarProps.videoTitle,
              videoListingId: radarProps.videoListingId,
              videoPostId: radarProps.videoPostId,
            }}
            className="bg-black/50 hover:bg-black/70 text-white hover:text-white backdrop-blur-sm"
            size="sm"
          />
        </div>
      )}
    </div>
  )
}
