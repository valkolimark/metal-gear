import Link from 'next/link'
import { SettingsCompanyDesktop } from '@/components/design-preview/settings/SettingsDesktop'
import { MobileSettingsCompany } from '@/components/design-preview/settings/MobileSettings'
import { MobileFrame } from '@/components/design-preview/_shared/MobileFrame'

type Variant = 'desktop-preview' | 'desktop-wide' | 'mobile'

const VARIANTS: Array<{ key: Variant; label: string }> = [
  { key: 'desktop-preview', label: 'Desktop · With buyer preview' },
  { key: 'desktop-wide', label: 'Desktop · Wide (no preview rail)' },
  { key: 'mobile', label: 'Mobile · Accordion sections' },
]

function isVariant(v: string | undefined): v is Variant {
  return VARIANTS.some((entry) => entry.key === v)
}

export default async function SettingsPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>
}) {
  const params = await searchParams
  const variant: Variant = isVariant(params.variant) ? params.variant : 'desktop-preview'
  const isMobile = variant === 'mobile'

  return (
    <div>
      <VariantSwitcher active={variant} />
      {isMobile ? (
        <MobileFrame>
          <MobileSettingsCompany />
        </MobileFrame>
      ) : (
        <div style={{ height: 'calc(100vh - 48px)' }}>
          <SettingsCompanyDesktop variant={variant === 'desktop-preview' ? 'preview' : 'wide'} />
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
        Settings · Variant
      </span>
      {VARIANTS.map((v) => {
        const isActive = active === v.key
        return (
          <Link
            key={v.key}
            href={`/design/settings?variant=${v.key}`}
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
