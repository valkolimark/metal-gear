'use client'

import type { ReactNode } from 'react'
import { COND, PHOTO_BG, type ConditionKey } from '../_shared/listings-data'
import {
  BellIcon,
  BookmarkIcon,
  CheckIcon,
  ChevronDownIcon,
  GlobeIcon,
  MessageIcon,
  MoreIcon,
  PhoneIcon,
  PhotoIcon,
  PinIcon,
  SearchIcon,
  SirenIcon,
} from '../_shared/icons'
import {
  STOREFRONT_FILTER_CATS,
  STOREFRONT_REVIEW_BREAKDOWN,
  STOREFRONT_SORTS,
  STOREFRONT_TABS,
  type Location,
  type Service,
  type Storefront,
  type StorefrontListing,
  type StorefrontReview,
  type StorefrontTabKey,
} from './sellers-data'

export type CoverMode = 'grid' | 'hero' | 'none'
export type BadgeStyle = 'pill' | 'shield' | 'star'
export type ListingDensity = 'comfy' | 'compact'

export function StorefrontCover({
  s,
  mode = 'grid',
}: {
  s: Storefront
  mode?: CoverMode
}) {
  if (mode === 'none') {
    return <div style={{ height: 32, background: '#F0F3F7' }} />
  }
  if (mode === 'hero') {
    const main = s.coverTiles[0]
    return (
      <div
        className="relative"
        style={{ height: 280, background: main.bg, overflow: 'hidden' }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 25% 30%, rgba(255,255,255,0.20) 0%, transparent 60%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 24px)',
          }}
        />
        <CoverChips s={s} />
        <div
          className="absolute inset-x-0 bottom-0 h-24"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.30))' }}
        />
      </div>
    )
  }
  return (
    <div
      className="relative grid"
      style={{
        height: 280,
        gridTemplateColumns: '2fr 1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 4,
        background: '#0A1628',
      }}
    >
      <div
        className="relative"
        style={{
          gridRow: '1 / span 2',
          background: s.coverTiles[0].bg,
          overflow: 'hidden',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18) 0%, transparent 60%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 24px)',
          }}
        />
        <CoverChips s={s} />
      </div>
      {s.coverTiles.slice(1, 4).map((t, i) => (
        <div
          key={i}
          className="relative"
          style={{ background: t.bg, overflow: 'hidden' }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 16px)',
            }}
          />
          <div
            className="absolute bottom-1.5 left-2 text-[9.5px] font-bold uppercase"
            style={{
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: '0.08em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            {t.label}
          </div>
        </div>
      ))}
      <button
        type="button"
        className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 h-8 px-3 text-[11.5px] font-bold"
        style={{ background: 'rgba(255,255,255,0.95)', color: '#0A1628', borderRadius: 999 }}
      >
        <PhotoIcon size={12} /> See all photos
      </button>
    </div>
  )
}

