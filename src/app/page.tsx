import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { ArrowRight, Shield, Zap, Globe, Users, Star, MapPin, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { MarketingHeader } from '@/components/layout/marketing-header'
import { Footer } from '@/components/layout/footer'
import { JsonLd } from '@/components/json-ld'
import { createAdminClient } from '@/lib/supabase/admin'
import { EQUIPMENT_CATEGORIES } from '@/lib/constants'
import { ProblemDiagnoser } from '@/components/search/ProblemDiagnoser'
import { WelcomeBackStrip } from '@/app/(marketing)/components/WelcomeBackStrip'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Metal Gear — Industrial Equipment Marketplace | Houston, TX',
  description: 'Buy and sell heavy industrial equipment: centrifuges, pumps, compressors, and more. Serving oil & gas, petrochemical, mining, and manufacturing industries across Texas and beyond.',
  openGraph: {
    title: 'Metal Gear — Industrial Equipment Marketplace',
    description: 'Buy and sell heavy industrial equipment across oil & gas, petrochemical, mining, and manufacturing.',
    images: [{ url: 'https://metal-gear-five.vercel.app/api/og?type=home', width: 1200, height: 630 }],
    type: 'website',
    locale: 'en_US',
    siteName: 'Metal Gear',
  },
  alternates: {
    canonical: 'https://metal-gear-five.vercel.app',
  },
}

function categorySlug(name: string): string {
  return name.toLowerCase().replace(/[&]/g, 'and').replace(/\s+/g, '-')
}

const TESTIMONIALS = [
  {
    name: 'Robert Chen',
    role: 'Plant Manager, Gulf Coast Petrochemical',
    quote: 'Metal Gear saved us thousands on refurbished compressors. The listing quality and seller verification give us confidence in every purchase.',
    rating: 5,
  },
  {
    name: 'Sarah Martinez',
    role: 'Owner, Precision CNC Solutions',
    quote: 'Listed our surplus lathes and had three offers within a week. The comparison tools helped buyers make faster decisions.',
    rating: 5,
  },
  {
    name: 'James Okafor',
    role: 'Procurement Lead, TX Mining Corp',
    quote: 'The search radius filter and map view make it easy to find equipment nearby. We\'ve cut procurement time in half.',
    rating: 5,
  },
]

const FEATURES = [
  {
    icon: Shield,
    title: 'Verified Sellers',
    description: 'Every seller is verified. Reviews and ratings help you buy with confidence.',
  },
  {
    icon: Zap,
    title: 'Real-Time Offers',
    description: 'Make offers, negotiate prices, and get instant notifications on deals.',
  },
  {
    icon: Globe,
    title: 'Map-Based Search',
    description: 'Find equipment near you with radius filters and interactive map views.',
  },
  {
    icon: Users,
    title: 'Growing Community',
    description: 'Join thousands of buyers and sellers across oil & gas, manufacturing, and more.',
  },
]

