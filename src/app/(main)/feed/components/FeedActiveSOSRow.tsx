'use client'

import Link from 'next/link'
import { Siren, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SOSItem {
  id: string
  title: string
  equipment_category: string
  urgency: string | null
  created_at: string | null
  requester_id: string
}

interface FeedActiveSOSRowProps {
  activeSOS: SOSItem[]
  hasInterests: boolean
  currentUserId?: string
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function urgencyBadge(urgency: string | null) {
  if (urgency === 'critical')
    return <Badge className="bg-red-500/20 text-red-500 text-[10px] px-1.5 py-0">Critical</Badge>
  if (urgency === 'high')
    return <Badge className="bg-orange-500/20 text-orange-500 text-[10px] px-1.5 py-0">High</Badge>
  return <Badge className="bg-blue-500/20 text-blue-500 text-[10px] px-1.5 py-0">Normal</Badge>
}

export function FeedActiveSOSRow({
  activeSOS,
  hasInterests,
  currentUserId,
}: FeedActiveSOSRowProps) {
  return (
    <section className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-sm font-semibold text-foreground">
          Active SOS in Your Categories
        </h2>
        <Link href="/sos" className="text-xs text-primary hover:underline font-body">
          See all &rarr;
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
        {/* Send SOS card — always first */}
        <Link
          href="/sos/create"
          className="w-[160px] shrink-0 rounded-xl border-2 border-dashed border-orange-500/40 bg-orange-500/5 hover:bg-orange-500/10 flex flex-col items-center justify-center gap-2 p-4 cursor-pointer h-[100px] transition-colors"
        >
          <Siren className="size-6 text-[#FF6B2B]" />
          <span className="font-display text-sm font-bold text-[#FF6B2B]">Send SOS</span>
          <span className="font-body text-[10px] text-muted-foreground">Urgent need?</span>
        </Link>

        {!hasInterests ? (
          <Link
            href="/profile"
            className="w-[240px] shrink-0 rounded-xl border border-border bg-card p-3 flex items-center justify-center text-center h-[100px]"
          >
            <p className="font-body text-xs text-muted-foreground">
              Set your equipment interests to see relevant SOS alerts.{' '}
              <span className="text-primary">Update profile &rarr;</span>
            </p>
          </Link>
        ) : activeSOS.length === 0 ? (
          <div className="w-[240px] shrink-0 rounded-xl border border-border bg-card p-3 flex items-center justify-center text-center h-[100px]">
            <p className="font-body text-xs text-muted-foreground">
              No active SOS in your categories right now.
            </p>
          </div>
        ) : (
          activeSOS.map((sos) => {
            const isOwn = currentUserId && sos.requester_id === currentUserId
            return (
              <Link
                key={sos.id}
                href={`/sos/${sos.id}`}
                className="w-[200px] shrink-0 rounded-xl border border-border bg-card hover:bg-muted/50 p-3 cursor-pointer h-[100px] flex flex-col justify-between transition-colors"
              >
                <div className="flex items-center gap-2">
                  {urgencyBadge(sos.urgency)}
                  {isOwn && (
                    <Badge className="bg-[#FF6B2B]/15 text-[#FF6B2B] text-[10px] px-1.5 py-0">
                      Yours
                    </Badge>
                  )}
                  {sos.created_at && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto">
                      <Clock className="size-3" />
                      {timeAgo(sos.created_at)}
                    </span>
                  )}
                </div>
                <p className="font-body text-sm font-medium text-foreground truncate">
                  {sos.equipment_category.replace(/_/g, ' ')}
                </p>
                <p className="font-body text-xs text-primary">
                  {isOwn ? 'View responses \u2192' : 'Respond \u2192'}
                </p>
              </Link>
            )
          })
        )}
      </div>
    </section>
  )
}
