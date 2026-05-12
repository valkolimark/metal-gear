'use client'

import { useState, type ReactNode } from 'react'
import { ModernHeader } from '../_shared/ModernHeader'
import { PhotoTile } from '../_shared/PhotoTile'
import { COND, PHOTO_BG } from '../_shared/listings-data'
import {
  HeartIcon,
  ImageIcon,
  PlusIcon,
  SearchIcon,
} from '../_shared/icons'
import {
  LSTATUS,
  MOCK_MY_LISTINGS,
  MOCK_MY_LISTINGS_KPIS,
  priceFmt,
  type MyListing,
} from './listings-data'

const CARD_SHADOW =
  '0 1px 2px rgba(11,37,69,0.04), 0 4px 12px rgba(11,37,69,0.05)'

export function MyListingsApp() {
  const [view, setView] = useState<'rows' | 'grid' | 'table'>('rows')
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const rows = MOCK_MY_LISTINGS.filter(
    (l) => !query || l.title.toLowerCase().includes(query.toLowerCase())
  )
  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  return (
    <div
      style={{
        background: '#F4F6FA',
        minHeight: '100%',
        fontFamily: 'var(--mg-font-body)',
      }}
    >
      <ModernHeader />
      <div className="max-w-[1280px] mx-auto px-6 py-6">
        <div className="flex items-end justify-between mb-4">
          <div>
            <h1
              className="text-[28px] font-bold"
              style={{
                color: '#0A1628',
                fontFamily: 'var(--mg-font-display)',
                letterSpacing: '-0.02em',
              }}
            >
              My Listings
            </h1>
            <p className="text-[13.5px] mt-1" style={{ color: '#5A6B82' }}>
              Manage your equipment inventory · 42 total
            </p>
          </div>
        </div>
        <ListingsKPIStrip />
        <ListingsFilterBar
          view={view}
          setView={setView}
          query={query}
          setQuery={setQuery}
        />

        {view === 'table' ? (
          <MyListingsTable rows={rows} selected={selected} toggle={toggle} />
        ) : view === 'grid' ? (
          <MyListingsGrid rows={rows} selected={selected} toggle={toggle} />
        ) : (
          <MyListingsRows rows={rows} selected={selected} toggle={toggle} />
        )}

        {selected.size > 0 && (
          <BulkBar count={selected.size} onClear={() => setSelected(new Set())} />
        )}
      </div>
    </div>
  )
}

