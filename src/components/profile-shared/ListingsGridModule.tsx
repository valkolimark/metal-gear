import Link from 'next/link'
import { ArrowRight, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface ListingsGridModuleListing {
  id: string
  title: string
  category: string | null
  condition: string
  price_cents: number | null
  contact_for_price: boolean
  views_count: number | null
  favorites_count: number | null
  is_featured?: boolean | null
  listing_images: { url: string; position: number }[] | null
}

type ColumnSpec = 2 | 3 | 4 | 6 | 8

const COLUMN_CLASS: Record<ColumnSpec, string> = {
  2: 'grid grid-cols-1 gap-3 sm:grid-cols-2',
  3: 'grid grid-cols-2 gap-3 sm:grid-cols-3',
  4: 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4',
  6: 'grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6',
  8: 'grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4',
}

interface ListingsGridModuleProps {
  title: string
  subtitle?: string | null
  listings: ListingsGridModuleListing[]
  columns: ColumnSpec
  totalCount?: number | null
  seeAllHref?: string | null
  showFeaturedBadge?: boolean
  emptyState?: React.ReactNode
}

export function ListingsGridModule({
  title,
  subtitle,
  listings,
  columns,
  totalCount,
  seeAllHref,
  showFeaturedBadge = false,
  emptyState,
}: ListingsGridModuleProps) {
  return (
    <section className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(11,37,69,0.04),0_4px_12px_rgba(11,37,69,0.05)]">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h3 className="font-display text-[15px] font-bold tracking-tight text-foreground">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="inline-flex shrink-0 items-center gap-1 text-[12px] font-bold text-[#FF6B2B]"
          >
            {totalCount && totalCount > listings.length
              ? `See all (${totalCount})`
              : 'See all'}
            <ArrowRight className="size-3" />
          </Link>
        )}
      </header>
      <div className="p-4">
        {listings.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            {emptyState ?? 'No listings yet.'}
          </div>
        ) : (
          <div className={COLUMN_CLASS[columns]}>
            {listings.map((listing) => (
              <ListingTile
                key={listing.id}
                listing={listing}
                showFeaturedBadge={showFeaturedBadge}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function ListingTile({
  listing,
  showFeaturedBadge,
}: {
  listing: ListingsGridModuleListing
  showFeaturedBadge: boolean
}) {
  const image = [...(listing.listing_images ?? [])]
    .sort((a, b) => a.position - b.position)[0]?.url
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group block overflow-hidden rounded-xl border border-transparent bg-background transition-shadow hover:shadow-[0_8px_24px_rgba(11,37,69,0.10)]"
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={listing.title}
            className="size-full object-cover transition-transform group-hover:scale-105"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Package className="size-7 text-muted-foreground/40" />
          </div>
        )}
        {showFeaturedBadge && listing.is_featured && (
          <Badge className="absolute top-2 left-2 bg-[#FF6B2B] text-white">
            Featured
          </Badge>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-[13px] font-medium text-foreground">
          {listing.title}
        </p>
        {listing.category && (
          <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">
            {listing.category} · {listing.condition.replace(/_/g, ' ')}
          </p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <span className="font-display text-[13px] font-bold text-foreground">
            {listing.contact_for_price
              ? 'Contact'
              : listing.price_cents
                ? `$${(listing.price_cents / 100).toLocaleString()}`
                : 'Free'}
          </span>
          <span className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span>{(listing.views_count ?? 0).toLocaleString()} views</span>
            <span>{(listing.favorites_count ?? 0).toLocaleString()} favs</span>
          </span>
        </div>
      </div>
    </Link>
  )
}
