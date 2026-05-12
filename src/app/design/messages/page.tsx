import Link from 'next/link'
import { MessagesDesktop } from '@/components/design-preview/messages/MessagesDesktop'
import {
  MobileMessagesCompose,
  MobileMessagesInbox,
  MobileMessagesThread,
} from '@/components/design-preview/messages/MobileMessages'
import { MobileFrame } from '@/components/design-preview/_shared/MobileFrame'

type Variant = 'desktop' | 'mobile-inbox' | 'mobile-thread' | 'mobile-compose'

const VARIANTS: Array<{ key: Variant; label: string }> = [
  { key: 'desktop', label: 'Desktop · Inbox + thread' },
  { key: 'mobile-inbox', label: 'Mobile · Inbox' },
  { key: 'mobile-thread', label: 'Mobile · Thread' },
  { key: 'mobile-compose', label: 'Mobile · New message' },
]

function isVariant(v: string | undefined): v is Variant {
  return VARIANTS.some((entry) => entry.key === v)
}

export default async function MessagesPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>
}) {
  const params = await searchParams
  const variant: Variant = isVariant(params.variant) ? params.variant : 'desktop'
  const isMobile = variant !== 'desktop'

  return (
    <div>
      <VariantSwitcher active={variant} />
      {isMobile ? (
        <MobileFrame>
          {variant === 'mobile-inbox' && <MobileMessagesInbox />}
          {variant === 'mobile-thread' && <MobileMessagesThread />}
          {variant === 'mobile-compose' && <MobileMessagesCompose />}
        </MobileFrame>
      ) : (
        <div style={{ height: 'calc(100vh - 48px)' }}>
          <MessagesDesktop />
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
        Messages · Variant
      </span>
      {VARIANTS.map((v) => {
        const isActive = active === v.key
        return (
          <Link
            key={v.key}
            href={`/design/messages?variant=${v.key}`}
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
