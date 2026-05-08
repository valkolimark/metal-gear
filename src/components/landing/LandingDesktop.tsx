// Cycle 67 — desktop cinematic landing layout.
// Mounted from `src/app/page.tsx` for viewports ≥ md. Mobile users see
// `LandingMobile.tsx`. Visual values lifted from the design handoff
// (`design_handoff_homepage/components/LandingDesktop.jsx`).

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { LANDING_TESTIMONIAL } from './data'
import { SirenIcon, CornerBrackets } from './icons'
import {
  AudienceChip,
  FeaturedShopCard,
  LandingFooter,
  LandingNav,
  MonoLink,
  SectionHead,
  StatsStrip,
  StencilLabel,
  TickerRow,
} from './shared'
import type {
  LandingFeaturedShop,
  LandingNetworkSummary,
  LandingStat,
  LandingTickerItem,
} from './types'

interface LandingDesktopProps {
  network: LandingNetworkSummary
  ticker: LandingTickerItem[]
  featured: LandingFeaturedShop[]
  stats: LandingStat[]
}

export function LandingDesktop(props: LandingDesktopProps) {
  return (
    <div
      className="hidden md:block w-full"
      style={{
        background: '#0A0F19',
        fontFamily: 'var(--mg-font-body)',
        color: '#fff',
        overflow: 'hidden',
      }}
    >
      <CinematicHero {...props} />
      <SOSFeatureSection />
      <FeaturedShopsSection featured={props.featured} totalShops={props.network.rebuilders} />
      <StatsSection stats={props.stats} />
      <ClosingCTA />
      <LandingFooter />
    </div>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────

function CinematicHero({ network, ticker }: LandingDesktopProps) {
  // The headline status pill keeps a numeric anchor — falls back to "47" only
  // when we have at least one company in the data, otherwise reads "online."
  const statusPillCopy = `NETWORK ONLINE · ${network.states} STATES · ${network.rebuilders.toLocaleString()} REBUILDERS`

  return (
    <div className="relative" style={{ minHeight: 820 }}>
      <LandingNav />

      {/* Background photo plate */}
      <div className="absolute inset-x-0" style={{ top: 76, bottom: 0 }}>
        <div
          className="relative w-full h-full overflow-hidden"
          style={{
            backgroundImage:
              "linear-gradient(135deg, rgba(6,9,15,0.45) 0%, rgba(11,26,46,0.30) 50%, rgba(31,91,184,0.25) 100%), url('/landing/hero-rotor.webp')",
            backgroundSize: 'cover',
            backgroundPosition: 'center right',
          }}
        >
          {/* Left scrim — headline legibility */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, rgba(6,9,15,0.92) 0%, rgba(6,9,15,0.78) 28%, rgba(6,9,15,0.40) 52%, transparent 78%)',
            }}
          />
          {/* Cobalt color grade */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 70% 45%, rgb(var(--mg-accent-rgb) / 0.22) 0%, transparent 55%)',
              mixBlendMode: 'screen',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 25% 85%, rgba(11,26,46,0.65) 0%, transparent 55%)',
            }}
          />
          {/* Hatching */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 24px)',
            }}
          />
          {/* Top + bottom vignette */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(6,9,15,0.55) 0%, transparent 22%, transparent 65%, rgba(6,9,15,0.92) 100%)',
            }}
          />
          {/* Big stencil "03" */}
          <div
            className="absolute select-none pointer-events-none"
            style={{
              right: 60,
              top: 80,
              fontFamily: 'var(--mg-font-display)',
              fontSize: 380,
              fontWeight: 800,
              color: 'rgba(255,255,255,0.06)',
              letterSpacing: '-0.06em',
              lineHeight: 0.85,
              mixBlendMode: 'overlay',
            }}
          >
            03
          </div>
          <CornerBrackets color="rgba(255,255,255,0.22)" size={28} inset={28} />

          {/* Photo callout — bottom-right */}
          <div className="absolute" style={{ right: 40, bottom: 120 }}>
            <div className="flex flex-col items-end gap-1.5">
              <StencilLabel>REBUILD BAY · TURBINE ROTOR</StencilLabel>
              <span
                className="text-[10px] font-bold"
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontFamily: 'var(--mg-font-mono)',
                  letterSpacing: '0.06em',
                  textShadow: '0 1px 3px rgba(0,0,0,0.7)',
                }}
              >
                BAYOU INDUSTRIAL · BAY 03 · 18:42 CT
              </span>
            </div>
          </div>

          {/* Crosshair / spec annotation */}
          <svg
            className="absolute"
            width="220"
            height="120"
            viewBox="0 0 220 120"
            style={{ right: 280, top: 140, opacity: 0.85 }}
            aria-hidden="true"
          >
            <circle cx="20" cy="100" r="6" fill="none" stroke="var(--mg-accent)" strokeWidth="1.5" />
            <circle cx="20" cy="100" r="2" fill="var(--mg-accent)" />
            <line
              x1="26"
              y1="100"
              x2="120"
              y2="20"
              stroke="var(--mg-accent)"
              strokeWidth="1"
              strokeDasharray="3,3"
            />
            <line x1="120" y1="20" x2="210" y2="20" stroke="var(--mg-accent)" strokeWidth="1" />
            <text
              x="125"
              y="14"
              fill="var(--mg-accent)"
              fontSize="10"
              fontFamily="var(--mg-font-mono)"
              fontWeight="700"
              letterSpacing="0.08em"
            >
              BLADE INSPECTION
            </text>
            <text x="125" y="32" fill="rgba(255,255,255,0.75)" fontSize="9" fontFamily="var(--mg-font-mono)">
              RUNOUT · 0.0008&quot;
            </text>
          </svg>
        </div>
      </div>

      {/* Hero content */}
      <div className="relative px-12 pt-16 pb-20" style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div className="flex items-center gap-3 mb-7">
          <span
            className="size-2.5 rounded-full mg-anim-pulse"
            style={{ background: '#22C55E', boxShadow: '0 0 12px rgba(34,197,94,0.7)' }}
          />
          <span
            className="text-[11px] font-bold uppercase"
            style={{
              color: '#22C55E',
              letterSpacing: '0.18em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            {statusPillCopy}
          </span>
        </div>

        <h1
          className="font-bold tracking-tight"
          style={{
            color: '#fff',
            fontFamily: 'var(--mg-font-display)',
            fontSize: 92,
            lineHeight: 0.96,
            letterSpacing: '-0.045em',
            maxWidth: 900,
          }}
        >
          Find the shop
          <br />
          <span style={{ color: 'var(--mg-accent)' }}>you can trust.</span>
        </h1>

        <p
          className="text-[18px] mt-6 max-w-[560px]"
          style={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.55 }}
        >
          When the line goes down at 3 AM, you don&apos;t need a directory. You need a{' '}
          <strong style={{ color: '#fff', fontWeight: 700 }}>verified rebuilder</strong> on call.
          Built by shops, for shops — and the plants that depend on them.
        </p>

        {/* Split CTAs */}
        <div className="mt-9 flex items-center gap-3 flex-wrap">
          <Link
            href="/sos/create"
            className="inline-flex items-center gap-2 h-14 px-6 text-[14.5px] font-bold transition-transform hover:scale-[1.02]"
            style={
              {
                background: 'var(--mg-accent)',
                color: '#0A0F19',
                borderRadius: 999,
                boxShadow: '0 8px 28px rgb(var(--mg-accent-rgb) / 0.45)',
              } satisfies CSSProperties
            }
          >
            <SirenIcon size={16} /> Send an SOS now
            <span style={{ fontFamily: 'var(--mg-font-mono)', opacity: 0.7 }}>→</span>
          </Link>
          <Link
            href="/sellers"
            className="inline-flex items-center gap-2 h-14 px-6 text-[14.5px] font-bold transition-colors hover:bg-white/[0.16]"
            style={{
              background: 'rgba(255,255,255,0.10)',
              color: '#fff',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.20)',
              backdropFilter: 'blur(8px)',
            }}
          >
            Browse rebuilders
          </Link>
          <span
            className="ml-3 text-[11px] font-semibold"
            style={{
              color: 'rgba(255,255,255,0.55)',
              fontFamily: 'var(--mg-font-mono)',
              letterSpacing: '0.06em',
            }}
          >
            FREE TO JOIN · NO CARD REQUIRED
          </span>
        </div>

        {/* Audience split chips */}
        <div className="mt-12 grid grid-cols-2 gap-3" style={{ maxWidth: 720 }}>
          <AudienceChip
            kicker="FOR PLANT MANAGERS"
            title="Find a shop in 4 minutes"
            sub="Search verified rebuilders by part number, location, and SLA."
            color="#1877F2"
            href="/sellers"
          />
          <AudienceChip
            kicker="FOR REBUILDERS"
            title="Get jobs while you sleep"
            sub="Set your radius and on-call hours. We route SOS leads to you."
            color="var(--mg-accent)"
            href="/listings/new"
          />
        </div>

        {/* Live ticker — bottom-right overlay */}
        <div className="absolute hidden lg:block" style={{ right: 48, bottom: -40, width: 380 }}>
          <div
            className="overflow-hidden"
            style={{
              background: 'rgba(6,9,15,0.85)',
              border: '1px solid rgba(255,255,255,0.10)',
              borderRadius: 6,
              backdropFilter: 'blur(16px)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.50)',
            }}
          >
            <div
              className="flex items-center justify-between px-4 py-2"
              style={{
                background: 'rgba(255,255,255,0.04)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="size-1.5 rounded-full"
                  style={{
                    background: 'var(--mg-accent)',
                    boxShadow: '0 0 8px rgb(var(--mg-accent-rgb) / 0.7)',
                  }}
                />
                <span
                  className="text-[10px] font-bold uppercase"
                  style={{
                    color: '#fff',
                    letterSpacing: '0.16em',
                    fontFamily: 'var(--mg-font-mono)',
                  }}
                >
                  LIVE · NETWORK FEED
                </span>
              </div>
              <span
                className="text-[9.5px]"
                style={{
                  color: 'rgba(255,255,255,0.45)',
                  fontFamily: 'var(--mg-font-mono)',
                }}
              >
                NOW
              </span>
            </div>
            {ticker.slice(0, 4).map((t, i) => (
              <TickerRow key={`${t.tag}-${i}`} t={t} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SOS feature section ──────────────────────────────────────────────

const SOS_STEPS: Array<{ n: string; t: string; s: string }> = [
  {
    n: '01',
    t: 'Drop a pin and describe the failure.',
    s: 'Voice memo, photo, or three taps. Our parser tags it.',
  },
  {
    n: '02',
    t: 'We page every shop in radius.',
    s: 'Verified rebuilders parsed by capability, not zip code.',
  },
  {
    n: '03',
    t: 'First to claim is on the phone.',
    s: 'Average response: under 4 hours. Nights, weekends, holidays.',
  },
]

function SOSFeatureSection() {
  return (
    <section
      className="px-12 py-24"
      style={{
        background: '#0A0F19',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        maxWidth: 1400,
        margin: '0 auto',
      }}
    >
      <div
        className="grid gap-12"
        style={{ gridTemplateColumns: '0.95fr 1fr', alignItems: 'center' }}
      >
        <div>
          <SectionHead
            kicker="FLAGSHIP · 24/7 SOS"
            title="A 3 AM lifeline for the people who keep things running."
            sub="Fire one signal. We route it to every verified rebuilder in your radius who's on-call right now. The first to claim it is on the phone with you in minutes."
          />

          <div className="mt-10 flex flex-col gap-3">
            {SOS_STEPS.map((s) => (
              <div
                key={s.n}
                className="flex items-start gap-4 px-5 py-4"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 4,
                }}
              >
                <span
                  className="text-[28px] font-bold shrink-0"
                  style={{
                    color: 'var(--mg-accent)',
                    fontFamily: 'var(--mg-font-display)',
                    letterSpacing: '-0.04em',
                    lineHeight: 1,
                    width: 56,
                  }}
                >
                  {s.n}
                </span>
                <div>
                  <div
                    className="text-[15px] font-bold"
                    style={{ color: '#fff', fontFamily: 'var(--mg-font-display)' }}
                  >
                    {s.t}
                  </div>
                  <div
                    className="text-[12.5px] mt-1"
                    style={{ color: 'rgba(255,255,255,0.62)' }}
                  >
                    {s.s}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div
            className="mt-8 px-5 py-5"
            style={{
              background: 'rgb(var(--mg-accent-rgb) / 0.08)',
              border: '1px solid rgb(var(--mg-accent-rgb) / 0.25)',
              borderRadius: 6,
            }}
          >
            <div
              className="text-[10px] font-bold uppercase mb-2"
              style={{
                color: 'var(--mg-accent)',
                letterSpacing: '0.16em',
                fontFamily: 'var(--mg-font-mono)',
              }}
            >
              FIELD REPORT · 03:42 CT · SUNDAY
            </div>
            <p className="text-[14.5px] italic" style={{ color: '#fff', lineHeight: 1.55 }}>
              &ldquo;{LANDING_TESTIMONIAL.quote}&rdquo;
            </p>
            <div
              className="flex items-center gap-2.5 mt-3 pt-3"
              style={{ borderTop: '1px solid rgb(var(--mg-accent-rgb) / 0.20)' }}
            >
              <div
                className="size-9 inline-flex items-center justify-center text-[12px] font-bold"
                style={{
                  background: LANDING_TESTIMONIAL.color,
                  color: '#fff',
                  borderRadius: 999,
                  fontFamily: 'var(--mg-font-display)',
                }}
              >
                {LANDING_TESTIMONIAL.tag}
              </div>
              <div>
                <div className="text-[12px] font-bold" style={{ color: '#fff' }}>
                  {LANDING_TESTIMONIAL.author}
                </div>
                <div className="text-[10.5px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {LANDING_TESTIMONIAL.role}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right — SOS UI mockup */}
        <SOSPreviewMock />
      </div>
    </section>
  )
}

const RESPONDER_PINS = [
  { x: '28%', y: '32%', t: '12 min' },
  { x: '70%', y: '28%', t: '24 min' },
  { x: '38%', y: '72%', t: '08 min' },
  { x: '78%', y: '64%', t: '31 min' },
] as const

function SOSPreviewMock() {
  return (
    <div className="relative">
      <div
        className="relative overflow-hidden"
        style={{
          background: '#0F1623',
          border: '1px solid rgba(255,255,255,0.10)',
          borderRadius: 8,
          padding: 16,
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span
              className="size-2 rounded-full"
              style={{
                background: 'var(--mg-accent)',
                boxShadow: '0 0 10px rgb(var(--mg-accent-rgb) / 0.7)',
              }}
            />
            <span
              className="text-[10px] font-bold uppercase"
              style={{
                color: 'var(--mg-accent)',
                fontFamily: 'var(--mg-font-mono)',
                letterSpacing: '0.16em',
              }}
            >
              ACTIVE SOS · SOS-2031
            </span>
          </div>
          <span
            className="text-[10px]"
            style={{ color: 'rgba(255,255,255,0.45)', fontFamily: 'var(--mg-font-mono)' }}
          >
            03:42 CT
          </span>
        </div>

        {/* Map */}
        <div
          className="relative overflow-hidden"
          style={{ background: '#06090F', borderRadius: 4, height: 280 }}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '28px 28px',
            }}
          />
          <span
            className="absolute mg-anim-sos-pulse"
            style={{
              left: '52%',
              top: '48%',
              width: 140,
              height: 140,
              transform: 'translate(-50%, -50%)',
              borderRadius: 999,
              background:
                'radial-gradient(circle, rgb(var(--mg-accent-rgb) / 0.35) 0%, transparent 70%)',
            }}
          />
          <span
            className="absolute size-4 rounded-full"
            style={{
              left: '52%',
              top: '48%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--mg-accent)',
              boxShadow:
                '0 0 0 4px rgba(10,15,25,0.85), 0 0 20px rgb(var(--mg-accent-rgb) / 0.7)',
            }}
          />
          {RESPONDER_PINS.map((p, i) => (
            <div key={i}>
              <span
                className="absolute size-3 rounded-full"
                style={{
                  left: p.x,
                  top: p.y,
                  transform: 'translate(-50%, -50%)',
                  background: '#22C55E',
                  boxShadow: '0 0 0 3px rgba(10,15,25,0.85)',
                }}
              />
              <span
                className="absolute text-[9.5px] font-bold px-1.5 h-4 inline-flex items-center"
                style={{
                  left: p.x,
                  top: `calc(${p.y} + 12px)`,
                  transform: 'translateX(-50%)',
                  background: 'rgba(0,0,0,0.7)',
                  color: '#22C55E',
                  borderRadius: 2,
                  fontFamily: 'var(--mg-font-mono)',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.t}
              </span>
            </div>
          ))}
          <div className="absolute top-2 left-2">
            <StencilLabel>CHANNELVIEW, TX</StencilLabel>
          </div>
        </div>

        {/* Below map: claims (visual mock — no real shop list) */}
        <div
          className="mt-3"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 4,
          }}
        >
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span
              className="text-[10px] font-bold uppercase"
              style={{
                color: 'rgba(255,255,255,0.55)',
                fontFamily: 'var(--mg-font-mono)',
                letterSpacing: '0.14em',
              }}
            >
              CLAIMS · 4 RESPONDED
            </span>
            <span
              className="text-[10px] font-bold"
              style={{ color: '#22C55E', fontFamily: 'var(--mg-font-mono)' }}
            >
              RED · ACCEPTED
            </span>
          </div>
          {[
            { tag: 'BIG', name: 'Bayou Industrial Group', city: 'Houma, LA', resp: '12 min' },
            { tag: 'SHE', name: 'Sherman Engineering', city: 'Texas City, TX', resp: '18 min' },
            { tag: 'GCM', name: 'Gulf Coast Machineworks', city: 'Pasadena, TX', resp: '22 min' },
          ].map((s, i) => (
            <div
              key={s.tag}
              className="flex items-center gap-2.5 px-3 py-2"
              style={{
                borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              <div
                className="size-7 inline-flex items-center justify-center text-[10px] font-bold"
                style={{
                  background:
                    i === 0
                      ? 'linear-gradient(135deg, #0B2545 0%, #1877F2 100%)'
                      : i === 1
                        ? 'linear-gradient(135deg, #1F2937 0%, #475569 100%)'
                        : 'linear-gradient(135deg, #155E75 0%, #0EA5E9 100%)',
                  color: '#fff',
                  borderRadius: 4,
                  fontFamily: 'var(--mg-font-display)',
                }}
              >
                {s.tag}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11.5px] font-bold truncate" style={{ color: '#fff' }}>
                  {s.name}
                </div>
                <div
                  className="text-[9.5px]"
                  style={{
                    color: 'rgba(255,255,255,0.45)',
                    fontFamily: 'var(--mg-font-mono)',
                  }}
                >
                  {s.city} · ETA {s.resp}
                </div>
              </div>
              <span
                className="text-[9.5px] font-bold uppercase px-1.5 h-4 inline-flex items-center"
                style={{
                  background: i === 0 ? 'rgba(34,197,94,0.20)' : 'rgba(255,255,255,0.06)',
                  color: i === 0 ? '#22C55E' : 'rgba(255,255,255,0.55)',
                  borderRadius: 2,
                  fontFamily: 'var(--mg-font-mono)',
                }}
              >
                {i === 0 ? 'ACCEPT' : 'CLAIMED'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Featured shops ───────────────────────────────────────────────────

function FeaturedShopsSection({
  featured,
  totalShops,
}: {
  featured: LandingFeaturedShop[]
  totalShops: number
}) {
  if (featured.length === 0) return null
  return (
    <section
      className="px-12 py-24"
      style={{ background: '#06090F', borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div className="flex items-end justify-between gap-8 mb-10">
          <SectionHead
            kicker="VERIFIED REBUILDERS"
            title="Shops that show their work."
            sub="Every rebuilder on Metal Gear is verified, rated by the plants they've served, and accountable for documented work. No drive-by listings."
          />
          <MonoLink href="/sellers">BROWSE ALL {totalShops.toLocaleString()}</MonoLink>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featured.map((s) => (
            <FeaturedShopCard key={s.tag + s.name} shop={s} />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Stats section ────────────────────────────────────────────────────

function StatsSection({ stats }: { stats: LandingStat[] }) {
  if (stats.length === 0) return null
  return (
    <section
      className="px-12 py-24"
      style={{ background: '#0A0F19', borderTop: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <SectionHead kicker="THE NETWORK" title="Built by shops. Used everywhere." align="center" />
        <div className="mt-12">
          <StatsStrip items={stats} />
        </div>
      </div>
    </section>
  )
}

// ─── Closing CTA ──────────────────────────────────────────────────────

function ClosingCTA() {
  return (
    <section
      className="relative px-12 py-24 overflow-hidden"
      style={{
        background:
          'linear-gradient(135deg, #0A0F19 0%, var(--mg-warm-1) 50%, var(--mg-warm-3) 110%)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 24px)',
        }}
      />
      <CornerBrackets color="rgba(255,255,255,0.20)" size={32} inset={32} />
      <div className="relative text-center" style={{ maxWidth: 760, margin: '0 auto' }}>
        <span
          className="inline-flex items-center gap-2 px-3 h-[24px] mb-5 text-[10.5px] font-bold uppercase"
          style={{
            background: 'rgb(var(--mg-accent-rgb) / 0.18)',
            color: 'var(--mg-accent)',
            border: '1px solid rgb(var(--mg-accent-rgb) / 0.4)',
            borderRadius: 3,
            letterSpacing: '0.18em',
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          <span className="size-1.5" style={{ background: 'var(--mg-accent)' }} /> JOIN FREE · NO CARD
        </span>
        <h2
          className="font-bold tracking-tight"
          style={{
            color: '#fff',
            fontFamily: 'var(--mg-font-display)',
            fontSize: 56,
            lineHeight: 1.0,
            letterSpacing: '-0.035em',
          }}
        >
          The next time the line goes down,
          <br />
          <span style={{ color: 'var(--mg-accent)' }}>have a number to call.</span>
        </h2>
        <div className="mt-9 flex items-center justify-center gap-3 flex-wrap">
          <Link
            href="/sellers"
            className="inline-flex items-center gap-2 px-6 text-[14px] font-bold transition-transform hover:scale-[1.02]"
            style={{
              height: 52,
              background: 'var(--mg-accent)',
              color: '#0A0F19',
              borderRadius: 999,
              boxShadow: '0 8px 28px rgb(var(--mg-accent-rgb) / 0.40)',
            }}
          >
            <SirenIcon size={15} /> Find the shop you can trust
            <span style={{ fontFamily: 'var(--mg-font-mono)', opacity: 0.7 }}>→</span>
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-5 text-[13px] font-bold transition-colors hover:bg-white/[0.16]"
            style={{
              height: 52,
              background: 'rgba(255,255,255,0.10)',
              color: '#fff',
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.20)',
            }}
          >
            Become a rebuilder
          </Link>
        </div>
      </div>
    </section>
  )
}

