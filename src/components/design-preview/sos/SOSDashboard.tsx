'use client'

import { useState } from 'react'
import { ModernHeader } from '../_shared/ModernHeader'
import {
  ChevronDownIcon,
  SearchIcon,
  SirenIcon,
} from '../_shared/icons'
import { MOCK_SOS_KPIS, MOCK_SOS_ROWS, STATUS, URG, type SOSRow } from './sos-data'

const CARD_SHADOW =
  '0 1px 2px rgba(11,37,69,0.04), 0 4px 12px rgba(11,37,69,0.05)'

export function SOSDashboardConsole() {
  const [tab, setTab] = useState('open')
  const [mapOn, setMapOn] = useState(true)
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
        <DashboardHeader sub="Live equipment requests in your network — your posts and responses" />
        <SOSKPIStrip />
        <SOSFilterBar tab={tab} setTab={setTab} mapOn={mapOn} setMapOn={setMapOn} />
        {mapOn && <SOSMapPanel />}
        <SOSTable tab={tab} />
      </div>
    </div>
  )
}

export function SOSDashboardCards() {
  const [tab, setTab] = useState('all')
  const [mapOn, setMapOn] = useState(false)
  return (
    <div
      style={{
        background: '#F4F6FA',
        minHeight: '100%',
        fontFamily: 'var(--mg-font-body)',
      }}
    >
      <ModernHeader />
      <div className="max-w-[1080px] mx-auto px-6 py-6">
        <DashboardHeader sub="Browse open requests and your activity — visual layout" />
        <SOSKPIStrip />
        <SOSFilterBar tab={tab} setTab={setTab} mapOn={mapOn} setMapOn={setMapOn} />
        {mapOn && <SOSMapPanel />}
        <SOSCardGrid rows={MOCK_SOS_ROWS} />
      </div>
    </div>
  )
}

function DashboardHeader({ sub }: { sub: string }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <h1
          className="text-[28px] font-bold flex items-center gap-2.5"
          style={{
            color: '#0A1628',
            fontFamily: 'var(--mg-font-display)',
            letterSpacing: '-0.02em',
          }}
        >
          <span
            className="size-9 flex items-center justify-center"
            style={{ background: '#FF6B2B', color: '#fff', borderRadius: 12 }}
          >
            <SirenIcon size={18} />
          </span>
          SOS Dashboard
        </h1>
        <p className="text-[13.5px] mt-1.5" style={{ color: '#5A6B82' }}>
          {sub}
        </p>
      </div>
    </div>
  )
}

