import {
  Package,
  ShoppingCart,
  Star,
  Receipt,
  Siren,
  type LucideIcon,
} from 'lucide-react'
import type { ActivityEntry } from './types'

interface ActivityFeedProps {
  entries: ActivityEntry[]
  emptyState?: React.ReactNode
}

const TYPE_META: Record<
  ActivityEntry['type'],
  { icon: LucideIcon; color: string }
> = {
  listing_created: { icon: Package, color: '#1877F2' },
  listing_sold: { icon: ShoppingCart, color: '#22C55E' },
  review_received: { icon: Star, color: '#F59E0B' },
  transaction_completed: { icon: Receipt, color: '#22C55E' },
  sos_responded: { icon: Siren, color: '#FF6B2B' },
}

function formatTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks}w`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}mo`
  return `${Math.floor(days / 365)}y`
}

export function ActivityFeed({ entries, emptyState }: ActivityFeedProps) {
  if (entries.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-muted-foreground">
        {emptyState ?? 'No recent activity yet.'}
      </div>
    )
  }
  return (
    <div className="flex flex-col">
      {entries.map((entry, i) => {
        const meta = TYPE_META[entry.type]
        const Icon = meta.icon
        return (
          <div
            key={entry.id}
            className={`flex items-start gap-3 py-3 ${
              i < entries.length - 1 ? 'border-b border-border' : ''
            }`}
          >
            <span
              className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full"
              style={{ background: `${meta.color}1F`, color: meta.color }}
            >
              <Icon className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-semibold text-foreground">
                {entry.title}
              </div>
              <div className="text-[11.5px] text-muted-foreground">
                {entry.subtitle}
              </div>
            </div>
            <span
              className="shrink-0 text-[10.5px] text-muted-foreground"
              style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
            >
              {formatTimeAgo(entry.occurredAt)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
