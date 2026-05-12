import Link from 'next/link'
import { SearchEntry } from '@/components/design-preview/search/SearchEntry'
import {
  SearchResults,
  type SearchResultsView,
} from '@/components/design-preview/search/SearchResults'
import {
  MobileSearchEntry,
  MobileSearchResults,
} from '@/components/design-preview/search/MobileSearch'

type Variant =
  | 'entry'
  | 'results-list'
  | 'results-grid'
  | 'results-map'
  | 'mobile-entry'
  | 'mobile-results'

const VARIANTS: Array<{ key: Variant; label: string }> = [
  { key: 'entry', label: 'Desktop · Entry' },
  { key: 'results-list', label: 'Desktop · Results (List)' },
  { key: 'results-grid', label: 'Desktop · Results (Grid)' },
  { key: 'results-map', label: 'Desktop · Results (Map)' },
  { key: 'mobile-entry', label: 'Mobile · Entry' },
  { key: 'mobile-results', label: 'Mobile · Results' },
]

function isVariant(v: string | undefined): v is Variant {
  return VARIANTS.some((entry) => entry.key === v)
}

const RESULTS_VIEW: Record<'results-list' | 'results-grid' | 'results-map', SearchResultsView> = {
  'results-list': 'list',
  'results-grid': 'grid',
  'results-map': 'map',
}

export default async function SearchPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string }>
}) {
  const params = await searchParams
  const variant: Variant = isVariant(params.variant) ? params.variant : 'entry'
  const isMobile = variant === 'mobile-entry' || variant === 'mobile-results'

  return (
    <div>
      <VariantSwitcher active={variant} />
      {isMobile ? (
        <MobileFrame>
          {variant === 'mobile-entry' && <MobileSearchEntry />}
          {variant === 'mobile-results' && <MobileSearchResults />}
        </MobileFrame>
      ) : (
        <>
          {variant === 'entry' && <SearchEntry />}
          {(variant === 'results-list' || variant === 'results-grid' || variant === 'results-map') && (
            <SearchResults initialView={RESULTS_VIEW[variant]} />
          )}
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
        Search · Variant
      </span>
      {VARIANTS.map((v) => {
        const isActive = active === v.key
        return (
          <Link
            key={v.key}
            href={`/design/search?variant=${v.key}`}
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

function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '32px 16px 64px',
        background: '#F4F6FA',
        minHeight: 'calc(100vh - 48px)',
      }}
    >
      <div
        style={{
          width: 390,
          height: 844,
          background: '#000',
          borderRadius: 48,
          padding: 8,
          boxShadow: '0 24px 60px rgba(11,37,69,0.18)',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#F0F2F5',
            borderRadius: 40,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}