function ListingsKPIStrip() {
  return (
    <div className="grid grid-cols-4 gap-2 mb-4">
      {MOCK_MY_LISTINGS_KPIS.map((k) => (
        <div
          key={k.label}
          className="px-4 py-2.5"
          style={{
            background: '#FFFFFF',
            borderRadius: 12,
            border: '1px solid #ECEFF3',
          }}
        >
          <div
            className="text-[11px] font-semibold uppercase"
            style={{ color: '#5A6B82', letterSpacing: '0.05em' }}
          >
            {k.label}
          </div>
          <div
            className="text-[20px] font-bold mt-0.5"
            style={{
              color: '#0A1628',
              fontFamily: 'var(--mg-font-display)',
              letterSpacing: '-0.02em',
            }}
          >
            {k.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function ViewSwitcher({
  view,
  setView,
}: {
  view: 'rows' | 'grid' | 'table'
  setView: (v: 'rows' | 'grid' | 'table') => void
}) {
  const views: Array<{ key: 'rows' | 'grid' | 'table'; label: string; icon: ReactNode }> = [
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
      key: 'rows',
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
      key: 'table',
      label: 'Table',
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
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <line x1="3" y1="9" x2="21" y2="9" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="9" y1="3" x2="9" y2="21" />
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
        const active = v.key === view
        return (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className="flex items-center gap-1.5 h-7 px-3 text-[12px] font-semibold"
            style={{
              background: active ? '#FFFFFF' : 'transparent',
              color: active ? '#0A1628' : '#5A6B82',
              borderRadius: 999,
              boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
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

function ListingsFilterBar({
  view,
  setView,
  query,
  setQuery,
}: {
  view: 'rows' | 'grid' | 'table'
  setView: (v: 'rows' | 'grid' | 'table') => void
  query: string
  setQuery: (v: string) => void
}) {
  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <div className="relative">
        <SearchIcon
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: '#94A3B8' }}
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search title or ID…"
          className="h-9 pl-9 pr-3 text-[13px] outline-none w-[260px]"
          style={{
            background: '#FFFFFF',
            borderRadius: 999,
            border: '1px solid #E5E9EF',
          }}
        />
      </div>
      <FBChip label="Status: All" />
      <FBChip label="Category" />
      <FBChip label="Condition" />
      <FBChip label="Price" />
      <FBChip label="Quality ≥ 0" />
      <button
        type="button"
        className="text-[12px] font-semibold ml-1"
        style={{ color: '#1877F2' }}
      >
        + Saved filter
      </button>
      <div className="ml-auto flex items-center gap-2">
        <ViewSwitcher view={view} setView={setView} />
        <button
          type="button"
          className="h-9 px-4 text-[13px] font-semibold flex items-center gap-1.5"
          style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
        >
          <PlusIcon size={14} strokeWidth={2.5} /> Create listing
        </button>
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

function QualityBar({ score }: { score: number }) {
  const color =
    score >= 85 ? '#22C55E' : score >= 60 ? '#F59E0B' : '#DC2626'
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-1.5 w-12 rounded-full overflow-hidden"
        style={{ background: '#F0F3F7' }}
      >
        <div
          className="h-full"
          style={{ width: `${score}%`, background: color, borderRadius: 999 }}
        />
      </div>
      <span className="text-[11.5px] font-bold" style={{ color }}>
        {score}
      </span>
    </div>
  )
}

function MyListingsRows({
  rows,
  selected,
  toggle,
}: {
  rows: MyListing[]
  selected: Set<string>
  toggle: (id: string) => void
}) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        boxShadow: CARD_SHADOW,
        overflow: 'hidden',
      }}
    >
      {rows.map((l, i) => {
        const s = LSTATUS[l.status]
        const c = COND[l.condition]
        const isSel = selected.has(l.id)
        const expiringSoon =
          l.status === 'active' && l.expiresIn > 0 && l.expiresIn <= 7
        return (
          <div
            key={l.id}
            className="flex items-center gap-4 px-4 py-3"
            style={{
              borderBottom:
                i === rows.length - 1 ? 'none' : '1px solid #F0F3F7',
              background: isSel ? 'rgba(24,119,242,0.04)' : 'transparent',
            }}
          >
            <button
              type="button"
              onClick={() => toggle(l.id)}
              className="size-4 shrink-0 flex items-center justify-center"
              style={{
                borderRadius: 4,
                border: `1.5px solid ${isSel ? '#1877F2' : '#CBD3DD'}`,
                background: isSel ? '#1877F2' : '#FFFFFF',
              }}
            >
              {isSel && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
            <PhotoTile bg={l.bg} hasMedia={l.media} size={56} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <div
                  className="text-[14px] font-bold truncate"
                  style={{
                    color: '#0A1628',
                    fontFamily: 'var(--mg-font-display)',
                    letterSpacing: '-0.005em',
                  }}
                >
                  {l.title}
                </div>
                <span
                  className="text-[10.5px] font-bold px-2 h-[20px] inline-flex items-center"
                  style={{ background: s.bg, color: s.color, borderRadius: 999 }}
                >
                  {s.label}
                </span>
                {l.highPerf && (
                  <span
                    className="text-[10.5px] font-bold uppercase px-2 h-[20px] inline-flex items-center gap-1"
                    style={{
                      background: 'rgba(34,197,94,0.10)',
                      color: '#16A34A',
                      borderRadius: 999,
                      letterSpacing: '0.04em',
                    }}
                  >
                    ★ Top performer
                  </span>
                )}
                {!l.media && l.status === 'active' && (
                  <span
                    className="text-[10.5px] font-bold px-2 h-[20px] inline-flex items-center gap-1"
                    style={{
                      background: 'rgba(245,158,11,0.12)',
                      color: '#B45309',
                      borderRadius: 999,
                    }}
                  >
                    ! Add photos
                  </span>
                )}
                {expiringSoon && (
                  <span
                    className="text-[10.5px] font-bold px-2 h-[20px] inline-flex items-center"
                    style={{
                      background: 'rgba(220,38,38,0.10)',
                      color: '#B91C1C',
                      borderRadius: 999,
                    }}
                  >
                    Expires {l.expiresIn}d
                  </span>
                )}
                {l.boostable && l.score < 60 && (
                  <span
                    className="text-[10.5px] font-bold px-2 h-[20px] inline-flex items-center gap-1"
                    style={{
                      background: 'rgba(168,85,247,0.10)',
                      color: '#7E22CE',
                      borderRadius: 999,
                    }}
                  >
                    ⚡ Boost
                  </span>
                )}
              </div>
              <div
                className="flex items-center gap-3 mt-1 text-[12px]"
                style={{ color: '#5A6B82' }}
              >
                <span style={{ fontFamily: 'var(--mg-font-mono)' }}>{l.id}</span>
                <span>·</span>
                <span>{l.category}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <span
                    className="size-1.5 rounded-full"
                    style={{ background: c.color }}
                  />
                  {c.label}
                </span>
                <span>·</span>
                <span>{l.location}</span>
                {l.autoRenew && (
                  <>
                    <span>·</span>
                    <span style={{ color: '#16A34A', fontWeight: 600 }}>
                      Auto-renew
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-5 shrink-0">
              <div className="text-right">
                <div
                  className="text-[15px] font-bold"
                  style={{
                    color: '#0A1628',
                    fontFamily: 'var(--mg-font-display)',
                  }}
                >
                  {priceFmt(l)}
                </div>
                <div
                  className="text-[10.5px] font-semibold uppercase"
                  style={{ color: '#94A3B8', letterSpacing: '0.05em' }}
                >
                  USD
                </div>
              </div>
              <div
                className="flex items-center gap-3 text-[12px]"
                style={{ color: '#5A6B82' }}
              >
                <span className="flex items-center gap-1">
                  <EyeSimple />
                  {l.views}
                </span>
                <span className="flex items-center gap-1">
                  <HeartIcon size={12} />
                  {l.faves}
                </span>
              </div>
              <QualityBar score={l.score} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function EyeSimple() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function MyListingsTable({
  rows,
  selected,
  toggle,
}: {
  rows: MyListing[]
  selected: Set<string>
  toggle: (id: string) => void
}) {
  const [sort, setSort] = useState<{ key: 'views' | 'faves' | 'score'; dir: 'asc' | 'desc' }>(
    { key: 'views', dir: 'desc' }
  )
  const sorted = [...rows].sort((a, b) => {
    const va = a[sort.key]
    const vb = b[sort.key]
    if (va == null) return 1
    if (vb == null) return -1
    return sort.dir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1)
  })
  const grid = '40px 56px minmax(220px, 2fr) 90px minmax(140px, 1fr) 90px 100px 90px 70px 70px 100px'
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        boxShadow: CARD_SHADOW,
        overflow: 'hidden',
      }}
    >
      <div
        className="grid items-center gap-3 px-4 h-10 text-[10.5px] font-bold uppercase"
        style={{
          color: '#5A6B82',
          letterSpacing: '0.06em',
          borderBottom: '1px solid #ECEFF3',
          background: '#FAFBFC',
          gridTemplateColumns: grid,
        }}
      >
        <div />
        <div />
        <div>Title</div>
        <div>ID</div>
        <div>Category</div>
        <div>Cond.</div>
        <div className="text-right">Price</div>
        <div>Status</div>
        <div
          className="text-right cursor-pointer"
          onClick={() =>
            setSort((s) => ({
              key: 'views',
              dir: s.key === 'views' && s.dir === 'desc' ? 'asc' : 'desc',
            }))
          }
        >
          Views{sort.key === 'views' ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
        </div>
        <div
          className="text-right cursor-pointer"
          onClick={() =>
            setSort((s) => ({
              key: 'faves',
              dir: s.key === 'faves' && s.dir === 'desc' ? 'asc' : 'desc',
            }))
          }
        >
          Faves{sort.key === 'faves' ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
        </div>
        <div
          className="cursor-pointer"
          onClick={() =>
            setSort((s) => ({
              key: 'score',
              dir: s.key === 'score' && s.dir === 'desc' ? 'asc' : 'desc',
            }))
          }
        >
          Quality{sort.key === 'score' ? (sort.dir === 'desc' ? ' ↓' : ' ↑') : ''}
        </div>
      </div>
      {sorted.map((l, i) => {
        const s = LSTATUS[l.status]
        const c = COND[l.condition]
        const isSel = selected.has(l.id)
        return (
          <div
            key={l.id}
            className="grid items-center gap-3 px-4 h-[60px] text-[13px]"
            style={{
              borderBottom:
                i === sorted.length - 1 ? 'none' : '1px solid #F0F3F7',
              color: '#0A1628',
              gridTemplateColumns: grid,
              background: isSel ? 'rgba(24,119,242,0.04)' : 'transparent',
            }}
          >
            <button
              type="button"
              onClick={() => toggle(l.id)}
              className="size-4 flex items-center justify-center"
              style={{
                borderRadius: 4,
                border: `1.5px solid ${isSel ? '#1877F2' : '#CBD3DD'}`,
                background: isSel ? '#1877F2' : '#FFFFFF',
              }}
            >
              {isSel && (
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
            <PhotoTile bg={l.bg} hasMedia={l.media} size={40} radius={8} />
            <div className="min-w-0">
              <div
                className="text-[13px] font-semibold truncate"
                style={{ fontFamily: 'var(--mg-font-display)' }}
              >
                {l.title}
              </div>
              <div className="text-[11px]" style={{ color: '#5A6B82' }}>
                {l.location}
                {l.autoRenew && (
                  <span style={{ color: '#16A34A', fontWeight: 600 }}>
                    {' '}
                    · auto-renew
                  </span>
                )}
              </div>
            </div>
            <div
              className="text-[11.5px]"
              style={{ color: '#5A6B82', fontFamily: 'var(--mg-font-mono)' }}
            >
              {l.id}
            </div>
            <div className="text-[12.5px] truncate" style={{ color: '#5A6B82' }}>
              {l.category}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full" style={{ background: c.color }} />
              <span className="text-[12px]">{c.label}</span>
            </div>
            <div className="text-right">
              <span
                className="text-[13px] font-bold"
                style={{ fontFamily: 'var(--mg-font-display)' }}
              >
                {priceFmt(l)}
              </span>
            </div>
            <div>
              <span
                className="text-[10.5px] font-bold px-2 h-[20px] inline-flex items-center"
                style={{ background: s.bg, color: s.color, borderRadius: 999 }}
              >
                {s.label}
              </span>
            </div>
            <div className="text-right text-[13px] font-semibold">{l.views}</div>
            <div className="text-right text-[13px] font-semibold">{l.faves}</div>
            <QualityBar score={l.score} />
          </div>
        )
      })}
    </div>
  )
}

function MyListingsGrid({
  rows,
  selected,
  toggle,
}: {
  rows: MyListing[]
  selected: Set<string>
  toggle: (id: string) => void
}) {
  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
    >
      {rows.map((l) => {
        const s = LSTATUS[l.status]
        const c = COND[l.condition]
        const isSel = selected.has(l.id)
        const expiringSoon =
          l.status === 'active' && l.expiresIn > 0 && l.expiresIn <= 7
        return (
          <div
            key={l.id}
            className="flex flex-col"
            style={{
              background: '#FFFFFF',
              borderRadius: 14,
              boxShadow: CARD_SHADOW,
              border: isSel ? '2px solid #1877F2' : '2px solid transparent',
              overflow: 'hidden',
              transition: 'all 140ms ease',
            }}
          >
            <div
              className="relative"
              style={{
                aspectRatio: '4 / 3',
                background: l.media ? PHOTO_BG[l.bg] : '#F0F3F7',
              }}
            >
              {!l.media && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                  <ImageIcon size={32} style={{ color: '#94A3B8' }} />
                  <span
                    className="text-[10.5px] font-bold uppercase tracking-wide"
                    style={{ color: '#94A3B8' }}
                  >
                    No photo
                  </span>
                </div>
              )}
              {l.media && (
                <div
                  className="absolute inset-0"
                  style={{
                    background:
                      'radial-gradient(circle at 25% 20%, rgba(255,255,255,0.20) 0%, transparent 55%)',
                  }}
                />
              )}

              <button
                type="button"
                onClick={() => toggle(l.id)}
                className="absolute top-2.5 left-2.5 size-5 flex items-center justify-center"
                style={{
                  borderRadius: 5,
                  border: `1.5px solid ${
                    isSel ? '#1877F2' : 'rgba(255,255,255,0.85)'
                  }`,
                  background: isSel ? '#1877F2' : 'rgba(10,22,40,0.30)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                {isSel && (
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>

              <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                <span
                  className="text-[10px] font-bold px-2 h-[20px] inline-flex items-center"
                  style={{
                    background: '#FFFFFF',
                    color: s.color,
                    borderRadius: 999,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                  }}
                >
                  <span
                    className="size-1.5 rounded-full mr-1"
                    style={{ background: s.color }}
                  />
                  {s.label}
                </span>
              </div>

              <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 flex-wrap">
                {l.highPerf && (
                  <span
                    className="text-[10px] font-bold uppercase px-1.5 h-[20px] inline-flex items-center gap-1"
                    style={{
                      background: '#FFFFFF',
                      color: '#16A34A',
                      borderRadius: 999,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    ★ Top
                  </span>
                )}
                {!l.media && l.status === 'active' && (
                  <span
                    className="text-[10px] font-bold px-1.5 h-[20px] inline-flex items-center gap-1"
                    style={{
                      background: '#FEF3C7',
                      color: '#B45309',
                      borderRadius: 999,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                    }}
                  >
                    ! Add photos
                  </span>
                )}
                {expiringSoon && (
                  <span
                    className="text-[10px] font-bold px-1.5 h-[20px] inline-flex items-center"
                    style={{
                      background: '#FEE2E2',
                      color: '#B91C1C',
                      borderRadius: 999,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                    }}
                  >
                    Expires {l.expiresIn}d
                  </span>
                )}
                {l.boostable && l.score < 60 && (
                  <span
                    className="text-[10px] font-bold px-1.5 h-[20px] inline-flex items-center gap-1"
                    style={{
                      background: '#F3E8FF',
                      color: '#7E22CE',
                      borderRadius: 999,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                    }}
                  >
                    ⚡ Boost
                  </span>
                )}
              </div>

              {l.media && (
                <div
                  className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 px-2 h-[22px] text-[10.5px] font-semibold"
                  style={{
                    background: 'rgba(10,22,40,0.55)',
                    color: '#fff',
                    borderRadius: 999,
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <span className="flex items-center gap-0.5">
                    <EyeSimple />
                    {l.views}
                  </span>
                  <span style={{ opacity: 0.5 }}>·</span>
                  <span className="flex items-center gap-0.5">
                    <HeartIcon size={11} />
                    {l.faves}
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 flex flex-col flex-1">
              <div
                className="text-[13.5px] font-bold leading-snug line-clamp-2"
                style={{
                  color: '#0A1628',
                  fontFamily: 'var(--mg-font-display)',
                  letterSpacing: '-0.005em',
                  minHeight: 36,
                }}
              >
                {l.title}
              </div>
              <div
                className="flex items-center gap-1.5 mt-1.5 text-[11px]"
                style={{ color: '#5A6B82' }}
              >
                <span style={{ fontFamily: 'var(--mg-font-mono)' }}>{l.id}</span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <span
                    className="size-1 rounded-full"
                    style={{ background: c.color }}
                  />
                  {c.label}
                </span>
              </div>
              <div
                className="text-[11px] mt-0.5 truncate"
                style={{ color: '#5A6B82' }}
              >
                {l.category}
              </div>
              <div
                className="flex items-end justify-between mt-3 pt-2.5"
                style={{ borderTop: '1px solid #F0F3F7' }}
              >
                <div>
                  <div
                    className="text-[16px] font-bold leading-none"
                    style={{
                      color: '#0A1628',
                      fontFamily: 'var(--mg-font-display)',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {priceFmt(l)}
                  </div>
                  <div
                    className="text-[10px] font-semibold uppercase mt-1"
                    style={{ color: '#94A3B8', letterSpacing: '0.05em' }}
                  >
                    USD
                  </div>
                </div>
                <QualityBar score={l.score} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BulkBar({ count, onClear }: { count: number; onClear: () => void }) {
  return (
    <div
      className="sticky flex items-center gap-3 px-2 py-2 mx-auto mt-4"
      style={{
        bottom: 24,
        background: '#0A1628',
        color: '#fff',
        borderRadius: 999,
        boxShadow: '0 12px 32px rgba(11,37,69,0.30)',
        maxWidth: 'fit-content',
      }}
    >
      <span className="text-[13px] font-semibold pl-3">{count} selected</span>
      <button
        type="button"
        className="h-8 px-3 text-[12.5px] font-semibold"
        style={{
          background: 'rgba(255,255,255,0.10)',
          color: '#fff',
          borderRadius: 999,
        }}
      >
        Edit all
      </button>
      <button
        type="button"
        className="h-8 px-3 text-[12.5px] font-semibold"
        style={{
          background: 'rgba(255,255,255,0.10)',
          color: '#fff',
          borderRadius: 999,
        }}
      >
        Mark sold
      </button>
      <button
        type="button"
        className="h-8 px-3 text-[12.5px] font-semibold"
        style={{
          background: 'rgba(255,255,255,0.10)',
          color: '#fff',
          borderRadius: 999,
        }}
      >
        Boost
      </button>
      <button
        type="button"
        className="h-8 px-3 text-[12.5px] font-semibold"
        style={{
          background: 'rgba(220,38,38,0.30)',
          color: '#FCA5A5',
          borderRadius: 999,
        }}
      >
        Remove
      </button>
      <button
        type="button"
        onClick={onClear}
        className="size-8 flex items-center justify-center"
        style={{ color: '#fff' }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  )
}
