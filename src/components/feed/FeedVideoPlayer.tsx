'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { Play, Loader2, AlertTriangle, RefreshCw } from 'lucide-react'

interface FeedVideoPlayerProps {
  streamVideoId: string | null
  thumbnailUrl: string | null
  status: 'processing' | 'ready' | 'error'
  postId?: string
  className?: string
}

const MAX_POLLS = 24 // 24 × 5s = 2 minutes
const POLL_INTERVAL = 5000

export function FeedVideoPlayer({
  streamVideoId,
  thumbnailUrl,
  status: initialStatus,
  className = '',
}: FeedVideoPlayerProps) {
  const [status, setStatus] = useState(initialStatus)
  const [showIframe, setShowIframe] = useState(false)
  const [iframeError, setIframeError] = useState(false)
  const [currentThumbnail, setCurrentThumbnail] = useState(thumbnailUrl)
  const [exhaustedPolls, setExhaustedPolls] = useState(false)
  const pollCountRef = useRef(0)
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const iframeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Poll for video status when processing
  useEffect(() => {
    if (status !== 'processing' || !streamVideoId) return

    const poll = async () => {
      try {
        const res = await fetch(
          `/api/feed/upload-media?streamVideoId=${streamVideoId}`
        )
        if (!res.ok) return
        const data = await res.json()
        if (data.status === 'ready') {
          setStatus('ready')
          if (data.thumbnailUrl) setCurrentThumbnail(data.thumbnailUrl)
          if (pollTimerRef.current) clearInterval(pollTimerRef.current)
        } else if (data.status === 'error') {
          setStatus('error')
          if (pollTimerRef.current) clearInterval(pollTimerRef.current)
        }
      } catch {
        // Ignore transient fetch errors during polling
      }
      pollCountRef.current++
      if (pollCountRef.current >= MAX_POLLS) {
        setExhaustedPolls(true)
        if (pollTimerRef.current) clearInterval(pollTimerRef.current)
      }
    }

    pollTimerRef.current = setInterval(poll, POLL_INTERVAL)
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [status, streamVideoId])

  const handlePlay = useCallback(() => {
    setShowIframe(true)
    setIframeError(false)
    // Timeout: if iframe doesn't load in 10s, show error
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

  // No stream video ID at all — video unavailable
  if (!streamVideoId) {
    return (
      <div className={`relative aspect-video overflow-hidden rounded-xl border border-border bg-muted ${className}`}>
        {currentThumbnail ? (
          <Image
            src={currentThumbnail}
            alt="Video unavailable"
            fill
            className="object-cover opacity-50"
            sizes="(max-width: 768px) 100vw, 600px"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/10" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AlertTriangle className="size-8 text-muted-foreground" />
          <p className="mt-2 font-body text-sm text-muted-foreground">Video unavailable</p>
        </div>
      </div>
    )
  }

  // Processing state
  if (status === 'processing') {
    return (
      <div className={`relative aspect-video overflow-hidden rounded-xl border border-border bg-muted ${className}`}>
        {currentThumbnail ? (
          <Image
            src={currentThumbnail}
            alt="Video processing"
            fill
            className="object-cover opacity-60"
            sizes="(max-width: 768px) 100vw, 600px"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/10" />
        )}
        <div className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 backdrop-blur-sm">
          {exhaustedPolls ? (
            <>
              <Loader2 className="size-3.5 text-white/70" />
              <span className="font-body text-xs text-white/90">Still processing — check back shortly</span>
            </>
          ) : (
            <>
              <Loader2 className="size-3.5 animate-spin text-white/70" />
              <span className="font-body text-xs text-white/90">Processing video…</span>
            </>
          )}
        </div>
      </div>
    )
  }

  // Error state
  if (status === 'error') {
    return (
      <div className={`relative aspect-video overflow-hidden rounded-xl border border-border bg-muted ${className}`}>
        {currentThumbnail ? (
          <Image
            src={currentThumbnail}
            alt="Video error"
            fill
            className="object-cover opacity-50"
            sizes="(max-width: 768px) 100vw, 600px"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/10" />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <AlertTriangle className="size-8 text-muted-foreground" />
          <p className="mt-2 font-body text-sm text-muted-foreground">Video unavailable</p>
        </div>
      </div>
    )
  }

  // Ready state — poster-first pattern
  if (showIframe && !iframeError) {
    const iframeSrc = `https://iframe.videodelivery.net/${streamVideoId}?${currentThumbnail ? `poster=${encodeURIComponent(currentThumbnail)}&` : ''}autoplay=true&muted=true&preload=metadata`
    return (
      <div className={`relative aspect-video overflow-hidden rounded-xl border border-border ${className}`}>
        <iframe
          src={iframeSrc}
          title="Video"
          className="absolute inset-0 h-full w-full"
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          loading="lazy"
          onLoad={handleIframeLoad}
        />
      </div>
    )
  }

  // Poster with play button (default ready state)
  return (
    <div className={`relative aspect-video overflow-hidden rounded-xl border border-border bg-muted ${className}`}>
      {currentThumbnail ? (
        <Image
          src={currentThumbnail}
          alt="Video thumbnail"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 600px"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted-foreground/20" />
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
    </div>
  )
}