export default async function HomePage() {
  // Check if user is logged in for welcome strip
  let firstName: string | null = null
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user?.id) {
      const adminClient = createAdminClient()
      const { data: profile } = await adminClient
        .from('profiles')
        .select('display_name')
        .eq('id', user.id)
        .maybeSingle()
      firstName = profile?.display_name?.split(' ')[0] ?? null
    }
  } catch {
    // Session check failed — show anonymous homepage
  }

  const admin = createAdminClient()

  // Try homepage featured slots first, fall back to most-viewed
  const { data: featuredSlots } = await admin
    .from('homepage_featured_slots')
    .select('target_id')
    .eq('active', true)
    .eq('slot_type', 'listing')
    .order('position', { ascending: true })
    .limit(6)

  const slotListingIds = (featuredSlots ?? []).map((s) => s.target_id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let featured: any[] | null = null
  if (slotListingIds.length > 0) {
    const { data } = await admin
      .from('listings')
      .select('id, title, category, condition, price_cents, contact_for_price, location_city, location_state, favorites_count, is_featured, listing_images(url, position)')
      .in('id', slotListingIds)
      .eq('status', 'active')
      .eq('has_media', true)
    featured = data
  }

  // Fill remaining slots with boosted/most-viewed listings
  if (!featured || featured.length < 3) {
    const existingIds = (featured ?? []).map((l) => l.id)
    const { data: fallback } = await admin
      .from('listings')
      .select('id, title, category, condition, price_cents, contact_for_price, location_city, location_state, favorites_count, is_featured, listing_images(url, position)')
      .eq('status', 'active')
      .eq('has_media', true)
      .not('id', 'in', `(${existingIds.length > 0 ? existingIds.join(',') : '00000000-0000-0000-0000-000000000000'})`)
      .order('is_featured', { ascending: false })
      .order('views_count', { ascending: false })
      .limit(6 - (featured?.length ?? 0))
    featured = [...(featured ?? []), ...(fallback ?? [])]
  }

  const { count: totalListings } = await admin
    .from('listings')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'active')

  const { count: totalUsers } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })

  const displayCategories = EQUIPMENT_CATEGORIES.filter((c) => c !== 'Other').slice(0, 12)

  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Metal Gear',
    description: 'B2B industrial equipment marketplace serving oil & gas, petrochemical, mining, and manufacturing industries.',
    url: 'https://metal-gear-five.vercel.app',
    logo: 'https://metal-gear-five.vercel.app/icons/icon-512.svg',
    foundingLocation: {
      '@type': 'Place',
      name: 'Houston, TX',
    },
    areaServed: {
      '@type': 'State',
      name: 'Texas',
    },
  }

  return (
    <div className="flex min-h-screen flex-col">
      <JsonLd data={organizationSchema} />
      <MarketingHeader />
      <main className="flex-1">
        {firstName && <WelcomeBackStrip firstName={firstName} />}
        {/* Hero */}
        <section className="relative overflow-hidden px-4 py-20 sm:py-28">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
          <div className="relative mx-auto flex max-w-4xl flex-col items-center gap-6 text-center">
            <Badge variant="secondary" className="font-body text-sm">
              Houston, TX Industrial Marketplace
            </Badge>
            <h1 className="font-display text-5xl font-bold tracking-tight text-foreground sm:text-7xl">
              Metal <span className="text-primary">Gear</span>
            </h1>
            <p className="max-w-2xl font-body text-lg text-muted-foreground sm:text-xl">
              The marketplace for industrial equipment. Buy and sell heavy machinery
              across oil &amp; gas, petrochemical, mining, manufacturing, and CNC machining.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="font-body text-base">
                <Link href="/signup">
                  Start Selling Free
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-body text-base">
                <Link href="/search">Browse Equipment</Link>
              </Button>
            </div>
            <div className="mt-4 flex divide-x divide-border font-body text-sm text-muted-foreground">
              <div className="px-4">
                <span className="font-display text-2xl font-bold text-foreground">{totalListings ?? 0}</span>
                <p>Active Listings</p>
              </div>
              <div className="px-4">
                <span className="font-display text-2xl font-bold text-foreground">{totalUsers ?? 0}</span>
                <p>Users</p>
              </div>
              <div className="px-4">
                <span className="font-display text-2xl font-bold text-foreground">Free</span>
                <p>To List</p>
              </div>
            </div>
          </div>
        </section>

        {/* Describe Your Problem */}
        <section className="px-4 py-8">
          <div className="mx-auto max-w-2xl">
            <ProblemDiagnoser />
          </div>
        </section>

        {/* Featured Listings */}
        {featured && featured.length > 0 && (
          <section className="px-4 py-16">
            <div className="mx-auto max-w-6xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
                    Featured Equipment
                  </h2>
                  <p className="mt-1 font-body text-muted-foreground">
                    Top picks and boosted listings
                  </p>
                </div>
                <Button asChild variant="outline" className="hidden font-body sm:flex">
                  <Link href="/search">
                    View All <ArrowRight className="ml-1.5 size-3.5" />
                  </Link>
                </Button>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((listing) => {
                  const imageUrl = listing.listing_images
                    ?.sort((a: { position: number }, b: { position: number }) => a.position - b.position)[0]
                    ?.url
                  return (
                    <Link key={listing.id} href={`/listings/${listing.id}`}>
                      <Card className="h-full overflow-hidden border-border bg-card py-0 gap-0 transition-colors hover:border-primary/50">
                        <div className="relative aspect-[16/10] bg-muted">
                          {imageUrl ? (
                            <Image
                              src={imageUrl}
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
                          )}
                          {listing.is_featured && (
                            <Badge className="absolute left-2 top-2 bg-primary/90 font-body text-[11px] text-white">
                              Featured
                            </Badge>
                          )}
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
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  )
                })}
              </div>
              <div className="mt-4 text-center sm:hidden">
                <Button asChild variant="outline" className="font-body">
                  <Link href="/search">
                    View All Listings <ArrowRight className="ml-1.5 size-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Category Grid */}
        <section className="bg-surface/30 px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center font-display text-2xl font-bold text-foreground sm:text-3xl">
              Browse by Category
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-center font-body text-muted-foreground">
              Find exactly what you need across 20+ equipment categories
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {displayCategories.map((category) => (
                <Link
                  key={category}
                  href={`/equipment/${categorySlug(category)}`}
                  className="group rounded-lg border border-border bg-card p-4 text-center transition-colors hover:border-primary/50"
                >
                  <p className="font-body text-sm font-medium text-foreground group-hover:text-primary">
                    {category}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center font-display text-2xl font-bold text-foreground sm:text-3xl">
              Why Metal Gear?
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="text-center">
                  <div className="mx-auto flex size-12 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="size-6 text-primary" />
                  </div>
                  <h3 className="mt-3 font-display text-base font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-1 font-body text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="bg-surface/30 px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="text-center font-display text-2xl font-bold text-foreground sm:text-3xl">
              Trusted by Industry Professionals
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <Card key={t.name} className="border-border bg-card">
                  <CardContent className="p-6">
                    <div className="flex gap-0.5">
                      {Array.from({ length: t.rating }).map((_, i) => (
                        <Star key={i} className="size-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <p className="mt-3 font-body text-sm text-muted-foreground">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="mt-4">
                      <p className="font-body text-sm font-medium text-foreground">{t.name}</p>
                      <p className="font-body text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-20">
          <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card p-8 text-center sm:p-12">
            <h2 className="font-display text-3xl font-bold text-foreground sm:text-4xl">
              Ready to Buy or Sell?
            </h2>
            <p className="mx-auto mt-3 max-w-lg font-body text-lg text-muted-foreground">
              Join Houston&apos;s fastest-growing industrial equipment marketplace.
              Free to list, powerful tools to close deals.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="font-body text-base">
                <Link href="/signup">
                  Create Free Account
                  <ArrowRight className="ml-2 size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="font-body text-base">
                <Link href="/pricing">View Plans</Link>
              </Button>
            </div>
            <p className="mt-4 font-body text-sm text-muted-foreground">
              No credit card required. Premium plans from $29.99/mo.
            </p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
