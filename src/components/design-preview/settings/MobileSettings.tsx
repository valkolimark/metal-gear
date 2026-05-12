'use client'

import { useState, type ReactNode } from 'react'
import {
  CheckIcon,
  ChevronDownIcon,
  PlusIcon,
  XIcon,
} from '../_shared/icons'
import {
  SETTINGS_COMPANY,
  SETTINGS_COMPLETENESS,
  SETTINGS_TEAM_PREVIEW,
  SETTINGS_VERIFY,
  type SettingsCompanyData,
} from './settings-data'

export function MobileSettingsCompany() {
  const [data, setData] = useState<SettingsCompanyData>(SETTINGS_COMPANY)
  function set<K extends keyof SettingsCompanyData>(
    key: K,
    value: SettingsCompanyData[K]
  ) {
    setData((prev) => ({ ...prev, [key]: value }))
  }
  const [open, setOpen] = useState<string | null>('identity')

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
            Settings
          </span>
          <span
            className="text-[14px] font-bold tracking-tight"
            style={{ fontFamily: 'var(--mg-font-display)' }}
          >
            Company
          </span>
        </div>
        <button type="button" className="text-[12px] font-bold" style={{ color: '#FF6B2B' }}>
          Save
        </button>
      </div>

      <div
        className="relative shrink-0"
        style={{ background: data.coverBg, height: 110 }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.18) 0%, transparent 60%)',
          }}
        />
        <button
          type="button"
          className="absolute top-2 right-2 px-2 h-7 text-[10.5px] font-bold inline-flex items-center gap-1"
          style={{
            background: 'rgba(0,0,0,0.40)',
            color: '#fff',
            borderRadius: 999,
            letterSpacing: '0.04em',
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          <svg
            width="10"
            height="10"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" x2="12" y1="3" y2="15" />
          </svg>
          EDIT COVER
        </button>
      </div>
      <div
        className="px-4 -mt-8 relative pb-3 shrink-0"
        style={{ background: '#FFFFFF' }}
      >
        <div
          className="size-[68px] inline-flex items-center justify-center"
          style={{
            background: data.logoBg,
            color: '#fff',
            borderRadius: 14,
            border: '3px solid #fff',
            fontFamily: 'var(--mg-font-display)',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            fontSize: 22,
            boxShadow: '0 4px 12px rgba(11,37,69,0.18)',
          }}
        >
          {data.logoText}
        </div>
        <div className="flex items-center gap-1.5 mt-2.5">
          <div
            className="text-[16px] font-bold tracking-tight"
            style={{ fontFamily: 'var(--mg-font-display)' }}
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
      </div>

      <div className="px-3 pt-3 shrink-0">
        <div
          className="px-3 py-2.5"
          style={{ background: '#0A1628', color: '#fff', borderRadius: 12 }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-bold uppercase"
              style={{
                letterSpacing: '0.10em',
                fontFamily: 'var(--mg-font-mono)',
                color: '#94A3B8',
              }}
            >
              Profile health
            </span>
            <span
              className="text-[11px] font-bold"
              style={{ color: '#86EFAC', fontFamily: 'var(--mg-font-mono)' }}
            >
              {SETTINGS_COMPLETENESS.pct}%
            </span>
          </div>
          <div
            className="relative h-1 mt-2"
            style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 999 }}
          >
            <div
              className="absolute inset-y-0 left-0"
              style={{
                width: `${SETTINGS_COMPLETENESS.pct}%`,
                background:
                  'linear-gradient(90deg, #FF6B2B 0%, #22C55E 100%)',
                borderRadius: 999,
              }}
            />
          </div>
          <div
            className="text-[10.5px] mt-2 inline-flex items-center gap-1"
            style={{ color: '#FF9863', fontFamily: 'var(--mg-font-mono)' }}
          >
            ! 2 steps left · COI + payouts
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2 [&>*]:shrink-0">
        <Acc id="identity" title="Identity" sub="Name, tagline, pitch" open={open} setOpen={setOpen}>
          <MField label="Display name">
            <MInput value={data.name} onChange={(v) => set('name', v)} />
          </MField>
          <MField label="Tagline" counter={`${data.tagline.length}/60`}>
            <MInput value={data.tagline} onChange={(v) => set('tagline', v)} />
          </MField>
          <MField label="Description" counter={`${data.description.length}/600`}>
            <textarea
              value={data.description}
              onChange={(e) => set('description', e.target.value)}
              rows={4}
              style={{
                width: '100%',
                background: '#FBFCFD',
                border: '1px solid #E5E9EF',
                borderRadius: 8,
                padding: '10px 12px',
                fontSize: 13,
                lineHeight: 1.45,
                color: '#0A1628',
                resize: 'vertical',
                outline: 'none',
                fontFamily: 'var(--mg-font-body)',
              }}
            />
          </MField>
        </Acc>

        <Acc
          id="caps"
          title="Capabilities"
          sub={`${data.industries.length} industries · ${data.capabilities.length} services`}
          open={open}
          setOpen={setOpen}
        >
          <MField label="Industries">
            <div className="flex flex-wrap gap-1.5">
              {data.industries.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 h-7 pl-2.5 pr-1.5 text-[11px] font-bold shrink-0"
                  style={{
                    background: 'rgba(24,119,242,0.10)',
                    color: '#1877F2',
                    borderRadius: 999,
                  }}
                >
                  {v}
                  <button
                    type="button"
                    onClick={() =>
                      set(
                        'industries',
                        data.industries.filter((x) => x !== v)
                      )
                    }
                    className="size-4 inline-flex items-center justify-center"
                    style={{ borderRadius: 999, background: 'rgba(0,0,0,0.06)' }}
                  >
                    <XIcon size={9} />
                  </button>
                </span>
              ))}
              <button
                type="button"
                className="inline-flex items-center gap-1 h-7 px-2.5 text-[11px] font-semibold shrink-0"
                style={{
                  background: '#FFFFFF',
                  color: '#5A6B82',
                  borderRadius: 999,
                  border: '1px dashed #CBD5E0',
                }}
              >
                <PlusIcon size={10} /> Add
              </button>
            </div>
          </MField>
          <MField label="Capabilities">
            <div className="flex flex-wrap gap-1.5">
              {data.capabilities.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center h-7 px-2.5 text-[11px] font-bold shrink-0"
                  style={{
                    background: 'rgba(255,107,43,0.10)',
                    color: '#FF6B2B',
                    borderRadius: 999,
                  }}
                >
                  {v}
                </span>
              ))}
            </div>
          </MField>
        </Acc>

        <Acc
          id="service"
          title="Service area"
          sub={`${data.city}, ${data.state} · ${data.serviceRadius} mi`}
          open={open}
          setOpen={setOpen}
        >
          <div className="grid grid-cols-2 gap-2">
            <MField label="City">
              <MInput value={data.city} onChange={(v) => set('city', v)} />
            </MField>
            <MField label="State">
              <MInput value={data.state} onChange={(v) => set('state', v)} />
            </MField>
          </div>
          <MField label={`Service radius — ${data.serviceRadius} mi`}>
            <input
              type="range"
              min={25}
              max={500}
              value={data.serviceRadius}
              onChange={(e) => set('serviceRadius', Number(e.target.value))}
              style={{ width: '100%', accentColor: '#FF6B2B' }}
            />
          </MField>
          <div
            className="flex items-center justify-between text-[11px]"
            style={{ color: '#5A6B82', fontFamily: 'var(--mg-font-mono)' }}
          >
            <span>~ 142 facilities in radius</span>
            <span style={{ color: '#16A34A', fontWeight: 700 }}>+22 vs. last week</span>
          </div>
        </Acc>

        <Acc
          id="contact"
          title="Contact"
          sub={`${data.phone} · ${data.website}`}
          open={open}
          setOpen={setOpen}
        >
          <MField label="Phone">
            <MInput value={data.phone} onChange={(v) => set('phone', v)} mono />
          </MField>
          <MField label="Email">
            <MInput value={data.email} onChange={(v) => set('email', v)} />
          </MField>
          <MField label="Website">
            <MInput
              value={data.website}
              onChange={(v) => set('website', v)}
              prefix="https://"
            />
          </MField>
          <div
            className="flex items-center justify-between gap-3 py-1.5 mt-1 border-t"
            style={{ borderColor: '#F0F3F7' }}
          >
            <div className="flex-1">
              <div className="text-[12px] font-bold" style={{ color: '#0A1628' }}>
                Accept emergency SOS
              </div>
              <div className="text-[10.5px] mt-0.5" style={{ color: '#5A6B82' }}>
                24/7 critical pings
              </div>
            </div>
            <span
              className="relative inline-flex items-center"
              style={{
                width: 36,
                height: 22,
                borderRadius: 999,
                background: '#FF6B2B',
              }}
            >
              <span
                className="absolute size-[18px] rounded-full"
                style={{
                  background: '#fff',
                  left: 16,
                  top: 2,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </span>
          </div>
        </Acc>

        <Acc
          id="verify"
          title="Verification"
          sub="2 of 3 verified"
          badge="!"
          open={open}
          setOpen={setOpen}
        >
          {SETTINGS_VERIFY.map((v) => (
            <div
              key={v.key}
              className="flex items-center gap-2.5 py-2 border-b"
              style={{ borderColor: '#F0F3F7' }}
            >
              <span
                className="size-7 inline-flex items-center justify-center shrink-0"
                style={{
                  background:
                    v.status === 'verified'
                      ? 'rgba(34,197,94,0.10)'
                      : 'rgba(255,107,43,0.10)',
                  color: v.status === 'verified' ? '#16A34A' : '#FF6B2B',
                  borderRadius: 999,
                }}
              >
                {v.status === 'verified' ? (
                  <CheckIcon size={11} />
                ) : (
                  <span style={{ fontWeight: 800 }}>!</span>
                )}
              </span>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold" style={{ color: '#0A1628' }}>
                  {v.label}
                </div>
                <div className="text-[10px] truncate" style={{ color: '#5A6B82' }}>
                  {v.detail}
                </div>
              </div>
              <button
                type="button"
                className="text-[11px] font-bold"
                style={{ color: v.status === 'verified' ? '#5A6B82' : '#FF6B2B' }}
              >
                {v.status === 'verified' ? 'View' : 'Fix'}
              </button>
            </div>
          ))}
        </Acc>

        <Acc
          id="team"
          title="Team"
          sub="6 members · 2 admins"
          open={open}
          setOpen={setOpen}
        >
          {SETTINGS_TEAM_PREVIEW.map((t) => (
            <div
              key={t.name}
              className="flex items-center gap-2.5 py-2 border-b"
              style={{ borderColor: '#F0F3F7' }}
            >
              <div
                className="size-8 inline-flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{
                  background:
                    'linear-gradient(135deg, #0B2545 0%, #1E3A8A 100%)',
                  color: '#fff',
                  borderRadius: 999,
                }}
              >
                {t.init}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] font-bold truncate">{t.name}</div>
                <div className="text-[10px]" style={{ color: '#5A6B82' }}>
                  {t.role}
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="text-[11.5px] font-bold inline-flex items-center gap-1 mt-1"
            style={{ color: '#FF6B2B' }}
          >
            <PlusIcon size={11} /> Invite team member
          </button>
        </Acc>

        <Acc id="danger" title="Danger zone" sub="Pause or delete" open={open} setOpen={setOpen}>
          <button
            type="button"
            className="w-full h-9 text-[12px] font-bold"
            style={{
              background: '#FFFFFF',
              color: '#0A1628',
              border: '1px solid #E5E9EF',
              borderRadius: 999,
            }}
          >
            Pause company profile
          </button>
          <button
            type="button"
            className="w-full h-9 text-[12px] font-bold mt-2"
            style={{
              background: 'rgba(220,38,38,0.08)',
              color: '#DC2626',
              borderRadius: 999,
            }}
          >
            Delete company
          </button>
        </Acc>

        <div className="h-2" />
      </div>

      <div
        className="px-3 py-3 shrink-0"
        style={{
          background: '#0A1628',
          borderTop: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full" style={{ background: '#FF6B2B' }} />
              <span className="text-[11.5px] font-bold" style={{ color: '#fff' }}>
                3 unsaved changes
              </span>
            </div>
            <div
              className="text-[10px] mt-0.5"
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontFamily: 'var(--mg-font-mono)',
              }}
            >
              last saved 4 min ago
            </div>
          </div>
          <button
            type="button"
            className="h-9 px-4 text-[12px] font-bold inline-flex items-center gap-1.5"
            style={{
              background: '#FF6B2B',
              color: '#fff',
              borderRadius: 999,
              boxShadow: '0 4px 12px rgba(255,107,43,0.35)',
            }}
          >
            <CheckIcon size={11} /> Save
          </button>
        </div>
      </div>
    </div>
  )
}

