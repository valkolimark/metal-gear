import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const admin = createAdminClient()

  const { data: listing } = await admin
    .from('listings')
    .select('title, description, category, price_cents, contact_for_price, location_city, location_state')
    .eq('id', id)
    .single()

  if (!listing) {
    return { title: 'Listing Not Found — Metal Gear' }
  }

  const price = listing.contact_for_price
    ? 'Contact for Price'
    : listing.price_cents
      ? `$${(listing.price_cents / 100).toLocaleString()}`
      : 'Free'

  const description =
    listing.description?.slice(0, 160) ||
    `${listing.category} — ${price} — ${listing.location_city}, ${listing.location_state}`

  return {
    title: `${listing.title} — Metal Gear`,
    description,
    openGraph: {
      title: listing.title,
      description,
      type: 'website',
      siteName: 'Metal Gear',
    },
    twitter: {
      card: 'summary',
      title: listing.title,
      description,
    },
  }
}

export default function ListingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
