import Link from 'next/link'
import {
  ProfileDesktopPersonOwn,
  ProfileDesktopPersonVisit,
  ProfileDesktopCompanyVisit,
} from '@/components/design-preview/profile/ProfileDesktop'
import {
  MobileProfilePerson,
  MobileProfileCompany,
} from '@/components/design-preview/profile/MobileProfile'
import { MobileFrame } from '@/components/design-preview/_shared/MobileFrame'

type Variant =
  | 'person-own'
  | 'person-visit'
  | 'company-visit'
  | 'mobile-person'
  | 'mobile-company'

const VARIANTS: Array<{ key: Variant; label: string }> = [
  { key: 'person-own', label: 'Desktop · Person (Own)' },
  { key: 'person-visit', label: 'Desktop · Person (Visiting)' },
  { key: 'company-visit', label: 'Desktop · Company (Visiting)' },
  { key: 'mobile-person', label: 'Mobile · Person' },
  { key: 'mobile-company', label: 'Mobile · Company' },
]

function isVariant(v: string | undefined): v is Variant {
  return VARIANTS.some((entry) => entry.key === v)
}

export default async function ProfilePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>
}) {
  const params = await searchParams
  const variant: Variant = isVariant(params.variant) ? params.variant : 'person-visit'
  const isMobile = variant === 'mobile-person' || variant === 'mobile-company'

  return (
    <div>
      <VariantSwitcher active={variant} />
      {isMobile ? (
        <MobileFrame>
          {variant === 'mobile-person' && <MobileProfilePerson viewer="visit" />}
          {variant === 'mobile-company' && <MobileProfileCompany />}
        </MobileFrame>
      ) : (
        <>
          {variant === 'person-own' && <ProfileDesktopPersonOwn />}
          {variant === 'person-visit' && <ProfileDesktopPersonVisit />}
          {variant === 'company-visit' && <ProfileDesktopCompanyVisit />}
        </>
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
        Profile · Variant
      </span>
      {VARIANTS.map((v) => {
        const isActive = active === v.key
        return (
          <Link
            key={v.key}
            href={`/design/profile?variant=${v.key}`}
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