function Acc({
  id,
  title,
  sub,
  badge,
  open,
  setOpen,
  children,
}: {
  id: string
  title: string
  sub: string
  badge?: string
  open: string | null
  setOpen: (id: string | null) => void
  children: ReactNode
}) {
  const isOpen = open === id
  return (
    <div
      className="overflow-hidden"
      style={{ background: '#FFFFFF', borderRadius: 12, border: '1px solid #E5E9EF' }}
    >
      <button
        type="button"
        onClick={() => setOpen(isOpen ? null : id)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-bold" style={{ color: '#0A1628' }}>
              {title}
            </span>
            {badge && (
              <span
                className="text-[9px] font-bold w-4 h-4 inline-flex items-center justify-center"
                style={{
                  background: '#FF6B2B',
                  color: '#fff',
                  borderRadius: 999,
                  fontFamily: 'var(--mg-font-mono)',
                }}
              >
                {badge}
              </span>
            )}
          </div>
          <div className="text-[10.5px] truncate" style={{ color: '#5A6B82' }}>
            {sub}
          </div>
        </div>
        <span
          style={{
            color: '#94A3B8',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
          }}
        >
          <ChevronDownIcon size={13} />
        </span>
      </button>
      {isOpen && (
        <div
          className="px-3 pb-3 flex flex-col gap-2.5 border-t"
          style={{ borderColor: '#F0F3F7' }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function MField({
  label,
  counter,
  children,
}: {
  label: string
  counter?: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1 mt-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold" style={{ color: '#0A1628' }}>
          {label}
        </span>
        {counter && (
          <span
            className="text-[9.5px]"
            style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
          >
            {counter}
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function MInput({
  value,
  onChange,
  prefix,
  mono,
}: {
  value: string
  onChange: (v: string) => void
  prefix?: string
  mono?: boolean
}) {
  return (
    <div
      className="flex items-center"
      style={{
        background: '#FBFCFD',
        border: '1px solid #E5E9EF',
        borderRadius: 8,
      }}
    >
      {prefix && (
        <span
          className="px-2 text-[11.5px] font-bold border-r"
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
        style={{
          flex: 1,
          height: 36,
          padding: '0 12px',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: 13,
          color: '#0A1628',
          fontFamily: mono ? 'var(--mg-font-mono)' : 'var(--mg-font-body)',
        }}
      />
    </div>
  )
}
