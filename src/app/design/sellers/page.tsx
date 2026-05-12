import Link from 'next/link'
import { SellersDesktop } from '@/components/design-preview/sellers/SellersDesktop'
import { MobileSellers } from '@/components/design-preview/sellers/MobileSellers'
import { MobileFrame } from '@/components/design-preview/_shared/MobileFrame'

type Variant = 'desktop-company' | 'desktop-person' | 'mobile-company' | 'mobile-person'

const VARIANTS: Array<{ key: Variant; label: string }> = [
  { key: 'desktop-company', label: 'Desktop · Company' },
  { key: 'desktop-person', label: 'Desktop · Person' },
  { key: 'mobile-company', label: 'Mobile · Company' },
  { key: 'mobile-person', label: 'Mobile · Person' },
]

function isVariant(v: string | undefined): v is Variant {
  return VARIANTS.some((entry) => entry.key === v)
}

export default async function SellersPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>
}) {
  const params = await searchParams
  const variant: Variant = isVariant(params.variant) ? params.variant : 'desktop-company'
  const isMobile = variant === 'mobile-company' || variant === 'mobile-person'
  const kind: 'company' | 'person' =
    variant === 'desktop-person' || variant === 'mobile-person' ? 'person' : 'company'

  return (
    <div>
      <VariantSwitcher active={variant} />
      {isMobile ? (
        <MobileFrame>
          <MobileSellers initialKind={kind} />
        </MobileFrame>
      ) : (
        <div style={{ height: 'calc(100vh - 48px)' }}>
          <SellersDesktop initialKind={kind} />
        </div>
      )}
    </div>
  )
}

function VariantSwitcher({ active }: { active: Variant }) {
  return (
    <div
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: '#0A1628',
        color: '#E8EEF5',
        padding: '10px 16px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 8,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <Link
        href="/design"
        style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontFamily: 'var(--mg-font-mono)',
          color: 'rgba(255,255,255,0.6)',
          textDecoration: 'none',
          marginRight: 8,
        }}
      >
        ← Index
      </Link>
      <span
        style={{
          fontSize: 11,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          fontFamily: 'var(--mg-font-mono)',
          color: 'rgba(255,255,255,0.45)',
          marginRight: 4,
        }}
      >
        Sellers · Variant
      </span>
      {VARIANTS.map((v) => {
        const isActive = active === v.key
        return (
          <Link
            key={v.key}
            href={`/design/sellers?variant=${v.key}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: 28,
              padding: '0 12px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
              textDecoration: 'none',
              background: isActive ? '#FF6B2B' : 'rgba(255,255,255,0.08)',
              color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.78)',
            }}
          >
            {v.label}
          </Link>
        )
      })}
    </div>
  )
}
