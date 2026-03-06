'use client'

import { useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface VideoPlayerProps {
  videoId?: string
  embedUrl?: string
  thumbnailUrl?: string
  title?: string
}

export function VideoPlayer({ videoId, embedUrl, thumbnailUrl, title }: VideoPlayerProps) {
  const [loaded, setLoaded] = useState(false)

  const src = embedUrl || (videoId ? `https://iframe.videodelivery.net/${videoId}` : null)

  if (!src) return null

  const iframeSrc = `${src}?autoplay=false${thumbnailUrl ? `&poster=${encodeURIComponent(thumbnailUrl)}` : ''}`

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border" style={{ aspectRatio: '16/9' }}>
      {!loaded && (
        <Skeleton className="absolute inset-0" />
      )}
      <iframe
        src={iframeSrc}
        title={title || 'Video'}
        className="absolute inset-0 h-full w-full"
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        allowFullScreen
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}
