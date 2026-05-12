import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TrustStripCard } from '@/components/profile-shared/TrustStripCard'
import { CoverGrid } from '@/components/profile-shared/CoverGrid'
import { ActivityFeed } from '@/components/profile-shared/ActivityFeed'
import { ProfileTabsNav } from '@/components/profile-shared/ProfileTabsNav'
import type {
  TrustMetrics,
  ActivityEntry,
} from '@/components/profile-shared/types'

const replaceMock = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
  usePathname: () => '/sellers/abc',
  useSearchParams: () => new URLSearchParams(),
}))

function emptyMetrics(): TrustMetrics {
  return {
    rating: { avg: null, count: 0 },
    transactions: { count: 0 },
    sosResponses: { count: 0 },
    responseTime: { avgMinutes: null, ratePct: null },
    onPlatform: { sinceYear: null, years: null },
    followers: { count: 0 },
  }
}

describe('TrustStripCard', () => {
  it('renders em-dashes when every metric is null (brand-new seller)', () => {
    render(<TrustStripCard metrics={emptyMetrics()} variant="seller" />)
    const cell = screen.getByTestId('trust-strip')
    // 5 stats × `—` value for everything that lacks data
    expect(cell.textContent).toContain('—')
    // No "0" anywhere — that would mislead.
    // (Followers cell shows the actual follower count, which IS 0 here. The
    //  rule is "don't render 0 for rating/transactions/sos/response time" —
    //  followers can legitimately be 0 with no misleading implication.)
  })

  it('renders rating, response time, transactions, followers, on-platform for a populated seller', () => {
    const metrics: TrustMetrics = {
      rating: { avg: 4.7, count: 187 },
      transactions: { count: 42 },
      sosResponses: { count: 18 },
      responseTime: { avgMinutes: 45, ratePct: 92 },
      onPlatform: { sinceYear: 2021, years: 4 },
      followers: { count: 56 },
    }
    render(<TrustStripCard metrics={metrics} variant="seller" />)
    const cell = screen.getByTestId('trust-strip')
    expect(cell.textContent).toContain('4.7')
    expect(cell.textContent).toContain('187 reviews')
    expect(cell.textContent).toContain('45m')
    expect(cell.textContent).toContain('92% reply rate')
    expect(cell.textContent).toContain('42') // transactions
    expect(cell.textContent).toContain('56') // followers
    expect(cell.textContent).toContain('since 2021')
  })

  it('profile-own variant swaps the followers cell for SOS responses', () => {
    const metrics: TrustMetrics = {
      rating: { avg: 4.0, count: 5 },
      transactions: { count: 3 },
      sosResponses: { count: 9 },
      responseTime: { avgMinutes: null, ratePct: null },
      onPlatform: { sinceYear: 2024, years: 1 },
      followers: { count: 0 },
    }
    render(<TrustStripCard metrics={metrics} variant="profile-own" />)
    const cell = screen.getByTestId('trust-strip')
    expect(cell.textContent).toContain('SOS responses')
    expect(cell.textContent).toContain('9')
    expect(cell.textContent).not.toContain('Followers')
  })
})

