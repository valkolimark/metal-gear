'use client'

import Link from 'next/link'
import { Siren } from 'lucide-react'

interface SOSItem {
  id: string
  title: string
  equipment_category: string
  urgency: string | null
  created_at: string | null
  requester_id: string
  company_name?: string | null
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

function urgencyConfig(urgency: string | null) {
  if (urgency === 'critical') return { label: 'Critical', color: '#FA3E3E' }
  if (urgency === 'high') return { label: 'High', color: '#F7B928' }
  return { label: 'Normal', color: '#1877F2' }
}

const CARD_SHADOW = '0 1px 2px rgba(11,37,69,0.04), 0 4px 12px rgba(11,37,69,0.05)'

export function FeedActiveSOSRow({
  activeSOS,
  hasInterests,
  currentUserId,
}: FeedActiveSOSRowProps) {
  // Mirrors the inner-pages design tokens — uses --mg-font-display where available
  // but falls back to whatever the page's body font is.
  const tiles = activeSOS.slice(0, 4)

  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h2 className="font-display text-[15px] font-bold text-foreground tracking-tight">
          Active SOS in your categories
        </h2>
        <Link
          href="/sos"
          className="font-body text-[13px] font-semibold text-[#1877F2] hover:underline"
        >
          See all
        </Link>
      </div>

      <Link
        href="/sos/create"
        className="flex items-center gap-3 p-4 text-left mb-3 transition-colors hover:bg-[#FFEEDB]"
        style={{
          background: 'linear-gradient(135deg, #FFF7F0 0%, #FFEEDB 100%)',
          borderRadius: 16,
        }}
      >
        <div
          className="size-12 flex items-center justify-center shrink-0"
          style={{ background: '#FF6B2B', color: '#fff', borderRadius: 14 }}
        >
          <Siren className="size-[22px]" strokeWidth={2} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-display text-[15px] font-bold tracking-tight"
            style={{ color: '#9A3412' }}
          >
            Got an urgent need?
          </div>
          <div className="font-body text-[12.5px]" style={{ color: '#9A3412', opacity: 0.75 }}>
            Send an SOS — average response 18 min.
          </div>
        </div>
        <span
          className="font-body font-semibold text-[13px] px-3.5 h-9 flex items-center shrink-0"
          style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
        >
          Send SOS
        </span>
      </Link>

      {!hasInterests ? (
        <Link
          href="/profile"
          className="block p-4 text-center font-body text-[13px] text-muted-foreground rounded-2xl bg-card"
          style={{ boxShadow: CARD_SHADOW }}
        >
          Set your equipment interests to see relevant SOS alerts.{' '}
          <span className="text-[#1877F2] font-semibold">Update profile →</span>
        </Link>
      ) : tiles.length === 0 ? (
        <div
          className="p-4 text-center font-body text-[13px] text-muted-foreground rounded-2xl bg-card"
          style={{ boxShadow: CARD_SHADOW }}
        >
          No active SOS in your categories right now.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {tiles.map((sos) => {
            const isOwn = currentUserId && sos.requester_id === currentUserId
            const urg = urgencyConfig(sos.urgency)
            return (
              <Link
                key={sos.id}
                href={`/sos/${sos.id}`}
                className="flex flex-col items-start gap-1.5 p-3.5 text-left bg-card hover:translate-y-[-1px] transition-transform"
                style={{ borderRadius: 14, boxShadow: CARD_SHADOW }}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: urg.color }}
                  />
                  <span
                    className="font-body text-[11px] font-bold uppercase"
                    style={{ color: urg.color, letterSpacing: '0.06em' }}
                  >
                    {urg.label}
                  </span>
                  {sos.created_at && (
                    <span
                      className="font-body text-[11.5px] text-muted-foreground"
                      style={{ marginLeft: 2 }}
                    >
                      · {timeAgo(sos.created_at)}
                    </span>
                  )}
                </div>
                <div className="font-display text-[14px] font-bold leading-snug text-foreground tracking-tight line-clamp-2">
                  {sos.equipment_category.replace(/_/g, ' ')}
                </div>
                {sos.company_name && (
                  <div className="font-body text-[12.5px] text-muted-foreground truncate w-full">
                    {sos.company_name}
                  </div>
                )}
                <div className="font-body mt-1 text-[12.5px] font-semibold text-[#1877F2]">
                  {isOwn ? 'View thread →' : 'Respond →'}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