function CoverChips({ s }: { s: Storefront }) {
  return (
    <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 flex-wrap">
      <span
        className="text-[10px] font-bold uppercase px-2 h-[22px] inline-flex items-center"
        style={{
          background: 'rgba(255,255,255,0.16)',
          color: '#fff',
          borderRadius: 4,
          letterSpacing: '0.10em',
          fontFamily: 'var(--mg-font-mono)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {s.kind === 'company' ? 'COMPANY · STOREFRONT' : 'INDIVIDUAL · STOREFRONT'}
      </span>
      <span
        className="text-[10px] font-bold uppercase px-2 h-[22px] inline-flex items-center gap-1"
        style={{
          background: 'rgba(34,197,94,0.20)',
          color: '#86EFAC',
          borderRadius: 4,
          letterSpacing: '0.10em',
          fontFamily: 'var(--mg-font-mono)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <CheckIcon size={10} /> ID + INSURANCE VERIFIED
      </span>
      {s.kind === 'company' && (
        <span
          className="text-[10px] font-bold uppercase px-2 h-[22px] inline-flex items-center"
          style={{
            background: 'rgba(255,107,43,0.22)',
            color: '#FFB088',
            borderRadius: 4,
            letterSpacing: '0.10em',
            fontFamily: 'var(--mg-font-mono)',
            backdropFilter: 'blur(8px)',
          }}
        >
          24/7 SOS RESPONDER
        </span>
      )}
    </div>
  )
}

export function StorefrontIdentity({
  s,
  badgeStyle = 'pill',
}: {
  s: Storefront
  badgeStyle?: BadgeStyle
}) {
  return (
    <div
      className="px-6 pt-0 pb-4 relative"
      style={{ background: '#FFFFFF', marginTop: -52 }}
    >
      <div className="flex items-end gap-5">
        <div className="relative shrink-0">
          <div
            className="flex items-center justify-center font-bold"
            style={{
              width: 168,
              height: 168,
              background: s.avatarColor,
              color: '#fff',
              borderRadius: s.kind === 'company' ? 24 : 999,
              fontSize: 56,
              fontFamily: 'var(--mg-font-display)',
              border: '6px solid #FFFFFF',
              boxShadow: '0 8px 24px rgba(11,37,69,0.18)',
              letterSpacing: '-0.02em',
            }}
          >
            {s.tag}
          </div>
          {s.hoursStatus === 'open' && (
            <span
              className="absolute size-6 rounded-full"
              style={{
                right: 10,
                bottom: 10,
                background: '#22C55E',
                border: '4px solid #fff',
              }}
            />
          )}
        </div>
        <div className="flex-1 min-w-0 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <h1
              className="text-[28px] font-bold"
              style={{
                color: '#0A1628',
                fontFamily: 'var(--mg-font-display)',
                letterSpacing: '-0.02em',
              }}
            >
              {s.name}
            </h1>
            <VerifiedBadge style={badgeStyle} />
            <span
              className="text-[10.5px] font-bold uppercase ml-1 px-2 h-[22px] inline-flex items-center"
              style={{
                background: 'rgba(255,107,43,0.10)',
                color: '#C2410C',
                borderRadius: 999,
                letterSpacing: '0.08em',
                fontFamily: 'var(--mg-font-mono)',
              }}
            >
              TOP SELLER
            </span>
          </div>
          <div className="text-[14px] mt-1" style={{ color: '#5A6B82' }}>
            {s.tagline}
          </div>
          <div
            className="flex items-center gap-2.5 mt-2.5 text-[12.5px] flex-wrap"
            style={{ color: '#5A6B82' }}
          >
            <span className="inline-flex items-center gap-1">
              <PinIcon size={12} /> {s.hq}
            </span>
            <span style={{ color: '#CBD5E0' }}>·</span>
            <span>{s.serviceArea}</span>
            <span style={{ color: '#CBD5E0' }}>·</span>
            <span style={{ fontFamily: 'var(--mg-font-mono)' }}>Est. {s.founded}</span>
            <span style={{ color: '#CBD5E0' }}>·</span>
            <span
              className="inline-flex items-center gap-1"
              style={{ color: s.hoursStatus === 'open' ? '#16A34A' : '#5A6B82' }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{
                  background: s.hoursStatus === 'open' ? '#22C55E' : '#94A3B8',
                }}
              />
              <span style={{ fontWeight: 700 }}>{s.hours}</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 pb-3 shrink-0">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-bold"
            style={{
              background: '#FF6B2B',
              color: '#fff',
              borderRadius: 999,
              boxShadow: '0 4px 12px rgba(255,107,43,0.30)',
            }}
          >
            <SirenIcon size={14} /> Send SOS
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-bold"
            style={{ background: '#0B2545', color: '#fff', borderRadius: 999 }}
          >
            <MessageIcon size={13} /> Message
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-10 px-3.5 text-[13px] font-bold"
            style={{
              background: '#FFFFFF',
              color: '#0A1628',
              borderRadius: 999,
              border: '1px solid #E5E9EF',
            }}
          >
            <PhoneIcon size={13} /> Call
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 h-10 px-3.5 text-[13px] font-bold"
            style={{
              background: '#FFFFFF',
              color: '#0A1628',
              borderRadius: 999,
              border: '1px solid #E5E9EF',
            }}
          >
            <BookmarkIcon size={13} /> Follow
          </button>
          <button
            type="button"
            className="size-10 inline-flex items-center justify-center"
            style={{
              background: '#FFFFFF',
              color: '#0A1628',
              borderRadius: 999,
              border: '1px solid #E5E9EF',
            }}
          >
            <MoreIcon size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function VerifiedBadge({ style = 'pill' }: { style?: BadgeStyle }) {
  if (style === 'star') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="#1877F2">
        <path d="M12 1l3 4 5-1-1 5 4 3-4 3 1 5-5-1-3 4-3-4-5 1 1-5-4-3 4-3-1-5 5 1z" />
      </svg>
    )
  }
  if (style === 'shield') {
    return (
      <span
        className="size-6 inline-flex items-center justify-center"
        style={{ background: '#1877F2', borderRadius: 6, color: '#fff' }}
      >
        <CheckIcon size={13} />
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 h-[22px] px-2 text-[10.5px] font-bold uppercase"
      style={{
        background: 'rgba(24,119,242,0.12)',
        color: '#1877F2',
        borderRadius: 999,
        letterSpacing: '0.08em',
        fontFamily: 'var(--mg-font-mono)',
      }}
    >
      <CheckIcon size={10} /> Verified
    </span>
  )
}

export function StorefrontTrustStrip({
  s,
  compact = false,
}: {
  s: Storefront
  compact?: boolean
}) {
  const stats =
    s.kind === 'company'
      ? [
          { label: 'Rating', value: s.rating + '★', sub: `${s.reviews} reviews`, color: '#FF6B2B' },
          { label: 'Response rate', value: s.responseRate + '%', sub: s.responseTime + ' avg', color: '#22C55E' },
          { label: 'Transactions', value: String(s.txCount), sub: 'Completed', color: '#1877F2' },
          { label: 'Followers', value: (s.followers / 1000).toFixed(1) + 'k', sub: '+128 this mo', color: '#0EA5E9' },
          { label: 'On-call', value: s.oncall, sub: '< 4 hrs avg', color: '#FF6B2B' },
        ]
      : [
          { label: 'Rating', value: s.rating + '★', sub: `${s.reviews} reviews`, color: '#FF6B2B' },
          { label: 'Response time', value: s.responseTime, sub: s.responseRate + '% rate', color: '#22C55E' },
          { label: 'Jobs completed', value: String(s.txCount), sub: 'Lifetime', color: '#1877F2' },
          { label: 'Followers', value: (s.followers / 1000).toFixed(1) + 'k', sub: 'Followers', color: '#0EA5E9' },
          { label: 'On-call', value: s.oncall, sub: 'Will travel', color: '#FF6B2B' },
        ]
  return (
    <div
      className="grid shrink-0"
      style={{
        gridTemplateColumns: `repeat(${stats.length}, 1fr)`,
        gap: 1,
        background: '#E5E9EF',
        border: '1px solid #E5E9EF',
        borderRadius: 14,
        overflow: 'hidden',
      }}
    >
      {stats.map((stat, i) => (
        <div
          key={i}
          className="flex flex-col"
          style={{
            background: '#FFFFFF',
            padding: compact ? '12px 14px' : '14px 18px',
          }}
        >
          <span
            className="text-[10.5px] font-bold uppercase"
            style={{
              color: '#94A3B8',
              letterSpacing: '0.10em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            {stat.label}
          </span>
          <span
            className="text-[20px] font-bold mt-0.5"
            style={{
              color: stat.color,
              fontFamily: 'var(--mg-font-display)',
              letterSpacing: '-0.01em',
            }}
          >
            {stat.value}
          </span>
          <span className="text-[11px]" style={{ color: '#5A6B82' }}>
            {stat.sub}
          </span>
        </div>
      ))}
    </div>
  )
}

export function StorefrontTabs({
  active,
  onChange,
  sticky = true,
}: {
  active: StorefrontTabKey
  onChange: (key: StorefrontTabKey) => void
  sticky?: boolean
}) {
  return (
    <div
      className={(sticky ? 'sticky top-0 z-20 ' : '') + 'flex items-center justify-between px-4 shrink-0'}
      style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E9EF' }}
    >
      <div className="flex items-center gap-1 overflow-x-auto">
        {STOREFRONT_TABS.map((t) => {
          const on = t.key === active
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className="relative inline-flex items-center gap-1.5 h-12 px-4 text-[13px] shrink-0"
              style={{ color: on ? '#0A1628' : '#5A6B82', fontWeight: on ? 700 : 600 }}
            >
              {t.label}
              {t.count != null && (
                <span
                  className="text-[11px]"
                  style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
                >
                  {t.count}
                </span>
              )}
              {on && (
                <span
                  className="absolute left-3 right-3 bottom-0 h-[3px]"
                  style={{ background: '#0A1628', borderRadius: '3px 3px 0 0' }}
                />
              )}
            </button>
          )
        })}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <a
          className="text-[12px] font-semibold inline-flex items-center gap-1"
          style={{ color: '#5A6B82' }}
          href="#"
        >
          <GlobeIcon size={11} /> Share
        </a>
        <span className="size-1 rounded-full" style={{ background: '#CBD5E0' }} />
        <a className="text-[12px] font-semibold" style={{ color: '#5A6B82' }} href="#">
          Report
        </a>
      </div>
    </div>
  )
}

export function SCard({
  title,
  sub,
  action,
  children,
  padded = true,
  accent,
}: {
  title?: string
  sub?: string
  action?: ReactNode
  children: ReactNode
  padded?: boolean
  accent?: string
}) {
  return (
    <section
      className="shrink-0"
      style={{
        background: '#FFFFFF',
        borderRadius: 14,
        border: '1px solid #E5E9EF',
        overflow: 'hidden',
      }}
    >
      {(title || action) && (
        <div
          className="flex items-center justify-between px-5 py-3.5"
          style={{ borderBottom: '1px solid #F0F3F7' }}
        >
          <div className="flex items-center gap-2">
            {accent && (
              <span className="size-1.5 rounded-full" style={{ background: accent }} />
            )}
            <h3
              className="text-[14px] font-bold"
              style={{
                color: '#0A1628',
                fontFamily: 'var(--mg-font-display)',
                letterSpacing: '-0.005em',
              }}
            >
              {title}
            </h3>
            {sub && (
              <span className="text-[11.5px]" style={{ color: '#94A3B8' }}>
                {sub}
              </span>
            )}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: padded ? 20 : 0 }}>{children}</div>
    </section>
  )
}

export function IndustryChips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span
          key={it}
          className="inline-flex items-center h-7 px-3 text-[11.5px] font-bold shrink-0"
          style={{ background: '#F0F3F7', color: '#0A1628', borderRadius: 999 }}
        >
          {it}
        </span>
      ))}
    </div>
  )
}

export function ServiceRow({ svc }: { svc: Service }) {
  return (
    <div
      className="flex items-center gap-3 py-3 border-b"
      style={{ borderColor: '#F0F3F7' }}
    >
      <span
        className="size-9 inline-flex items-center justify-center shrink-0"
        style={{ background: '#F0F3F7', color: '#0B2545', borderRadius: 10 }}
      >
        <ServiceIcon kind={svc.id} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-bold" style={{ color: '#0A1628' }}>
          {svc.label}
        </div>
        <div className="text-[11.5px]" style={{ color: '#5A6B82' }}>
          {svc.sub}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div
          className="text-[10.5px] uppercase font-bold"
          style={{
            color: '#94A3B8',
            letterSpacing: '0.08em',
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          SLA
        </div>
        <div
          className="text-[12px] font-bold"
          style={{ color: '#0A1628', fontFamily: 'var(--mg-font-mono)' }}
        >
          {svc.sla}
        </div>
      </div>
      <div className="text-right shrink-0" style={{ minWidth: 90 }}>
        <div
          className="text-[10.5px] uppercase font-bold"
          style={{
            color: '#94A3B8',
            letterSpacing: '0.08em',
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          From
        </div>
        <div
          className="text-[13px] font-bold"
          style={{ color: '#FF6B2B', fontFamily: 'var(--mg-font-display)' }}
        >
          {svc.from === 0 ? 'Quote' : '$' + svc.from.toLocaleString()}
        </div>
      </div>
      <button
        type="button"
        className="h-8 px-3 text-[11.5px] font-bold inline-flex items-center gap-1"
        style={{
          background: '#FFFFFF',
          color: '#0A1628',
          border: '1px solid #E5E9EF',
          borderRadius: 999,
        }}
      >
        Request <ChevronDownIcon size={11} />
      </button>
    </div>
  )
}

export function ServiceIcon({ kind }: { kind: string }) {
  const p = {
    width: 16,
    height: 16,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (kind === 'rebuild')
    return (
      <svg {...p}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    )
  if (kind === 'bowl')
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    )
  if (kind === 'gearbox')
    return (
      <svg {...p}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    )
  if (kind === 'field')
    return (
      <svg {...p}>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.33 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
      </svg>
    )
  if (kind === 'inspect' || kind === 'vibe')
    return (
      <svg {...p}>
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    )
  if (kind === 'logistics')
    return (
      <svg {...p}>
        <path d="M5 17h14v-5l-3-7H8l-3 7z" />
        <circle cx="7.5" cy="17.5" r="2.5" />
        <circle cx="16.5" cy="17.5" r="2.5" />
      </svg>
    )
  return (
    <svg {...p}>
      <circle cx="12" cy="12" r="9" />
    </svg>
  )
}

export function StorefrontListingCard({
  l,
  density = 'comfy',
}: {
  l: StorefrontListing
  density?: ListingDensity
}) {
  const photoH = density === 'compact' ? 140 : 180
  const condKey = l.condition.toLowerCase() as ConditionKey
  const cond = COND[condKey] || { label: l.condition, color: '#0EA5E9' }
  return (
    <div
      className="overflow-hidden flex flex-col shrink-0"
      style={{
        background: '#FFFFFF',
        borderRadius: 14,
        border: '1px solid #E5E9EF',
        boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
      }}
    >
      <div
        className="relative"
        style={{ height: photoH, background: PHOTO_BG[l.bg] }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18) 0%, transparent 60%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 18px)',
          }}
        />
        {l.status === 'featured' && (
          <span
            className="absolute top-2 left-2 inline-flex items-center gap-1 h-5 px-2 text-[9.5px] font-bold uppercase"
            style={{
              background: '#FF6B2B',
              color: '#fff',
              borderRadius: 4,
              letterSpacing: '0.08em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            ★ Featured
          </span>
        )}
        <span
          className="absolute top-2 right-2 inline-flex items-center h-5 px-2 text-[9.5px] font-bold uppercase"
          style={{
            background: 'rgba(0,0,0,0.50)',
            color: '#fff',
            borderRadius: 4,
            letterSpacing: '0.08em',
            fontFamily: 'var(--mg-font-mono)',
            backdropFilter: 'blur(8px)',
          }}
        >
          {cond.label}
        </span>
        <button
          type="button"
          className="absolute bottom-2 right-2 size-7 inline-flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.92)', color: '#0A1628', borderRadius: 999 }}
        >
          <BookmarkIcon size={12} />
        </button>
      </div>
      <div className="px-3 pt-2.5 pb-3 flex-1 flex flex-col">
        <div
          className="text-[10px] font-bold uppercase"
          style={{
            color: '#94A3B8',
            letterSpacing: '0.10em',
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          {l.id} · {l.year}
        </div>
        <div
          className="text-[13.5px] font-bold mt-0.5 truncate"
          style={{ color: '#0A1628' }}
        >
          {l.title}
        </div>
        <div className="text-[11.5px]" style={{ color: '#5A6B82' }}>
          {l.sub}
        </div>
        <div
          className="flex items-end justify-between mt-2 pt-2"
          style={{ borderTop: '1px solid #F0F3F7' }}
        >
          <div>
            <div
              className="text-[15px] font-bold"
              style={{ color: '#0B2545', fontFamily: 'var(--mg-font-display)' }}
            >
              ${l.price.toLocaleString()}
            </div>
            <div
              className="text-[10px]"
              style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
            >
              {l.views} views · {l.faves} faves
            </div>
          </div>
          <button
            type="button"
            className="h-7 px-2.5 text-[11px] font-bold inline-flex items-center gap-1"
            style={{ background: '#0B2545', color: '#fff', borderRadius: 999 }}
          >
            Quote
          </button>
        </div>
      </div>
    </div>
  )
}

export function LocationCard({ loc }: { loc: Location }) {
  return (
    <div
      className="flex items-start gap-2.5 py-3 border-b"
      style={{ borderColor: '#F0F3F7' }}
    >
      <span
        className="size-9 inline-flex items-center justify-center shrink-0"
        style={{
          background: loc.primary ? 'rgba(255,107,43,0.12)' : '#F0F3F7',
          color: loc.primary ? '#FF6B2B' : '#0B2545',
          borderRadius: 10,
        }}
      >
        <PinIcon size={14} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[12.5px] font-bold" style={{ color: '#0A1628' }}>
            {loc.city}
          </span>
          {loc.primary && (
            <span
              className="text-[9.5px] font-bold uppercase px-1.5 h-4 inline-flex items-center"
              style={{
                background: '#FF6B2B',
                color: '#fff',
                borderRadius: 4,
                letterSpacing: '0.06em',
                fontFamily: 'var(--mg-font-mono)',
              }}
            >
              HQ
            </span>
          )}
        </div>
        <div className="text-[11px]" style={{ color: '#5A6B82' }}>
          {loc.role}
        </div>
        <div
          className="text-[11px]"
          style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
        >
          {loc.phone} · {loc.radius} mi radius
        </div>
      </div>
    </div>
  )
}

export function VerificationPanel({ verified }: { verified: string[] }) {
  const all = [
    { key: 'identity', label: 'Business identity', sub: 'EIN verified' },
    { key: 'insurance', label: 'Insurance (COI)', sub: '$2M general liability' },
    { key: 'tax', label: 'Tax compliance', sub: 'TX state tax current' },
    { key: 'banking', label: 'Banking on file', sub: 'ACH escrow ready' },
  ]
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {all.map((v) => {
        const on = verified.includes(v.key)
        return (
          <div
            key={v.key}
            className="flex items-center gap-2 px-2.5 py-2"
            style={{
              background: on ? 'rgba(34,197,94,0.06)' : '#F0F3F7',
              borderRadius: 8,
            }}
          >
            <span
              className="size-6 inline-flex items-center justify-center shrink-0"
              style={{
                background: on ? '#22C55E' : '#CBD5E0',
                color: '#fff',
                borderRadius: 999,
              }}
            >
              {on ? (
                <CheckIcon size={11} />
              ) : (
                <span style={{ fontWeight: 800, fontSize: 11 }}>?</span>
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[11.5px] font-bold" style={{ color: '#0A1628' }}>
                {v.label}
              </div>
              <div className="text-[10px]" style={{ color: '#5A6B82' }}>
                {v.sub}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function ServiceMap({ s }: { s: Storefront }) {
  return (
    <div
      className="relative overflow-hidden"
      style={{ background: '#0B1B2D', borderRadius: 12, height: 200 }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <svg
        className="absolute inset-0"
        width="100%"
        height="100%"
        preserveAspectRatio="none"
        viewBox="0 0 100 60"
      >
        <path
          d="M 0 38 Q 10 38, 18 40 T 35 42 Q 45 44, 55 42 T 75 40 Q 85 39, 100 41"
          stroke="rgba(56,189,248,0.32)"
          strokeWidth="0.4"
          fill="none"
        />
        <path
          d="M 0 60 L 0 40 Q 10 40, 18 42 T 35 44 Q 45 46, 55 44 T 75 42 Q 85 41, 100 43 L 100 60 Z"
          fill="rgba(11,37,69,0.55)"
        />
      </svg>
      {s.locations.map((loc) => (
        <span key={loc.id} className="contents">
          <span
            className="absolute"
            style={{
              left: `${loc.x * 100}%`,
              top: `${loc.y * 100}%`,
              width: 80,
              height: 80,
              borderRadius: 999,
              transform: 'translate(-50%, -50%)',
              background:
                'radial-gradient(circle, rgba(255,107,43,0.30) 0%, rgba(255,107,43,0.04) 70%, transparent 100%)',
              border: '1px dashed rgba(255,107,43,0.45)',
            }}
          />
          <span
            className="absolute size-3 rounded-full"
            style={{
              left: `${loc.x * 100}%`,
              top: `${loc.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              background: loc.primary ? '#FF6B2B' : '#1877F2',
              boxShadow: '0 0 0 3px rgba(255,255,255,0.85)',
            }}
          />
          <span
            className="absolute text-[10px] font-bold"
            style={{
              left: `${loc.x * 100}%`,
              top: `calc(${loc.y * 100}% + 14px)`,
              transform: 'translateX(-50%)',
              color: '#fff',
              fontFamily: 'var(--mg-font-mono)',
              textShadow: '0 1px 2px rgba(0,0,0,0.6)',
              whiteSpace: 'nowrap',
            }}
          >
            {loc.city.split(',')[0]}
          </span>
        </span>
      ))}
      <div
        className="absolute top-2 left-2.5 text-[10px] font-bold uppercase"
        style={{
          color: 'rgba(255,255,255,0.7)',
          letterSpacing: '0.10em',
          fontFamily: 'var(--mg-font-mono)',
        }}
      >
        SERVICE AREA
      </div>
    </div>
  )
}

export function ListingsFilterBar({
  cat,
  onCat,
  density,
  onDensity,
  sort,
  onSort,
}: {
  cat: string
  onCat: (id: string) => void
  density: ListingDensity
  onDensity: (d: ListingDensity) => void
  sort: string
  onSort: (v: string) => void
}) {
  return (
    <div
      className="flex flex-col gap-3 px-5 py-3.5"
      style={{ background: '#FFFFFF', borderBottom: '1px solid #F0F3F7' }}
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {STOREFRONT_FILTER_CATS.map((c) => {
            const on = c.id === cat
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => onCat(c.id)}
                className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] shrink-0"
                style={{
                  background: on ? '#0A1628' : '#F0F3F7',
                  color: on ? '#fff' : '#0A1628',
                  borderRadius: 999,
                  fontWeight: on ? 700 : 600,
                }}
              >
                {c.label}
                <span
                  className="text-[10.5px]"
                  style={{
                    color: on ? 'rgba(255,255,255,0.55)' : '#94A3B8',
                    fontFamily: 'var(--mg-font-mono)',
                  }}
                >
                  {c.count}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center"
            style={{ background: '#F0F3F7', borderRadius: 999, padding: 2 }}
          >
            {(['comfy', 'compact'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onDensity(d)}
                className="h-7 px-3 text-[11px] font-bold capitalize"
                style={{
                  background: d === density ? '#FFFFFF' : 'transparent',
                  color: d === density ? '#0A1628' : '#5A6B82',
                  borderRadius: 999,
                }}
              >
                {d}
              </button>
            ))}
          </div>
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value)}
            style={{
              height: 32,
              padding: '0 28px 0 12px',
              background: '#F0F3F7',
              border: 'none',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              color: '#0A1628',
              appearance: 'none',
            }}
          >
            {STOREFRONT_SORTS.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2 text-[11.5px]" style={{ color: '#5A6B82' }}>
        <SearchIcon size={11} />
        <input
          placeholder="Search this seller's inventory…"
          style={{
            flex: 1,
            height: 32,
            padding: '0 12px',
            background: '#FBFCFD',
            border: '1px solid #E5E9EF',
            borderRadius: 999,
            fontSize: 12,
            color: '#0A1628',
            outline: 'none',
          }}
        />
        <button
          type="button"
          className="h-8 px-3 text-[11px] font-bold inline-flex items-center gap-1 shrink-0"
          style={{
            background: '#FFFFFF',
            color: '#0A1628',
            border: '1px solid #E5E9EF',
            borderRadius: 999,
          }}
        >
          <BellIcon size={11} /> Save search
        </button>
      </div>
    </div>
  )
}

export function ReviewsSummary({ s }: { s: Storefront }) {
  return (
    <div
      className="grid gap-5 items-center"
      style={{ gridTemplateColumns: '160px 1fr' }}
    >
      <div className="flex flex-col items-center text-center">
        <div
          className="text-[44px] font-bold"
          style={{
            color: '#0A1628',
            fontFamily: 'var(--mg-font-display)',
            letterSpacing: '-0.03em',
            lineHeight: 1,
          }}
        >
          {s.rating}
        </div>
        <div
          className="flex items-center gap-0.5 mt-1"
          style={{ color: '#FF6B2B', fontSize: 14 }}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i}>★</span>
          ))}
        </div>
        <div className="text-[11px] mt-1" style={{ color: '#5A6B82' }}>
          {s.reviews} reviews
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {STOREFRONT_REVIEW_BREAKDOWN.map((b) => (
          <div key={b.stars} className="flex items-center gap-2">
            <span
              className="text-[11px] w-3 text-right"
              style={{ color: '#5A6B82', fontFamily: 'var(--mg-font-mono)' }}
            >
              {b.stars}
            </span>
            <span style={{ color: '#FF6B2B', fontSize: 10 }}>★</span>
            <div
              className="flex-1 h-1.5"
              style={{ background: '#F0F3F7', borderRadius: 999, overflow: 'hidden' }}
            >
              <div
                style={{
                  width: `${b.pct * 100}%`,
                  height: '100%',
                  background: '#FF6B2B',
                  borderRadius: 999,
                }}
              />
            </div>
            <span
              className="text-[10.5px] w-8 text-right"
              style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
            >
              {b.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReviewItem({ r }: { r: StorefrontReview }) {
  return (
    <div className="flex gap-3 py-4 border-b" style={{ borderColor: '#F0F3F7' }}>
      <div
        className="size-10 inline-flex items-center justify-center shrink-0 text-[12px] font-bold"
        style={{
          background: r.color,
          color: '#fff',
          borderRadius: 999,
          fontFamily: 'var(--mg-font-display)',
        }}
      >
        {r.tag}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[12.5px] font-bold" style={{ color: '#0A1628' }}>
            {r.name}
          </span>
          <span className="text-[11px]" style={{ color: '#5A6B82' }}>
            · {r.role}
          </span>
          {r.verified && (
            <span
              className="inline-flex items-center gap-0.5 h-4 px-1.5 text-[9.5px] font-bold"
              style={{
                background: 'rgba(34,197,94,0.10)',
                color: '#16A34A',
                borderRadius: 4,
                letterSpacing: '0.06em',
                fontFamily: 'var(--mg-font-mono)',
              }}
            >
              <CheckIcon size={8} /> VERIFIED BUY
            </span>
          )}
          <span
            className="ml-auto text-[10.5px]"
            style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
          >
            {r.when}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span style={{ color: '#FF6B2B', fontSize: 12, letterSpacing: 1 }}>
            {'★'.repeat(r.rating)}
            <span style={{ color: '#E5E9EF' }}>{'★'.repeat(5 - r.rating)}</span>
          </span>
          <span
            className="text-[10.5px]"
            style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
          >
            tx: {r.tx}
          </span>
        </div>
        <p
          className="text-[12.5px] mt-1.5"
          style={{ color: '#0A1628', lineHeight: 1.55 }}
        >
          {r.body}
        </p>
      </div>
    </div>
  )
}