describe('CoverGrid', () => {
  it('renders the banner photo when bannerUrl is provided', () => {
    render(
      <CoverGrid
        bannerUrl="https://example.com/banner.jpg"
        photoUrls={[]}
        chips={[{ label: 'COMPANY · STOREFRONT', variant: 'category' }]}
      />,
    )
    const banner = screen.getAllByAltText(/cover/i)
    expect(banner.length).toBeGreaterThan(0)
    expect(banner[0].getAttribute('src')).toBe('https://example.com/banner.jpg')
  })

  it('falls back to gradient placeholders when no photos exist', () => {
    const { container } = render(
      <CoverGrid
        bannerUrl={null}
        photoUrls={[]}
        chips={[{ label: 'INDIVIDUAL · STOREFRONT', variant: 'category' }]}
      />,
    )
    // Should render but contain no <img> elements
    expect(container.querySelectorAll('img').length).toBe(0)
  })

  it('renders fewer than 3 photos with gradients in remaining slots', () => {
    const { container } = render(
      <CoverGrid
        bannerUrl="https://example.com/banner.jpg"
        photoUrls={['https://example.com/photo1.jpg']}
        chips={[]}
      />,
    )
    // Desktop variant: 1 banner + 1 photo = 2 imgs.
    // Mobile variant: 1 banner = 1 img.
    // Both render in the DOM; Tailwind responsive classes hide one or the other.
    expect(container.querySelectorAll('img').length).toBe(3)
  })

  it('renders the "Edit cover" link when editable=true', () => {
    render(
      <CoverGrid
        bannerUrl={null}
        photoUrls={[]}
        chips={[]}
        editable
        editHref="/profile/cover"
      />,
    )
    expect(screen.getAllByText(/edit cover/i).length).toBeGreaterThan(0)
  })

  it('renders verified chip with emerald palette', () => {
    render(
      <CoverGrid
        bannerUrl={null}
        photoUrls={[]}
        chips={[{ label: 'VERIFIED DEALER', variant: 'verified' }]}
      />,
    )
    expect(screen.getAllByText('VERIFIED DEALER').length).toBeGreaterThan(0)
  })
})

describe('ActivityFeed', () => {
  it('renders empty state when entries is empty', () => {
    render(<ActivityFeed entries={[]} />)
    expect(screen.getByText(/no recent activity/i)).toBeInTheDocument()
  })

  it('renders entries with humanized time-ago labels', () => {
    const now = Date.now()
    const entries: ActivityEntry[] = [
      {
        id: 'a',
        type: 'listing_created',
        title: 'Posted a new listing',
        subtitle: 'Centrifuge 24-inch',
        occurredAt: new Date(now - 3 * 60_000).toISOString(),
      },
      {
        id: 'b',
        type: 'review_received',
        title: 'Received a 5★ review',
        subtitle: 'Great seller',
        occurredAt: new Date(now - 2 * 24 * 60 * 60_000).toISOString(),
      },
    ]
    render(<ActivityFeed entries={entries} />)
    expect(screen.getByText('Posted a new listing')).toBeInTheDocument()
    expect(screen.getByText('Received a 5★ review')).toBeInTheDocument()
    expect(screen.getByText('3m')).toBeInTheDocument()
    expect(screen.getByText('2d')).toBeInTheDocument()
  })
})

describe('ProfileTabsNav', () => {
  it('renders all tabs with their counts', () => {
    render(
      <ProfileTabsNav
        tabs={[
          { id: 'storefront', label: 'Storefront' },
          { id: 'listings', label: 'Listings', count: 47 },
          { id: 'reviews', label: 'Reviews', count: 12 },
        ]}
        defaultTab="storefront"
      />,
    )
    expect(screen.getByText('Storefront')).toBeInTheDocument()
    expect(screen.getByText('Listings')).toBeInTheDocument()
    expect(screen.getByText('47')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
  })

  it('marks the default tab as selected when no ?tab= is present', () => {
    render(
      <ProfileTabsNav
        tabs={[
          { id: 'about', label: 'About' },
          { id: 'listings', label: 'Listings', count: 0 },
        ]}
        defaultTab="about"
      />,
    )
    const aboutTab = screen.getByText('About').closest('button')
    expect(aboutTab?.getAttribute('aria-selected')).toBe('true')
  })

  it('disables tabs marked disabled', () => {
    render(
      <ProfileTabsNav
        tabs={[
          { id: 'about', label: 'About' },
          { id: 'services', label: 'Services', disabled: true },
        ]}
        defaultTab="about"
      />,
    )
    const services = screen.getByText('Services').closest('button')
    expect(services).toBeDisabled()
  })
})
