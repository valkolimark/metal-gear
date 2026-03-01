import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://metal-gear-five.vercel.app'

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
      images: [
        {
          url: `${APP_URL}/api/og?listing=${id}`,
          width: 1200,
          height: 630,
          alt: listing.title,
        },
      ],
      type: 'website',
      siteName: 'Metal Gear',
    },
    twitter: {
      card: 'summary_large_image',
      title: listing.title,
      description,
      images: [`${APP_URL}/api/og?listing=${id}`],
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
