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
    .select('title, description, category, condition, price_cents, contact_for_price, location_city, location_state, listing_images(url, position)')
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

  const sortedImages = ((listing.listing_images as { url: string; position: number }[]) ?? [])
    .sort((a, b) => a.position - b.position)
  const primaryImage = sortedImages[0]?.url

  const truncTitle = listing.title.length > 60 ? listing.title.slice(0, 57) + '...' : listing.title
  const location = [listing.location_city, listing.location_state].filter(Boolean).join(', ')
  const ogUrl = `${APP_URL}/api/og?type=listing&title=${encodeURIComponent(truncTitle)}${listing.price_cents ? `&price=${listing.price_cents / 100}` : ''}&condition=${encodeURIComponent(listing.condition ?? '')}&location=${encodeURIComponent(location)}${primaryImage ? `&image=${encodeURIComponent(primaryImage)}` : ''}`

  return {
    title: `${listing.title} — $${listing.price_cents ? (listing.price_cents / 100).toLocaleString() : 'Contact'} | Metal Gear`,
    description,
    alternates: {
      canonical: `https://metal-gear-five.vercel.app/listings/${id}`,
    },
    openGraph: {
      title: listing.title,
      description,
      images: [
        {
          url: ogUrl,
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
      images: [ogUrl],
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
