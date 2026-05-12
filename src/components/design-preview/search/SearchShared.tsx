'use client'

import { useState, type ReactNode } from 'react'

export type NLChipKind = 'term' | 'price' | 'location' | 'condition' | 'seller'
export type NLChipData = {
  kind: NLChipKind
  label: string
  raw?: string
  op?: string
  value?: number
  radius?: number
}

export function NLChip({ chip, onRemove }: { chip: NLChipData; onRemove: () => void }) {
  const palette: Record<NLChipKind, { bg: string; fg: string; kind: string }> = {
    term: { bg: 'rgba(11,37,69,0.06)', fg: '#0A1628', kind: 'TEXT' },
    price: { bg: 'rgba(34,197,94,0.10)', fg: '#15803D', kind: 'PRICE' },
    location: { bg: 'rgba(61,155,214,0.12)', fg: '#0E6A9E', kind: 'NEAR' },
    condition: { bg: 'rgba(255,107,43,0.10)', fg: '#C24A12', kind: 'COND' },
    seller: { bg: 'rgba(24,119,242,0.10)', fg: '#1877F2', kind: 'SELLER' },
  }
  const s = palette[chip.kind] || palette.term
  return (
    <span
      className="inline-flex items-center gap-1.5 h-7 pl-2 pr-1 text-[12px] font-semibold"
      style={{ background: s.bg, color: s.fg, borderRadius: 999 }}
    >
      <span
        className="text-[9px] font-bold"
        style={{ fontFamily: 'var(--mg-font-mono)', opacity: 0.65, letterSpacing: '0.06em' }}
      >
        {s.kind}
      </span>
      <span style={{ letterSpacing: '-0.005em' }}>{chip.label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="size-5 flex items-center justify-center"
        style={{ borderRadius: 999, opacity: 0.6 }}
      >
        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </button>
    </span>
  )
}

export type SearchSegment = { key: string; label: string; count: number }

export function SearchSegmentTabs({
  active,
  setActive,
  segments,
}: {
  active: string
  setActive: (key: string) => void
  segments: SearchSegment[]
}) {
  return (
    <div
      className="flex items-center gap-1 overflow-x-auto scrollbar-none"
      style={{ borderBottom: '1px solid #ECEFF3' }}
    >
      {segments.map((s) => {
        const isActive = active === s.key
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => setActive(s.key)}
            className="relative flex items-center gap-1.5 h-11 px-4 text-[13px] font-semibold whitespace-nowrap"
            style={{ color: isActive ? '#0A1628' : '#5A6B82' }}
          >
            {s.label}
            <span
              className="text-[10.5px] font-bold px-1.5 h-[16px] inline-flex items-center justify-center"
              style={{
                background: isActive ? '#0B2545' : '#F0F3F7',
                color: isActive ? '#fff' : '#5A6B82',
                borderRadius: 999,
                minWidth: 22,
                fontFamily: 'var(--mg-font-mono)',
              }}
            >
              {s.count}
            </span>
            {isActive && (
              <span
                className="absolute bottom-0 left-3 right-3 h-[3px]"
                style={{ background: '#FF6B2B', borderRadius: '3px 3px 0 0' }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

export function FilterRailGroup({
  title,
  children,
  defaultOpen = true,
}: {
  title: string
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ borderBottom: '1px solid #ECEFF3' }} className="py-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-1"
      >
        <span
          className="text-[11px] font-bold uppercase"
          style={{ color: '#0A1628', letterSpacing: '0.07em' }}
        >
          {title}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#94A3B8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 140ms ease',
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && <div className="mt-2.5 px-1">{children}</div>}
    </div>
  )
}

export function FilterCheck({
  label,
  count,
  checked,
}: {
  label: string
  count: number
  checked?: boolean
}) {
  const [on, setOn] = useState(!!checked)
  return (
    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer">
      <span
        className="size-4 flex items-center justify-center shrink-0"
        style={{
          background: on ? '#0B2545' : '#fff',
          border: on ? 'none' : '1.5px solid #CBD5E1',
          borderRadius: 5,
        }}
      >
        {on && (
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
      </span>
      <span
        onClick={() => setOn(!on)}
        className="text-[13px] flex-1"
        style={{ color: '#0A1628' }}
      >
        {label}
      </span>
      <span
        className="text-[11px]"
        style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
      >
        {count}
      </span>
    </label>
  )
}

export function FilterRange({
  minLabel,
  maxLabel,
  percent,
}: {
  minLabel: string
  maxLabel: string
  percent: [number, number]
}) {
  return (
    <div className="px-1">
      <div
        className="relative h-1.5 my-3"
        style={{ background: '#F0F3F7', borderRadius: 999 }}
      >
        <div
          className="absolute h-full"
          style={{
            left: `${percent[0]}%`,
            right: `${100 - percent[1]}%`,
            background: '#0B2545',
            borderRadius: 999,
          }}
        />
        <div
          className="absolute size-4 -translate-y-1/2 -translate-x-1/2 top-1/2"
          style={{
            left: `${percent[0]}%`,
            background: '#fff',
            borderRadius: 999,
            boxShadow: '0 1px 4px rgba(11,37,69,0.20), 0 0 0 2px #0B2545',
          }}
        />
        <div
          className="absolute size-4 -translate-y-1/2 -translate-x-1/2 top-1/2"
          style={{
            left: `${percent[1]}%`,
            background: '#fff',
            borderRadius: 999,
            boxShadow: '0 1px 4px rgba(11,37,69,0.20), 0 0 0 2px #0B2545',
          }}
        />
      </div>
      <div
        className="flex justify-between text-[12px] font-semibold"
        style={{ color: '#5A6B82', fontFamily: 'var(--mg-font-mono)' }}
      >
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  )
}

export type ResultKind = 'listing' | 'company' | 'person' | 'sos' | 'post'

export function ResultBadge({ kind }: { kind: ResultKind }) {
  const m: Record<ResultKind, { label: string; color: string; bg: string }> = {
    listing: { label: 'LISTING', color: '#0EA5E9', bg: 'rgba(14,165,233,0.10)' },
    company: { label: 'COMPANY', color: '#1877F2', bg: 'rgba(24,119,242,0.10)' },
    person: { label: 'PERSON', color: '#0B2545', bg: 'rgba(11,37,69,0.08)' },
    sos: { label: 'SOS', color: '#FF6B2B', bg: 'rgba(255,107,43,0.12)' },
    post: { label: 'POST', color: '#16A34A', bg: 'rgba(34,197,94,0.10)' },
  }
  const s = m[kind]
  return (
    <span
      className="text-[9.5px] font-bold inline-flex items-center px-1.5 h-[16px]"
      style={{
        background: s.bg,
        color: s.color,
        borderRadius: 4,
        letterSpacing: '0.08em',
        fontFamily: 'var(--mg-font-mono)',
      }}
    >
      {s.label}
    </span>
  )
}

export function MatchBar({ score }: { score: number }) {
  const color = score >= 90 ? '#22C55E' : score >= 80 ? '#0EA5E9' : '#94A3B8'
  return (
    <div className="flex items-center gap-1.5">
      <div
        className="h-1.5 w-10 rounded-full overflow-hidden"
        style={{ background: '#F0F3F7' }}
      >
        <div
          className="h-full"
          style={{ width: `${score}%`, background: color, borderRadius: 999 }}
        />
      </div>
      <span
        className="text-[10.5px] font-bold"
        style={{ color, fontFamily: 'var(--mg-font-mono)' }}
      >
        {score}%
      </span>
    </div>
  )
}

export function Avatar({
  tag,
  color = '#3D9BD6',
  size = 36,
}: {
  tag: string
  color?: string
  size?: number
}) {
  return (
    <div
      className="flex items-center justify-center font-bold shrink-0"
      style={{
        width: size,
        height: size,
        background: color,
        color: '#fff',
        borderRadius: 999,
        fontSize: size * 0.36,
        fontFamily: 'var(--mg-font-display)',
      }}
    >
      {tag}
    </div>
  )
}

export function VerifiedTick({ size = 12 }: { size?: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5 text-[10.5px] font-bold px-1.5 h-[18px]"
      style={{ background: 'rgba(24,119,242,0.10)', color: '#1877F2', borderRadius: 999 }}
    >
      <svg width={size - 2} height={size - 2} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 1l3 4 5-1-1 5 4 3-4 3 1 5-5-1-3 4-3-4-5 1 1-5-4-3 4-3-1-5 5 1z" />
      </svg>
      Verified
    </span>
  )
}
