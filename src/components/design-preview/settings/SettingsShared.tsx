'use client'

import type { CSSProperties, ReactNode } from 'react'
import { ChevronDownIcon, CheckIcon, XIcon, PlusIcon } from '../_shared/icons'
import {
  SETTINGS_COMPANY,
  SETTINGS_COMPLETENESS,
  SETTINGS_NAV,
  type NavIconKind,
  type SettingsCompanyData,
} from './settings-data'

export function SettingsSidebar({
  active = 'company',
  onPick,
}: {
  active?: string
  onPick?: (key: string) => void
}) {
  return (
    <nav
      className="flex flex-col gap-5 py-5 px-3"
      style={{
        background: '#FFFFFF',
        borderRight: '1px solid #E5E9EF',
        height: '100%',
      }}
    >
      <div className="px-3">
        <div
          className="text-[10.5px] font-bold uppercase mb-1"
          style={{
            color: '#94A3B8',
            letterSpacing: '0.10em',
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          Settings
        </div>
        <div
          className="text-[15px] font-bold tracking-tight"
          style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
        >
          NRM Equipment
        </div>
      </div>
      {SETTINGS_NAV.map((g) => (
        <div key={g.group}>
          <div
            className="px-3 mb-1.5 text-[9.5px] font-bold uppercase"
            style={{
              color: '#94A3B8',
              letterSpacing: '0.12em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            {g.group}
          </div>
          <div className="flex flex-col gap-0.5">
            {g.items.map((it) => {
              const on = it.key === active
              return (
                <button
                  key={it.key}
                  type="button"
                  onClick={() => onPick?.(it.key)}
                  className="flex items-center gap-2.5 px-3 h-9 text-left"
                  style={{
                    background: on ? '#F0F3F7' : 'transparent',
                    color: on ? '#0A1628' : '#5A6B82',
                    borderRadius: 8,
                    boxShadow: on ? 'inset 3px 0 0 #FF6B2B' : 'none',
                  }}
                >
                  <NavIcon kind={it.icon} />
                  <span
                    className="flex-1 text-[12.5px]"
                    style={{ fontWeight: on ? 700 : 500 }}
                  >
                    {it.label}
                  </span>
                  {it.count != null && (
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
                    >
                      {it.count}
                    </span>
                  )}
                  {it.badge && (
                    <span
                      className="text-[9px] font-bold px-1.5 h-[16px] inline-flex items-center"
                      style={{
                        background: '#FFF4ED',
                        color: '#FF6B2B',
                        borderRadius: 999,
                        letterSpacing: '0.06em',
                        fontFamily: 'var(--mg-font-mono)',
                      }}
                    >
                      {it.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function NavIcon({ kind }: { kind: NavIconKind }) {
  const p = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2.2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  switch (kind) {
    case 'building':
      return (
        <svg {...p}>
          <rect width="16" height="20" x="4" y="2" rx="2" />
          <path d="M9 22v-4h6v4" />
          <path d="M8 6h.01" />
          <path d="M16 6h.01" />
          <path d="M12 6h.01" />
          <path d="M12 10h.01" />
          <path d="M12 14h.01" />
          <path d="M16 10h.01" />
          <path d="M16 14h.01" />
          <path d="M8 10h.01" />
          <path d="M8 14h.01" />
        </svg>
      )
    case 'user':
      return (
        <svg {...p}>
          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      )
    case 'users':
      return (
        <svg {...p}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      )
    case 'shield':
      return (
        <svg {...p}>
          <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
        </svg>
      )
    case 'tag':
      return (
        <svg {...p}>
          <path d="M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z" />
          <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor" />
        </svg>
      )
    case 'map':
      return (
        <svg {...p}>
          <path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" />
          <path d="M9 3v15" />
          <path d="M15 6v15" />
        </svg>
      )
    case 'card':
    case 'credit':
      return (
        <svg {...p}>
          <rect width="20" height="14" x="2" y="5" rx="2" />
          <line x1="2" x2="22" y1="10" y2="10" />
        </svg>
      )
    case 'siren':
      return (
        <svg {...p}>
          <path d="M7 18v-6a5 5 0 1 1 10 0v6" />
          <path d="M5 21a1 1 0 0 0 1-1v-3h12v3a1 1 0 0 0 1 1z" />
        </svg>
      )
    case 'bell':
      return (
        <svg {...p}>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      )
    case 'plug':
      return (
        <svg {...p}>
          <path d="M12 22v-5" />
          <path d="M9 7V2" />
          <path d="M15 7V2" />
          <path d="M6 13V8h12v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4Z" />
        </svg>
      )
    case 'lock':
      return (
        <svg {...p}>
          <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      )
    case 'download':
      return (
        <svg {...p}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" x2="12" y1="15" y2="3" />
        </svg>
      )
  }
}

export function SettingsSection({
  title,
  sub,
  icon,
  action,
  children,
  anchor,
}: {
  title: string
  sub?: string
  icon?: ReactNode
  action?: ReactNode
  children: ReactNode
  anchor?: string
}) {
  return (
    <section
      id={anchor}
      className="overflow-hidden shrink-0"
      style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E9EF' }}
    >
      <header
        className="flex items-start justify-between gap-3 px-5 py-4"
        style={{ borderBottom: '1px solid #F0F3F7' }}
      >
        <div className="flex items-start gap-3">
          {icon && (
            <div
              className="size-9 inline-flex items-center justify-center shrink-0 mt-0.5"
              style={{ background: '#FFF4ED', color: '#FF6B2B', borderRadius: 10 }}
            >
              {icon}
            </div>
          )}
          <div>
            <div
              className="text-[14.5px] font-bold tracking-tight"
              style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
            >
              {title}
            </div>
            {sub && (
              <div className="text-[11.5px] mt-0.5" style={{ color: '#5A6B82' }}>
                {sub}
              </div>
            )}
          </div>
        </div>
        {action}
      </header>
      <div className="p-5 flex flex-col gap-4">{children}</div>
    </section>
  )
}

export function Field({
  label,
  hint,
  required,
  error,
  children,
  span = 'full',
  counter,
}: {
  label: string
  hint?: string
  required?: boolean
  error?: string
  children: ReactNode
  span?: 'half' | 'full'
  counter?: string
}) {
  return (
    <div
      className="flex flex-col gap-1.5"
      style={{ gridColumn: span === 'half' ? 'span 1' : 'span 2' }}
    >
      <div className="flex items-center justify-between">
        <label
          className="text-[11.5px] font-bold inline-flex items-center gap-1"
          style={{ color: '#0A1628' }}
        >
          {label}
          {required && <span style={{ color: '#FF6B2B' }}>*</span>}
        </label>
        {counter && (
          <span
            className="text-[10.5px]"
            style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
          >
            {counter}
          </span>
        )}
      </div>
      {children}
      {hint && !error && (
        <div className="text-[10.5px]" style={{ color: '#94A3B8' }}>
          {hint}
        </div>
      )}
      {error && (
        <div
          className="text-[10.5px] inline-flex items-center gap-1"
          style={{ color: '#DC2626', fontFamily: 'var(--mg-font-mono)' }}
        >
          ! {error}
        </div>
      )}
    </div>
  )
}

const inputBase: CSSProperties = {
  width: '100%',
  background: '#FFFFFF',
  color: '#0A1628',
  border: '1px solid #E5E9EF',
  borderRadius: 8,
  height: 38,
  padding: '0 12px',
  fontSize: 13.5,
  fontFamily: 'var(--mg-font-body)',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
}

export function TextInput({
  value,
  onChange,
  placeholder,
  prefix,
  suffix,
  mono,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  prefix?: string
  suffix?: string
  mono?: boolean
}) {
  return (
    <div className="relative flex items-center" style={{ ...inputBase, padding: 0, height: 38 }}>
      {prefix && (
        <span
          className="px-3 text-[12px] font-bold border-r"
          style={{
            color: '#94A3B8',
            borderColor: '#E5E9EF',
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          {prefix}
        </span>
      )}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          height: 36,
          padding: '0 12px',
          background: 'transparent',
          outline: 'none',
          border: 'none',
          fontSize: 13.5,
          color: '#0A1628',
          fontFamily: mono ? 'var(--mg-font-mono)' : 'var(--mg-font-body)',
        }}
      />
      {suffix && (
        <span
          className="px-3 text-[12px] font-bold border-l"
          style={{
            color: '#94A3B8',
            borderColor: '#E5E9EF',
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          {suffix}
        </span>
      )}
    </div>
  )
}

export function TextArea({
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      style={{
        ...inputBase,
        height: 'auto',
        padding: '10px 12px',
        resize: 'vertical',
        lineHeight: 1.5,
      }}
    />
  )
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputBase, paddingRight: 32, appearance: 'none', cursor: 'pointer' }}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span
        className="absolute pointer-events-none"
        style={{ right: 12, top: 13, color: '#5A6B82' }}
      >
        <ChevronDownIcon size={12} />
      </span>
    </div>
  )
}

export function TagPicker({
  values = [],
  onChange,
  options,
  color = '#FF6B2B',
}: {
  values?: string[]
  onChange: (v: string[]) => void
  options: string[]
  color?: string
}) {
  const remaining = options.filter((o) => !values.includes(o))
  return (
    <div className="flex flex-col gap-2">
      <div
        className="flex flex-wrap gap-1.5 p-2 min-h-[44px]"
        style={{
          background: '#FBFCFD',
          border: '1px solid #E5E9EF',
          borderRadius: 8,
        }}
      >
        {values.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1.5 text-[11.5px] font-bold shrink-0"
            style={{ background: `${color}1A`, color, borderRadius: 999 }}
          >
            {v}
            <button
              type="button"
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="size-4 inline-flex items-center justify-center"
              style={{ borderRadius: 999, background: 'rgba(0,0,0,0.06)' }}
            >
              <XIcon size={9} />
            </button>
          </span>
        ))}
        {values.length === 0 && (
          <span className="text-[12px] py-1.5 px-1" style={{ color: '#94A3B8' }}>
            None selected
          </span>
        )}
      </div>
      {remaining.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {remaining.slice(0, 8).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => onChange([...values, o])}
              className="inline-flex items-center gap-1 h-7 px-2.5 text-[11.5px] font-semibold shrink-0"
              style={{
                background: '#FFFFFF',
                color: '#5A6B82',
                borderRadius: 999,
                border: '1px dashed #CBD5E0',
              }}
            >
              <PlusIcon size={10} /> {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ToggleRow({
  label,
  sub,
  value,
  onChange,
  accent = '#22C55E',
}: {
  label: string
  sub?: string
  value: boolean
  onChange?: (v: boolean) => void
  accent?: string
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <div className="flex-1">
        <div className="text-[12.5px] font-bold" style={{ color: '#0A1628' }}>
          {label}
        </div>
        {sub && (
          <div className="text-[11px] mt-0.5" style={{ color: '#5A6B82' }}>
            {sub}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange?.(!value)}
        className="relative inline-flex items-center shrink-0"
        style={{
          width: 38,
          height: 22,
          borderRadius: 999,
          background: value ? accent : '#CBD5E0',
          transition: 'background 0.15s',
        }}
      >
        <span
          className="absolute size-[18px] rounded-full"
          style={{
            background: '#fff',
            left: value ? 18 : 2,
            top: 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'left 0.15s',
          }}
        />
      </button>
    </div>
  )
}

export function CompletenessCard() {
  const c = SETTINGS_COMPLETENESS
  return (
    <div
      className="overflow-hidden shrink-0"
      style={{ background: '#0A1628', borderRadius: 14, color: '#fff' }}
    >
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span
            className="text-[10.5px] font-bold uppercase"
            style={{
              letterSpacing: '0.10em',
              fontFamily: 'var(--mg-font-mono)',
              color: '#94A3B8',
            }}
          >
            Profile health
          </span>
          <span
            className="text-[10.5px] font-bold"
            style={{ color: '#86EFAC', fontFamily: 'var(--mg-font-mono)' }}
          >
            {c.pct}%
          </span>
        </div>
        <div
          className="text-[20px] font-bold leading-tight tracking-tight"
          style={{ fontFamily: 'var(--mg-font-display)' }}
        >
          You&apos;re <span style={{ color: '#86EFAC' }}>almost there</span>
        </div>
        <div className="text-[11.5px] mt-1" style={{ color: '#94A3B8' }}>
          2 steps left to unlock buyer trust badges and SOS payouts.
        </div>
        <div
          className="relative h-1.5 mt-3 mb-3"
          style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 999 }}
        >
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${c.pct}%`,
              background: 'linear-gradient(90deg, #FF6B2B 0%, #22C55E 100%)',
              borderRadius: 999,
            }}
          />
        </div>
        <div className="flex flex-col gap-1.5 mt-3">
          {c.steps.map((s) => (
            <div
              key={s.key}
              className="flex items-center gap-2.5 py-1.5 px-2.5 -mx-2.5"
              style={{
                borderRadius: 8,
                background: !s.done ? 'rgba(255,107,43,0.10)' : 'transparent',
              }}
            >
              <span
                className="size-4 inline-flex items-center justify-center shrink-0 rounded-full"
                style={{
                  background: s.done ? '#22C55E' : 'rgba(255,255,255,0.10)',
                  color: '#fff',
                  border: s.done ? 'none' : '1.5px dashed rgba(255,255,255,0.35)',
                }}
              >
                {s.done && <CheckIcon size={9} />}
              </span>
              <div className="flex-1 min-w-0">
                <div
                  className="text-[11.5px] font-bold"
                  style={{ color: s.done ? 'rgba(255,255,255,0.85)' : '#fff' }}
                >
                  {s.label}
                </div>
                <div
                  className="text-[10px]"
                  style={{
                    color: 'rgba(255,255,255,0.55)',
                    fontFamily: 'var(--mg-font-mono)',
                  }}
                >
                  {s.hint}
                </div>
              </div>
              {!s.done && s.cta && (
                <button
                  type="button"
                  className="text-[10.5px] font-bold whitespace-nowrap"
                  style={{ color: '#FF9863' }}
                >
                  {s.cta} →
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SaveBar({
  dirty = true,
  lastSaved = '4 min ago',
}: {
  dirty?: boolean
  lastSaved?: string
}) {
  return (
    <div
      className="sticky bottom-0 z-30 flex items-center justify-between gap-3 px-5 py-3 shrink-0"
      style={{
        background: dirty ? '#0A1628' : '#FFFFFF',
        color: dirty ? '#FFFFFF' : '#0A1628',
        borderTop: dirty ? '1px solid rgba(255,255,255,0.10)' : '1px solid #E5E9EF',
        boxShadow: dirty ? '0 -8px 24px rgba(11,37,69,0.18)' : 'none',
        borderRadius: 14,
      }}
    >
      <div className="flex items-center gap-2.5">
        {dirty ? (
          <>
            <span
              className="size-2 rounded-full"
              style={{
                background: '#FF6B2B',
                boxShadow: '0 0 0 4px rgba(255,107,43,0.20)',
              }}
            />
            <span className="text-[12.5px] font-bold">3 unsaved changes</span>
            <span
              className="text-[10.5px]"
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontFamily: 'var(--mg-font-mono)',
              }}
            >
              · last saved {lastSaved}
            </span>
          </>
        ) : (
          <>
            <CheckIcon size={14} style={{ color: '#22C55E' }} />
            <span className="text-[12.5px] font-bold">All changes saved</span>
            <span
              className="text-[10.5px]"
              style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
            >
              · {lastSaved}
            </span>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="h-9 px-3.5 text-[12.5px] font-bold"
          style={{
            background: 'transparent',
            color: dirty ? 'rgba(255,255,255,0.85)' : '#5A6B82',
            borderRadius: 999,
            border: dirty
              ? '1px solid rgba(255,255,255,0.20)'
              : '1px solid #E5E9EF',
          }}
        >
          Discard
        </button>
        <button
          type="button"
          className="h-9 px-4 text-[12.5px] font-bold inline-flex items-center gap-1.5"
          style={{
            background: '#FF6B2B',
            color: '#fff',
            borderRadius: 999,
            boxShadow: '0 4px 12px rgba(255,107,43,0.35)',
          }}
        >
          <CheckIcon size={12} /> Save changes
        </button>
      </div>
    </div>
  )
}

export function LivePreview({ data = SETTINGS_COMPANY }: { data?: SettingsCompanyData }) {
  return (
    <div
      className="overflow-hidden shrink-0"
      style={{ background: '#FFFFFF', borderRadius: 14, border: '1px solid #E5E9EF' }}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5"
        style={{ borderBottom: '1px solid #F0F3F7' }}
      >
        <div className="flex items-center gap-2">
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: '#5A6B82' }}
          >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span
            className="text-[10.5px] font-bold uppercase"
            style={{
              color: '#5A6B82',
              letterSpacing: '0.08em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            Buyer preview
          </span>
        </div>
        <button type="button" className="text-[10.5px] font-bold" style={{ color: '#FF6B2B' }}>
          Open profile →
        </button>
      </div>
      <div className="relative h-24" style={{ background: data.coverBg }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 70% 40%, rgba(255,255,255,0.18) 0%, transparent 60%)',
          }}
        />
      </div>
      <div className="px-4 pb-4 -mt-8 relative">
        <div
          className="size-16 inline-flex items-center justify-center"
          style={{
            background: data.logoBg,
            color: '#fff',
            borderRadius: 14,
            border: '3px solid #fff',
            fontFamily: 'var(--mg-font-display)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            fontSize: 18,
            boxShadow: '0 4px 12px rgba(11,37,69,0.18)',
          }}
        >
          {data.logoText}
        </div>
        <div className="flex items-center gap-1.5 mt-2.5">
          <div
            className="text-[15px] font-bold tracking-tight"
            style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
          >
            {data.name}
          </div>
          <span
            className="size-4 inline-flex items-center justify-center"
            style={{ background: '#1877F2', color: '#fff', borderRadius: 999 }}
          >
            <CheckIcon size={9} />
          </span>
        </div>
        <div className="text-[11.5px]" style={{ color: '#5A6B82' }}>
          {data.tagline}
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          {data.industries.slice(0, 3).map((i) => (
            <span
              key={i}
              className="text-[9.5px] font-bold uppercase px-1.5 h-[16px] inline-flex items-center"
              style={{
                background: '#F0F3F7',
                color: '#5A6B82',
                borderRadius: 4,
                letterSpacing: '0.06em',
                fontFamily: 'var(--mg-font-mono)',
              }}
            >
              {i}
            </span>
          ))}
        </div>
        <div
          className="grid grid-cols-3 gap-2 mt-3 pt-3"
          style={{ borderTop: '1px solid #F0F3F7' }}
        >
          <PreviewStat label="Since" value={data.founded} />
          <PreviewStat label="Radius" value={`${data.serviceRadius} mi`} />
          <PreviewStat label="Rating" value="4.9 ★" />
        </div>
      </div>
    </div>
  )
}

function PreviewStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
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
        className="text-[13px] font-bold"
        style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
      >
        {value}
      </span>
    </div>
  )
}
