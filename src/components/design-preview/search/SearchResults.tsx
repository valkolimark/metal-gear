'use client'

import { useState, type ReactNode } from 'react'
import { ModernHeader } from '../_shared/ModernHeader'
import { PhotoTile } from '../_shared/PhotoTile'
import { COND, PHOTO_BG } from '../_shared/listings-data'
import {
  ArrowRightIcon,
  BookmarkIcon,
  HeartIcon,
  PlusIcon,
  SearchIcon,
  SirenIcon,
  SparkleIcon,
} from '../_shared/icons'
import {
  Avatar,
  FilterCheck,
  FilterRailGroup,
  FilterRange,
  MatchBar,
  NLChip,
  ResultBadge,
  SearchSegmentTabs,
  VerifiedTick,
  type NLChipData,
} from './SearchShared'
import {
  ACTIVE_PARSE,
  ACTIVE_QUERY,
  SEARCH_COMPANIES,
  SEARCH_LISTINGS,
  SEARCH_PEOPLE,
  SEARCH_POSTS,
  SEARCH_SEGMENTS,
  SEARCH_SOS,
  type SearchCompany,
  type SearchListing,
  type SearchPerson,
  type SearchPost,
  type SearchSOS,
} from './search-data'

export type SearchResultsView = 'list' | 'grid' | 'map'

