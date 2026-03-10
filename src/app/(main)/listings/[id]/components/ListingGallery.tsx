'use client'

import { useState, useRef, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, Play } from 'lucide-react'
import { VideoPlayer } from '@/components/ui/video-player'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import type { Tables } from '@/types/database'

type ListingImage = Tables<'listing_images'>
type ListingVideo = Tables<'listing_videos'>

interface Props {
  images: ListingImage[]
  videos: ListingVideo[]
  title: string
}

export function ListingGallery({ images, videos, title }: Props) {
  const [active, setActive] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right' | null>(null)
  const [videoDialogOpen, setVideoDialogOpen] = useState(false)
  const [activeVideo, setActiveVideo] = useState<ListingVideo | null>(null)

  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchEndX = useRef(0)
  const touchEndY = useRef(0)
  const MIN_SWIPE = 50

  const allMedia = [
    ...images.map((img) => ({ type: 'image' as const, data: img })),
    ...videos.map((vid) => ({ type: 'video' as const, data: vid })),
  ]

  const goNext = useCallback(() => {
    if (allMedia.length <= 1) return
    setDirection('right')
    setActive((i) => (i + 1) % allMedia.length)
  }, [allMedia.length])

  const goPrev = useCallback(() => {
    if (allMedia.length <= 1) return
    setDirection('left')
    setActive((i) => (i - 1 + allMedia.length) % allMedia.length)
  }, [allMedia.length])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.changedTouches[0].screenX
    touchStartY.current = e.changedTouches[0].screenY
  }, [])

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      touchEndX.current = e.changedTouches[0].screenX
      touchEndY.current = e.changedTouches[0].screenY
      const deltaX = touchStartX.current - touchEndX.current
      const deltaY = touchStartY.current - touchEndY.current
      if (Math.abs(deltaX) < MIN_SWIPE) return
      if (Math.abs(deltaX) < Math.abs(deltaY)) return // vertical scroll
      if (deltaX > 0) goNext()
      else goPrev()
    },
    [goNext, goPrev]
  )

  const handleVideoClick = (vid: ListingVideo) => {
    setActiveVideo(vid)
    setVideoDialogOpen(true)
  }

  if (allMedia.length === 0) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-xl border border-border bg-card">
        <p className="font-body text-muted-foreground">No photos</p>
      </div>
    )
  }

  const currentMedia = allMedia[active]

  return (
    <div>
      {/* Desktop layout: vertical thumbnails + main image */}
      <div className="hidden lg:flex lg:gap-3">
        {/* Vertical thumbnail strip */}
        <div className="flex w-[72px] shrink-0 flex-col gap-2 overflow-y-auto" style={{ maxHeight: '460px' }}>
          {allMedia.map((item, i) => (
            <button
              key={i}
              onClick={() => {
                if (item.type === 'video') {
                  handleVideoClick(item.data as ListingVideo)
                } else {
                  setActive(i)
                }
              }}
              className={`relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-md border-2 transition-colors ${
                active === i
                  ? 'border-primary'
                  : 'border-transparent hover:border-zinc-600 dark:hover:border-zinc-600'
              }`}
            >
              {item.type === 'image' ? (
                <Image
                  src={(item.data as ListingImage).url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="72px"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-900">
                  <Play className="size-5 text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Main image */}
        <div className="group relative flex-1 aspect-square overflow-hidden rounded-xl bg-zinc-950 dark:bg-zinc-950 bg-zinc-100 cursor-zoom-in">
          {currentMedia.type === 'image' ? (
            <Image
              src={(currentMedia.data as ListingImage).url}
              alt={title}
              fill
              className="object-contain transition-transform duration-300 group-hover:scale-110"
              sizes="(max-width: 1024px) 100vw, 460px"
              priority
            />
          ) : (
            <div
              className="flex h-full w-full cursor-pointer items-center justify-center"
              onClick={() => handleVideoClick(currentMedia.data as ListingVideo)}
            >
              <Play className="size-16 text-white/80" />
            </div>
          )}

          {/* Prev/Next arrows */}
          {allMedia.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}

          {/* Counter badge */}
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 font-body text-xs text-white backdrop-blur">
            {active + 1} / {allMedia.length}
          </div>
        </div>
      </div>

      {/* Mobile layout: full-width image + dot indicators */}
      <div className="lg:hidden">
        <div
          className="relative w-full aspect-square overflow-hidden rounded-xl bg-zinc-950 dark:bg-zinc-950 bg-zinc-100"
          onTouchStart={allMedia.length > 1 ? handleTouchStart : undefined}
          onTouchEnd={allMedia.length > 1 ? handleTouchEnd : undefined}
        >
          {currentMedia.type === 'image' ? (
            <Image
              key={active}
              src={(currentMedia.data as ListingImage).url}
              alt={title}
              fill
              className={`object-contain ${
                direction === 'right'
                  ? 'slide-in-right'
                  : direction === 'left'
                    ? 'slide-in-left'
                    : ''
              }`}
              sizes="100vw"
              priority
              onAnimationEnd={() => setDirection(null)}
            />
          ) : (
            <div
              className="flex h-full w-full cursor-pointer items-center justify-center"
              onClick={() => handleVideoClick(currentMedia.data as ListingVideo)}
            >
              <Play className="size-16 text-white/80" />
            </div>
          )}

          {/* Counter badge */}
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 font-body text-xs text-white backdrop-blur">
            {active + 1} / {allMedia.length}
          </div>
        </div>

        {/* Dot indicators */}
        {allMedia.length > 1 && (
          <div className="flex justify-center gap-1.5 mt-3">
            {allMedia.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`h-2 rounded-full transition-all duration-200 ${
                  active === i ? 'bg-primary w-4' : 'bg-zinc-600 dark:bg-zinc-600 bg-zinc-300 w-2'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Video lightbox dialog */}
      <Dialog open={videoDialogOpen} onOpenChange={setVideoDialogOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {activeVideo && (
            <div className="aspect-video w-full">
              {activeVideo.stream_video_id || activeVideo.embed_url ? (
                <VideoPlayer
                  videoId={activeVideo.stream_video_id || undefined}
                  embedUrl={activeVideo.embed_url || undefined}
                  thumbnailUrl={activeVideo.thumbnail_url || undefined}
                  title={title}
                />
              ) : (
                <video
                  src={activeVideo.url}
                  controls
                  autoPlay
                  className="h-full w-full bg-black"
                >
                  Your browser does not support video playback.
                </video>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
