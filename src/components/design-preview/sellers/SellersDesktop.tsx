'use client'

import { useState, type ReactNode } from 'react'
import {
  ChevronDownIcon,
  CheckIcon,
  CreditIcon,
  MessageIcon,
  PhoneIcon,
  PinIcon,
  ShareIcon,
  SirenIcon,
} from '../_shared/icons'
import {
  IndustryChips,
  ListingsFilterBar,
  LocationCard,
  ReviewItem,
  ReviewsSummary,
  SCard,
  ServiceMap,
  ServiceRow,
  StorefrontCover,
  StorefrontIdentity,
  StorefrontListingCard,
  StorefrontTabs,
  StorefrontTrustStrip,
  VerificationPanel,
  type BadgeStyle,
  type CoverMode,
  type ListingDensity,
} from './SellersShared'
import {
  STOREFRONT_ACTIVITY,
  STOREFRONT_COMPANY,
  STOREFRONT_LISTINGS,
  STOREFRONT_PERSON,
  STOREFRONT_REVIEWS,
  STOREFRONT_TABS,
  type Storefront,
  type StorefrontKind,
  type StorefrontTabKey,
} from './sellers-data'

export function SellersDesktop({
  initialKind = 'company',
  tweaks = {},
}: {
  initialKind?: StorefrontKind
  tweaks?: {
    cover?: CoverMode
    badge?: BadgeStyle
    density?: ListingDensity
    showSide?: boolean
    showStats?: boolean
  }
}) {
  const [kind, setKind] = useState<StorefrontKind>(initialKind)
  const [tab, setTab] = useState<StorefrontTabKey>('home')
  const s = kind === 'company' ? STOREFRONT_COMPANY : STOREFRONT_PERSON

  const cover: CoverMode = tweaks.cover || 'grid'
  const badge: BadgeStyle = tweaks.badge || 'pill'
  const density: ListingDensity = tweaks.density || 'comfy'
  const showSide = tweaks.showSide !== false
  const showStats = tweaks.showStats !== false

  return (
    <div
      className="w-full h-full flex flex-col"
      style={{
        background: '#F0F3F7',
        fontFamily: 'var(--mg-font-body)',
        color: '#0A1628',
      }}
    >
      <SellersPageHeader s={s} kind={kind} onKindChange={setKind} />

      <StorefrontCover s={s} mode={cover} />
      <StorefrontIdentity s={s} badgeStyle={badge} />

      <StorefrontTabs active={tab} onChange={setTab} sticky={false} />

      <div className="flex-1 px-6 py-5 overflow-y-auto">
        {tab === 'home' && (
          <HomeTab s={s} showSide={showSide} showStats={showStats} density={density} />
        )}
        {tab === 'listings' && <ListingsTab density={density} />}
        {tab === 'services' && <ServicesTab s={s} />}
        {tab === 'reviews' && <ReviewsTab s={s} />}
        {tab === 'about' && <AboutTab s={s} showSide={showSide} />}
        {tab === 'locations' && <LocationsTab s={s} />}
      </div>
    </div>
  )
}

