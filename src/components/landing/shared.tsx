// Cycle 67 — shared primitives for the cinematic landing surface.
// Used by both desktop and mobile layouts. All visual values lifted from the
// design handoff (`design_handoff_homepage/components/LandingShared.jsx`).

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { ArrowRightThin, CornerBrackets } from './icons'
import type { LandingFeaturedShop, LandingStat, LandingTickerItem } from './types'

// ─── CSS-var style helper ─────────────────────────────────────────────

type CSSVarStyle = CSSProperties & Record<`--${string}`, string>

// ─── Caution stripe rule ──────────────────────────────────────────────

export function CautionStripe({ height = 6 }: { height?: number }) {
  return (
    <div
      style={{
        height,
        backgroundImage:
          'repeating-linear-gradient(135deg, #FFB800 0 16px, #0A0F19 16px 28px)',
      }}
    />
  )
}

// ─── Mono spec readout ────────────────────────────────────────────────

export function Spec({
  label,
  value,
  color = 'var(--mg-accent)',
}: {
  label: string
  value: string | number
  color?: string
}) {
  return (
    <div className="flex flex-col">
      <span
        className="text-[9.5px] font-bold uppercase"
        style={{
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.16em',
          fontFamily: 'var(--mg-font-mono)',
        }}
      >
        {label}
      </span>
      <span
        className="text-[13px] font-bold"
        style={{ color, fontFamily: 'var(--mg-font-mono)', letterSpacing: '0.04em' }}
      >
        {value}
      </span>
    </div>
  )
}

// ─── Stencil label ────────────────────────────────────────────────────

