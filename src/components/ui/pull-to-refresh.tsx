'use client'

import { Loader2, ArrowDown } from 'lucide-react'

interface PullToRefreshIndicatorProps {
  pulling: boolean
  refreshing: boolean
  pullDistance: number
  threshold: number
}

export function PullToRefreshIndicator({
  pulling,
  refreshing,
  pullDistance,
  threshold,
}: PullToRefreshIndicatorProps) {
  if (!pulling && !refreshing) return null

  const progress = Math.min(pullDistance / threshold, 1)
  const rotation = progress * 180

  return (
    <div
      className="flex items-center justify-center overflow-hidden transition-[height] duration-200 lg:hidden"
      style={{ height: pulling || refreshing ? `${Math.max(pullDistance, refreshing ? 48 : 0)}px` : 0 }}
    >
      {refreshing ? (
        <Loader2 className="size-5 animate-spin text-primary" />
      ) : (
        <ArrowDown
          className="size-5 text-muted-foreground transition-transform"
          style={{ transform: `rotate(${rotation}deg)`, opacity: progress }}
        />
      )}
    </div>
  )
}
