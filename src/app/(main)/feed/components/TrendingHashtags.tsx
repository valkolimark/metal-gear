'use client'

import Link from 'next/link'
import { TrendingUp } from 'lucide-react'

interface TrendingHashtagsProps {
  hashtags: Array<{ tag: string; post_count: number }>
}

function formatCount(count: number): string {
  if (count >= 1000) return (count / 1000).toFixed(1) + 'k'
  return count.toString()
}

export function TrendingHashtags({ hashtags }: TrendingHashtagsProps) {
  if (hashtags.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <TrendingUp className="size-4 text-primary" />
        <h3 className="font-display text-sm font-semibold text-foreground">Trending</h3>
      </div>
      <div className="py-1">
        {hashtags.map((h) => (
          <Link
            key={h.tag}
            href={`/feed/hashtag/${h.tag}`}
            className="flex items-center justify-between px-4 py-2 hover:bg-muted/50 transition-colors"
          >
            <span className="font-body text-sm font-medium text-primary">
              #{h.tag}
            </span>
            <span className="font-body text-xs text-muted-foreground">
              {formatCount(h.post_count)}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
