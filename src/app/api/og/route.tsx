import { ImageResponse } from '@vercel/og'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const listingId = searchParams.get('listing')

  if (!listingId) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: '#0A0A0F',
            color: '#FFFFFF',
          }}
        >
          <div style={{ fontSize: 64, fontWeight: 700, color: '#1877F2', display: 'flex' }}>
            Metal Gear
          </div>
          <div style={{ fontSize: 28, color: '#999', marginTop: 16, display: 'flex' }}>
            Industrial Equipment Marketplace
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  const admin = createAdminClient()
  const { data: listing } = await admin
    .from('listings')
    .select('title, price_cents, category, condition, contact_for_price, listing_images(url, position)')
    .eq('id', listingId)
    .single()

  if (!listing) {
    return new ImageResponse(
      (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            backgroundColor: '#0A0A0F',
            color: '#FFFFFF',
          }}
        >
          <div style={{ fontSize: 48, fontWeight: 700, color: '#1877F2', display: 'flex' }}>
            Metal Gear
          </div>
          <div style={{ fontSize: 24, color: '#999', marginTop: 12, display: 'flex' }}>
            Listing not found
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  const images = (listing.listing_images as { url: string; position: number }[]) || []
  const sortedImages = images.sort((a, b) => a.position - b.position)
  const photoUrl = sortedImages[0]?.url

  const price = listing.contact_for_price
    ? 'Contact for Price'
    : listing.price_cents
      ? `$${(listing.price_cents / 100).toLocaleString()}`
      : 'Price TBD'

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          backgroundColor: '#0A0A0F',
        }}
      >
        {/* Left: Photo */}
        <div style={{ display: 'flex', width: '50%', height: '100%', position: 'relative' }}>
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: '100%',
                backgroundColor: '#1A1A2F',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#444',
                fontSize: 64,
              }}
            >
              No Photo
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            width: '50%',
            padding: '48px',
          }}
        >
          {/* Brand */}
          <div style={{ fontSize: 24, fontWeight: 700, color: '#1877F2', marginBottom: 24, display: 'flex' }}>
            METAL GEAR
          </div>

          {/* Title */}
          <div
            style={{
              fontSize: 36,
              fontWeight: 700,
              color: '#FFFFFF',
              lineHeight: 1.2,
              marginBottom: 16,
              display: 'flex',
              maxHeight: '130px',
              overflow: 'hidden',
            }}
          >
            {listing.title.length > 80 ? listing.title.slice(0, 77) + '...' : listing.title}
          </div>

          {/* Category + Condition */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <div
              style={{
                display: 'flex',
                backgroundColor: '#1A1A2F',
                color: '#1877F2',
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              {listing.category || 'Equipment'}
            </div>
            {listing.condition && (
              <div
                style={{
                  display: 'flex',
                  backgroundColor: '#1A1A2F',
                  color: '#999',
                  padding: '8px 16px',
                  borderRadius: 6,
                  fontSize: 16,
                }}
              >
                {listing.condition}
              </div>
            )}
          </div>

          {/* Price */}
          <div style={{ fontSize: 42, fontWeight: 700, color: '#1877F2', display: 'flex' }}>
            {price}
          </div>

          {/* Footer */}
          <div
            style={{
              marginTop: 32,
              fontSize: 16,
              color: '#666',
              display: 'flex',
            }}
          >
            metal-gear-five.vercel.app
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
