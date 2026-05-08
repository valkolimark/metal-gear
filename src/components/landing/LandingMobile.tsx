// Cycle 67 — mobile cinematic landing layout.
// Mounted from `src/app/page.tsx` for viewports < md. Visual values lifted from
// the design handoff (`design_handoff_homepage/components/MobileLanding.jsx`).

import Link from 'next/link'
import { LANDING_TESTIMONIAL } from './data'
import { CornerBrackets, HamburgerIcon, SirenIcon } from './icons'
import {
  CautionStripe,
  FeaturedShopCard,
  Spec,
  TickerRow,
} from './shared'
import type {
  LandingFeaturedShop,
  LandingNetworkSummary,
  LandingStat,
  LandingTickerItem,
} from './types'

interface LandingMobileProps {
  network: LandingNetworkSummary
  ticker: LandingTickerItem[]
  featured: LandingFeaturedShop[]
  stats: LandingStat[]
}

export function LandingMobile({ network, ticker, featured, stats }: LandingMobileProps) {
  return (
    <div
      className="md:hidden w-full"
      style={{
        background: '#0A0F19',
        fontFamily: 'var(--mg-font-body)',
        color: '#fff',
      }}
    >
      {/* Hero — full-bleed photo, nav floats on top, content lives in bottom scrim */}
      <div
        className="relative overflow-hidden"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(6,9,15,0.55) 0%, rgba(6,9,15,0.10) 25%, rgba(6,9,15,0.75) 75%, rgba(6,9,15,0.98) 100%), url('/landing/hero-rotor.webp')",
          backgroundSize: 'cover',
          backgroundPosition: '65% center',
          minHeight: 660,
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 80% 25%, rgb(var(--mg-accent-rgb) / 0.18) 0%, transparent 60%)',
            mixBlendMode: 'screen',
          }}
        />

        <div className="relative px-5 pt-5 flex flex-col" style={{ minHeight: 660 }}>
          {/* Floating nav */}
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-[12.5px] font-bold"
              style={{
                color: '#fff',
                fontFamily: 'var(--mg-font-display)',
                letterSpacing: '0.06em',
              }}
            >
              METAL GEAR
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center -mr-1.5 p-2"
              aria-label="Sign in"
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              <HamburgerIcon size={18} />
            </Link>
          </div>

          {/* NETWORK ONLINE pill — top-left, floating */}
          <div className="mt-4">
            <span
              className="inline-flex items-center gap-1.5 px-2 h-[22px] text-[9.5px] font-bold uppercase"
              style={{
                background: 'rgba(6,9,15,0.55)',
                color: '#22C55E',
                border: '1px solid rgba(34,197,94,0.30)',
                borderRadius: 3,
                letterSpacing: '0.16em',
                fontFamily: 'var(--mg-font-mono)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <span
                className="size-1.5 rounded-full mg-anim-pulse"
                style={{
                  background: '#22C55E',
                  boxShadow: '0 0 6px rgba(34,197,94,0.7)',
                }}
              />
              NETWORK ONLINE
            </span>
          </div>

          <div className="mt-auto pb-9">
            <h1
              className="font-bold tracking-tight"
              style={{
                color: '#fff',
                fontFamily: 'var(--mg-font-display)',
                fontSize: 46,
                lineHeight: 0.98,
                letterSpacing: '-0.04em',
              }}
            >
              Find the shop
              <br />
              <span style={{ color: 'var(--mg-accent)' }}>you can trust.</span>
            </h1>
            <p
              className="text-[14px] mt-4 max-w-[300px]"
              style={{ color: 'rgba(255,255,255,0.78)', lineHeight: 1.55 }}
            >
              When the line goes down at 3 AM, you don&apos;t need a directory — you need a
              verified rebuilder on call.
            </p>

            <div className="mt-7 flex flex-col gap-2.5">
              <Link
                href="/sos/create"
                className="inline-flex items-center justify-center gap-2 h-12 px-5 text-[13.5px] font-bold w-full"
                style={{
                  background: 'var(--mg-accent)',
                  color: '#0A0F19',
                  borderRadius: 999,
                  boxShadow: '0 6px 20px rgb(var(--mg-accent-rgb) / 0.40)',
                }}
              >
                <SirenIcon size={14} /> Send an SOS now
              </Link>
              <Link
                href="/sellers"
                className="inline-flex items-center justify-center gap-2 h-12 px-5 text-[13.5px] font-bold w-full"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  color: '#fff',
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.16)',
                  backdropFilter: 'blur(8px)',
                }}
              >
                Browse rebuilders
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Spec strip */}
      <div
        className="grid grid-cols-3 px-5 py-4 gap-2"
        style={{
          background: '#0A0F19',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <Spec label="Shops" value={network.rebuilders.toLocaleString()} color="#fff" />
        <Spec label="Listings" value={network.listings.toLocaleString()} color="#22C55E" />
        <Spec label="States" value={network.states.toString()} color="#FFB800" />
      </div>

      {/* Live ticker */}
      {ticker.length > 0 && (
        <div
          className="mx-4 mt-5 relative overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.10)',
            borderRadius: 6,
          }}
        >
          <div
            className="flex items-center justify-between px-3 py-2"
            style={{
              background: 'rgba(255,255,255,0.04)',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className="size-1.5 rounded-full"
                style={{
                  background: 'var(--mg-accent)',
                  boxShadow: '0 0 6px rgb(var(--mg-accent-rgb) / 0.7)',
                }}
              />
              <span
                className="text-[9.5px] font-bold uppercase"
                style={{
                  color: '#fff',
                  letterSpacing: '0.14em',
                  fontFamily: 'var(--mg-font-mono)',
                }}
              >
                LIVE NETWORK FEED
              </span>
            </div>
            <span
              className="text-[9px]"
              style={{
                color: 'rgba(255,255,255,0.40)',
                fontFamily: 'var(--mg-font-mono)',
              }}
            >
              NOW
            </span>
          </div>
          {ticker.slice(0, 3).map((t, i) => (
            <TickerRow key={`${t.tag}-${i}`} t={t} />
          ))}
        </div>
      )}

      {/* SOS feature */}
      <section className="px-5 py-14">
        <div className="inline-flex items-center gap-2 mb-3">
          <span className="size-1.5" style={{ background: 'var(--mg-accent)' }} />
          <span
            className="text-[9.5px] font-bold uppercase"
            style={{
              color: 'var(--mg-accent)',
              letterSpacing: '0.18em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            FLAGSHIP · 24/7 SOS
          </span>
        </div>
        <h2
          className="font-bold tracking-tight"
          style={{
            color: '#fff',
            fontFamily: 'var(--mg-font-display)',
            fontSize: 30,
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
          }}
        >
          A 3 AM lifeline for the people who keep things running.
        </h2>
        <div className="mt-6 flex flex-col gap-2.5">
          {[
            { n: '01', t: 'Drop a pin. Describe the failure.', s: 'Voice memo, photo, or three taps.' },
            { n: '02', t: 'We page every shop in radius.', s: 'Verified rebuilders parsed by capability.' },
            { n: '03', t: 'First to claim is on the phone.', s: 'Avg response: under 4 hours.' },
          ].map((s) => (
            <div
              key={s.n}
              className="flex items-start gap-3 px-4 py-3"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 4,
              }}
            >
              <span
                className="text-[20px] font-bold shrink-0 w-9"
                style={{
                  color: 'var(--mg-accent)',
                  fontFamily: 'var(--mg-font-display)',
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                }}
              >
                {s.n}
              </span>
              <div>
                <div
                  className="text-[13px] font-bold"
                  style={{ color: '#fff', fontFamily: 'var(--mg-font-display)' }}
                >
                  {s.t}
                </div>
                <div className="text-[11px] mt-0.5" style={{ color: 'rgba(255,255,255,0.62)' }}>
                  {s.s}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Testimonial */}
        <div
          className="mt-5 px-4 py-4"
          style={{
            background: 'rgb(var(--mg-accent-rgb) / 0.08)',
            border: '1px solid rgb(var(--mg-accent-rgb) / 0.25)',
            borderRadius: 6,
          }}
        >
          <div
            className="text-[9.5px] font-bold uppercase mb-2"
            style={{
              color: 'var(--mg-accent)',
              letterSpacing: '0.14em',
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            FIELD REPORT · 03:42 CT
          </div>
          <p className="text-[12.5px] italic" style={{ color: '#fff', lineHeight: 1.55 }}>
            &ldquo;{LANDING_TESTIMONIAL.quote}&rdquo;
          </p>
          <div
            className="flex items-center gap-2 mt-3 pt-3"
            style={{ borderTop: '1px solid rgb(var(--mg-accent-rgb) / 0.20)' }}
          >
            <div
              className="size-8 inline-flex items-center justify-center text-[10.5px] font-bold"
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
              <div className="text-[11.5px] font-bold" style={{ color: '#fff' }}>
                {LANDING_TESTIMONIAL.author}
              </div>
              <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.55)' }}>
                {LANDING_TESTIMONIAL.role}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured shops */}
      {featured.length > 0 && (
        <section
          className="px-5 py-12"
          style={{ background: '#06090F', borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="size-1.5" style={{ background: 'var(--mg-accent)' }} />
            <span
              className="text-[9.5px] font-bold uppercase"
              style={{
                color: 'var(--mg-accent)',
                letterSpacing: '0.18em',
                fontFamily: 'var(--mg-font-mono)',
              }}
            >
              VERIFIED REBUILDERS
            </span>
          </div>
          <h2
            className="font-bold tracking-tight"
            style={{
              color: '#fff',
              fontFamily: 'var(--mg-font-display)',
              fontSize: 28,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
            }}
          >
            Shops that show their work.
          </h2>
          <div className="flex flex-col gap-3 mt-6">
            {featured.slice(0, 3).map((s) => (
              <FeaturedShopCard key={s.tag + s.name} shop={s} />
            ))}
          </div>
          <Link
            href="/sellers"
            className="text-[11.5px] font-bold inline-flex items-center gap-1 mt-5"
            style={{
              color: 'var(--mg-accent)',
              fontFamily: 'var(--mg-font-mono)',
              letterSpacing: '0.06em',
            }}
          >
            BROWSE ALL {network.rebuilders.toLocaleString()} →
          </Link>
        </section>
      )}

      {/* Stats */}
      {stats.length > 0 && (
        <section className="px-5 py-12">
          <div
            className="grid grid-cols-2 gap-1"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            {stats.map((s, i) => (
              <div
                key={i}
                className="flex flex-col px-4 py-4"
                style={{ background: '#0A0F19' }}
              >
                <span
                  className="text-[9px] font-bold uppercase"
                  style={{
                    color: 'rgba(255,255,255,0.45)',
                    letterSpacing: '0.14em',
                    fontFamily: 'var(--mg-font-mono)',
                  }}
                >
                  {s.label}
                </span>
                <span
                  className="text-[22px] font-bold mt-0.5"
                  style={{
                    color: '#fff',
                    fontFamily: 'var(--mg-font-display)',
                    letterSpacing: '-0.03em',
                    lineHeight: 1.05,
                  }}
                >
                  {s.value}
                </span>
                <span
                  className="text-[9.5px] mt-0.5"
                  style={{
                    color: 'rgba(255,255,255,0.50)',
                    fontFamily: 'var(--mg-font-mono)',
                  }}
                >
                  {s.sub}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Closing CTA */}
      <section
        className="relative overflow-hidden px-5 py-14"
        style={{
          background:
            'linear-gradient(160deg, #0A0F19 0%, var(--mg-warm-1) 40%, var(--mg-warm-3) 110%)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 22px)',
          }}
        />
        <CornerBrackets color="rgba(255,255,255,0.20)" size={20} inset={16} />
        <div className="relative text-center">
          <h2
            className="font-bold tracking-tight"
            style={{
              color: '#fff',
              fontFamily: 'var(--mg-font-display)',
              fontSize: 32,
              lineHeight: 1.05,
              letterSpacing: '-0.03em',
            }}
          >
            Have a number to call.
          </h2>
          <p
            className="text-[12.5px] mt-3"
            style={{ color: 'rgba(255,255,255,0.72)', lineHeight: 1.55 }}
          >
            Free to join. No card required.
          </p>
          <Link
            href="/sellers"
            className="mt-5 inline-flex items-center justify-center gap-2 h-12 px-5 text-[13.5px] font-bold w-full"
            style={{
              background: 'var(--mg-accent)',
              color: '#0A0F19',
              borderRadius: 999,
              boxShadow: '0 6px 20px rgb(var(--mg-accent-rgb) / 0.40)',
            }}
          >
            <SirenIcon size={14} /> Find the shop you can trust
          </Link>
        </div>
      </section>

      {/* Footer */}
      <CautionStripe height={3} />
      <footer
        className="px-5 py-6 flex flex-col items-center gap-3"
        style={{ background: '#06090F' }}
      >
        <Link href="/" className="flex items-center gap-2">
          <div
            className="size-7 inline-flex items-center justify-center font-bold text-[11px]"
            style={{
              background: 'var(--mg-accent)',
              color: '#0A0F19',
              borderRadius: 5,
              fontFamily: 'var(--mg-font-display)',
            }}
          >
            MG
          </div>
          <span
            className="text-[11px] font-bold tracking-tight"
            style={{ color: '#fff', fontFamily: 'var(--mg-font-display)' }}
          >
            METAL GEAR
          </span>
        </Link>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {[
            { label: 'Find a shop', href: '/sellers' },
            { label: 'Send SOS', href: '/sos/create' },
            { label: 'Sell', href: '/listings/new' },
            { label: 'Pricing', href: '/pricing' },
            { label: 'About', href: '/about' },
            { label: 'Terms', href: '/terms' },
          ].map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[10.5px] font-semibold"
              style={{ color: 'rgba(255,255,255,0.55)' }}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div
          className="text-[9px] font-bold uppercase"
          style={{
            color: 'rgba(255,255,255,0.30)',
            letterSpacing: '0.18em',
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          EST. 2026 · BUILT BY SHOPS
        </div>
      </footer>
    </div>
  )
}