export function StencilLabel({
  children,
  color = 'var(--mg-accent)',
}: {
  children: React.ReactNode
  color?: string
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 h-[22px] text-[10px] font-bold uppercase"
      style={{
        background: 'rgba(0,0,0,0.55)',
        color,
        // The design layers a 33% alpha border via `${color}55`. When `color`
        // is a CSS variable that won't compose, so we use a transparent
        // outline + nested pseudo solid via boxShadow inset for reliability.
        border: `1px solid ${color === 'var(--mg-accent)' ? 'rgb(var(--mg-accent-rgb) / 0.33)' : color}`,
        borderRadius: 3,
        letterSpacing: '0.14em',
        fontFamily: 'var(--mg-font-mono)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <span className="size-1.5" style={{ background: color, borderRadius: 1 }} />
      {children}
    </span>
  )
}

// ─── Live ticker row ──────────────────────────────────────────────────

export function TickerRow({ t }: { t: LandingTickerItem }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
    >
      <span
        className="text-[10px] font-bold uppercase shrink-0 w-[68px]"
        style={{
          color: t.color,
          letterSpacing: '0.10em',
          fontFamily: 'var(--mg-font-mono)',
        }}
      >
        {t.tag}
      </span>
      <span
        className="text-[12px] flex-1 min-w-0 truncate"
        style={{ color: 'rgba(255,255,255,0.86)' }}
      >
        {t.text}
      </span>
      <span
        className="text-[9.5px] font-bold uppercase px-1.5 h-[18px] inline-flex items-center shrink-0"
        style={{
          background: t.color + '22',
          color: t.color,
          border: `1px solid ${t.color}40`,
          borderRadius: 3,
          letterSpacing: '0.10em',
          fontFamily: 'var(--mg-font-mono)',
        }}
      >
        {t.status}
      </span>
      <span
        className="text-[10px] shrink-0 w-[80px] text-right"
        style={{ color: 'rgba(255,255,255,0.40)', fontFamily: 'var(--mg-font-mono)' }}
      >
        {t.when}
      </span>
    </div>
  )
}

// ─── Stats strip (4-up grid) ──────────────────────────────────────────

export function StatsStrip({
  items,
  dense = false,
}: {
  items: LandingStat[]
  dense?: boolean
}) {
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${items.length}, 1fr)`,
        gap: 1,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {items.map((s, i) => (
        <div
          key={i}
          className="flex flex-col"
          style={{ background: '#0A0F19', padding: dense ? '14px 16px' : '22px 24px' }}
        >
          <span
            className="text-[10px] font-bold uppercase"
            style={{
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '0.14em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            {s.label}
          </span>
          <span
            className={`${dense ? 'text-[24px]' : 'text-[36px]'} font-bold mt-1`}
            style={{
              color: '#fff',
              fontFamily: 'var(--mg-font-display)',
              letterSpacing: '-0.03em',
              lineHeight: 1,
            }}
          >
            {s.value}
          </span>
          <span
            className="text-[10.5px] mt-1"
            style={{ color: 'rgba(255,255,255,0.50)', fontFamily: 'var(--mg-font-mono)' }}
          >
            {s.sub}
          </span>
        </div>
      ))}
    </div>
  )
}

// ─── Featured shop card ───────────────────────────────────────────────

export function FeaturedShopCard({ shop }: { shop: LandingFeaturedShop }) {
  return (
    <Link
      href={shop.href}
      className="relative overflow-hidden flex flex-col transition-all hover:-translate-y-0.5"
      style={{
        background: '#0F1623',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 6,
      }}
    >
      <div className="relative" style={{ height: 160, background: shop.bg }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.16) 0%, transparent 65%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(255,255,255,0.045) 0 1px, transparent 1px 18px)',
          }}
        />
        <CornerBrackets />
        <div className="absolute top-2.5 left-2.5">
          <StencilLabel color="#FFB800">VERIFIED REBUILDER</StencilLabel>
        </div>
        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-2">
          <div
            className="size-12 inline-flex items-center justify-center font-bold text-[15px]"
            style={{
              background: shop.color,
              color: '#fff',
              borderRadius: 8,
              border: '2px solid rgba(255,255,255,0.20)',
              fontFamily: 'var(--mg-font-display)',
              letterSpacing: '-0.02em',
            }}
          >
            {shop.tag}
          </div>
          <div>
            <div
              className="text-[14px] font-bold leading-tight"
              style={{
                color: '#fff',
                fontFamily: 'var(--mg-font-display)',
                textShadow: '0 1px 3px rgba(0,0,0,0.6)',
              }}
            >
              {shop.name}
            </div>
            <div
              className="text-[10.5px]"
              style={{
                color: 'rgba(255,255,255,0.78)',
                fontFamily: 'var(--mg-font-mono)',
              }}
            >
              {shop.city}
            </div>
          </div>
        </div>
      </div>
      <div className="px-4 py-3.5">
        <div className="text-[12px] font-bold" style={{ color: '#fff' }}>
          {shop.specialty}
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <Spec label="Rating" value={shop.rating != null ? `${shop.rating.toFixed(1)}★` : '—'} />
          <Spec label="Jobs" value={shop.jobs > 0 ? shop.jobs.toLocaleString() : '—'} color="#fff" />
          <Spec label="Resp" value={shop.response ?? '—'} color="#22C55E" />
        </div>
      </div>
    </Link>
  )
}

// ─── Section header ───────────────────────────────────────────────────

export function SectionHead({
  kicker,
  title,
  sub,
  align = 'left',
}: {
  kicker?: string
  title: string
  sub?: string
  align?: 'left' | 'center'
}) {
  return (
    <div className={align === 'center' ? 'text-center max-w-[680px] mx-auto' : 'max-w-[680px]'}>
      {kicker && (
        <div
          className={`inline-flex items-center gap-2 mb-3 ${align === 'center' ? 'justify-center' : ''}`}
        >
          <span className="size-1.5" style={{ background: 'var(--mg-accent)' }} />
          <span
            className="text-[10.5px] font-bold uppercase"
            style={{
              color: 'var(--mg-accent)',
              letterSpacing: '0.20em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            {kicker}
          </span>
        </div>
      )}
      <h2
        className="font-bold tracking-tight"
        style={{
          color: '#fff',
          fontFamily: 'var(--mg-font-display)',
          fontSize: 44,
          lineHeight: 1.05,
          letterSpacing: '-0.025em',
        }}
      >
        {title}
      </h2>
      {sub && (
        <p
          className="text-[15px] mt-3"
          style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.55 }}
        >
          {sub}
        </p>
      )}
    </div>
  )
}

// ─── Landing nav (desktop) ────────────────────────────────────────────

export function LandingNav() {
  return (
    <div className="flex items-center justify-between px-7 py-4 relative z-10">
      <Link href="/" className="flex items-center gap-2.5">
        <div
          className="size-9 inline-flex items-center justify-center font-bold text-[14px]"
          style={{
            background: 'var(--mg-accent)',
            color: '#0A0F19',
            borderRadius: 8,
            fontFamily: 'var(--mg-font-display)',
          }}
        >
          MG
        </div>
        <div className="leading-tight">
          <div
            className="text-[14px] font-bold tracking-tight"
            style={{ color: '#fff', fontFamily: 'var(--mg-font-display)' }}
          >
            METAL GEAR
          </div>
          <div
            className="text-[9.5px] font-bold uppercase"
            style={{
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '0.18em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            BUILT BY SHOPS
          </div>
        </div>
      </Link>
      <nav className="flex items-center gap-1">
        <NavLink href="/sellers">Find a shop</NavLink>
        <NavLink href="/sos/create" emphasis>
          Send SOS
        </NavLink>
        <NavLink href="/listings/new">Sell</NavLink>
        <NavLink href="/pricing">Pricing</NavLink>
      </nav>
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="h-9 px-3 inline-flex items-center text-[12.5px] font-semibold"
          style={{ color: 'rgba(255,255,255,0.78)' }}
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="h-9 px-4 inline-flex items-center gap-1.5 text-[12.5px] font-bold"
          style={
            {
              background: 'var(--mg-accent)',
              color: '#0A0F19',
              borderRadius: 999,
              boxShadow: '0 4px 16px rgb(var(--mg-accent-rgb) / 0.40)',
            } satisfies CSSVarStyle
          }
        >
          Join free <span style={{ fontFamily: 'var(--mg-font-mono)' }}>→</span>
        </Link>
      </div>
    </div>
  )
}

function NavLink({
  href,
  children,
  emphasis,
}: {
  href: string
  children: React.ReactNode
  emphasis?: boolean
}) {
  return (
    <Link
      href={href}
      className="h-9 px-3 inline-flex items-center text-[12.5px] font-semibold"
      style={{ color: emphasis ? 'var(--mg-accent)' : 'rgba(255,255,255,0.78)' }}
    >
      {children}
    </Link>
  )
}

// ─── Audience chip (desktop hero) ─────────────────────────────────────

export function AudienceChip({
  kicker,
  title,
  sub,
  color,
  href,
}: {
  kicker: string
  title: string
  sub: string
  color: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="px-5 py-4 relative overflow-hidden block transition-colors hover:bg-white/[0.07]"
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.10)',
        borderRadius: 6,
        backdropFilter: 'blur(12px)',
      }}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: color }} />
      <div
        className="text-[10px] font-bold uppercase"
        style={{ color, letterSpacing: '0.16em', fontFamily: 'var(--mg-font-mono)' }}
      >
        {kicker}
      </div>
      <div
        className="text-[15px] font-bold mt-1"
        style={{
          color: '#fff',
          fontFamily: 'var(--mg-font-display)',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </div>
      <div className="text-[12px] mt-1" style={{ color: 'rgba(255,255,255,0.62)', lineHeight: 1.45 }}>
        {sub}
      </div>
    </Link>
  )
}

// ─── Landing footer (minimal, monospace links) ────────────────────────

export function LandingFooter() {
  const links: Array<{ label: string; href: string }> = [
    { label: 'Find a shop', href: '/sellers' },
    { label: 'Send SOS', href: '/sos/create' },
    { label: 'Sell', href: '/listings/new' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'About', href: '/about' },
    { label: 'Terms', href: '/terms' },
    { label: 'Privacy', href: '/privacy' },
  ]
  return (
    <>
      <CautionStripe height={4} />
      <footer
        className="px-7 py-7 flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
        style={{
          background: '#06090F',
          borderTop: '1px solid rgba(255,255,255,0.04)',
        }}
      >
        <Link href="/" className="flex items-center gap-2.5">
          <div
            className="size-8 inline-flex items-center justify-center font-bold text-[12px]"
            style={{
              background: 'var(--mg-accent)',
              color: '#0A0F19',
              borderRadius: 6,
              fontFamily: 'var(--mg-font-display)',
            }}
          >
            MG
          </div>
          <div className="leading-tight">
            <div
              className="text-[12px] font-bold tracking-tight"
              style={{ color: '#fff', fontFamily: 'var(--mg-font-display)' }}
            >
              METAL GEAR
            </div>
            <div
              className="text-[9px] font-bold uppercase"
              style={{
                color: 'rgba(255,255,255,0.40)',
                letterSpacing: '0.18em',
                fontFamily: 'var(--mg-font-mono)',
              }}
            >
              EST. 2026 · BUILT BY SHOPS
            </div>
          </div>
        </Link>
        <nav className="flex items-center gap-5 flex-wrap">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[11.5px] font-semibold transition-colors hover:text-white"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </footer>
    </>
  )
}

// ─── Trailing arrow link (e.g. "BROWSE ALL 4,287 →") ─────────────────

export function MonoLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-[12px] font-bold inline-flex items-center gap-1.5 shrink-0 transition-opacity hover:opacity-80"
      style={{
        color: 'var(--mg-accent)',
        fontFamily: 'var(--mg-font-mono)',
        letterSpacing: '0.06em',
      }}
    >
      {children}
      <ArrowRightThin size={12} />
    </Link>
  )
}