export function SearchResults({ initialView = 'list' }: { initialView?: SearchResultsView }) {
  const [active, setActive] = useState('all')
  const [view, setView] = useState<SearchResultsView>(initialView)
  const [chips, setChips] = useState<NLChipData[]>(ACTIVE_PARSE)
  const removeChip = (i: number) => setChips(chips.filter((_, idx) => idx !== i))
  const mapOn = view === 'map'

  return (
    <div style={{ background: '#F4F6FA', minHeight: '100%', fontFamily: 'var(--mg-font-body)' }}>
      <ModernHeader />

      <div
        className="sticky top-[56px] z-20"
        style={{ background: '#F4F6FA', borderBottom: '1px solid #ECEFF3' }}
      >
        <div className="max-w-[1280px] mx-auto px-6 pt-4 pb-3">
          <div className="relative">
            <div className="absolute left-4 top-[14px]" style={{ color: '#94A3B8' }}>
              <SearchIcon size={18} />
            </div>
            <input
              defaultValue={ACTIVE_QUERY}
              className="w-full h-[48px] pl-12 pr-[120px] text-[14.5px] font-medium outline-none"
              style={{
                background: '#FFFFFF',
                borderRadius: 12,
                border: '1px solid #E5E9EF',
                color: '#0A1628',
                boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
              }}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
              <button
                type="button"
                className="h-9 px-3 text-[12px] font-semibold flex items-center gap-1.5"
                style={{ background: '#F0F3F7', color: '#0A1628', borderRadius: 999 }}
              >
                <BookmarkIcon size={12} /> Save
              </button>
              <button
                type="button"
                className="h-9 px-4 text-[12.5px] font-bold"
                style={{ background: '#0B2545', color: '#fff', borderRadius: 999 }}
              >
                Search
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 text-[10.5px] font-bold uppercase"
              style={{ color: '#FF6B2B', letterSpacing: '0.08em' }}
            >
              <SparkleIcon size={10} /> Understood as
            </span>
            {chips.map((c, i) => (
              <NLChip key={i} chip={c} onRemove={() => removeChip(i)} />
            ))}
            <button
              type="button"
              className="text-[12px] font-semibold inline-flex items-center gap-1"
              style={{ color: '#1877F2' }}
            >
              <PlusIcon size={11} strokeWidth={3} /> Add filter
            </button>
            <span className="ml-auto text-[11.5px]" style={{ color: '#94A3B8' }}>
              <span style={{ color: '#0A1628', fontWeight: 600 }}>248</span> results ·{' '}
              <span style={{ fontFamily: 'var(--mg-font-mono)' }}>0.18s</span>
            </span>
          </div>
        </div>

        <div className="max-w-[1280px] mx-auto px-6">
          <SearchSegmentTabs active={active} setActive={setActive} segments={SEARCH_SEGMENTS} />
        </div>
      </div>

      <div className="max-w-[1280px] mx-auto px-6 py-5">
        <div
          className="grid gap-5"
          style={{ gridTemplateColumns: view === 'map' ? '232px 1fr 420px' : '232px 1fr' }}
        >
          <aside className="self-start sticky top-[180px]">
            <FilterRail />
          </aside>

          <main className="flex flex-col gap-5 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold" style={{ color: '#5A6B82' }}>
                Showing <span style={{ color: '#0A1628' }}>1–24</span> of 248
              </span>
              <div className="ml-auto flex items-center gap-2">
                <SearchViewSwitcher view={view} setView={setView} />
                <FBChip label="Sort: Best match" />
              </div>
            </div>

            <SectionHeader
              icon={<SparkleIcon size={12} />}
              label="Top result"
              caption="Highest match for your query"
            />
            <TopResult listing={SEARCH_LISTINGS[0]} />

            <SectionHeader label="Listings" count={142} action="See all listings" />
            {view === 'list' && (
              <div className="grid gap-2.5">
                {SEARCH_LISTINGS.slice(1, 5).map((l) => (
                  <ListingResultRow key={l.id} l={l} />
                ))}
              </div>
            )}
            {view === 'grid' && (
              <div className="grid grid-cols-3 gap-3">
                {SEARCH_LISTINGS.slice(1, 7).map((l) => (
                  <ListingGridCard key={l.id} l={l} />
                ))}
              </div>
            )}
            {view === 'map' && (
              <div className="grid gap-2.5">
                {SEARCH_LISTINGS.slice(1, 4).map((l) => (
                  <ListingResultRow key={l.id} l={l} />
                ))}
              </div>
            )}

            <SectionHeader label="Companies" count={18} action="See all companies" />
            <div className="grid grid-cols-3 gap-2.5">
              {SEARCH_COMPANIES.map((c) => (
                <CompanyCard key={c.id} c={c} />
              ))}
            </div>

            <SectionHeader label="People" count={41} action="See all people" />
            <div className="grid grid-cols-3 gap-2.5">
              {SEARCH_PEOPLE.map((p) => (
                <PersonCard key={p.id} p={p} />
              ))}
            </div>

            <SectionHeader label="SOS posts" count={9} action="See all SOS" />
            <div className="grid gap-2">
              {SEARCH_SOS.map((s) => (
                <SOSResultRow key={s.id} s={s} />
              ))}
            </div>

            <SectionHeader
              label="Posts mentioning decanter"
              count={38}
              action="See all posts"
            />
            <div className="grid gap-2">
              {SEARCH_POSTS.map((p) => (
                <PostResultRow key={p.id} p={p} />
              ))}
            </div>

            <SparseResultBand />
          </main>

          {mapOn && (
            <aside className="self-start sticky top-[180px]">
              <MapPanel />
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterRail() {
  return (
    <div
      className="p-4"
      style={{
        background: '#FFFFFF',
        borderRadius: 14,
        boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
      }}
    >
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-[13px] font-bold"
          style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
        >
          Refine
        </span>
        <button type="button" className="text-[11.5px] font-semibold" style={{ color: '#1877F2' }}>
          Reset
        </button>
      </div>

      <FilterRailGroup title="Category">
        <FilterCheck label="Centrifuges" count={142} checked />
        <FilterCheck label="Pumps" count={1240} />
        <FilterCheck label="Heat exchangers" count={312} />
        <FilterCheck label="Valves" count={906} />
        <button type="button" className="text-[12px] font-semibold mt-1" style={{ color: '#1877F2' }}>
          Show 18 more
        </button>
      </FilterRailGroup>

      <FilterRailGroup title="Condition">
        <FilterCheck label="New" count={28} />
        <FilterCheck label="Excellent" count={64} />
        <FilterCheck label="Good" count={112} checked />
        <FilterCheck label="Fair" count={31} checked />
        <FilterCheck label="For parts" count={13} />
      </FilterRailGroup>

      <FilterRailGroup title="Price">
        <FilterRange minLabel="$0" maxLabel="$50,000" percent={[0, 62]} />
      </FilterRailGroup>

      <FilterRailGroup title="Distance from Houston, TX">
        <div className="flex flex-wrap gap-1.5">
          {['25 mi', '100 mi', '250 mi', '500 mi', 'Any'].map((d) => (
            <button
              key={d}
              type="button"
              className="h-7 px-2.5 text-[11.5px] font-semibold"
              style={{
                background: d === '250 mi' ? '#0B2545' : '#F7F9FC',
                color: d === '250 mi' ? '#fff' : '#5A6B82',
                borderRadius: 999,
              }}
            >
              {d}
            </button>
          ))}
        </div>
      </FilterRailGroup>

      <FilterRailGroup title="Seller" defaultOpen={false}>
        <FilterCheck label="Verified only" count={84} checked />
        <FilterCheck label="OEM service" count={12} />
        <FilterCheck label="≥ 4.5 ★ rating" count={196} />
      </FilterRailGroup>

      <FilterRailGroup title="Posted" defaultOpen={false}>
        <FilterCheck label="Last 24 hours" count={14} />
        <FilterCheck label="Last 7 days" count={62} />
        <FilterCheck label="Last 30 days" count={142} />
      </FilterRailGroup>
    </div>
  )
}

function SectionHeader({
  icon,
  label,
  count,
  action,
  caption,
}: {
  icon?: ReactNode
  label: string
  count?: number
  action?: string
  caption?: string
}) {
  return (
    <div className="flex items-end justify-between mt-1">
      <div className="flex items-center gap-2">
        {icon && <span style={{ color: '#FF6B2B' }}>{icon}</span>}
        <h2
          className="text-[15px] font-bold"
          style={{
            color: '#0A1628',
            fontFamily: 'var(--mg-font-display)',
            letterSpacing: '-0.01em',
          }}
        >
          {label}
        </h2>
        {count != null && (
          <span
            className="text-[11px] font-bold px-1.5 h-[18px] inline-flex items-center"
            style={{
              background: '#F0F3F7',
              color: '#5A6B82',
              borderRadius: 999,
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            {count}
          </span>
        )}
        {caption && (
          <span className="text-[12px]" style={{ color: '#5A6B82' }}>
            · {caption}
          </span>
        )}
      </div>
      {action && (
        <button
          type="button"
          className="text-[12px] font-semibold inline-flex items-center gap-1"
          style={{ color: '#1877F2' }}
        >
          {action} <ArrowRightIcon size={11} strokeWidth={2.5} />
        </button>
      )}
    </div>
  )
}

function sellerInitials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
}

function TopResult({ listing: l }: { listing: SearchListing }) {
  const c = COND[l.condition]
  return (
    <div
      className="flex gap-4 p-4 relative overflow-hidden"
      style={{
        background: '#FFFFFF',
        borderRadius: 14,
        border: '1.5px solid #FF6B2B',
        boxShadow:
          '0 1px 2px rgba(11,37,69,0.04), 0 8px 24px rgba(255,107,43,0.10)',
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{ background: 'linear-gradient(90deg, #FF6B2B 0%, #FFB37A 100%)' }}
      />
      <PhotoTile bg={l.bg} hasMedia={true} size={140} radius={12} />
      <div className="min-w-0 flex-1 flex flex-col">
        <div className="flex items-center gap-2 mb-1">
          <ResultBadge kind="listing" />
          <span
            className="text-[10.5px] font-bold uppercase px-2 h-[20px] inline-flex items-center gap-1"
            style={{
              background: `${c.color}18`,
              color: c.color,
              borderRadius: 999,
              letterSpacing: '0.04em',
            }}
          >
            <span className="size-1.5 rounded-full" style={{ background: c.color }} />
            {c.label}
          </span>
          {!l.verified && <VerifiedTick />}
          <span
            className="ml-auto text-[11.5px]"
            style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
          >
            {l.posted}
          </span>
        </div>
        <div
          className="text-[18px] font-bold leading-snug"
          style={{
            color: '#0A1628',
            fontFamily: 'var(--mg-font-display)',
            letterSpacing: '-0.01em',
          }}
        >
          {l.title}
        </div>
        <div className="text-[12.5px] mt-1" style={{ color: '#5A6B82' }}>
          {l.category} · {l.location} · {l.distance} mi away
        </div>
        <div className="flex items-center gap-3 mt-2.5">
          <MatchBar score={l.match} />
          <span className="text-[11.5px]" style={{ color: '#5A6B82' }}>
            matches all 3 of your filters
          </span>
        </div>
        <div className="flex items-center justify-between mt-auto pt-3">
          <div className="flex items-center gap-2">
            <Avatar tag={sellerInitials(l.seller)} color="#94A3B8" size={28} />
            <div>
              <div className="text-[12px] font-semibold" style={{ color: '#0A1628' }}>
                {l.seller}
              </div>
              <div className="text-[11px]" style={{ color: '#5A6B82' }}>
                ★ {l.sellerRating}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="text-[22px] font-bold"
              style={{
                color: '#0A1628',
                fontFamily: 'var(--mg-font-display)',
                letterSpacing: '-0.01em',
              }}
            >
              ${l.price.toLocaleString()}
            </div>
            <button
              type="button"
              className="size-9 flex items-center justify-center"
              style={{ background: '#F0F3F7', color: '#5A6B82', borderRadius: 999 }}
            >
              <HeartIcon size={15} />
            </button>
            <button
              type="button"
              className="h-9 px-4 text-[12.5px] font-bold"
              style={{ background: '#0B2545', color: '#fff', borderRadius: 999 }}
            >
              Contact seller
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ListingResultRow({ l }: { l: SearchListing }) {
  const c = COND[l.condition]
  return (
    <div
      className="flex gap-3 p-3"
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
      }}
    >
      <PhotoTile bg={l.bg} hasMedia={true} size={88} radius={10} />
      <div className="min-w-0 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 mb-1">
          <ResultBadge kind="listing" />
          <span
            className="text-[10.5px] font-bold uppercase px-1.5 h-[18px] inline-flex items-center gap-1"
            style={{
              background: `${c.color}18`,
              color: c.color,
              borderRadius: 999,
              letterSpacing: '0.04em',
            }}
          >
            <span className="size-1.5 rounded-full" style={{ background: c.color }} />
            {c.label}
          </span>
          {l.verified && <VerifiedTick />}
          <MatchBar score={l.match} />
          <span
            className="ml-auto text-[11px]"
            style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
          >
            {l.posted}
          </span>
        </div>
        <div
          className="text-[14px] font-bold leading-snug"
          style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
        >
          {l.title}
        </div>
        <div className="text-[12px] mt-0.5" style={{ color: '#5A6B82' }}>
          {l.seller} · {l.location} · {l.distance} mi
        </div>
        <div className="flex items-center justify-between mt-auto pt-2">
          <div
            className="text-[16px] font-bold"
            style={{
              color: '#0A1628',
              fontFamily: 'var(--mg-font-display)',
              letterSpacing: '-0.01em',
            }}
          >
            ${l.price.toLocaleString()}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="size-8 flex items-center justify-center"
              style={{ background: '#F0F3F7', color: '#5A6B82', borderRadius: 999 }}
            >
              <HeartIcon size={13} />
            </button>
            <button
              type="button"
              className="h-8 px-3 text-[12px] font-bold"
              style={{ background: '#0B2545', color: '#fff', borderRadius: 999 }}
            >
              Contact
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CompanyCard({ c }: { c: SearchCompany }) {
  return (
    <div
      className="p-3 flex flex-col gap-2"
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <Avatar tag={c.tag} color="#1877F2" size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <ResultBadge kind="company" />
            {c.verified && <VerifiedTick />}
          </div>
          <div
            className="text-[13px] font-bold leading-tight mt-0.5 truncate"
            style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
          >
            {c.name}
          </div>
        </div>
      </div>
      <div className="text-[11.5px]" style={{ color: '#5A6B82' }}>
        {c.type} · {c.location}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[11px]" style={{ color: '#5A6B82' }}>
          <span className="font-bold" style={{ color: '#0A1628' }}>
            {c.followers.toLocaleString()}
          </span>{' '}
          followers ·{' '}
          <span className="font-bold" style={{ color: '#0A1628' }}>
            {c.listings}
          </span>{' '}
          listings
        </div>
        <button
          type="button"
          className="h-7 px-2.5 text-[11.5px] font-bold"
          style={{ background: '#F0F3F7', color: '#0A1628', borderRadius: 999 }}
        >
          Follow
        </button>
      </div>
    </div>
  )
}

function PersonCard({ p }: { p: SearchPerson }) {
  return (
    <div
      className="p-3 flex flex-col gap-2"
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
      }}
    >
      <div className="flex items-center gap-2.5">
        <Avatar tag={p.tag} color="#3D9BD6" size={40} />
        <div className="min-w-0 flex-1">
          <ResultBadge kind="person" />
          <div
            className="text-[13px] font-bold leading-tight mt-0.5 truncate"
            style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
          >
            {p.name}
          </div>
        </div>
      </div>
      <div className="text-[11.5px] leading-snug" style={{ color: '#5A6B82' }}>
        {p.role}
        <br />
        {p.company} · {p.location}
      </div>
      <div className="flex items-center justify-between">
        <div className="text-[11px]" style={{ color: '#5A6B82' }}>
          <span className="font-bold" style={{ color: '#0A1628' }}>
            {p.mutual}
          </span>{' '}
          mutual
        </div>
        <button
          type="button"
          className="h-7 px-2.5 text-[11.5px] font-bold"
          style={{ background: '#0B2545', color: '#fff', borderRadius: 999 }}
        >
          Connect
        </button>
      </div>
    </div>
  )
}

const URGENCY: Record<
  SearchSOS['urgency'],
  { color: string; bg: string }
> = {
  critical: { color: '#DC2626', bg: 'rgba(220,38,38,0.10)' },
  high: { color: '#FF6B2B', bg: 'rgba(255,107,43,0.10)' },
  medium: { color: '#F59E0B', bg: 'rgba(245,158,11,0.12)' },
}

function SOSResultRow({ s }: { s: SearchSOS }) {
  const urg = URGENCY[s.urgency]
  return (
    <div
      className="flex items-center gap-3 p-3"
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
        borderLeft: `3px solid ${urg.color}`,
      }}
    >
      <div
        className="size-10 flex items-center justify-center shrink-0"
        style={{ background: urg.bg, color: urg.color, borderRadius: 10 }}
      >
        <SirenIcon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <ResultBadge kind="sos" />
          <span
            className="text-[10.5px] font-bold uppercase px-1.5 h-[18px] inline-flex items-center"
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
            className="text-[10.5px] font-bold px-1.5 h-[18px] inline-flex items-center"
            style={{
              background: '#F0F3F7',
              color: '#5A6B82',
              borderRadius: 999,
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            {s.id}
          </span>
        </div>
        <div
          className="text-[13.5px] font-bold leading-tight"
          style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
        >
          {s.title}
        </div>
        <div className="text-[11.5px] mt-0.5" style={{ color: '#5A6B82' }}>
          {s.location} · {s.posted} ·{' '}
          <span className="font-semibold" style={{ color: '#0A1628' }}>
            {s.responses} responses
          </span>
        </div>
      </div>
      <button
        type="button"
        className="h-8 px-3 text-[12px] font-bold shrink-0"
        style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
      >
        Respond
      </button>
    </div>
  )
}

function PostResultRow({ p }: { p: SearchPost }) {
  return (
    <div
      className="flex gap-3 p-3"
      style={{
        background: '#FFFFFF',
        borderRadius: 12,
        boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
      }}
    >
      <Avatar tag={p.tag} color="#0B2545" size={36} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5">
          <ResultBadge kind="post" />
          <span className="text-[12.5px] font-bold" style={{ color: '#0A1628' }}>
            {p.author}
          </span>
          <span
            className="text-[11px]"
            style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
          >
            · {p.when}
          </span>
        </div>
        <div className="text-[12.5px] leading-snug" style={{ color: '#0A1628' }}>
          {p.excerpt}
        </div>
      </div>
    </div>
  )
}

function MapPanel() {
  const rows = SEARCH_LISTINGS.slice(0, 6)
  return (
    <div
      className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #E8F0FA 0%, #F0F4FA 100%)',
        borderRadius: 14,
        height: 720,
        boxShadow:
          '0 1px 2px rgba(11,37,69,0.04), 0 4px 12px rgba(11,37,69,0.05)',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(11,37,69,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(11,37,69,0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
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
          className="size-[180px] rounded-full"
          style={{
            border: '1.5px dashed rgba(255,107,43,0.55)',
            background:
              'radial-gradient(circle, rgba(255,107,43,0.10) 0%, transparent 70%)',
          }}
        />
      </div>
      <div
        className="absolute px-2 h-6 flex items-center text-[10.5px] font-bold uppercase"
        style={{
          left: '44%',
          top: '78%',
          transform: 'translate(-50%,0)',
          background: '#fff',
          color: '#FF6B2B',
          borderRadius: 999,
          letterSpacing: '0.06em',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        250 mi · Houston
      </div>

      {rows.map((p) => (
        <div
          key={p.id}
          className="absolute"
          style={{ left: `${p.pinX}%`, top: `${p.pinY}%`, transform: 'translate(-50%,-100%)' }}
        >
          <div
            className="px-2.5 h-8 flex items-center gap-1.5 text-[12px] font-bold whitespace-nowrap"
            style={{
              background: p.id === SEARCH_LISTINGS[0].id ? '#FF6B2B' : '#FFFFFF',
              color: p.id === SEARCH_LISTINGS[0].id ? '#fff' : '#0A1628',
              borderRadius: 999,
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
              border: '2px solid #fff',
            }}
          >
            ${(p.price / 1000).toFixed(0)}k
          </div>
        </div>
      ))}
      <div
        className="absolute top-3 left-3 px-3 py-1.5 text-[12px] font-semibold flex items-center gap-2"
        style={{
          background: '#FFFFFF',
          color: '#0A1628',
          borderRadius: 999,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        <span className="size-2 rounded-full" style={{ background: '#22C55E' }} />
        {rows.length} of 142 in view
      </div>
      <div className="absolute top-3 right-3 flex flex-col gap-1">
        {['+', '−'].map((s) => (
          <button
            key={s}
            type="button"
            className="size-9 flex items-center justify-center text-[18px] font-bold"
            style={{
              background: '#FFFFFF',
              color: '#0A1628',
              borderRadius: 10,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}

function ListingGridCard({ l }: { l: SearchListing }) {
  const c = COND[l.condition]
  return (
    <div
      className="flex flex-col"
      style={{
        background: '#FFFFFF',
        borderRadius: 14,
        boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
        overflow: 'hidden',
      }}
    >
      <div className="relative" style={{ height: 160, background: PHOTO_BG[l.bg] }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18) 0%, transparent 60%)',
          }}
        />
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
          <span
            className="text-[10px] font-bold uppercase px-2 h-[20px] inline-flex items-center gap-1"
            style={{
              background: 'rgba(255,255,255,0.95)',
              color: c.color,
              borderRadius: 999,
              letterSpacing: '0.04em',
            }}
          >
            <span className="size-1.5 rounded-full" style={{ background: c.color }} />
            {c.label}
          </span>
        </div>
        <button
          type="button"
          className="absolute top-2.5 right-2.5 size-8 flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.95)',
            color: l.faved ? '#DC2626' : '#5A6B82',
            borderRadius: 999,
          }}
        >
          <HeartIcon size={13} fill={l.faved ? '#DC2626' : 'none'} />
        </button>
        <div className="absolute bottom-2.5 left-2.5">
          <span
            className="text-[10px] font-bold px-2 h-[20px] inline-flex items-center gap-1"
            style={{
              background: 'rgba(11,37,69,0.85)',
              color: '#fff',
              borderRadius: 999,
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            {l.match}% match
          </span>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <ResultBadge kind="listing" />
          {l.verified && <VerifiedTick />}
        </div>
        <div
          className="text-[13px] font-bold leading-snug"
          style={{
            color: '#0A1628',
            fontFamily: 'var(--mg-font-display)',
            minHeight: 34,
          }}
        >
          {l.title}
        </div>
        <div className="text-[11.5px]" style={{ color: '#5A6B82' }}>
          {l.location} · {l.distance} mi
        </div>
        <div className="flex items-center justify-between mt-1">
          <span
            className="text-[16px] font-bold"
            style={{
              color: '#0A1628',
              fontFamily: 'var(--mg-font-display)',
              letterSpacing: '-0.01em',
            }}
          >
            ${l.price.toLocaleString()}
          </span>
          <button
            type="button"
            className="h-7 px-2.5 text-[11.5px] font-bold"
            style={{ background: '#0B2545', color: '#fff', borderRadius: 999 }}
          >
            Contact
          </button>
        </div>
        <div className="flex items-center gap-1.5 pt-1.5" style={{ borderTop: '1px solid #F0F3F7' }}>
          <Avatar tag={sellerInitials(l.seller)} color="#94A3B8" size={20} />
          <span className="text-[11px] truncate" style={{ color: '#5A6B82' }}>
            {l.seller}
          </span>
          <span
            className="text-[11px] ml-auto"
            style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
          >
            {l.posted}
          </span>
        </div>
      </div>
    </div>
  )
}

function SparseResultBand() {
  return (
    <div
      className="mt-2 p-5 flex items-start gap-4"
      style={{
        background: 'linear-gradient(180deg, #FFFFFF 0%, #F7F9FC 100%)',
        borderRadius: 14,
        border: '1px dashed #CBD5E1',
      }}
    >
      <div
        className="size-10 flex items-center justify-center shrink-0"
        style={{ background: '#F0F3F7', color: '#5A6B82', borderRadius: 999 }}
      >
        <SearchIcon size={18} />
      </div>
      <div className="flex-1">
        <div
          className="text-[14px] font-bold"
          style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
        >
          No &quot;Groups&quot; or &quot;Events&quot; matched
        </div>
        <div className="text-[12.5px] mt-0.5" style={{ color: '#5A6B82' }}>
          Try widening your distance to{' '}
          <span className="font-semibold" style={{ color: '#0A1628' }}>
            500 mi
          </span>
          , removing
          <span className="font-semibold" style={{ color: '#0A1628' }}>
            {' '}
            &quot;under $50k&quot;
          </span>
          , or set up a saved search to get notified when new matches arrive.
        </div>
        <div className="flex items-center gap-1.5 mt-2.5">
          <button
            type="button"
            className="h-8 px-3 text-[12px] font-bold"
            style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
          >
            Save this search
          </button>
          <button
            type="button"
            className="h-8 px-3 text-[12px] font-semibold"
            style={{
              background: '#FFFFFF',
              color: '#0A1628',
              borderRadius: 999,
              border: '1px solid #E5E9EF',
            }}
          >
            Widen distance
          </button>
        </div>
      </div>
    </div>
  )
}

function FBChip({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 h-9 px-3 text-[12.5px] font-semibold"
      style={{
        background: '#FFFFFF',
        color: '#0A1628',
        borderRadius: 999,
        border: '1px solid #E5E9EF',
      }}
    >
      {label}
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#94A3B8"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  )
}

function SearchViewSwitcher({
  view,
  setView,
}: {
  view: SearchResultsView
  setView: (v: SearchResultsView) => void
}) {
  const views: Array<{ key: SearchResultsView; label: string; icon: ReactNode }> = [
    {
      key: 'list',
      label: 'List',
      icon: (
        <svg
          width="13"
          height="13"
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
      label: 'Grid',
      icon: (
        <svg
          width="13"
          height="13"
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
      label: 'Map',
      icon: (
        <svg
          width="13"
          height="13"
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
      className="flex items-center gap-0.5 p-1"
      style={{ background: '#F0F3F7', borderRadius: 999 }}
    >
      {views.map((v) => {
        const isActive = v.key === view
        return (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className="flex items-center gap-1.5 h-7 px-3 text-[12px] font-semibold"
            style={{
              background: isActive ? '#FFFFFF' : 'transparent',
              color: isActive ? '#0A1628' : '#5A6B82',
              borderRadius: 999,
              boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {v.icon}
            {v.label}
          </button>
        )
      })}
    </div>
  )
}
