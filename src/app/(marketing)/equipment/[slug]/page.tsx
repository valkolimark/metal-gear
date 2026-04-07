import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { ArrowRight, MapPin, Heart, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createAdminClient } from '@/lib/supabase/admin'
import { EQUIPMENT_CATEGORIES } from '@/lib/constants'

function categorySlug(name: string): string {
  return name.toLowerCase().replace(/[&]/g, 'and').replace(/\s+/g, '-')
}

function findCategory(slug: string): string | undefined {
  return EQUIPMENT_CATEGORIES.find((c) => categorySlug(c) === slug)
}

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return EQUIPMENT_CATEGORIES
    .filter((c) => c !== 'Other')
    .map((c) => ({ slug: categorySlug(c) }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const category = findCategory(slug)
  if (!category) return {}

  return {
    title: `${category} for Sale — Used Industrial Equipment`,
    description: `Browse used ${category.toLowerCase()} for sale in Houston, TX. Find quality industrial equipment for oil & gas, manufacturing, and more on Metal Gear.`,
    openGraph: {
      title: `${category} for Sale | Metal Gear`,
      description: `Shop used ${category.toLowerCase()} — Houston's industrial equipment marketplace.`,
    },
  }
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params
  const category = findCategory(slug)
  if (!category) notFound()

  const admin = createAdminClient()
  const { data: listings, count } = await admin
    .from('listings')
    .select('id, title, category, condition, price_cents, contact_for_price, location_city, location_state, favorites_count, created_at, listing_images(url, position)', { count: 'exact' })
    .eq('category', category)
    .eq('status', 'active')
    .eq('has_media', true)
    .order('created_at', { ascending: false })
    .limit(24)

  const relatedCategories = EQUIPMENT_CATEGORIES
    .filter((c) => c !== category && c !== 'Other')
    .slice(0, 8)

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="space-y-4">
        <Badge variant="outline" className="font-body text-xs">
          Industrial Equipment
        </Badge>
        <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">
          {category} <span className="text-primary">for Sale</span>
        </h1>
        <p className="max-w-2xl font-body text-lg text-muted-foreground">
          Browse {count ?? 0} used {category.toLowerCase()} listings in Houston, TX and surrounding areas.
          Find quality equipment for your operation.
        </p>
        <Button asChild className="font-body">
          <Link href={`/search?category=${encodeURIComponent(category)}`}>
            View All {category}
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </Button>
      </div>

      {/* Listings Grid */}
      {listings && listings.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <Link key={listing.id} href={`/listings/${listing.id}`}>
              <Card className="h-full overflow-hidden border-border bg-card py-0 gap-0 transition-colors hover:border-primary/50">
                <div className="relative aspect-[16/10] bg-muted">
                  {(() => {
                    const img = listing.listing_images
                      ?.sort((a: { position: number }, b: { position: number }) => a.position - b.position)[0]
                      ?.url
                    return img ? (
                      <Image
                        src={img}
                        alt={listing.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        unoptimized
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center">
                        <Package className="size-10 text-muted-foreground/40" />
                      </div>
                    )
                  })()}
                </div>
                <CardContent className="flex h-full flex-col p-4">
                  <p className="truncate font-body font-medium text-foreground">
                    {listing.title}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="font-body text-[11px]">
                      {listing.category}
                    </Badge>
                    <Badge variant="outline" className="font-body text-[11px] capitalize">
                      {listing.condition.replace('_', ' ')}
                    </Badge>
                  </div>
                  <div className="mt-auto pt-3">
                    <p className="font-display text-lg font-bold text-primary">
                      {listing.contact_for_price
                        ? 'Contact'
                        : listing.price_cents
                          ? `$${(listing.price_cents / 100).toLocaleString()}`
                          : 'Free'}
                    </p>
                    <p className="mt-1 flex items-center gap-1 font-body text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {listing.location_city}, {listing.location_state}
                      <span className="ml-auto flex items-center gap-1">
                        <Heart className="size-3" />
                        {listing.favorites_count}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <p className="font-display text-lg font-semibold text-foreground">
            No {category.toLowerCase()} listed yet
          </p>
          <p className="mt-2 font-body text-sm text-muted-foreground">
            Be the first to list your {category.toLowerCase()}.
          </p>
          <Button asChild className="mt-4 font-body">
            <Link href="/signup">Start Selling</Link>
          </Button>
        </div>
      )}

      {/* Related Categories */}
      <div className="space-y-4">
        <h2 className="font-display text-xl font-bold text-foreground">
          Browse Other Categories
        </h2>
        <div className="flex flex-wrap gap-2">
          {relatedCategories.map((c) => (
            <Link
              key={c}
              href={`/equipment/${categorySlug(c)}`}
              className="rounded-full border border-border px-4 py-2 font-body text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              {c}
            </Link>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-xl border border-border bg-card p-8 text-center sm:p-12">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Have {category} to Sell?
        </h2>
        <p className="mx-auto mt-2 max-w-lg font-body text-muted-foreground">
          List your equipment for free on Metal Gear and reach thousands of buyers in Houston and beyond.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg" className="font-body">
            <Link href="/signup">List Your Equipment</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="font-body">
            <Link href="/pricing">View Plans</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
