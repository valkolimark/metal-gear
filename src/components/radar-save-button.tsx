'use client'

import { useState, useTransition } from 'react'
import { Radar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toggleRadarListing, toggleRadarPost, toggleRadarVideo } from '@/app/actions/radar'
import type { RadarVideoData } from '@/app/actions/radar'

interface BaseProps {
  userId: string | null
  className?: string
  size?: 'sm' | 'md'
}

interface ListingProps extends BaseProps {
  itemType: 'listing'
  itemId: string
  initialSaved: boolean
  videoData?: never
}

interface PostProps extends BaseProps {
  itemType: 'feed_post'
  itemId: string
  initialSaved: boolean
  videoData?: never
}

interface VideoProps extends BaseProps {
  itemType: 'video'
  itemId: string
  initialSaved: boolean
  videoData: RadarVideoData
}

type Props = ListingProps | PostProps | VideoProps

export function RadarSaveButton({ userId, itemType, itemId, initialSaved, videoData, className, size = 'md' }: Props) {
  const [saved, setSaved] = useState(initialSaved)
  const [isPending, startTransition] = useTransition()

  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    if (!userId) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname)
      return
    }

    setSaved((prev) => !prev)

    startTransition(async () => {
      try {
        let result: { saved?: boolean; error?: string }
        if (itemType === 'listing') {
          result = await toggleRadarListing(itemId)
        } else if (itemType === 'feed_post') {
          result = await toggleRadarPost(itemId)
        } else {
          result = await toggleRadarVideo(videoData!)
        }
        if ('saved' in result) {
          setSaved(result.saved!)
        }
      } catch {
        setSaved((prev) => !prev)
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-label={saved ? 'Remove from Radar' : 'Save to Radar'}
      title={saved ? 'Remove from Radar' : 'Save to Radar'}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        size === 'sm' ? 'h-7 w-7' : 'h-9 w-9',
        saved
          ? 'text-primary hover:text-primary/80'
          : 'text-muted-foreground hover:text-foreground',
        isPending && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <Radar
        className={cn(
          iconSize,
          'transition-colors',
          saved && 'drop-shadow-[0_0_4px_hsl(var(--primary)/0.5)]'
        )}
      />
    </button>
  )
}
