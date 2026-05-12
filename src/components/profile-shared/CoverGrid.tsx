import Link from 'next/link'
import { Camera, ImagePlus } from 'lucide-react'

export interface CoverChip {
  label: string
  variant: 'category' | 'verified'
}

interface CoverGridProps {
  bannerUrl: string | null
  photoUrls: string[] // up to 3
  chips: CoverChip[]
  editable?: boolean
  editHref?: string
  alt?: string
}

const GRADIENT_FILLERS = [
  'linear-gradient(135deg, #155E75 0%, #0EA5E9 100%)',
  'linear-gradient(135deg, #831843 0%, #DB2777 100%)',
  'linear-gradient(135deg, #1F2937 0%, #4B5563 100%)',
]

const LARGE_TILE_FALLBACK =
  'linear-gradient(135deg, #1E3A8A 0%, #1877F2 60%, #3D9BD6 100%)'

export function CoverGrid({
  bannerUrl,
  photoUrls,
  chips,
  editable = false,
  editHref,
  alt = 'Storefront cover',
}: CoverGridProps) {
  const tiles = [photoUrls[0] ?? null, photoUrls[1] ?? null, photoUrls[2] ?? null]
  return (
    <div className="relative">
      {/* Desktop: 4-tile grid */}
      <div
        className="relative hidden overflow-hidden rounded-2xl md:grid"
        style={{
          height: 280,
          gridTemplateColumns: '2fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: 4,
          background: '#0A1628',
        }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            gridRow: '1 / span 2',
            background: bannerUrl ? '#0A1628' : LARGE_TILE_FALLBACK,
          }}
        >
          {bannerUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bannerUrl}
              alt={alt}
              className="absolute inset-0 size-full object-cover"
              crossOrigin="anonymous"
            />
          ) : (
            <>
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18) 0%, transparent 60%)',
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 24px)',
                }}
              />
            </>
          )}
          <CoverChipRow chips={chips} />
        </div>
        {tiles.map((url, i) => (
          <div
            key={i}
            className="relative overflow-hidden"
            style={{ background: url ? '#0A1628' : GRADIENT_FILLERS[i] }}
          >
            {url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={url}
                alt=""
                className="absolute inset-0 size-full object-cover"
                crossOrigin="anonymous"
              />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    'repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 16px)',
                }}
              />
            )}
          </div>
        ))}
        {editable && editHref && (
          <Link
            href={editHref}
            className="absolute right-3 bottom-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-background/95 px-3 text-[12px] font-bold text-foreground shadow-[0_4px_12px_rgba(11,37,69,0.18)] hover:bg-background"
          >
            <ImagePlus className="size-3.5" />
            Edit cover
          </Link>
        )}
      </div>

      {/* Mobile: single banner */}
      <div
        className="relative h-[180px] overflow-hidden rounded-2xl md:hidden"
        style={{ background: bannerUrl ? '#0A1628' : LARGE_TILE_FALLBACK }}
      >
        {bannerUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bannerUrl}
            alt={alt}
            className="absolute inset-0 size-full object-cover"
            crossOrigin="anonymous"
          />
        ) : (
          <>
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.18) 0%, transparent 60%)',
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 24px)',
              }}
            />
          </>
        )}
        <CoverChipRow chips={chips} />
        {editable && editHref && (
          <Link
            href={editHref}
            className="absolute right-3 bottom-3 inline-flex h-8 items-center gap-1.5 rounded-full bg-background/95 px-3 text-[11px] font-bold text-foreground"
          >
            <Camera className="size-3" />
            Edit cover
          </Link>
        )}
      </div>
    </div>
  )
}

function CoverChipRow({ chips }: { chips: CoverChip[] }) {
  if (chips.length === 0) return null
  return (
    <div className="absolute top-4 left-4 inline-flex flex-wrap items-center gap-1.5">
      {chips.map((chip, i) =>
        chip.variant === 'verified' ? (
          <span
            key={i}
            className="inline-flex h-[22px] items-center px-2 text-[10px] font-bold uppercase"
            style={{
              background: 'rgba(34,197,94,0.20)',
              color: '#86EFAC',
              borderRadius: 4,
              letterSpacing: '0.10em',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              backdropFilter: 'blur(8px)',
            }}
          >
            {chip.label}
          </span>
        ) : (
          <span
            key={i}
            className="inline-flex h-[22px] items-center px-2 text-[10px] font-bold uppercase"
            style={{
              background: 'rgba(255,255,255,0.16)',
              color: '#fff',
              borderRadius: 4,
              letterSpacing: '0.10em',
              fontFamily: 'var(--font-jetbrains-mono), monospace',
              backdropFilter: 'blur(8px)',
            }}
          >
            {chip.label}
          </span>
        ),
      )}
    </div>
  )
}
