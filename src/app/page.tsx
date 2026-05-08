import type { Metadata } from 'next'
import { JsonLd } from '@/components/json-ld'
import { LandingDesktop } from '@/components/landing/LandingDesktop'
import { LandingMobile } from '@/components/landing/LandingMobile'
import {
  getLandingFeaturedShops,
  getLandingNetworkSummary,
  getLandingStats,
  getLandingTicker,
} from '@/app/actions/landing'

// Cycle 67 — cinematic landing replaces the previous marketplace homepage.
// Brand pivot: Metal Gear positions as the trust layer for verified industrial
// rebuilders. SOS-first hero, photo-driven, dark cinematic palette.

export const metadata: Metadata = {
  title: 'Metal Gear — Find the shop you can trust',
  description:
    "When the line goes down at 3 AM, you don't need a directory. You need a verified rebuilder on call. Built by shops, for shops — and the plants that depend on them.",
  openGraph: {
    title: 'Metal Gear — Find the shop you can trust',
    description:
      'The trust layer for industrial rebuilders and the plants that need them. Verified shops. 24/7 SOS lifeline.',
    images: [
      {
        url: 'https://metal-gear-five.vercel.app/api/og?type=home',
        width: 1200,
        height: 630,
      },
    ],
    type: 'website',
    locale: 'en_US',
    siteName: 'Metal Gear',
  },
  alternates: {
    canonical: 'https://metal-gear-five.vercel.app',
  },
}

// Cinematic palette CSS variables. Set on the wrapper so children read
// `var(--mg-accent)` etc. Keeps palette experiments to a single edit.
const CINEMATIC_PALETTE = {
  '--mg-accent': '#3B9EFF',
  '--mg-accent-rgb': '59, 158, 255',
  '--mg-warm-1': '#0B1A2E',
  '--mg-warm-2': '#163763',
  '--mg-warm-3': '#1F5BB8',
  '--mg-font-display': 'var(--font-manrope), system-ui, sans-serif',
  '--mg-font-body': 'var(--font-manrope), system-ui, sans-serif',
  '--mg-font-mono':
    'var(--font-jetbrains-mono), ui-monospace, SFMono-Regular, Menlo, monospace',
} as React.CSSProperties

export default async function HomePage() {
  const network = await getLandingNetworkSummary()
  const [ticker, featured, stats] = await Promise.all([
    getLandingTicker(4),
    getLandingFeaturedShops(4),
    getLandingStats(network),
  ])

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Metal Gear',
    description:
      'Trust layer for industrial rebuilders and the plants that depend on them. 24/7 SOS lifeline.',
    url: 'https://metal-gear-five.vercel.app',
    logo: 'https://metal-gear-five.vercel.app/icons/icon-512.svg',
    foundingLocation: { '@type': 'Place', name: 'Houston, TX' },
    areaServed: { '@type': 'State', name: 'Texas' },
  }

  return (
    <div data-section="landing" style={CINEMATIC_PALETTE}>
      <JsonLd data={organizationSchema} />
      <LandingDesktop
        network={network}
        ticker={ticker}
        featured={featured}
        stats={stats}
      />
      <LandingMobile
        network={network}
        ticker={ticker}
        featured={featured}
        stats={stats}
      />
    </div>
  )
}
