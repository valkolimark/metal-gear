'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { VideoPlayer } from '@/components/ui/video-player'
import type { FeedPostWithDetails } from '@/app/actions/feed-posts'

interface FeedPostMediaProps {
  media: FeedPostWithDetails['media']
}

export function FeedPostMedia({ media }: FeedPostMediaProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (lightboxIndex === null) return
      if (e.key === 'Escape') setLightboxIndex(null)
      if (e.key === 'ArrowLeft') setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))
      if (e.key === 'ArrowRight') setLightboxIndex((i) => (i !== null && i < media.length - 1 ? i + 1 : i))
    },
    [lightboxIndex, media.length]
  )

  useEffect(() => {
    if (lightboxIndex !== null) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [lightboxIndex, handleKeyDown])

  if (media.length === 0) return null

  // Single video
  if (media.length === 1 && media[0].media_type === 'video') {
    return (
      <div className="mt-3">
        <VideoPlayer
          videoId={media[0].stream_video_id ?? undefined}
          embedUrl={media[0].media_url}
          thumbnailUrl={media[0].thumbnail_url ?? undefined}
        />
      </div>
    )
  }

  const images = media.filter((m) => m.media_type === 'image')

  return (
    <>
      <div className="mt-3">
        {images.length === 1 && (
          <div
            className="relative aspect-[16/10] cursor-pointer overflow-hidden rounded-lg"
            onClick={() => setLightboxIndex(0)}
          >
            <Image
              src={images[0].media_url}
              alt="Post image"
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 600px"
            />
          </div>
        )}

        {images.length === 2 && (
          <div className="grid grid-cols-2 gap-1">
            {images.map((img, i) => (
              <div
                key={img.id}
                className="relative aspect-square cursor-pointer overflow-hidden rounded-lg"
                onClick={() => setLightboxIndex(i)}
              >
                <Image
                  src={img.media_url}
                  alt={`Post image ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 300px"
                />
              </div>
            ))}
          </div>
        )}

        {images.length === 3 && (
          <div className="grid grid-cols-2 gap-1">
            <div
              className="relative row-span-2 cursor-pointer overflow-hidden rounded-lg"
              style={{ aspectRatio: '1/1' }}
              onClick={() => setLightboxIndex(0)}
            >
              <Image
                src={images[0].media_url}
                alt="Post image 1"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 300px"
              />
            </div>
            <div className="flex flex-col gap-1">
              {images.slice(1).map((img, i) => (
                <div
                  key={img.id}
                  className="relative aspect-square cursor-pointer overflow-hidden rounded-lg"
                  onClick={() => setLightboxIndex(i + 1)}
                >
                  <Image
                    src={img.media_url}
                    alt={`Post image ${i + 2}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 25vw, 150px"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {images.length >= 4 && (
          <div className="grid grid-cols-2 gap-1">
            {images.slice(0, 4).map((img, i) => (
              <div
                key={img.id}
                className="relative aspect-square cursor-pointer overflow-hidden rounded-lg"
                onClick={() => setLightboxIndex(i)}
              >
                <Image
                  src={img.media_url}
                  alt={`Post image ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 300px"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setLightboxIndex(null)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="size-6" />
          </button>

          {lightboxIndex > 0 && (
            <button
              className="absolute left-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex((i) => (i !== null ? i - 1 : i))
              }}
            >
              <ChevronLeft className="size-6" />
            </button>
          )}

          {lightboxIndex < images.length - 1 && (
            <button
              className="absolute right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              onClick={(e) => {
                e.stopPropagation()
                setLightboxIndex((i) => (i !== null ? i + 1 : i))
              }}
            >
              <ChevronRight className="size-6" />
            </button>
          )}

          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[lightboxIndex].media_url}
              alt={`Post image ${lightboxIndex + 1}`}
              width={1200}
              height={800}
              className="max-h-[90vh] w-auto object-contain"
            />
          </div>
        </div>
      )}
    </>
  )
}
