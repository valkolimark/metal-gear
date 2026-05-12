import Link from 'next/link'
import {
  MobileSOSDashboard,
  SOSDashboardCards,
  SOSDashboardConsole,
} from '@/components/design-preview/sos/SOSDashboard'
import { MobileFrame } from '@/components/design-preview/_shared/MobileFrame'

type Variant = 'desktop-console' | 'desktop-cards' | 'mobile'

const VARIANTS: Array<{ key: Variant; label: string }> = [
  { key: 'desktop-console', label: 'Desktop · Console (table)' },
  { key: 'desktop-cards', label: 'Desktop · Cards (grid)' },
  { key: 'mobile', label: 'Mobile · Card list' },
]

function isVariant(v: string | undefined): v is Variant {
  return VARIANTS.some((entry) => entry.key === v)
}

export default async function SOSPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>
}) {
  const params = await searchParams
  const variant: Variant = isVariant(params.variant) ? params.variant : 'desktop-console'
  return (
    <div>
      <VariantSwitcher active={variant} />
      {variant === 'mobile' ? (
        <MobileFrame>
          <MobileSOSDashboard />
        </MobileFrame>
      ) : variant === 'desktop-cards' ? (
        <SOSDashboardCards />
      ) : (
        <SOSDashboardConsole />
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
        SOS · Variant
      </span>
      {VARIANTS.map((v) => {
        const isActive = active === v.key
        return (
          <Link
            key={v.key}
            href={`/design/sos?variant=${v.key}`}
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
