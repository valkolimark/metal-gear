import Link from 'next/link'
import { Clock, Lock } from 'lucide-react'
import type { ServiceCardData } from '@/lib/profile/services'
import { formatPriceFrom, formatSla } from '@/lib/profile/services-format'

interface ServiceCardProps {
  service: ServiceCardData
  /** Optional quote/request URL — usually /messages?recipient=... prefilled. */
  requestQuoteHref?: string
}

/**
 * Single service card primitive. Rendered inside `ServicesModule` on
 * /sellers/[id] and /companies/[slug]. Follows the Cycle 68 soft-card token.
 *
 * Pricing render rules (mirrors Cycle 70 §8 edge cases):
 *   - Paid tier + price set    → "From $X" line
 *   - Paid tier + no price     → "Quote on request" line, muted
 *   - Free tier (pricing gated) → Lock icon + tooltip; price hidden entirely
 *
 * SLA renders for every tier — only price is gated.
 */
export function ServiceCard({ service, requestQuoteHref }: ServiceCardProps) {
  const slaText = formatSla(service.slaMinDays, service.slaMaxDays)
  const showPriceRow = !service.isPricingGated

  return (
    <article
      className="flex flex-col rounded-2xl bg-card p-4 shadow-[0_1px_2px_rgba(11,37,69,0.04),0_4px_12px_rgba(11,37,69,0.05)]"
      data-testid="service-card"
    >
      <header>
        <h4 className="font-display text-[15px] font-bold leading-snug tracking-tight text-foreground line-clamp-2">
          {service.label}
        </h4>
        {service.category && (
          <div
            className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.10em] text-muted-foreground"
            style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
          >
            {humanizeCategory(service.category)}
          </div>
        )}
      </header>

      {service.description && (
        <p className="mt-2 text-[12.5px] leading-relaxed text-foreground/80 line-clamp-2">
          {service.description}
        </p>
      )}

      <div className="mt-3 flex flex-col gap-1.5">
        {slaText && (
          <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Clock className="size-3.5" aria-hidden />
            <span>{slaText}</span>
          </div>
        )}
        {showPriceRow ? (
          <div className="text-[13px] font-bold text-foreground">
            {service.priceFromUsd != null ? (
              formatPriceFrom(service.priceFromUsd)
            ) : (
              <span className="text-muted-foreground">Quote on request</span>
            )}
          </div>
        ) : (
          <PricingLockedRow />
        )}
      </div>

      {requestQuoteHref && (
        <Link
          href={requestQuoteHref}
          className="mt-3 inline-flex h-9 items-center justify-center rounded-full bg-[#0A1628] px-4 text-[12px] font-bold text-white hover:bg-[#152544]"
        >
          Request quote
        </Link>
      )}
    </article>
  )
}

function PricingLockedRow() {
  // Native title= tooltip is intentional — keeps this card a server component
  // (no client-side state) and meets the WAI-ARIA "tooltip on hover/tap"
  // requirement without extra JS.
  return (
    <div
      className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground"
      title="Pricing visible on Pro storefronts"
    >
      <Lock className="size-3.5" aria-hidden />
      <span>Pricing on Pro+</span>
    </div>
  )
}

function humanizeCategory(slug: string): string {
  if (!slug) return ''
  return slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