function SellersPageHeader({
  s,
  kind,
  onKindChange,
}: {
  s: Storefront
  kind: StorefrontKind
  onKindChange: (k: StorefrontKind) => void
}) {
  return (
    <div
      className="flex items-center justify-between px-6 py-2.5 shrink-0"
      style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E9EF' }}
    >
      <div className="flex items-center gap-2 text-[12px]" style={{ color: '#5A6B82' }}>
        <a href="#" style={{ color: '#5A6B82', fontWeight: 600 }}>
          Sellers
        </a>
        <span style={{ color: '#CBD5E0' }}>/</span>
        <a href="#" style={{ color: '#5A6B82', fontWeight: 600 }}>
          {s.industries[0]}
        </a>
        <span style={{ color: '#CBD5E0' }}>/</span>
        <span style={{ color: '#0A1628', fontWeight: 700 }}>{s.name}</span>
        <span
          className="text-[10px] font-bold uppercase ml-1.5 px-1.5 h-[18px] inline-flex items-center"
          style={{
            background: '#F0F3F7',
            color: '#94A3B8',
            borderRadius: 4,
            letterSpacing: '0.08em',
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          /sellers/{s.id}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div
          className="flex items-center text-[11px] font-bold"
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
              onClick={() => onKindChange(opt.k)}
              className="h-7 px-3 inline-flex items-center"
              style={{
                background: kind === opt.k ? '#FFFFFF' : 'transparent',
                color: kind === opt.k ? '#0A1628' : '#5A6B82',
                borderRadius: 999,
                boxShadow: kind === opt.k ? '0 1px 3px rgba(11,37,69,0.08)' : 'none',
              }}
            >
              {opt.l}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="h-8 px-3 text-[11.5px] font-semibold inline-flex items-center gap-1.5"
          style={{
            background: '#FFFFFF',
            color: '#0A1628',
            border: '1px solid #E5E9EF',
            borderRadius: 999,
          }}
        >
          <ShareIcon size={11} /> Share storefront
        </button>
      </div>
    </div>
  )
}

function HomeTab({
  s,
  showSide,
  showStats,
  density,
}: {
  s: Storefront
  showSide: boolean
  showStats: boolean
  density: ListingDensity
}) {
  const featured = STOREFRONT_LISTINGS.filter((l) => l.status === 'featured').slice(0, 3)
  const recent = STOREFRONT_LISTINGS.slice(0, 8)

  return (
    <div
      className="grid gap-5"
      style={{ gridTemplateColumns: showSide ? 'minmax(0, 1fr) 320px' : '1fr' }}
    >
      <div className="flex flex-col gap-5 min-w-0 [&>*]:shrink-0">
        {showStats && <StorefrontTrustStrip s={s} />}

        <SCard
          title="About this seller"
          sub={s.legal}
          action={
            <a className="text-[11.5px] font-bold" style={{ color: '#FF6B2B' }} href="#">
              Read more →
            </a>
          }
        >
          <div className="grid gap-5" style={{ gridTemplateColumns: '1fr 280px' }}>
            <div>
              <p
                className="text-[13.5px]"
                style={{ color: '#0A1628', lineHeight: 1.6 }}
              >
                {s.pitch}
              </p>
              <div className="mt-3.5">
                <div
                  className="text-[10.5px] font-bold uppercase mb-1.5"
                  style={{
                    color: '#94A3B8',
                    letterSpacing: '0.10em',
                    fontFamily: 'var(--mg-font-mono)',
                  }}
                >
                  Industries served
                </div>
                <IndustryChips items={s.industries} />
              </div>
            </div>
            <div>
              <div
                className="text-[10.5px] font-bold uppercase mb-1.5"
                style={{
                  color: '#94A3B8',
                  letterSpacing: '0.10em',
                  fontFamily: 'var(--mg-font-mono)',
                }}
              >
                Verification
              </div>
              <VerificationPanel verified={s.verified} />
            </div>
          </div>
        </SCard>

        <SCard
          title="Featured listings"
          sub={`${featured.length} of ${STOREFRONT_TABS[1].count}`}
          accent="#FF6B2B"
          action={
            <a className="text-[11.5px] font-bold" style={{ color: '#FF6B2B' }} href="#">
              View all listings →
            </a>
          }
          padded={false}
        >
          <div className="grid grid-cols-3 gap-3 p-4">
            {featured.map((l) => (
              <StorefrontListingCard key={l.id} l={l} density={density} />
            ))}
          </div>
        </SCard>

        <SCard
          title="Services"
          sub={`${s.services.length} capabilities`}
          action={
            <a className="text-[11.5px] font-bold" style={{ color: '#FF6B2B' }} href="#">
              All services →
            </a>
          }
        >
          <div>
            {s.services.slice(0, 4).map((svc) => (
              <ServiceRow key={svc.id} svc={svc} />
            ))}
          </div>
        </SCard>

        <SCard
          title="More from this seller"
          sub={`${STOREFRONT_LISTINGS.length} of ${STOREFRONT_TABS[1].count} shown`}
          padded={false}
          action={
            <a className="text-[11.5px] font-bold" style={{ color: '#FF6B2B' }} href="#">
              Browse inventory →
            </a>
          }
        >
          <div className="grid grid-cols-4 gap-3 p-4">
            {recent.map((l) => (
              <StorefrontListingCard key={l.id} l={l} density={density} />
            ))}
          </div>
        </SCard>

        <SCard
          title="Recent reviews"
          sub={`${s.rating}★ over ${s.reviews}`}
          action={
            <a className="text-[11.5px] font-bold" style={{ color: '#FF6B2B' }} href="#">
              All reviews →
            </a>
          }
        >
          <ReviewsSummary s={s} />
          <div className="mt-3">
            {STOREFRONT_REVIEWS.slice(0, 2).map((r, i) => (
              <ReviewItem key={i} r={r} />
            ))}
          </div>
        </SCard>
      </div>

      {showSide && <StorefrontSidebar s={s} />}
    </div>
  )
}

function StorefrontSidebar({ s }: { s: Storefront }) {
  return (
    <aside className="flex flex-col gap-4 min-w-0 [&>*]:shrink-0">
      <SCard padded={false}>
        <div
          className="px-4 py-4"
          style={{
            background: 'linear-gradient(135deg, #FF6B2B 0%, #FB923C 100%)',
            color: '#fff',
          }}
        >
          <div
            className="text-[10.5px] font-bold uppercase"
            style={{
              letterSpacing: '0.10em',
              fontFamily: 'var(--mg-font-mono)',
              color: 'rgba(255,255,255,0.85)',
            }}
          >
            EMERGENCY?
          </div>
          <div
            className="text-[16px] font-bold mt-0.5"
            style={{ fontFamily: 'var(--mg-font-display)' }}
          >
            Send an SOS request
          </div>
          <div
            className="text-[11.5px] mt-1"
            style={{ color: 'rgba(255,255,255,0.92)', lineHeight: 1.4 }}
          >
            This seller responds in {s.responseTime} on average and is on-call{' '}
            {s.oncall.toLowerCase()}.
          </div>
          <button
            type="button"
            className="w-full mt-3 h-9 inline-flex items-center justify-center gap-1.5 text-[12.5px] font-bold"
            style={{ background: '#0A1628', color: '#fff', borderRadius: 999 }}
          >
            <SirenIcon size={13} /> Open SOS form
          </button>
        </div>
        <div className="px-4 py-3" style={{ borderTop: '1px solid #F0F3F7' }}>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="h-9 inline-flex items-center justify-center gap-1.5 text-[11.5px] font-bold"
              style={{ background: '#0B2545', color: '#fff', borderRadius: 999 }}
            >
              <MessageIcon size={12} /> Message
            </button>
            <button
              type="button"
              className="h-9 inline-flex items-center justify-center gap-1.5 text-[11.5px] font-bold"
              style={{
                background: '#FFFFFF',
                color: '#0A1628',
                border: '1px solid #E5E9EF',
                borderRadius: 999,
              }}
            >
              <PhoneIcon size={12} /> Call
            </button>
            <button
              type="button"
              className="h-9 inline-flex items-center justify-center gap-1.5 text-[11.5px] font-bold col-span-2"
              style={{
                background: '#FFFFFF',
                color: '#0A1628',
                border: '1px solid #E5E9EF',
                borderRadius: 999,
              }}
            >
              <CreditIcon size={12} /> Request a quote (RFQ)
            </button>
          </div>
        </div>
      </SCard>

      <SCard title="Locations" sub={`${s.locations.length}`}>
        <ServiceMap s={s} />
        <div className="mt-1">
          {s.locations.map((loc) => (
            <LocationCard key={loc.id} loc={loc} />
          ))}
        </div>
        <a
          className="text-[11.5px] font-bold mt-1 inline-flex items-center gap-1"
          style={{ color: '#FF6B2B' }}
          href="#"
        >
          See on map →
        </a>
      </SCard>

      <SCard title="Certifications" sub={`${s.certs.length}`}>
        <div className="flex flex-col gap-1.5">
          {s.certs.map((c) => (
            <div
              key={c.label}
              className="flex items-center gap-2.5 px-2.5 py-2"
              style={{
                background: '#FBFCFD',
                borderRadius: 8,
                border: '1px solid #F0F3F7',
              }}
            >
              <span
                className="size-7 inline-flex items-center justify-center shrink-0"
                style={{ background: c.color, color: '#fff', borderRadius: 6 }}
              >
                <CheckIcon size={12} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[11.5px] font-bold" style={{ color: '#0A1628' }}>
                  {c.label}
                </div>
                <div className="text-[10.5px]" style={{ color: '#5A6B82' }}>
                  {c.sub}
                </div>
              </div>
            </div>
          ))}
        </div>
      </SCard>

      <SCard title="Recent activity">
        <div className="flex flex-col">
          {STOREFRONT_ACTIVITY.map((a, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 py-2.5 border-b"
              style={{ borderColor: '#F0F3F7' }}
            >
              <span
                className="size-2 rounded-full mt-1.5"
                style={{ background: a.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-semibold" style={{ color: '#0A1628' }}>
                  {a.title}
                </div>
                <div className="text-[10.5px]" style={{ color: '#5A6B82' }}>
                  {a.sub}
                </div>
              </div>
              <span
                className="text-[10px] shrink-0"
                style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
              >
                {a.when}
              </span>
            </div>
          ))}
        </div>
      </SCard>

      {s.kind === 'company' && s.team && (
        <SCard title="Team" sub={`${s.team.length} members`}>
          <div className="flex flex-col gap-2">
            {s.team.slice(0, 5).map((t) => (
              <div key={t.tag} className="flex items-center gap-2.5">
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
          </div>
        </SCard>
      )}
    </aside>
  )
}

function ListingsTab({ density: initialDensity }: { density: ListingDensity }) {
  const [cat, setCat] = useState('all')
  const [density, setDensity] = useState<ListingDensity>(initialDensity)
  const [sort, setSort] = useState('Featured')
  return (
    <div className="grid gap-5" style={{ gridTemplateColumns: '1fr' }}>
      <SCard padded={false}>
        <ListingsFilterBar
          cat={cat}
          onCat={setCat}
          density={density}
          onDensity={setDensity}
          sort={sort}
          onSort={setSort}
        />
        <div className="grid grid-cols-4 gap-3 p-4">
          {STOREFRONT_LISTINGS.map((l) => (
            <StorefrontListingCard key={l.id} l={l} density={density} />
          ))}
        </div>
        <div
          className="flex items-center justify-between px-5 py-3"
          style={{ borderTop: '1px solid #F0F3F7' }}
        >
          <span
            className="text-[11.5px]"
            style={{ color: '#5A6B82', fontFamily: 'var(--mg-font-mono)' }}
          >
            Showing 8 of 67
          </span>
          <button
            type="button"
            className="h-9 px-4 text-[12px] font-bold inline-flex items-center gap-1.5"
            style={{
              background: '#FFFFFF',
              color: '#0A1628',
              border: '1px solid #E5E9EF',
              borderRadius: 999,
            }}
          >
            Load 16 more <ChevronDownIcon size={11} />
          </button>
        </div>
      </SCard>
    </div>
  )
}

function ServicesTab({ s }: { s: Storefront }) {
  return (
    <div
      className="grid gap-5"
      style={{ gridTemplateColumns: 'minmax(0, 1fr) 320px' }}
    >
      <SCard title="All services" sub={`${s.services.length} capabilities`}>
        {s.services.map((svc) => (
          <ServiceRow key={svc.id} svc={svc} />
        ))}
      </SCard>
      <aside className="flex flex-col gap-4 [&>*]:shrink-0">
        <SCard padded={false}>
          <div
            className="px-4 py-4"
            style={{
              background: 'linear-gradient(135deg, #0B2545 0%, #1877F2 100%)',
              color: '#fff',
            }}
          >
            <div
              className="text-[10.5px] font-bold uppercase"
              style={{
                letterSpacing: '0.10em',
                fontFamily: 'var(--mg-font-mono)',
                color: 'rgba(255,255,255,0.85)',
              }}
            >
              NEED A QUOTE?
            </div>
            <div
              className="text-[15px] font-bold mt-0.5"
              style={{ fontFamily: 'var(--mg-font-display)' }}
            >
              Bundle multiple services
            </div>
            <div
              className="text-[11.5px] mt-1"
              style={{ color: 'rgba(255,255,255,0.92)', lineHeight: 1.4 }}
            >
              Most jobs combine 2–3 services. Send a single RFQ and get one bundled quote.
            </div>
            <button
              type="button"
              className="w-full mt-3 h-9 inline-flex items-center justify-center gap-1.5 text-[12px] font-bold"
              style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
            >
              Send bundled RFQ
            </button>
          </div>
        </SCard>
        <SCard title="Coverage">
          <ServiceMap s={s} />
          <div className="mt-1">
            {s.locations.map((loc) => (
              <LocationCard key={loc.id} loc={loc} />
            ))}
          </div>
        </SCard>
      </aside>
    </div>
  )
}

function ReviewsTab({ s }: { s: Storefront }) {
  return (
    <div
      className="grid gap-5"
      style={{ gridTemplateColumns: 'minmax(0, 1fr) 320px' }}
    >
      <SCard title="Reviews" sub={`${s.reviews} total`}>
        <ReviewsSummary s={s} />
        <div className="mt-4">
          {[...STOREFRONT_REVIEWS, ...STOREFRONT_REVIEWS.slice(0, 1)].map((r, i) => (
            <ReviewItem key={i} r={r} />
          ))}
        </div>
      </SCard>
      <aside className="flex flex-col gap-4 [&>*]:shrink-0">
        <SCard title="Trust signals">
          <VerificationPanel verified={s.verified} />
        </SCard>
        <SCard title="Response">
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[11.5px]" style={{ color: '#5A6B82' }}>
              Response rate
            </span>
            <span
              className="text-[12px] font-bold"
              style={{ color: '#16A34A', fontFamily: 'var(--mg-font-mono)' }}
            >
              {s.responseRate}%
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[11.5px]" style={{ color: '#5A6B82' }}>
              Avg response
            </span>
            <span
              className="text-[12px] font-bold"
              style={{ color: '#0A1628', fontFamily: 'var(--mg-font-mono)' }}
            >
              {s.responseTime}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[11.5px]" style={{ color: '#5A6B82' }}>
              On-call
            </span>
            <span
              className="text-[12px] font-bold"
              style={{ color: '#FF6B2B', fontFamily: 'var(--mg-font-mono)' }}
            >
              {s.oncall}
            </span>
          </div>
          <div className="flex items-center justify-between py-1.5">
            <span className="text-[11.5px]" style={{ color: '#5A6B82' }}>
              Transactions
            </span>
            <span
              className="text-[12px] font-bold"
              style={{ color: '#0A1628', fontFamily: 'var(--mg-font-mono)' }}
            >
              {s.txCount}
            </span>
          </div>
        </SCard>
      </aside>
    </div>
  )
}

function AboutTab({ s, showSide }: { s: Storefront; showSide: boolean }) {
  return (
    <div
      className="grid gap-5"
      style={{ gridTemplateColumns: showSide ? 'minmax(0, 1fr) 320px' : '1fr' }}
    >
      <div className="flex flex-col gap-5 [&>*]:shrink-0">
        <SCard title="About" sub={s.legal}>
          <p
            className="text-[13.5px]"
            style={{ color: '#0A1628', lineHeight: 1.7 }}
          >
            {s.pitch}
          </p>
          <div
            className="grid grid-cols-3 gap-4 mt-4 pt-4"
            style={{ borderTop: '1px solid #F0F3F7' }}
          >
            <Stat label="Founded" value={String(s.founded)} />
            <Stat label="Service area" value={s.serviceArea} />
            <Stat label="HQ" value={s.hq} />
            <Stat label="Member since" value={s.joined.replace('Joined ', '')} />
            <Stat label="Industries" value={`${s.industries.length}`} />
            <Stat label="Capabilities" value={`${s.services.length}`} />
          </div>
        </SCard>
        <SCard title="Industries served">
          <IndustryChips items={s.industries} />
        </SCard>
        <SCard title="Certifications" sub={`${s.certs.length}`}>
          <div className="grid grid-cols-3 gap-2">
            {s.certs.map((c) => (
              <div
                key={c.label}
                className="flex items-center gap-2.5 px-3 py-2.5"
                style={{
                  background: '#FBFCFD',
                  borderRadius: 10,
                  border: '1px solid #F0F3F7',
                }}
              >
                <span
                  className="size-9 inline-flex items-center justify-center shrink-0"
                  style={{ background: c.color, color: '#fff', borderRadius: 8 }}
                >
                  <CheckIcon size={14} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-bold" style={{ color: '#0A1628' }}>
                    {c.label}
                  </div>
                  <div className="text-[10.5px]" style={{ color: '#5A6B82' }}>
                    {c.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SCard>
        {s.kind === 'company' && s.team && (
          <SCard title="Team" sub={`${s.team.length} members`}>
            <div className="grid grid-cols-3 gap-3">
              {s.team.map((t) => (
                <div
                  key={t.tag}
                  className="flex items-center gap-3 px-3 py-2.5"
                  style={{
                    background: '#FBFCFD',
                    borderRadius: 10,
                    border: '1px solid #F0F3F7',
                  }}
                >
                  <div
                    className="size-11 inline-flex items-center justify-center text-[13px] font-bold"
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
                    <div
                      className="text-[12.5px] font-bold truncate"
                      style={{ color: '#0A1628' }}
                    >
                      {t.name}
                    </div>
                    <div className="text-[10.5px]" style={{ color: '#5A6B82' }}>
                      {t.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SCard>
        )}
      </div>
      {showSide && (
        <aside className="flex flex-col gap-4 [&>*]:shrink-0">
          <SCard title="Verification">
            <VerificationPanel verified={s.verified} />
          </SCard>
          <SCard title="At a glance">
            <Stat label="Rating" value={`${s.rating}★ (${s.reviews})`} />
            <Stat label="Response time" value={s.responseTime} />
            <Stat label="Transactions" value={String(s.txCount)} />
            <Stat label="Followers" value={(s.followers / 1000).toFixed(1) + 'k'} />
          </SCard>
        </aside>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <span
        className="text-[10px] font-bold uppercase"
        style={{
          color: '#94A3B8',
          letterSpacing: '0.10em',
          fontFamily: 'var(--mg-font-mono)',
        }}
      >
        {label}
      </span>
      <span className="text-[13px] font-bold" style={{ color: '#0A1628' }}>
        {value}
      </span>
    </div>
  )
}

function LocationsTab({ s }: { s: Storefront }) {
  return (
    <div
      className="grid gap-5"
      style={{ gridTemplateColumns: 'minmax(0, 1fr) 320px' }}
    >
      <SCard padded={false}>
        <div
          className="relative overflow-hidden"
          style={{ background: '#0B1B2D', height: 380 }}
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
                  width: 160,
                  height: 160,
                  borderRadius: 999,
                  transform: 'translate(-50%, -50%)',
                  background:
                    'radial-gradient(circle, rgba(255,107,43,0.22) 0%, rgba(255,107,43,0.04) 70%, transparent 100%)',
                  border: '1px dashed rgba(255,107,43,0.40)',
                }}
              />
              <span
                className="absolute size-4 rounded-full"
                style={{
                  left: `${loc.x * 100}%`,
                  top: `${loc.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  background: loc.primary ? '#FF6B2B' : '#1877F2',
                  boxShadow: '0 0 0 4px rgba(255,255,255,0.85)',
                }}
              />
              <span
                className="absolute"
                style={{
                  left: `${loc.x * 100}%`,
                  top: `calc(${loc.y * 100}% + 18px)`,
                  transform: 'translateX(-50%)',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  className="px-2 h-6 inline-flex items-center text-[10.5px] font-bold"
                  style={{
                    background: 'rgba(0,0,0,0.65)',
                    color: '#fff',
                    borderRadius: 999,
                    fontFamily: 'var(--mg-font-mono)',
                  }}
                >
                  {loc.city} · {loc.radius}mi
                </span>
              </span>
            </span>
          ))}
          <div
            className="absolute top-3 left-3 text-[10.5px] font-bold uppercase"
            style={{
              color: 'rgba(255,255,255,0.7)',
              letterSpacing: '0.10em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            SERVICE COVERAGE · {s.serviceArea}
          </div>
        </div>
        <div>
          {s.locations.map((loc) => (
            <div
              key={loc.id}
              className="flex items-center gap-3 px-5 py-3.5 border-b"
              style={{ borderColor: '#F0F3F7' }}
            >
              <span
                className="size-10 inline-flex items-center justify-center"
                style={{
                  background: loc.primary ? 'rgba(255,107,43,0.12)' : '#F0F3F7',
                  color: loc.primary ? '#FF6B2B' : '#0B2545',
                  borderRadius: 10,
                }}
              >
                <PinIcon size={16} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold" style={{ color: '#0A1628' }}>
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
                <div className="text-[11.5px]" style={{ color: '#5A6B82' }}>
                  {loc.role} · {loc.radius} mi service radius
                </div>
              </div>
              <div
                className="text-[12px] font-bold"
                style={{ color: '#0A1628', fontFamily: 'var(--mg-font-mono)' }}
              >
                {loc.phone}
              </div>
              <button
                type="button"
                className="h-8 px-3 text-[11.5px] font-bold inline-flex items-center gap-1"
                style={{ background: '#0B2545', color: '#fff', borderRadius: 999 }}
              >
                <PhoneIcon size={11} /> Call
              </button>
            </div>
          ))}
        </div>
      </SCard>
      <aside className="flex flex-col gap-4 [&>*]:shrink-0">
        <SCard title="Coverage stats">
          <Stat label="Locations" value={String(s.locations.length)} />
          <Stat
            label="Combined radius"
            value={`${s.locations.reduce((a, l) => a + l.radius, 0)} mi`}
          />
          <Stat label="Service area" value={s.serviceArea} />
        </SCard>
        <SCard padded={false}>
          <div
            className="px-4 py-4"
            style={{
              background: 'linear-gradient(135deg, #FF6B2B 0%, #FB923C 100%)',
              color: '#fff',
            }}
          >
            <div
              className="text-[15px] font-bold"
              style={{ fontFamily: 'var(--mg-font-display)' }}
            >
              Outside coverage?
            </div>
            <div
              className="text-[11.5px] mt-1"
              style={{ color: 'rgba(255,255,255,0.92)', lineHeight: 1.4 }}
            >
              Send an SOS — this seller has traveled outside their stated radius for emergencies.
            </div>
            <button
              type="button"
              className="w-full mt-3 h-9 inline-flex items-center justify-center gap-1.5 text-[12px] font-bold"
              style={{ background: '#0A1628', color: '#fff', borderRadius: 999 }}
            >
              <SirenIcon size={12} /> Send SOS anyway
            </button>
          </div>
        </SCard>
      </aside>
    </div>
  )
}
