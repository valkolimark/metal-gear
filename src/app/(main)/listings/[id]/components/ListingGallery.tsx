'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VideoPlayer } from '@/components/ui/video-player'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import type { Tables } from '@/types/database'

type ListingImage = Tables<'listing_images'>
type ListingVideo = Tables<'listing_videos'>

interface Props {
  images: ListingImage[]
  videos: ListingVideo[]
  title: string
}

const MAX_VISIBLE_IMAGE_THUMBS = 6

export function ListingGallery({ images, videos, title }: Props) {
  const [active, setActive] = useState(0)
  const [direction, setDirection] = useState<'left' | 'right' | null>(null)

  // Modal state
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [imageModalIndex, setImageModalIndex] = useState(0)
  const [videoModalOpen, setVideoModalOpen] = useState(false)

  // Mobile touch refs
  const touchStartX = useRef(0)
  const touchStartY = useRef(0)
  const touchEndX = useRef(0)
  const touchEndY = useRef(0)
  const MIN_SWIPE = 50

  // Mobile uses combined allMedia; desktop uses images-only for main view
  const allMedia = [
    ...images.map((img) => ({ type: 'image' as const, data: img })),
    ...videos.map((vid) => ({ type: 'video' as const, data: vid })),
  ]

  // Desktop thumbnail logic
  const overflowCount = Math.max(0, images.length - MAX_VISIBLE_IMAGE_THUMBS)
  const thumbsToShow = overflowCount > 0 ? images.slice(0, 5) : images.slice(0, MAX_VISIBLE_IMAGE_THUMBS)

  // Filter videos with valid stream IDs
  const playableVideos = videos.filter((v) => v.stream_video_id || v.embed_url || v.url)

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
      if (Math.abs(deltaX) < Math.abs(deltaY)) return
      if (deltaX > 0) goNext()
      else goPrev()
    },
    [goNext, goPrev]
  )

  // Keyboard navigation for image lightbox
  useEffect(() => {
    if (!imageModalOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setImageModalIndex((i) => Math.max(0, i - 1))
      if (e.key === 'ArrowRight') setImageModalIndex((i) => Math.min(images.length - 1, i + 1))
      if (e.key === 'Escape') setImageModalOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [imageModalOpen, images.length])

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
      {/* ═══════════════ DESKTOP LAYOUT ═══════════════ */}
      <div className="hidden lg:flex lg:gap-3">
        {/* Vertical thumbnail strip — no scroll, 44px thumbs, max 6 slots */}
        <div className="flex w-11 shrink-0 flex-col gap-1.5">
          {/* Image thumbnails */}
          {thumbsToShow.map((image, idx) => (
            <button
              key={image.id}
              onClick={() => setActive(idx)}
              className={cn(
                'relative h-11 w-11 shrink-0 overflow-hidden rounded border-2 transition-all',
                active === idx
                  ? 'border-primary'
                  : 'border-transparent hover:border-muted-foreground/50'
              )}
            >
              <Image
                src={image.url}
                alt={`Image ${idx + 1}`}
                fill
                className="object-cover"
                sizes="44px"
              />
            </button>
          ))}

          {/* Overflow tile — slot 6 when images > 6 */}
          {overflowCount > 0 && (
            <button
              onClick={() => {
                setImageModalIndex(5)
                setImageModalOpen(true)
              }}
              className="relative h-11 w-11 shrink-0 overflow-hidden rounded border-2 border-transparent hover:border-muted-foreground/50"
            >
              <Image
                src={images[5].url}
                alt="More images"
                fill
                className="object-cover brightness-50"
                sizes="44px"
              />
              <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold font-display">
                +{overflowCount}
              </span>
            </button>
          )}

          {/* Video thumbnail(s) — below image thumbs */}
          {playableVideos.length === 1 && (
            <button
              onClick={() => setVideoModalOpen(true)}
              className="relative h-11 w-11 shrink-0 overflow-hidden rounded border-2 border-transparent hover:border-muted-foreground/50 mt-1"
            >
              {playableVideos[0].thumbnail_url ? (
                <Image
                  src={playableVideos[0].thumbnail_url}
                  alt="Video"
                  fill
                  className="object-cover brightness-75"
                  sizes="44px"
                />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
              <span className="absolute inset-0 flex items-center justify-center">
                <svg className="h-4 w-4 text-white drop-shadow" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          )}

          {playableVideos.length > 1 && (
            <button
              onClick={() => setVideoModalOpen(true)}
              className="relative h-11 w-11 shrink-0 overflow-hidden rounded border-2 border-transparent hover:border-muted-foreground/50 mt-1"
            >
              {playableVideos[0].thumbnail_url ? (
                <Image
                  src={playableVideos[0].thumbnail_url}
                  alt="Videos"
                  fill
                  className="object-cover brightness-50"
                  sizes="44px"
                />
              ) : (
                <div className="h-full w-full bg-muted" />
              )}
              <span className="absolute inset-0 flex flex-col items-center justify-center text-white text-[10px] font-bold font-display leading-tight">
                {playableVideos.length}
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          )}
        </div>

        {/* Main image — clicking opens lightbox */}
        <div className="group relative flex-1 aspect-square overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-950">
          {currentMedia.type === 'image' ? (
            <button
              onClick={() => {
                setImageModalIndex(active)
                setImageModalOpen(true)
              }}
              className="relative h-full w-full cursor-zoom-in"
            >
              <Image
                src={(currentMedia.data as ListingImage).url}
                alt={title}
                fill
                className="object-contain transition-transform duration-300 group-hover:scale-110"
                sizes="(max-width: 1024px) 100vw, 460px"
                priority
              />
            </button>
          ) : (
            <button
              onClick={() => setVideoModalOpen(true)}
              className="flex h-full w-full cursor-pointer items-center justify-center bg-zinc-950"
            >
              <svg className="h-16 w-16 text-white/80" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          )}

          {/* Prev/Next arrows */}
          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const prevIdx = active === 0 ? images.length - 1 : active - 1
                  setActive(prevIdx)
                }}
                className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  const nextIdx = active === images.length - 1 ? 0 : active + 1
                  setActive(nextIdx)
                }}
                className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/70"
              >
                <ChevronRight className="size-5" />
              </button>
            </>
          )}

          {/* Counter badge */}
          <div className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 font-body text-xs text-white backdrop-blur pointer-events-none">
            {active + 1} / {images.length}
            {playableVideos.length > 0 && ` + ${playableVideos.length} video${playableVideos.length > 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      {/* ═══════════════ MOBILE LAYOUT (unchanged) ═══════════════ */}
      <div className="lg:hidden">
        <div
          className="relative w-full aspect-square overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-950"
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
            <button
              onClick={() => {
                const vid = currentMedia.data as ListingVideo
                if (vid.stream_video_id || vid.embed_url || vid.url) {
                  setVideoModalOpen(true)
                }
              }}
              className="flex h-full w-full cursor-pointer items-center justify-center"
            >
              <svg className="h-16 w-16 text-white/80" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
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
                  active === i ? 'bg-primary w-4' : 'bg-zinc-300 dark:bg-zinc-600 w-2'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* ═══════════════ IMAGE LIGHTBOX MODAL ═══════════════ */}
      <Dialog open={imageModalOpen} onOpenChange={setImageModalOpen}>
        <DialogContent className="max-w-5xl w-full p-0 bg-black border-0 rounded-xl overflow-hidden [&>button]:hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-white/10">
            <span className="text-white/70 text-sm font-body">
              {imageModalIndex + 1} / {images.length}
            </span>
            <DialogTitle className="sr-only">All images</DialogTitle>
            <DialogClose asChild>
              <button className="text-white/70 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
          </div>

          {/* Main image */}
          <div className="relative w-full aspect-[4/3] bg-black">
            {images[imageModalIndex] && (
              <Image
                src={images[imageModalIndex].url}
                alt={`Image ${imageModalIndex + 1}`}
                fill
                className="object-contain"
                sizes="(max-width: 1280px) 100vw, 1024px"
                priority
              />
            )}
            {/* Prev/Next arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={() => setImageModalIndex((i) => Math.max(0, i - 1))}
                  disabled={imageModalIndex === 0}
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white disabled:opacity-30 transition-all"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setImageModalIndex((i) => Math.min(images.length - 1, i + 1))}
                  disabled={imageModalIndex === images.length - 1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 hover:bg-black/80 text-white disabled:opacity-30 transition-all"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail filmstrip */}
          {images.length > 1 && (
            <div className="flex gap-2 px-4 py-3 bg-black/80 overflow-x-auto">
              {images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setImageModalIndex(idx)}
                  className={cn(
                    'relative h-14 w-14 flex-shrink-0 rounded overflow-hidden border-2 transition-all',
                    imageModalIndex === idx ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                  )}
                >
                  <Image src={img.url} alt="" fill className="object-cover" sizes="56px" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ═══════════════ VIDEO MODAL ═══════════════ */}
      <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <DialogContent className="max-w-4xl w-full p-0 bg-black border-0 rounded-xl overflow-hidden [&>button]:hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 border-b border-white/10">
            <span className="text-white/70 text-sm font-body">
              {playableVideos.length === 1 ? 'Video' : `${playableVideos.length} Videos`}
            </span>
            <DialogTitle className="sr-only">Videos</DialogTitle>
            <DialogClose asChild>
              <button className="text-white/70 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
          </div>

          {playableVideos.length === 1 && playableVideos[0] && (
            <div className="aspect-video w-full">
              <VideoPlayer
                videoId={playableVideos[0].stream_video_id || undefined}
                embedUrl={playableVideos[0].embed_url || undefined}
                thumbnailUrl={playableVideos[0].thumbnail_url || undefined}
                title={title}
              />
            </div>
          )}

          {playableVideos.length > 1 && (
            <div className="flex flex-col gap-4 p-4 max-h-[70vh] overflow-y-auto">
              {playableVideos.map((video, idx) => (
                <div key={video.id}>
                  <p className="text-white/50 text-xs font-body mb-1">Video {idx + 1}</p>
                  <div className="aspect-video w-full rounded overflow-hidden">
                    <VideoPlayer
                      videoId={video.stream_video_id || undefined}
                      embedUrl={video.embed_url || undefined}
                      thumbnailUrl={video.thumbnail_url || undefined}
                      title={`${title} — Video ${idx + 1}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
