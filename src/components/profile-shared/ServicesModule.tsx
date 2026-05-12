import Link from 'next/link'
import { ArrowRight, Wrench } from 'lucide-react'
import type { ServiceCardData } from '@/lib/profile/services'
import { ServiceCard } from './ServiceCard'

interface ServicesModuleProps {
  services: ServiceCardData[]
  /** Total active services for the seller — used for "See all (N)" link. */
  totalCount: number
  seeAllHref?: string | null
  variant: 'preview' | 'full'
  /** Optional quote/request prefix; appended with `?service=<id>`. */
  requestQuoteHrefPrefix?: string
  /** Optional override of the section title. */
  title?: string
  /** When true, render an "empty state" placeholder instead of nothing. */
  showEmptyState?: boolean
}

/**
 * Reusable Services grid for /sellers/[id] (Storefront preview + Services tab)
 * and /companies/[slug] (full section). Mirrors the Cycle 68 soft-card chrome
 * used by ListingsGridModule.
 *
 * Empty handling:
 *   - When `services.length === 0` and `showEmptyState !== true`, the parent
 *     should not render this module at all (we render nothing here for safety).
 *   - When `showEmptyState === true` (used inside the seller's own Services
 *     tab), we render a CTA pointing at the edit surface.
 */
export function ServicesModule({
  services,
  totalCount,
  seeAllHref,
  variant,
  requestQuoteHrefPrefix,
  title,
  showEmptyState,
}: ServicesModuleProps) {
  if (services.length === 0 && !showEmptyState) return null

  const heading = title ?? 'Services'
  const subtitle =
    services.length > 0
      ? variant === 'preview' && totalCount > services.length
        ? `${services.length} of ${totalCount}`
        : `${services.length} offering${services.length === 1 ? '' : 's'}`
      : null

  return (
    <section className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(11,37,69,0.04),0_4px_12px_rgba(11,37,69,0.05)]">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h3 className="font-display text-[15px] font-bold tracking-tight text-foreground">
            {heading}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {seeAllHref && services.length > 0 && (
          <Link
            href={seeAllHref}
            className="inline-flex shrink-0 items-center gap-1 text-[12px] font-bold text-[#FF6B2B]"
          >
            {totalCount > services.length
              ? `See all (${totalCount})`
              : 'See all'}
            <ArrowRight className="size-3" />
          </Link>
        )}
      </header>

      <div className="p-4">
        {services.length === 0 ? (
          <ServicesEmptyState />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {services.map((service) => {
              const href = requestQuoteHrefPrefix
                ? `${requestQuoteHrefPrefix}${requestQuoteHrefPrefix.includes('?') ? '&' : '?'}service=${service.id}`
                : undefined
              return (
                <ServiceCard
                  key={service.id}
                  service={service}
                  requestQuoteHref={href}
                />
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function ServicesEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
      <div className="inline-flex size-10 items-center justify-center rounded-full bg-muted">
        <Wrench className="size-5 text-muted-foreground" aria-hidden />
      </div>
      <p className="text-sm text-muted-foreground">
        No services configured yet.
      </p>
      <Link
        href="/settings/services"
        className="text-[12px] font-bold text-[#FF6B2B] hover:underline"
      >
        Configure services →
      </Link>
    </div>
  )
}
