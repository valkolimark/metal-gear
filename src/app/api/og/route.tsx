import { ImageResponse } from '@vercel/og'

export const runtime = 'edge'

const BG = '#18191A'
const CARD = '#242526'
const BLUE = '#1877F2'
const TEXT = '#E4E6EB'
const MUTED = '#B0B3B8'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? 'default'

  // Backward compat: ?listing=ID still works via the old DB-based approach
  // but new pages use ?type=listing&title=...&price=... (no DB call in edge)
  const legacyListingId = searchParams.get('listing')
  if (legacyListingId) {
    // Keep legacy behavior — import admin client dynamically
    try {
      const { createAdminClient } = await import('@/lib/supabase/admin')
      const admin = createAdminClient()
      const { data: listing } = await admin
        .from('listings')
        .select('title, price_cents, category, condition, contact_for_price, listing_images(url, position)')
        .eq('id', legacyListingId)
        .single()

      if (!listing) {
        return fallbackImage()
      }

      const images = (listing.listing_images as { url: string; position: number }[]) || []
      const sortedImages = images.sort((a, b) => a.position - b.position)
      const photoUrl = sortedImages[0]?.url
      const price = listing.contact_for_price
        ? 'Contact for Price'
        : listing.price_cents
          ? `$${(listing.price_cents / 100).toLocaleString()}`
          : 'Price TBD'

      return renderListing(
        listing.title,
        price,
        listing.condition ?? '',
        listing.category ?? '',
        photoUrl
      )
    } catch {
      return fallbackImage()
    }
  }

  // --- DEFAULT / Homepage ---
  if (type === 'default' || type === 'home') {
    return new ImageResponse(
      (
        <div style={{ display: 'flex', width: '100%', height: '100%', background: BG, alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
          <div style={{ fontSize: 72, fontWeight: 900, color: BLUE, letterSpacing: '-2px', display: 'flex' }}>METAL GEAR</div>
          <div style={{ fontSize: 28, color: MUTED, marginTop: 16, display: 'flex' }}>Industrial Equipment Marketplace</div>
          <div style={{ fontSize: 20, color: TEXT, marginTop: 12, display: 'flex' }}>Houston, TX · Oil &amp; Gas · Mining · Manufacturing</div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  // --- LISTING (query-param based, no DB call) ---
  if (type === 'listing') {
    const title = searchParams.get('title') ?? 'Industrial Equipment'
    const price = searchParams.get('price')
    const condition = searchParams.get('condition') ?? ''
    const location = searchParams.get('location') ?? ''
    const image = searchParams.get('image')

    const priceDisplay = price ? `$${Number(price).toLocaleString()}` : undefined

    return renderListing(title, priceDisplay, condition, location, image ?? undefined)
  }

  // --- COMPANY ---
  if (type === 'company') {
    const name = searchParams.get('name') ?? 'Industrial Company'
    const location = searchParams.get('location') ?? ''
    const listingCount = searchParams.get('listings') ?? '0'
    const logo = searchParams.get('logo')

    return new ImageResponse(
      (
        <div style={{
          display: 'flex', width: '100%', height: '100%', background: BG,
          alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
        }}>
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" style={{ width: 120, height: 120, borderRadius: 24, marginBottom: 24, objectFit: 'contain', background: CARD }} />
          )}
          <div style={{ fontSize: 48, fontWeight: 800, color: TEXT, textAlign: 'center', marginBottom: 12, display: 'flex' }}>
            {name}
          </div>
          {location && (
            <div style={{ fontSize: 24, color: MUTED, marginBottom: 8, display: 'flex' }}>{location}</div>
          )}
          <div style={{ fontSize: 20, color: BLUE, marginTop: 8, display: 'flex' }}>
            {listingCount} active listings · Metal Gear
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  // --- CATEGORY ---
  if (type === 'category') {
    const categoryName = searchParams.get('category') ?? 'Industrial Equipment'
    const count = searchParams.get('count') ?? ''

    return new ImageResponse(
      (
        <div style={{
          display: 'flex', width: '100%', height: '100%', background: BG,
          alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: BLUE, marginBottom: 24, display: 'flex' }}>METAL GEAR</div>
          <div style={{ fontSize: 56, fontWeight: 900, color: TEXT, textAlign: 'center', textTransform: 'capitalize', display: 'flex' }}>
            {categoryName}
          </div>
          {count && (
            <div style={{ fontSize: 24, color: MUTED, marginTop: 16, display: 'flex' }}>
              {count} listings available
            </div>
          )}
          <div style={{ fontSize: 18, color: MUTED, marginTop: 8, display: 'flex' }}>
            Industrial Equipment Marketplace · Houston, TX
          </div>
        </div>
      ),
      { width: 1200, height: 630 }
    )
  }

  // Fallback for unknown type
  return fallbackImage()
}

function renderListing(title: string, price: string | undefined, condition: string, locationOrCategory: string, imageUrl?: string) {
  const truncTitle = title.length > 60 ? title.slice(0, 57) + '...' : title

  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: BG }}>
        {/* Left: image */}
        <div style={{ display: 'flex', width: '50%', height: '100%' }}>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              display: 'flex', width: '100%', height: '100%', backgroundColor: CARD,
              alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: 64,
            }}>
              No Photo
            </div>
          )}
        </div>
        {/* Right: info */}
        <div style={{
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '48px', flex: 1, background: CARD,
        }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: BLUE, display: 'flex' }}>METAL GEAR</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 32, fontWeight: 800, color: TEXT, lineHeight: 1.2, marginBottom: 16, display: 'flex' }}>
              {truncTitle}
            </div>
            {condition && (
              <div style={{ fontSize: 18, color: MUTED, marginBottom: 8, textTransform: 'capitalize', display: 'flex' }}>
                {condition} condition
              </div>
            )}
            {locationOrCategory && (
              <div style={{ fontSize: 16, color: MUTED, display: 'flex' }}>{locationOrCategory}</div>
            )}
          </div>
          {price ? (
            <div style={{ fontSize: 48, fontWeight: 900, color: TEXT, display: 'flex' }}>{price}</div>
          ) : (
            <div style={{ fontSize: 28, fontWeight: 700, color: MUTED, display: 'flex' }}>Contact for Price</div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}

function fallbackImage() {
  return new ImageResponse(
    (
      <div style={{ display: 'flex', width: '100%', height: '100%', background: BG, alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 48, fontWeight: 900, color: BLUE, display: 'flex' }}>METAL GEAR</div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
