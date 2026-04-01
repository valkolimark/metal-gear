'use client'

import { useState } from 'react'
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