function SOSKPIStrip() {
  const tones: Record<
    'orange' | 'navy' | 'green' | 'blue',
    { fg: string; bg: string }
  > = {
    orange: { fg: '#FF6B2B', bg: 'rgba(255,107,43,0.10)' },
    navy: { fg: '#0B2545', bg: 'rgba(11,37,69,0.06)' },
    green: { fg: '#22C55E', bg: 'rgba(34,197,94,0.10)' },
    blue: { fg: '#1877F2', bg: 'rgba(24,119,242,0.10)' },
  }
  return (
    <div className="grid grid-cols-4 gap-3 mb-5">
      {MOCK_SOS_KPIS.map((k) => {
        const t = tones[k.tone]
        return (
          <div
            key={k.label}
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              padding: 16,
              boxShadow: CARD_SHADOW,
            }}
          >
            <div
              className="text-[12px] font-semibold mb-2"
              style={{ color: '#5A6B82' }}
            >
              {k.label}
            </div>
            <div className="flex items-baseline gap-2">
              <div
                className="text-[28px] font-bold leading-none"
                style={{
                  color: '#0A1628',
                  fontFamily: 'var(--mg-font-display)',
                  letterSpacing: '-0.02em',
                }}
              >
                {k.value}
              </div>
            </div>
            <div
              className="mt-2 inline-flex items-center px-2 h-5 text-[11px] font-semibold"
              style={{ color: t.fg, background: t.bg, borderRadius: 999 }}
            >
              {k.delta}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SOSFilterBar({
  tab,
  setTab,
  mapOn,
  setMapOn,
}: {
  tab: string
  setTab: (t: string) => void
  mapOn: boolean
  setMapOn: (v: boolean) => void
}) {
  const tabs = [
    { key: 'open', label: 'Open in network', count: 8 },
    { key: 'mine', label: 'My requests', count: 4 },
    { key: 'replies', label: 'My responses', count: 11 },
    { key: 'all', label: 'All', count: 23 },
  ]
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <div
          className="flex items-center gap-1 p-1"
          style={{ background: '#F0F3F7', borderRadius: 999 }}
        >
          {tabs.map((t) => {
            const active = t.key === tab
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className="flex items-center gap-1.5 h-8 px-3.5 text-[13px] font-semibold whitespace-nowrap"
                style={{
                  background: active ? '#FFFFFF' : 'transparent',
                  color: active ? '#0A1628' : '#5A6B82',
                  borderRadius: 999,
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                {t.label}
                <span
                  className="text-[11px] font-bold px-1.5 h-[18px] flex items-center justify-center"
                  style={{
                    background: active ? '#EFF6FF' : 'rgba(0,0,0,0.06)',
                    color: active ? '#1877F2' : '#5A6B82',
                    borderRadius: 999,
                    minWidth: 22,
                  }}
                >
                  {t.count}
                </span>
              </button>
            )
          })}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMapOn(!mapOn)}
            className="flex items-center gap-1.5 h-9 px-3 text-[13px] font-semibold"
            style={{
              background: mapOn ? '#0B2545' : '#FFFFFF',
              color: mapOn ? '#fff' : '#0A1628',
              borderRadius: 999,
              boxShadow: '0 1px 2px rgba(11,37,69,0.06)',
            }}
          >
            <span
              className="size-2 rounded-full"
              style={{ background: mapOn ? '#22C55E' : '#94A3B8' }}
            />
            Map
          </button>
          <button
            type="button"
            className="h-9 px-4 text-[13px] font-semibold flex items-center gap-1.5"
            style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
          >
            <SirenIcon size={14} strokeWidth={2.5} /> Send SOS
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <FilterChip label="Urgency: Any" />
        <FilterChip label="Within 200 mi" />
        <FilterChip label="All categories" />
        <FilterChip label="Last 7 days" />
        <button
          type="button"
          className="text-[12.5px] font-semibold ml-1"
          style={{ color: '#1877F2' }}
        >
          + Saved view
        </button>
        <div className="ml-auto relative">
          <SearchIcon
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: '#94A3B8' }}
          />
          <input
            placeholder="Search SOS by ID, equipment, company"
            className="h-9 pl-9 pr-3 text-[13px] outline-none w-[280px]"
            style={{
              background: '#FFFFFF',
              borderRadius: 999,
              border: '1px solid #E5E9EF',
            }}
          />
        </div>
      </div>
    </div>
  )
}

function FilterChip({ label }: { label: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 h-8 px-3 text-[12.5px] font-semibold"
      style={{
        background: '#FFFFFF',
        color: '#0A1628',
        borderRadius: 999,
        border: '1px solid #E5E9EF',
      }}
    >
      {label}
      <ChevronDownIcon size={12} style={{ color: '#94A3B8' }} />
    </button>
  )
}

function SOSTable({ tab }: { tab: string }) {
  const rows = MOCK_SOS_ROWS.filter((r) => {
    if (tab === 'mine') return r.mine
    if (tab === 'open') return r.status === 'open'
    return true
  })
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
        className="grid items-center gap-3 px-4 h-10 text-[11px] font-bold uppercase"
        style={{
          color: '#5A6B82',
          letterSpacing: '0.06em',
          borderBottom: '1px solid #F0F3F7',
          gridTemplateColumns: '110px 90px 1fr 1.2fr 110px 90px 80px 70px',
        }}
      >
        <div>Urgency</div>
        <div>Status</div>
        <div>Equipment</div>
        <div>Requester</div>
        <div>Location</div>
        <div>Posted</div>
        <div className="text-right">Replies</div>
        <div />
      </div>
      {rows.map((r, i) => {
        const u = URG[r.urgency]
        const s = STATUS[r.status]
        return (
          <div
            key={r.id}
            className="grid items-center gap-3 px-4 h-[64px] text-[13px]"
            style={{
              color: '#0A1628',
              borderBottom:
                i === rows.length - 1 ? 'none' : '1px solid #F0F3F7',
              gridTemplateColumns:
                '110px 90px 1fr 1.2fr 110px 90px 80px 70px',
              background: r.mine ? 'rgba(24,119,242,0.025)' : 'transparent',
            }}
          >
            <div className="flex items-center gap-1.5">
              <span className="size-2 rounded-full" style={{ background: u.color }} />
              <span
                className="text-[11px] font-bold uppercase"
                style={{ color: u.color, letterSpacing: '0.04em' }}
              >
                {u.label}
              </span>
            </div>
            <div>
              <span
                className="text-[11px] font-bold px-2 h-[20px] inline-flex items-center"
                style={{ background: s.bg, color: s.color, borderRadius: 999 }}
              >
                {s.label}
              </span>
            </div>
            <div className="min-w-0">
              <div
                className="font-semibold truncate"
                style={{
                  fontFamily: 'var(--mg-font-display)',
                  letterSpacing: '-0.005em',
                }}
              >
                {r.category}
              </div>
              <div
                className="text-[11.5px]"
                style={{
                  color: '#5A6B82',
                  fontFamily: 'var(--mg-font-mono)',
                }}
              >
                {r.id} · {r.budget}
              </div>
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <div
                className="size-7 flex items-center justify-center font-bold text-[10px] shrink-0"
                style={{
                  background: r.mine ? '#1877F2' : '#94A3B8',
                  color: '#fff',
                  borderRadius: 999,
                }}
              >
                {r.company
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold truncate">
                  {r.company}
                  {r.mine && (
                    <span
                      className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5"
                      style={{
                        background: 'rgba(24,119,242,0.10)',
                        color: '#1877F2',
                        borderRadius: 4,
                      }}
                    >
                      You
                    </span>
                  )}
                </div>
                <div className="text-[11.5px]" style={{ color: '#5A6B82' }}>
                  ★ {r.rating}
                  {r.claimedBy ? ` · won by ${r.claimedBy}` : ''}
                </div>
              </div>
            </div>
            <div>
              <div className="text-[13px]">{r.location}</div>
              <div className="text-[11.5px]" style={{ color: '#5A6B82' }}>
                {r.distance} mi
              </div>
            </div>
            <div className="text-[12.5px]" style={{ color: '#5A6B82' }}>
              {r.posted}
            </div>
            <div className="text-right text-[13px] font-semibold">{r.responses}</div>
            <div className="text-right">
              <button
                type="button"
                className="text-[12.5px] font-bold px-3 h-8"
                style={{
                  background: r.mine ? '#F0F3F7' : '#0B2545',
                  color: r.mine ? '#0A1628' : '#fff',
                  borderRadius: 999,
                }}
              >
                {r.mine ? 'Manage' : 'Respond'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SOSCardGrid({ rows }: { rows: SOSRow[] }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {rows.map((r) => {
        const u = URG[r.urgency]
        const s = STATUS[r.status]
        return (
          <div
            key={r.id}
            className="p-4 flex flex-col gap-3"
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              boxShadow: CARD_SHADOW,
            }}
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-[10.5px] font-bold uppercase px-2 h-[20px] inline-flex items-center gap-1"
                style={{
                  background: `${u.color}18`,
                  color: u.color,
                  borderRadius: 999,
                  letterSpacing: '0.05em',
                }}
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: u.color }}
                />
                {u.label}
              </span>
              <span
                className="text-[10.5px] font-bold px-2 h-[20px] inline-flex items-center"
                style={{ background: s.bg, color: s.color, borderRadius: 999 }}
              >
                {s.label}
              </span>
              {r.mine && (
                <span
                  className="text-[10.5px] font-bold px-2 h-[20px] inline-flex items-center"
                  style={{
                    background: 'rgba(24,119,242,0.10)',
                    color: '#1877F2',
                    borderRadius: 999,
                  }}
                >
                  You
                </span>
              )}
              <span
                className="ml-auto text-[11.5px]"
                style={{
                  color: '#5A6B82',
                  fontFamily: 'var(--mg-font-mono)',
                }}
              >
                {r.id}
              </span>
            </div>
            <div>
              <div
                className="text-[15px] font-bold leading-snug"
                style={{
                  color: '#0A1628',
                  fontFamily: 'var(--mg-font-display)',
                  letterSpacing: '-0.005em',
                }}
              >
                {r.category}
              </div>
              <div className="text-[12.5px] mt-1" style={{ color: '#5A6B82' }}>
                {r.location} · {r.distance} mi · {r.posted}
              </div>
            </div>
            <div
              className="flex items-center gap-2 pt-2 border-t"
              style={{ borderColor: '#F0F3F7' }}
            >
              <div
                className="size-8 flex items-center justify-center font-bold text-[11px]"
                style={{
                  background: r.mine ? '#1877F2' : '#94A3B8',
                  color: '#fff',
                  borderRadius: 999,
                }}
              >
                {r.company
                  .split(' ')
                  .map((w) => w[0])
                  .slice(0, 2)
                  .join('')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold truncate">{r.company}</div>
                <div className="text-[11.5px]" style={{ color: '#5A6B82' }}>
                  ★ {r.rating} · {r.responses} replies · {r.budget}
                </div>
              </div>
              <button
                type="button"
                className="text-[12.5px] font-bold px-3 h-8 shrink-0"
                style={{
                  background: r.mine ? '#F0F3F7' : '#0B2545',
                  color: r.mine ? '#0A1628' : '#fff',
                  borderRadius: 999,
                }}
              >
                {r.mine ? 'Manage' : 'Respond'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SOSMapPanel() {
  const pins: Array<{ x: number; y: number; urg: 'critical' | 'high' | 'normal' }> = [
    { x: 38, y: 62, urg: 'critical' },
    { x: 42, y: 58, urg: 'critical' },
    { x: 44, y: 65, urg: 'normal' },
    { x: 50, y: 64, urg: 'high' },
    { x: 56, y: 62, urg: 'normal' },
    { x: 35, y: 50, urg: 'high' },
    { x: 60, y: 45, urg: 'normal' },
    { x: 30, y: 70, urg: 'normal' },
  ]
  return (
    <div
      className="mb-4 relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #E8F0FA 0%, #F0F4FA 100%)',
        borderRadius: 16,
        height: 280,
        boxShadow: CARD_SHADOW,
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
      {pins.map((p, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            transform: 'translate(-50%,-100%)',
          }}
        >
          <div className="relative">
            <div
              className="size-7 rounded-full flex items-center justify-center"
              style={{
                background: URG[p.urg].color,
                boxShadow: `0 4px 12px ${URG[p.urg].color}66`,
                border: '2px solid #fff',
              }}
            >
              <SirenIcon size={12} className="text-white" />
            </div>
            <div
              className="absolute left-1/2 -translate-x-1/2 -bottom-1 size-1.5 rounded-full"
              style={{ background: URG[p.urg].color }}
            />
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
        <span
          className="size-2 rounded-full animate-pulse"
          style={{ background: '#22C55E' }}
        />
        Live · 8 within 200 mi
      </div>
      <div
        className="absolute bottom-3 left-3 flex items-center gap-3 px-3 py-2 text-[11.5px] font-semibold"
        style={{
          background: '#FFFFFF',
          color: '#0A1628',
          borderRadius: 12,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        }}
      >
        {(['critical', 'high', 'normal'] as const).map((k) => (
          <div key={k} className="flex items-center gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ background: URG[k].color }}
            />
            {URG[k].label}
          </div>
        ))}
      </div>
    </div>
  )
}

export function MobileSOSDashboard() {
  const [tab, setTab] = useState('open')
  const tabs = [
    { key: 'open', label: 'Open', count: 8 },
    { key: 'mine', label: 'Mine', count: 4 },
    { key: 'replies', label: 'Replies', count: 11 },
  ]
  const rows = MOCK_SOS_ROWS.filter((r) =>
    tab === 'mine' ? r.mine : tab === 'open' ? r.status === 'open' : true
  ).slice(0, 6)

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
        className="flex items-center px-4 h-[52px] shrink-0"
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
        <div className="flex items-center gap-2 ml-1">
          <span
            className="size-7 flex items-center justify-center"
            style={{ background: '#FF6B2B', borderRadius: 8 }}
          >
            <SirenIcon size={14} />
          </span>
          <span
            className="text-[15px] font-bold"
            style={{
              fontFamily: 'var(--mg-font-display)',
              letterSpacing: '-0.01em',
            }}
          >
            SOS
          </span>
        </div>
        <button
          type="button"
          className="ml-auto size-8 flex items-center justify-center"
          style={{ color: '#E8EEF5' }}
        >
          <SearchIcon size={18} />
        </button>
        <button
          type="button"
          className="size-8 flex items-center justify-center"
          style={{ color: '#E8EEF5' }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="15" y2="12" />
            <line x1="3" y1="18" x2="18" y2="18" />
          </svg>
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-20 [&>*]:shrink-0">
        <div className="px-4 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <div
              className="p-3"
              style={{ background: '#FFFFFF', borderRadius: 14 }}
            >
              <div className="text-[11px] font-semibold" style={{ color: '#5A6B82' }}>
                Open in network
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span
                  className="text-[22px] font-bold"
                  style={{
                    color: '#0A1628',
                    fontFamily: 'var(--mg-font-display)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  12
                </span>
                <span
                  className="text-[10.5px] font-semibold px-1.5 py-0.5"
                  style={{
                    background: 'rgba(255,107,43,0.10)',
                    color: '#FF6B2B',
                    borderRadius: 999,
                  }}
                >
                  +3
                </span>
              </div>
            </div>
            <div
              className="p-3"
              style={{ background: '#FFFFFF', borderRadius: 14 }}
            >
              <div className="text-[11px] font-semibold" style={{ color: '#5A6B82' }}>
                My active
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span
                  className="text-[22px] font-bold"
                  style={{
                    color: '#0A1628',
                    fontFamily: 'var(--mg-font-display)',
                    letterSpacing: '-0.02em',
                  }}
                >
                  4
                </span>
                <span
                  className="text-[10.5px] font-semibold px-1.5 py-0.5"
                  style={{
                    background: 'rgba(24,119,242,0.10)',
                    color: '#1877F2',
                    borderRadius: 999,
                  }}
                >
                  2 awaiting
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 pt-3">
          <div
            className="relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #E8F0FA 0%, #F0F4FA 100%)',
              borderRadius: 14,
              height: 120,
            }}
          >
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
            {(
              [
                { x: 40, y: 60, u: 'critical' as const },
                { x: 46, y: 64, u: 'critical' as const },
                { x: 55, y: 60, u: 'high' as const },
                { x: 62, y: 45, u: 'normal' as const },
              ]
            ).map((p, i) => (
              <div
                key={i}
                className="absolute"
                style={{
                  left: `${p.x}%`,
                  top: `${p.y}%`,
                  transform: 'translate(-50%,-50%)',
                }}
              >
                <div
                  className="size-5 rounded-full flex items-center justify-center"
                  style={{
                    background: URG[p.u].color,
                    border: '2px solid #fff',
                    boxShadow: `0 2px 6px ${URG[p.u].color}66`,
                  }}
                >
                  <SirenIcon size={9} className="text-white" />
                </div>
              </div>
            ))}
            <div
              className="absolute bottom-2 right-2 px-2.5 h-7 flex items-center text-[11px] font-bold"
              style={{ background: '#0B2545', color: '#fff', borderRadius: 999 }}
            >
              Open map →
            </div>
          </div>
        </div>

        <div className="px-4 pt-4">
          <div
            className="flex items-center gap-1 p-1"
            style={{
              background: '#FFFFFF',
              borderRadius: 999,
              boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
            }}
          >
            {tabs.map((t) => {
              const active = t.key === tab
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 text-[12.5px] font-semibold"
                  style={{
                    background: active ? '#0B2545' : 'transparent',
                    color: active ? '#fff' : '#5A6B82',
                    borderRadius: 999,
                  }}
                >
                  {t.label}
                  <span
                    className="text-[10px] font-bold px-1.5 h-[16px] flex items-center justify-center"
                    style={{
                      background: active
                        ? 'rgba(255,255,255,0.18)'
                        : 'rgba(0,0,0,0.06)',
                      color: active ? '#fff' : '#5A6B82',
                      borderRadius: 999,
                      minWidth: 18,
                    }}
                  >
                    {t.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="px-4 pt-3 flex flex-col gap-2.5">
          {rows.map((r) => {
            const u = URG[r.urgency]
            const s = STATUS[r.status]
            return (
              <div
                key={r.id}
                className="p-3.5"
                style={{
                  background: '#FFFFFF',
                  borderRadius: 14,
                  boxShadow: '0 1px 3px rgba(11,37,69,0.04)',
                }}
              >
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  <span
                    className="text-[10px] font-bold uppercase px-1.5 h-[18px] inline-flex items-center gap-1"
                    style={{
                      background: `${u.color}18`,
                      color: u.color,
                      borderRadius: 999,
                      letterSpacing: '0.04em',
                    }}
                  >
                    <span className="size-1 rounded-full" style={{ background: u.color }} />
                    {u.label}
                  </span>
                  <span
                    className="text-[10px] font-bold px-1.5 h-[18px] inline-flex items-center"
                    style={{ background: s.bg, color: s.color, borderRadius: 999 }}
                  >
                    {s.label}
                  </span>
                  <span
                    className="ml-auto text-[10.5px]"
                    style={{
                      color: '#94A3B8',
                      fontFamily: 'var(--mg-font-mono)',
                    }}
                  >
                    {r.posted}
                  </span>
                </div>
                <div
                  className="text-[14px] font-bold leading-snug"
                  style={{
                    color: '#0A1628',
                    fontFamily: 'var(--mg-font-display)',
                    letterSpacing: '-0.005em',
                  }}
                >
                  {r.category}
                </div>
                <div className="flex items-center gap-2 mt-2.5">
                  <div
                    className="size-6 flex items-center justify-center font-bold text-[10px]"
                    style={{
                      background: r.mine ? '#1877F2' : '#94A3B8',
                      color: '#fff',
                      borderRadius: 999,
                    }}
                  >
                    {r.company
                      .split(' ')
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div
                    className="text-[12px] truncate flex-1"
                    style={{ color: '#5A6B82' }}
                  >
                    {r.company} · ★ {r.rating}
                  </div>
                  <button
                    type="button"
                    className="text-[11.5px] font-bold px-2.5 h-7 shrink-0"
                    style={{
                      background: r.mine ? '#F0F3F7' : '#0B2545',
                      color: r.mine ? '#0A1628' : '#fff',
                      borderRadius: 999,
                    }}
                  >
                    {r.mine ? 'Manage' : 'Respond'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div
        className="absolute bottom-0 left-0 right-0 p-3"
        style={{ background: 'linear-gradient(to top, #F4F6FA 60%, transparent)' }}
      >
        <button
          type="button"
          className="w-full h-12 flex items-center justify-center gap-2 text-[14px] font-bold"
          style={{
            background: '#FF6B2B',
            color: '#fff',
            borderRadius: 999,
            boxShadow: '0 6px 16px rgba(255,107,43,0.4)',
          }}
        >
          <SirenIcon size={16} strokeWidth={2.5} /> Send SOS
        </button>
      </div>
    </div>
  )
}
