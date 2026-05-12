import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ServicesModule } from '@/components/profile-shared/ServicesModule'
import { ServiceCard } from '@/components/profile-shared/ServiceCard'
import type { ServiceCardData } from '@/lib/profile/services'
import { formatPriceFrom, formatSla } from '@/lib/profile/services-format'

function baseService(overrides: Partial<ServiceCardData> = {}): ServiceCardData {
  return {
    id: 'svc-1',
    label: 'Decanter rebuild',
    description: null,
    category: 'centrifuge-services',
    slaMinDays: 5,
    slaMaxDays: 10,
    priceFromUsd: 28000,
    isPricingGated: false,
    sortOrder: 10,
    ...overrides,
  }
}

describe('formatSla', () => {
  it('renders a range when min and max differ', () => {
    expect(formatSla(5, 10)).toBe('SLA: 5–10 days')
  })
  it('renders a single day when min and max are equal', () => {
    expect(formatSla(3, 3)).toBe('SLA: 3 days')
  })
  it('renders "1 day" singular for 1/1', () => {
    expect(formatSla(1, 1)).toBe('SLA: 1 day')
  })
  it('renders ~min when max is null', () => {
    expect(formatSla(2, null)).toBe('SLA: ~2 days')
  })
  it('returns null when both are null (caller omits row)', () => {
    expect(formatSla(null, null)).toBeNull()
  })
})

describe('formatPriceFrom', () => {
  it('formats whole-dollar with thousands separators', () => {
    expect(formatPriceFrom(28000)).toBe('From $28,000')
  })
  it('returns "Quote on request" when price is null', () => {
    expect(formatPriceFrom(null)).toBe('Quote on request')
  })
})

describe('ServiceCard pricing-gate', () => {
  it('renders "From $X" when paid tier (not gated)', () => {
    render(<ServiceCard service={baseService()} />)
    expect(screen.getByText('From $28,000')).toBeInTheDocument()
  })

  it('renders "Quote on request" when paid tier + null price', () => {
    render(<ServiceCard service={baseService({ priceFromUsd: null })} />)
    expect(screen.getByText('Quote on request')).toBeInTheDocument()
  })

  it('renders lock + "Pricing on Pro+" when free tier (gated)', () => {
    render(
      <ServiceCard
        service={baseService({ priceFromUsd: null, isPricingGated: true })}
      />
    )
    expect(screen.getByText('Pricing on Pro+')).toBeInTheDocument()
    // Price is hidden — no "From $" should appear
    expect(screen.queryByText(/From \$/)).not.toBeInTheDocument()
  })

  it('SLA renders for free tier (only price is gated)', () => {
    render(
      <ServiceCard
        service={baseService({ priceFromUsd: null, isPricingGated: true })}
      />
    )
    expect(screen.getByText('SLA: 5–10 days')).toBeInTheDocument()
  })

  it('omits SLA row entirely when both min and max are null', () => {
    render(
      <ServiceCard
        service={baseService({ slaMinDays: null, slaMaxDays: null })}
      />
    )
    expect(screen.queryByText(/SLA:/)).not.toBeInTheDocument()
  })

  it('renders "Request quote" CTA when requestQuoteHref is provided', () => {
    render(
      <ServiceCard
        service={baseService()}
        requestQuoteHref="/messages?recipient=abc"
      />
    )
    expect(screen.getByText('Request quote')).toBeInTheDocument()
  })

  it('omits the CTA when no href is provided', () => {
    render(<ServiceCard service={baseService()} />)
    expect(screen.queryByText('Request quote')).not.toBeInTheDocument()
  })
})

describe('ServicesModule', () => {
  it('renders nothing when services is empty and showEmptyState is false', () => {
    const { container } = render(
      <ServicesModule
        services={[]}
        totalCount={0}
        variant="full"
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders an empty-state CTA when showEmptyState=true', () => {
    render(
      <ServicesModule
        services={[]}
        totalCount={0}
        variant="full"
        showEmptyState
      />
    )
    expect(screen.getByText(/No services configured yet/i)).toBeInTheDocument()
    expect(screen.getByText(/Configure services/i)).toBeInTheDocument()
  })

  it('renders subtitle "N of M" when variant=preview with partial subset', () => {
    render(
      <ServicesModule
        services={[baseService()]}
        totalCount={10}
        variant="preview"
        seeAllHref="/sellers/abc?tab=services"
      />
    )
    expect(screen.getByText('1 of 10')).toBeInTheDocument()
  })

  it('renders subtitle "N offerings" when variant=full', () => {
    render(
      <ServicesModule
        services={[baseService(), baseService({ id: 'svc-2' })]}
        totalCount={2}
        variant="full"
      />
    )
    expect(screen.getByText('2 offerings')).toBeInTheDocument()
  })

  it('passes the quote-href prefix down with a service-scoped query param', () => {
    render(
      <ServicesModule
        services={[baseService()]}
        totalCount={1}
        variant="full"
        requestQuoteHrefPrefix="/messages?recipient=abc"
      />
    )
    const cta = screen.getByText('Request quote').closest('a')
    expect(cta?.getAttribute('href')).toBe(
      '/messages?recipient=abc&service=svc-1'
    )
  })
})
