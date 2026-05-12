'use client'

import { useState, type ReactNode } from 'react'
import {
  BookmarkIcon,
  CheckIcon,
  ChevronDownIcon,
  CreditIcon,
  MessageIcon,
  PhoneIcon,
  PinIcon,
  ShareIcon,
  SirenIcon,
} from '../_shared/icons'
import {
  ReviewItem,
  ReviewsSummary,
  ServiceIcon,
  ServiceMap,
  StorefrontListingCard,
  VerificationPanel,
} from './SellersShared'
import {
  STOREFRONT_COMPANY,
  STOREFRONT_FILTER_CATS,
  STOREFRONT_LISTINGS,
  STOREFRONT_PERSON,
  STOREFRONT_REVIEWS,
  STOREFRONT_TABS,
  type Storefront,
  type StorefrontKind,
  type StorefrontTabKey,
} from './sellers-data'

export function MobileSellers({
  initialKind = 'company',
}: {
  initialKind?: StorefrontKind
}) {
  const [kind, setKind] = useState<StorefrontKind>(initialKind)
  const [tab, setTab] = useState<StorefrontTabKey>('home')
  const s = kind === 'company' ? STOREFRONT_COMPANY : STOREFRONT_PERSON

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{
        background: '#F0F3F7',
        fontFamily: 'var(--mg-font-body)',
        color: '#0A1628',
        paddingTop: 44,
      }}
    >
      <div
        className="flex items-center justify-between px-3 pt-3 pb-2.5 shrink-0"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E9EF' }}
      >
        <button
          type="button"
          className="size-9 inline-flex items-center justify-center"
          style={{ borderRadius: 999, background: '#F0F3F7' }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="flex flex-col items-center">
          <span
            className="text-[9.5px] font-bold uppercase"
            style={{
              color: '#94A3B8',
              letterSpacing: '0.10em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            Storefront
          </span>
          <span
            className="text-[13px] font-bold tracking-tight truncate max-w-[180px]"
            style={{ fontFamily: 'var(--mg-font-display)' }}
          >
            {s.name}
          </span>
        </div>
        <button
          type="button"
          className="size-9 inline-flex items-center justify-center"
          style={{ borderRadius: 999, background: '#F0F3F7' }}
        >
          <ShareIcon size={13} />
        </button>
      </div>

      <div
        className="relative shrink-0"
        style={{ height: 140, background: s.coverTiles[0].bg, overflow: 'hidden' }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.20) 0%, transparent 60%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 20px)',
          }}
        />
        <div className="absolute top-2 left-2 inline-flex items-center gap-1 flex-wrap">
          <span
            className="text-[9px] font-bold uppercase px-1.5 h-[18px] inline-flex items-center"
            style={{
              background: 'rgba(255,255,255,0.18)',
              color: '#fff',
              borderRadius: 4,
              letterSpacing: '0.10em',
              fontFamily: 'var(--mg-font-mono)',
              backdropFilter: 'blur(6px)',
            }}
          >
            {s.kind === 'company' ? 'COMPANY' : 'INDIVIDUAL'}
          </span>
          <span
            className="text-[9px] font-bold uppercase px-1.5 h-[18px] inline-flex items-center gap-0.5"
            style={{
              background: 'rgba(34,197,94,0.22)',
              color: '#86EFAC',
              borderRadius: 4,
              letterSpacing: '0.10em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            <CheckIcon size={8} /> VERIFIED
          </span>
        </div>
        <div
          className="absolute inset-x-0 bottom-0 h-12"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.30))' }}
        />
      </div>

      <div
        className="px-4 pb-3 relative shrink-0"
        style={{ background: '#FFFFFF', marginTop: -32 }}
      >
        <div className="flex items-end gap-3">
          <div
            className="size-[80px] inline-flex items-center justify-center text-[26px] font-bold shrink-0"
            style={{
              background: s.avatarColor,
              color: '#fff',
              borderRadius: s.kind === 'company' ? 16 : 999,
              border: '4px solid #fff',
              fontFamily: 'var(--mg-font-display)',
              boxShadow: '0 4px 12px rgba(11,37,69,0.18)',
              letterSpacing: '-0.02em',
            }}
          >
            {s.tag}
          </div>
          <div className="flex-1 min-w-0 pb-1">
            <div className="flex items-center gap-1">
              <span
                className="text-[15px] font-bold tracking-tight truncate"
                style={{ fontFamily: 'var(--mg-font-display)' }}
              >
                {s.name}
              </span>
              <span
                className="size-4 inline-flex items-center justify-center shrink-0"
                style={{ background: '#1877F2', color: '#fff', borderRadius: 999 }}
              >
                <CheckIcon size={9} />
              </span>
            </div>
            <div className="text-[10.5px] truncate" style={{ color: '#5A6B82' }}>
              {s.tagline}
            </div>
            <div
              className="text-[10px] mt-0.5 inline-flex items-center gap-1"
              style={{ color: '#16A34A', fontFamily: 'var(--mg-font-mono)' }}
            >
              <span
                className="size-1.5 rounded-full"
                style={{ background: '#22C55E' }}
              />{' '}
              {s.hours}
            </div>
          </div>
        </div>

        <div
          className="mt-2.5 flex items-center text-[10.5px] font-bold"
          style={{ background: '#F0F3F7', borderRadius: 999, padding: 2 }}
        >
          {(
            [
              { k: 'company', l: 'Company' },
              { k: 'person', l: 'Person' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.k}
              type="button"
              onClick={() => setKind(opt.k)}
              className="flex-1 h-7 inline-flex items-center justify-center"
              style={{
                background: kind === opt.k ? '#FFFFFF' : 'transparent',
                color: kind === opt.k ? '#0A1628' : '#5A6B82',
                borderRadius: 999,
              }}
            >
              {opt.l}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-4 gap-1.5 mt-2.5">
          <ActionCell color="#FF6B2B" icon={<SirenIcon size={13} />} label="SOS" filled />
          <ActionCell icon={<MessageIcon size={13} />} label="Message" />
          <ActionCell icon={<PhoneIcon size={13} />} label="Call" />
          <ActionCell icon={<BookmarkIcon size={13} />} label="Follow" />
        </div>

        <div
          className="mt-2.5 grid grid-cols-3 gap-1"
          style={{ background: '#F0F3F7', borderRadius: 10, padding: 2 }}
        >
          <MStat label="Rating" value={`${s.rating}★`} sub={`${s.reviews}`} />
          <MStat label="Resp" value={s.responseTime} sub={`${s.responseRate}%`} />
          <MStat label="Tx" value={String(s.txCount)} sub="lifetime" />
        </div>
      </div>

      <div
        className="sticky top-0 z-20 flex items-center gap-1 px-3 overflow-x-auto shrink-0"
        style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E9EF' }}
      >
        {STOREFRONT_TABS.map((t) => {
          const on = t.key === tab
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="relative inline-flex items-center gap-1 h-10 px-3 text-[12px] shrink-0"
              style={{ color: on ? '#0A1628' : '#5A6B82', fontWeight: on ? 700 : 600 }}
            >
              {t.label}
              {t.count != null && (
                <span
                  className="text-[10px]"
                  style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
                >
                  {t.count}
                </span>
              )}
              {on && (
                <span
                  className="absolute left-2 right-2 bottom-0 h-[2.5px]"
                  style={{ background: '#0A1628', borderRadius: '3px 3px 0 0' }}
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3 [&>*]:shrink-0">
        {tab === 'home' && <MHome s={s} />}
        {tab === 'listings' && <MListings />}
        {tab === 'services' && <MServices s={s} />}
        {tab === 'reviews' && <MReviews s={s} />}
        {tab === 'about' && <MAbout s={s} />}
        {tab === 'locations' && <MLocations s={s} />}
        <div className="h-12" />
      </div>

      <div
        className="px-3 py-2.5 flex items-center gap-2 shrink-0"
        style={{ background: '#0A1628', borderTop: '1px solid rgba(255,255,255,0.10)' }}
      >
        <button
          type="button"
          className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 text-[12.5px] font-bold"
          style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
        >
          <SirenIcon size={13} /> Send SOS
        </button>
        <button
          type="button"
          className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 text-[12.5px] font-bold"
          style={{ background: 'rgba(255,255,255,0.10)', color: '#fff', borderRadius: 999 }}
        >
          <CreditIcon size={12} /> Request quote
        </button>
      </div>
    </div>
  )
}

function ActionCell({
  icon,
  label,
  color = '#0B2545',
  filled,
}: {
  icon: ReactNode
  label: string
  color?: string
  filled?: boolean
}) {
  return (
    <button
      type="button"
      className="flex flex-col items-center gap-0.5 py-2"
      style={{
        background: filled ? color : '#FFFFFF',
        color: filled ? '#fff' : '#0A1628',
        border: filled ? 'none' : '1px solid #E5E9EF',
        borderRadius: 10,
      }}
    >
      <span style={{ color: filled ? '#fff' : color }}>{icon}</span>
      <span
        className="text-[10px] font-bold"
        style={{ color: filled ? '#fff' : '#0A1628' }}
      >
        {label}
      </span>
    </button>
  )
}

function MStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div
      className="flex flex-col items-center py-1.5"
      style={{ background: '#FFFFFF', borderRadius: 8 }}
    >
      <span
        className="text-[9px] font-bold uppercase"
        style={{
          color: '#94A3B8',
          letterSpacing: '0.08em',
          fontFamily: 'var(--mg-font-mono)',
        }}
      >
        {label}
      </span>
      <span
        className="text-[12.5px] font-bold"
        style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
      >
        {value}
      </span>
      <span
        className="text-[9.5px]"
        style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
      >
        {sub}
      </span>
    </div>
  )
}

function MCard({
  title,
  sub,
  action,
  children,
  padded = true,
}: {
  title?: string
  sub?: string
  action?: ReactNode
  children: ReactNode
  padded?: boolean
}) {
  return (
    <section
      className="shrink-0"
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        border: '1px solid #E5E9EF',
        overflow: 'hidden',
      }}
    >
      {(title || action) && (
        <div
          className="flex items-center justify-between px-3 py-2.5"
          style={{ borderBottom: '1px solid #F0F3F7' }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="text-[12.5px] font-bold"
              style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
            >
              {title}
            </span>
            {sub && (
              <span
                className="text-[10.5px]"
                style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
              >
                {sub}
              </span>
            )}
          </div>
          {action}
        </div>
      )}
      <div style={{ padding: padded ? 12 : 0 }}>{children}</div>
    </section>
  )
}

function MHome({ s }: { s: Storefront }) {
  const featured = STOREFRONT_LISTINGS.filter((l) => l.status === 'featured').slice(0, 3)
  const recent = STOREFRONT_LISTINGS.slice(0, 4)
  return (
    <>
      <MCard title="About">
        <p
          className="text-[12px]"
          style={{ color: '#0A1628', lineHeight: 1.55 }}
        >
          {s.pitch}
        </p>
        <div className="flex flex-wrap gap-1 mt-2">
          {s.industries.slice(0, 6).map((i) => (
            <span
              key={i}
              className="inline-flex items-center h-6 px-2 text-[10.5px] font-bold"
              style={{ background: '#F0F3F7', color: '#0A1628', borderRadius: 999 }}
            >
              {i}
            </span>
          ))}
        </div>
      </MCard>

      <MCard title="Verification">
        <VerificationPanel verified={s.verified} />
      </MCard>

      <MCard
        title="Featured"
        sub={`${featured.length} of ${STOREFRONT_TABS[1].count}`}
        padded={false}
      >
        <div
          className="flex gap-2 p-2 overflow-x-auto"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {featured.map((l) => (
            <div
              key={l.id}
              style={{ width: 200, flex: '0 0 auto', scrollSnapAlign: 'start' }}
            >
              <StorefrontListingCard l={l} density="compact" />
            </div>
          ))}
        </div>
      </MCard>

      <MCard title="Top services" sub={`${s.services.length}`} padded={false}>
        {s.services.slice(0, 3).map((svc) => (
          <div
            key={svc.id}
            className="flex items-center gap-2.5 px-3 py-2.5 border-b"
            style={{ borderColor: '#F0F3F7' }}
          >
            <span
              className="size-8 inline-flex items-center justify-center shrink-0"
              style={{ background: '#F0F3F7', color: '#0B2545', borderRadius: 8 }}
            >
              <ServiceIcon kind={svc.id} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold truncate" style={{ color: '#0A1628' }}>
                {svc.label}
              </div>
              <div className="text-[10.5px]" style={{ color: '#5A6B82' }}>
                {svc.sla} · from{' '}
                {svc.from === 0 ? 'quote' : '$' + svc.from.toLocaleString()}
              </div>
            </div>
            <ChevronDownIcon size={11} />
          </div>
        ))}
      </MCard>

      <MCard title="Coverage">
        <ServiceMap s={s} />
      </MCard>

      <MCard title="Reviews" sub={`${s.rating}★ · ${s.reviews}`}>
        <ReviewsSummary s={s} />
        <div className="mt-2">
          <ReviewItem r={STOREFRONT_REVIEWS[0]} />
        </div>
      </MCard>

      <MCard title="More inventory" padded={false}>
        <div className="grid grid-cols-2 gap-2 p-2">
          {recent.map((l) => (
            <StorefrontListingCard key={l.id} l={l} density="compact" />
          ))}
        </div>
      </MCard>
    </>
  )
}

function MListings() {
  return (
    <MCard title="All listings" sub="67" padded={false}>
      <div className="flex gap-1.5 p-2 overflow-x-auto">
        {STOREFRONT_FILTER_CATS.map((c, i) => (
          <button
            key={c.id}
            type="button"
            className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] shrink-0"
            style={{
              background: i === 0 ? '#0A1628' : '#F0F3F7',
              color: i === 0 ? '#fff' : '#0A1628',
              borderRadius: 999,
              fontWeight: i === 0 ? 700 : 600,
            }}
          >
            {c.label}{' '}
            <span
              className="text-[9.5px]"
              style={{ opacity: 0.6, fontFamily: 'var(--mg-font-mono)' }}
            >
              {c.count}
            </span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 p-2">
        {STOREFRONT_LISTINGS.map((l) => (
          <StorefrontListingCard key={l.id} l={l} density="compact" />
        ))}
      </div>
    </MCard>
  )
}

function MServices({ s }: { s: Storefront }) {
  return (
    <MCard title="All services" sub={`${s.services.length}`} padded={false}>
      {s.services.map((svc) => (
        <div
          key={svc.id}
          className="flex items-center gap-2.5 px-3 py-3 border-b"
          style={{ borderColor: '#F0F3F7' }}
        >
          <span
            className="size-9 inline-flex items-center justify-center shrink-0"
            style={{ background: '#F0F3F7', color: '#0B2545', borderRadius: 10 }}
          >
            <ServiceIcon kind={svc.id} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold" style={{ color: '#0A1628' }}>
              {svc.label}
            </div>
            <div className="text-[10.5px]" style={{ color: '#5A6B82' }}>
              {svc.sub}
            </div>
            <div
              className="text-[10px] mt-0.5"
              style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
            >
              SLA {svc.sla} · from{' '}
              {svc.from === 0 ? 'quote' : '$' + svc.from.toLocaleString()}
            </div>
          </div>
          <button
            type="button"
            className="h-7 px-2.5 text-[10.5px] font-bold"
            style={{ background: '#0B2545', color: '#fff', borderRadius: 999 }}
          >
            Quote
          </button>
        </div>
      ))}
    </MCard>
  )
}

function MReviews({ s }: { s: Storefront }) {
  return (
    <>
      <MCard title="Summary">
        <ReviewsSummary s={s} />
      </MCard>
      <MCard title={`${s.reviews} reviews`} padded={false}>
        <div className="px-3">
          {STOREFRONT_REVIEWS.map((r, i) => (
            <ReviewItem key={i} r={r} />
          ))}
        </div>
      </MCard>
    </>
  )
}

function MAbout({ s }: { s: Storefront }) {
  return (
    <>
      <MCard title="About" sub={s.legal}>
        <p
          className="text-[12.5px]"
          style={{ color: '#0A1628', lineHeight: 1.6 }}
        >
          {s.pitch}
        </p>
      </MCard>
      <MCard title="Industries">
        <div className="flex flex-wrap gap-1.5">
          {s.industries.map((i) => (
            <span
              key={i}
              className="inline-flex items-center h-7 px-2.5 text-[11px] font-bold"
              style={{ background: '#F0F3F7', color: '#0A1628', borderRadius: 999 }}
            >
              {i}
            </span>
          ))}
        </div>
      </MCard>
      <MCard title="Certifications" sub={`${s.certs.length}`} padded={false}>
        {s.certs.map((c) => (
          <div
            key={c.label}
            className="flex items-center gap-2.5 px-3 py-2.5 border-b"
            style={{ borderColor: '#F0F3F7' }}
          >
            <span
              className="size-8 inline-flex items-center justify-center shrink-0"
              style={{ background: c.color, color: '#fff', borderRadius: 8 }}
            >
              <CheckIcon size={12} />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[11.5px] font-bold" style={{ color: '#0A1628' }}>
                {c.label}
              </div>
              <div className="text-[10px]" style={{ color: '#5A6B82' }}>
                {c.sub}
              </div>
            </div>
          </div>
        ))}
      </MCard>
      {s.kind === 'company' && s.team && (
        <MCard title="Team" sub={`${s.team.length} members`} padded={false}>
          {s.team.map((t) => (
            <div
              key={t.tag}
              className="flex items-center gap-2.5 px-3 py-2.5 border-b"
              style={{ borderColor: '#F0F3F7' }}
            >
              <div
                className="size-9 inline-flex items-center justify-center text-[11px] font-bold"
                style={{
                  background: t.color,
                  color: '#fff',
                  borderRadius: 999,
                  fontFamily: 'var(--mg-font-display)',
                }}
              >
                {t.tag}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold truncate" style={{ color: '#0A1628' }}>
                  {t.name}
                </div>
                <div className="text-[10.5px]" style={{ color: '#5A6B82' }}>
                  {t.role}
                </div>
              </div>
            </div>
          ))}
        </MCard>
      )}
    </>
  )
}

function MLocations({ s }: { s: Storefront }) {
  return (
    <>
      <MCard padded={false}>
        <ServiceMap s={s} />
      </MCard>
      <MCard title="Locations" sub={`${s.locations.length}`} padded={false}>
        {s.locations.map((loc) => (
          <div
            key={loc.id}
            className="flex items-center gap-2.5 px-3 py-3 border-b"
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
              <div className="flex items-center gap-1">
                <span className="text-[12px] font-bold" style={{ color: '#0A1628' }}>
                  {loc.city}
                </span>
                {loc.primary && (
                  <span
                    className="text-[9px] font-bold uppercase px-1 h-3.5 inline-flex items-center"
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
              <div className="text-[10.5px]" style={{ color: '#5A6B82' }}>
                {loc.role} · {loc.radius} mi
              </div>
            </div>
            <button
              type="button"
              className="size-8 inline-flex items-center justify-center"
              style={{ background: '#0B2545', color: '#fff', borderRadius: 999 }}
            >
              <PhoneIcon size={11} />
            </button>
          </div>
        ))}
      </MCard>
    </>
  )
}
