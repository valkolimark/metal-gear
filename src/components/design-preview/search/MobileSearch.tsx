'use client'

import { useState, type ReactNode } from 'react'
import { PhotoTile } from '../_shared/PhotoTile'
import { COND, PHOTO_BG } from '../_shared/listings-data'
import {
  FilterIcon,
  FlameIcon,
  SearchIcon,
  SirenIcon,
  SparkleIcon,
  TrendingIcon,
  XIcon,
} from '../_shared/icons'
import {
  Avatar,
  MatchBar,
  NLChip,
  ResultBadge,
  VerifiedTick,
  type NLChipData,
} from './SearchShared'
import {
  ACTIVE_PARSE,
  ACTIVE_QUERY,
  QUICK_CATEGORIES,
  RECENT_SEARCHES,
  SEARCH_COMPANIES,
  SEARCH_LISTINGS,
  SEARCH_PEOPLE,
  SEARCH_SEGMENTS,
  SEARCH_SOS,
  TRENDING_QUERIES,
  type SearchListing,
  type SearchSOS,
} from './search-data'

export function MobileSearchEntry() {
  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: '#F4F6FA',
        fontFamily: 'var(--mg-font-body)',
        paddingTop: 44,
      }}
    >
      <header
        className="flex items-center px-4 h-[52px] shrink-0 gap-2"
        style={{ background: '#0B2545', color: '#fff' }}
      >
        <button
          type="button"
          className="size-8 flex items-center justify-center -ml-1.5"
          style={{ color: '#E8EEF5' }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div className="relative flex-1">
          <SearchIcon
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: 'rgba(255,255,255,0.5)' }}
          />
          <input
            autoFocus
            placeholder="Search Metal Gear"
            className="w-full h-9 pl-9 pr-3 text-[13.5px] outline-none placeholder:opacity-55"
            style={{
              background: 'rgba(255,255,255,0.10)',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
            }}
          />
        </div>
        <button type="button" className="text-[13px] font-bold" style={{ color: '#fff' }}>
          Cancel
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-6">
        <div
          className="mx-4 mt-3 p-3 flex items-start gap-2.5"
          style={{
            background: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid rgba(255,107,43,0.20)',
          }}
        >
          <div
            className="size-8 flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,107,43,0.12)', color: '#FF6B2B', borderRadius: 999 }}
          >
            <SparkleIcon size={14} />
          </div>
          <div className="flex-1">
            <div className="text-[12px] font-bold" style={{ color: '#0A1628' }}>
              Try natural language
            </div>
            <div className="text-[11.5px] mt-0.5" style={{ color: '#5A6B82' }}>
              &quot;decanter under 50k near Houston&quot; → we&apos;ll parse the price + location
              for you.
            </div>
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[10.5px] font-bold uppercase"
              style={{ color: '#0A1628', letterSpacing: '0.08em' }}
            >
              Recent
            </span>
            <button type="button" className="text-[11.5px] font-semibold" style={{ color: '#5A6B82' }}>
              Clear
            </button>
          </div>
          <div className="bg-white" style={{ borderRadius: 12 }}>
            {RECENT_SEARCHES.map((r, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5"
                style={{ borderTop: i === 0 ? 'none' : '1px solid #F0F3F7' }}
              >
                <div
                  className="size-7 flex items-center justify-center shrink-0"
                  style={{
                    background:
                      r.kind === 'nl' ? 'rgba(255,107,43,0.10)' : '#F0F3F7',
                    color: r.kind === 'nl' ? '#FF6B2B' : '#5A6B82',
                    borderRadius: 999,
                  }}
                >
                  {r.kind === 'nl' ? <SparkleIcon size={11} /> : <SearchIcon size={11} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold truncate" style={{ color: '#0A1628' }}>
                    {r.q}
                  </div>
                  <div
                    className="text-[10.5px]"
                    style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
                  >
                    {r.when}
                  </div>
                </div>
                <button type="button" style={{ color: '#94A3B8' }}>
                  <XIcon size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 pt-4">
          <div className="flex items-center gap-1.5 mb-2">
            <FlameIcon size={11} style={{ color: '#FF6B2B' }} />
            <span
              className="text-[10.5px] font-bold uppercase"
              style={{ color: '#0A1628', letterSpacing: '0.08em' }}
            >
              Trending
            </span>
          </div>
          <div className="flex flex-col bg-white" style={{ borderRadius: 12 }}>
            {TRENDING_QUERIES.slice(0, 5).map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5"
                style={{ borderTop: i === 0 ? 'none' : '1px solid #F0F3F7' }}
              >
                <span
                  className="text-[11px] font-bold w-3 text-right"
                  style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-semibold truncate" style={{ color: '#0A1628' }}>
                    {t.q}
                  </div>
                  <div className="text-[10.5px]" style={{ color: '#5A6B82' }}>
                    {t.count}
                  </div>
                </div>
                <TrendingIcon size={11} style={{ color: '#22C55E' }} />
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 pt-4">
          <span
            className="text-[10.5px] font-bold uppercase"
            style={{ color: '#0A1628', letterSpacing: '0.08em' }}
          >
            Browse
          </span>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {QUICK_CATEGORIES.slice(0, 6).map((c) => (
              <button
                key={c.label}
                type="button"
                className="flex items-center justify-between px-3 h-10 text-[12.5px] font-semibold"
                style={{ background: '#fff', color: '#0A1628', borderRadius: 10 }}
              >
                <span>{c.label}</span>
                <span
                  className="text-[10.5px]"
                  style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
                >
                  {c.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

type MobileView = 'list' | 'grid' | 'map'

export function MobileSearchResults() {
  const [active, setActive] = useState('all')
  const [view, setView] = useState<MobileView>('list')
  const [chips, setChips] = useState<NLChipData[]>(ACTIVE_PARSE)
  const removeChip = (i: number) => setChips(chips.filter((_, idx) => idx !== i))

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: '#F4F6FA',
        fontFamily: 'var(--mg-font-body)',
        paddingTop: 44,
      }}
    >
      <header
        className="px-4 pt-2 pb-2 shrink-0 gap-2"
        style={{ background: '#0B2545', color: '#fff' }}
      >
        <div className="flex items-center gap-2 h-[44px]">
          <button
            type="button"
            className="size-8 flex items-center justify-center -ml-1.5"
            style={{ color: '#E8EEF5' }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div className="relative flex-1">
            <SearchIcon
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            />
            <input
              defaultValue={ACTIVE_QUERY}
              className="w-full h-9 pl-8 pr-8 text-[12.5px] outline-none font-medium"
              style={{
                background: 'rgba(255,255,255,0.10)',
                color: '#fff',
                border: 'none',
                borderRadius: 999,
              }}
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 size-6 flex items-center justify-center"
              style={{ color: 'rgba(255,255,255,0.6)' }}
            >
              <XIcon size={12} />
            </button>
          </div>
          <button
            type="button"
            className="size-9 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.10)', color: '#fff', borderRadius: 999 }}
          >
            <FilterIcon size={15} />
          </button>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none mt-1.5 pb-0.5">
          <span
            className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase shrink-0"
            style={{ color: '#FF6B2B', letterSpacing: '0.08em' }}
          >
            <SparkleIcon size={9} />
            Parsed
          </span>
          {chips.map((c, i) => (
            <NLChip key={i} chip={c} onRemove={() => removeChip(i)} />
          ))}
        </div>
      </header>

      <div
        className="shrink-0 px-3 flex items-center gap-1 overflow-x-auto scrollbar-none"
        style={{ background: '#fff', borderBottom: '1px solid #ECEFF3' }}
      >
        {SEARCH_SEGMENTS.map((s) => {
          const isActive = active === s.key
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => setActive(s.key)}
              className="relative flex items-center gap-1.5 h-10 px-3 text-[12px] font-semibold whitespace-nowrap"
              style={{ color: isActive ? '#0A1628' : '#5A6B82' }}
            >
              {s.label}
              <span
                className="text-[9.5px] font-bold px-1.5 h-[14px] inline-flex items-center justify-center"
                style={{
                  background: isActive ? '#0B2545' : '#F0F3F7',
                  color: isActive ? '#fff' : '#5A6B82',
                  borderRadius: 999,
                  minWidth: 18,
                  fontFamily: 'var(--mg-font-mono)',
                }}
              >
                {s.count}
              </span>
              {isActive && (
                <span
                  className="absolute bottom-0 left-2 right-2 h-[2.5px]"
                  style={{ background: '#FF6B2B', borderRadius: '3px 3px 0 0' }}
                />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-3">
        <div className="flex items-center gap-1.5 px-1">
          <SparkleIcon size={11} style={{ color: '#FF6B2B' }} />
          <span
            className="text-[10.5px] font-bold uppercase"
            style={{ color: '#0A1628', letterSpacing: '0.08em' }}
          >
            Top result
          </span>
        </div>
        <MobileTopResult l={SEARCH_LISTINGS[0]} />

        <div className="flex items-center justify-between px-1 mt-1">
          <span
            className="text-[10.5px] font-bold uppercase"
            style={{ color: '#0A1628', letterSpacing: '0.08em' }}
          >
            Listings{' '}
            <span style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}>
              · 142
            </span>
          </span>
          <MobileViewSwitcher view={view} setView={setView} />
        </div>
        {view === 'list' &&
          SEARCH_LISTINGS.slice(1, 3).map((l) => <MobileListingRow key={l.id} l={l} />)}
        {view === 'grid' && (
          <div className="grid grid-cols-2 gap-2">
            {SEARCH_LISTINGS.slice(1, 5).map((l) => (
              <MobileListingGridCard key={l.id} l={l} />
            ))}
          </div>
        )}
        {view === 'map' && <MobileMapPanel />}

        <div className="flex items-center justify-between px-1 mt-1">
          <span
            className="text-[10.5px] font-bold uppercase"
            style={{ color: '#0A1628', letterSpacing: '0.08em' }}
          >
            Companies{' '}
            <span style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}>· 18</span>
          </span>
          <button type="button" className="text-[11px] font-semibold" style={{ color: '#1877F2' }}>
            See all
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-3 px-3">
          {SEARCH_COMPANIES.map((c) => (
            <div
              key={c.id}
              className="p-2.5 shrink-0 flex flex-col gap-1.5"
              style={{ width: 200, background: '#fff', borderRadius: 12 }}
            >
              <div className="flex items-center gap-2">
                <Avatar tag={c.tag} color="#1877F2" size={32} />
                <div className="min-w-0">
                  <ResultBadge kind="company" />
                  <div
                    className="text-[12px] font-bold leading-tight mt-0.5 truncate"
                    style={{ color: '#0A1628' }}
                  >
                    {c.name}
                  </div>
                </div>
              </div>
              <div className="text-[10.5px]" style={{ color: '#5A6B82' }}>
                {c.location} · {c.listings} listings
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-1 mt-1">
          <span
            className="text-[10.5px] font-bold uppercase"
            style={{ color: '#0A1628', letterSpacing: '0.08em' }}
          >
            SOS posts{' '}
            <span style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}>· 9</span>
          </span>
          <button type="button" className="text-[11px] font-semibold" style={{ color: '#1877F2' }}>
            See all
          </button>
        </div>
        {SEARCH_SOS.slice(0, 2).map((s) => (
          <MobileSOSRow key={s.id} s={s} />
        ))}

        <div className="flex items-center justify-between px-1 mt-1">
          <span
            className="text-[10.5px] font-bold uppercase"
            style={{ color: '#0A1628', letterSpacing: '0.08em' }}
          >
            People{' '}
            <span style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}>· 41</span>
          </span>
          <button type="button" className="text-[11px] font-semibold" style={{ color: '#1877F2' }}>
            See all
          </button>
        </div>
        {SEARCH_PEOPLE.slice(0, 2).map((p) => (
          <div
            key={p.id}
            className="flex items-center gap-2.5 p-3"
            style={{ background: '#fff', borderRadius: 12 }}
          >
            <Avatar tag={p.tag} color="#3D9BD6" size={36} />
            <div className="min-w-0 flex-1">
              <div
                className="text-[12.5px] font-bold leading-tight truncate"
                style={{ color: '#0A1628' }}
              >
                {p.name}
              </div>
              <div className="text-[10.5px] leading-snug truncate" style={{ color: '#5A6B82' }}>
                {p.role} · {p.company}
              </div>
            </div>
            <button
              type="button"
              className="h-7 px-2.5 text-[11px] font-bold shrink-0"
              style={{ background: '#0B2545', color: '#fff', borderRadius: 999 }}
            >
              Connect
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function MobileTopResult({ l }: { l: SearchListing }) {
  const c = COND[l.condition]
  return (
    <div
      className="flex gap-3 p-3 relative overflow-hidden"
      style={{ background: '#fff', borderRadius: 14, border: '1.5px solid #FF6B2B' }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2.5px]"
        style={{ background: '#FF6B2B' }}
      />
      <PhotoTile bg={l.bg} hasMedia={true} size={84} radius={10} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 mb-1 flex-wrap">
          <ResultBadge kind="listing" />
          <span
            className="text-[9.5px] font-bold uppercase px-1.5 h-[16px] inline-flex items-center"
            style={{
              background: `${c.color}18`,
              color: c.color,
              borderRadius: 999,
              letterSpacing: '0.04em',
            }}
          >
            {c.label}
          </span>
          <MatchBar score={l.match} />
        </div>
        <div
          className="text-[12.5px] font-bold leading-tight"
          style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
        >
          {l.title}
        </div>
        <div className="text-[10.5px] mt-0.5" style={{ color: '#5A6B82' }}>
          {l.location} · {l.distance} mi
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span
            className="text-[15px] font-bold"
            style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
          >
            ${(l.price / 1000).toFixed(0)}k
          </span>
          <button
            type="button"
            className="h-7 px-2.5 text-[11px] font-bold"
            style={{ background: '#0B2545', color: '#fff', borderRadius: 999 }}
          >
            Contact
          </button>
        </div>
      </div>
    </div>
  )
}

function MobileListingRow({ l }: { l: SearchListing }) {
  const c = COND[l.condition]
  return (
    <div className="flex gap-3 p-3" style={{ background: '#fff', borderRadius: 12 }}>
      <PhotoTile bg={l.bg} hasMedia={true} size={64} radius={8} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 mb-0.5 flex-wrap">
          <span
            className="text-[9.5px] font-bold uppercase px-1.5 h-[16px] inline-flex items-center"
            style={{
              background: `${c.color}18`,
              color: c.color,
              borderRadius: 999,
              letterSpacing: '0.04em',
            }}
          >
            {c.label}
          </span>
          {l.verified && <VerifiedTick />}
        </div>
        <div
          className="text-[12px] font-bold leading-tight truncate"
          style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
        >
          {l.title}
        </div>
        <div className="text-[10.5px] mt-0.5" style={{ color: '#5A6B82' }}>
          {l.location} · {l.distance} mi
        </div>
        <div className="flex items-center justify-between mt-1">
          <span
            className="text-[13px] font-bold"
            style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
          >
            ${(l.price / 1000).toFixed(0)}k
          </span>
          <span
            className="text-[10px] font-semibold"
            style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
          >
            {l.match}% match
          </span>
        </div>
      </div>
    </div>
  )
}

const M_URGENCY: Record<SearchSOS['urgency'], { color: string; bg: string }> = {
  critical: { color: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
  high: { color: '#FF6B2B', bg: 'rgba(255,107,43,0.10)' },
  medium: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
}

function MobileSOSRow({ s }: { s: SearchSOS }) {
  const urg = M_URGENCY[s.urgency]
  return (
    <div
      className="flex items-center gap-2.5 p-3"
      style={{
        background: '#fff',
        borderRadius: 12,
        borderLeft: `3px solid ${urg.color}`,
      }}
    >
      <div
        className="size-9 flex items-center justify-center shrink-0"
        style={{ background: urg.bg, color: urg.color, borderRadius: 999 }}
      >
        <SirenIcon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 mb-0.5">
          <span
            className="text-[9.5px] font-bold uppercase px-1.5 h-[16px] inline-flex items-center"
            style={{
              background: urg.bg,
              color: urg.color,
              borderRadius: 999,
              letterSpacing: '0.04em',
            }}
          >
            {s.urgency}
          </span>
          <span
            className="text-[10px] font-bold"
            style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
          >
            {s.id}
          </span>
        </div>
        <div
          className="text-[12px] font-bold leading-tight"
          style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
        >
          {s.title}
        </div>
        <div className="text-[10.5px] mt-0.5" style={{ color: '#5A6B82' }}>
          {s.posted} · {s.responses} responses
        </div>
      </div>
    </div>
  )
}

function MobileViewSwitcher({
  view,
  setView,
}: {
  view: MobileView
  setView: (v: MobileView) => void
}) {
  const views: Array<{ key: MobileView; icon: ReactNode }> = [
    {
      key: 'list',
      icon: (
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
      ),
    },
    {
      key: 'grid',
      icon: (
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
      ),
    },
    {
      key: 'map',
      icon: (
        <svg
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6" />
          <line x1="9" y1="3" x2="9" y2="18" />
          <line x1="15" y1="6" x2="15" y2="21" />
        </svg>
      ),
    },
  ]
  return (
    <div
      className="flex items-center gap-0.5 p-0.5"
      style={{ background: '#F0F3F7', borderRadius: 999 }}
    >
      {views.map((v) => {
        const isActive = v.key === view
        return (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className="size-6 flex items-center justify-center"
            style={{
              background: isActive ? '#FFFFFF' : 'transparent',
              color: isActive ? '#0A1628' : '#5A6B82',
              borderRadius: 999,
              boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {v.icon}
          </button>
        )
      })}
    </div>
  )
}

function MobileListingGridCard({ l }: { l: SearchListing }) {
  const c = COND[l.condition]
  return (
    <div
      className="flex flex-col"
      style={{ background: '#fff', borderRadius: 12, overflow: 'hidden' }}
    >
      <div className="relative" style={{ height: 100, background: PHOTO_BG[l.bg] }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18) 0%, transparent 60%)',
          }}
        />
        <span
          className="absolute top-1.5 left-1.5 text-[8.5px] font-bold uppercase px-1.5 h-[14px] inline-flex items-center"
          style={{
            background: 'rgba(255,255,255,0.95)',
            color: c.color,
            borderRadius: 999,
            letterSpacing: '0.04em',
          }}
        >
          {c.label}
        </span>
        <span
          className="absolute bottom-1.5 left-1.5 text-[9px] font-bold px-1.5 h-[14px] inline-flex items-center"
          style={{
            background: 'rgba(11,37,69,0.85)',
            color: '#fff',
            borderRadius: 999,
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          {l.match}%
        </span>
      </div>
      <div className="p-2 flex flex-col gap-1">
        <div
          className="text-[11.5px] font-bold leading-tight"
          style={{
            color: '#0A1628',
            fontFamily: 'var(--mg-font-display)',
            minHeight: 30,
          }}
        >
          {l.title}
        </div>
        <div className="text-[10px]" style={{ color: '#5A6B82' }}>
          {l.location} · {l.distance} mi
        </div>
        <div
          className="text-[12.5px] font-bold mt-0.5"
          style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
        >
          ${(l.price / 1000).toFixed(0)}k
        </div>
      </div>
    </div>
  )
}

function MobileMapPanel() {
  const rows = SEARCH_LISTINGS.slice(0, 6)
  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #E8F0FA 0%, #F0F4FA 100%)',
        borderRadius: 12,
        height: 360,
        boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(11,37,69,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(11,37,69,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      <svg
        viewBox="0 0 100 80"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        <path
          d="M10,30 L20,25 L35,22 L50,20 L70,22 L85,28 L92,40 L88,55 L80,65 L70,68 L55,70 L40,68 L25,65 L15,55 L8,42 Z"
          fill="rgba(11,37,69,0.06)"
          stroke="rgba(11,37,69,0.15)"
          strokeWidth="0.3"
        />
      </svg>
      <div
        className="absolute"
        style={{ left: '44%', top: '64%', transform: 'translate(-50%,-50%)' }}
      >
        <div
          className="size-[140px] rounded-full"
          style={{
            border: '1.5px dashed rgba(255,107,43,0.55)',
            background:
              'radial-gradient(circle, rgba(255,107,43,0.10) 0%, transparent 70%)',
          }}
        />
      </div>
      {rows.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: `${p.pinX}%`,
            top: `${p.pinY}%`,
            transform: 'translate(-50%,-100%)',
          }}
        >
          <div
            className="px-1.5 h-6 flex items-center text-[10px] font-bold whitespace-nowrap"
            style={{
              background: p.id === SEARCH_LISTINGS[0].id ? '#FF6B2B' : '#fff',
              color: p.id === SEARCH_LISTINGS[0].id ? '#fff' : '#0A1628',
              borderRadius: 999,
              boxShadow: '0 2px 6px rgba(0,0,0,0.10)',
              border: '1.5px solid #fff',
            }}
          >
            ${(p.price / 1000).toFixed(0)}k
          </div>
        </div>
      ))}
      <div
        className="absolute top-2 left-2 px-2 h-6 text-[10.5px] font-semibold flex items-center gap-1.5"
        style={{
          background: '#fff',
          color: '#0A1628',
          borderRadius: 999,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <span className="size-1.5 rounded-full" style={{ background: '#22C55E' }} />6 of 142
      </div>
    </div>
  )
}
