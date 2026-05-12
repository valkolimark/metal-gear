'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Heart } from 'lucide-react'
import { addTrustedVendor, removeTrustedVendor } from '@/app/actions/trusted-vendors'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CompanyHeroProps {
  company: {
    id: string
    name: string
    logo_url: string | null
    banner_url: string | null
    city: string | null
    state: string | null
    industries: string[]
    website: string | null
  }
  listingCount: number
  memberCount: number
  memberSince: number
  avgRating?: number
  totalReviews?: number
  userId?: string | null
  isFavorited?: boolean
  isOwnCompany?: boolean
}

export function CompanyHero({
  company,
  listingCount,
  memberCount,
  memberSince,
  avgRating,
  totalReviews,
  userId,
  isFavorited: initialFavorited,
  isOwnCompany,
}: CompanyHeroProps) {
  const [favorited, setFavorited] = useState(initialFavorited ?? false)

  async function handleToggleFavorite() {
    if (!userId) return
    const prev = favorited
    setFavorited(!prev)

    const result = prev
      ? await removeTrustedVendor(userId, company.id)
      : await addTrustedVendor(userId, company.id)

    if (!result.success) {
      setFavorited(prev)
      toast.error('Failed to update trusted vendors')
    }
  }

  // 4-tile cover grid — design-handoff_inner_pages/sellers/SellersShared.jsx.
  // Banner photo gets the large left tile when available; the other three
  // tiles use industrial gradient placeholders so the storefront never
  // shows a single flat banner.
  const tileGradients = [
    'linear-gradient(135deg, #1E3A8A 0%, #1877F2 60%, #3D9BD6 100%)',
    'linear-gradient(135deg, #155E75 0%, #0EA5E9 100%)',
    'linear-gradient(135deg, #831843 0%, #DB2777 100%)',
    'linear-gradient(135deg, #1F2937 0%, #4B5563 100%)',
  ]

  return (
    <div className="relative">
      {/* Cover grid */}
      <div
        className="relative grid"
        style={{
          height: 280,
          gridTemplateColumns: '2fr 1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          gap: 4,
          background: '#0A1628',
        }}
      >
        {/* Large left tile — banner photo if uploaded, otherwise gradient */}
        <div
          className="relative overflow-hidden"
          style={{
            gridRow: '1 / span 2',
            background: company.banner_url ? '#0A1628' : tileGradients[0],
          }}
        >
          {company.banner_url && (
            <Image
              src={company.banner_url}
              alt={`${company.name} banner`}
              fill
              className="object-cover"
              unoptimized
            />
          )}
          {!company.banner_url && (
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
          {/* Cover chips */}
          <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 flex-wrap">
            <span
              className="text-[10px] font-bold uppercase px-2 h-[22px] inline-flex items-center"
              style={{
                background: 'rgba(255,255,255,0.16)',
                color: '#fff',
                borderRadius: 4,
                letterSpacing: '0.10em',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                backdropFilter: 'blur(8px)',
              }}
            >
              COMPANY · STOREFRONT
            </span>
            <span
              className="text-[10px] font-bold uppercase px-2 h-[22px] inline-flex items-center gap-1"
              style={{
                background: 'rgba(34,197,94,0.20)',
                color: '#86EFAC',
                borderRadius: 4,
                letterSpacing: '0.10em',
                fontFamily: 'var(--font-jetbrains-mono), monospace',
                backdropFilter: 'blur(8px)',
              }}
            >
              VERIFIED SELLER
            </span>
          </div>
        </div>
        {/* Three small gradient tiles on the right */}
        {tileGradients.slice(1, 4).map((bg, i) => (
          <div
            key={i}
            className="relative overflow-hidden"
            style={{ background: bg }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(135deg, rgba(255,255,255,0.05) 0 1px, transparent 1px 16px)',
              }}
            />
          </div>
        ))}
      </div>

      {/* Company identity row */}
      <div className="mx-auto max-w-7xl px-4">
        <div className="-mt-12 flex items-end gap-4 pb-4 md:-mt-16">
          {/* Logo */}
          <div className="flex size-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-background bg-card shadow-lg md:size-32">
            {company.logo_url ? (
              <Image
                src={company.logo_url}
                alt={company.name}
                width={128}
                height={128}
                className="object-contain"
                unoptimized
              />
            ) : (
              <span className="font-display text-3xl font-bold text-primary md:text-4xl">
                {company.name.charAt(0)}
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 pb-2">
            <div className="flex items-center gap-3">
              <h1 className="truncate font-display text-2xl font-bold md:text-3xl">
                {company.name}
              </h1>
              {userId && !isOwnCompany && (
                <button
                  onClick={handleToggleFavorite}
                  aria-label={favorited ? 'Remove from trusted vendors' : 'Add to trusted vendors'}
                  className="flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm transition-colors hover:bg-muted"
                >
                  <Heart
                    className={cn(
                      'size-4',
                      favorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'
                    )}
                  />
                  <span className="hidden sm:inline">
                    {favorited ? 'Trusted Vendor' : 'Add to Trusted Vendors'}
                  </span>
                </button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {company.city}
              {company.state ? `, ${company.state}` : ''}
            </p>
            {company.industries.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {company.industries.map((ind) => (
                  <span
                    key={ind}
                    className="inline-flex items-center rounded-full border border-border bg-card px-2.5 py-0.5 font-body text-xs text-foreground"
                  >
                    {ind}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Trust strip — design-handoff_inner_pages/profile/ProfileShared.jsx */}
        <div
          className="mt-4 grid overflow-hidden rounded-2xl bg-card"
          style={{
            gridTemplateColumns:
              avgRating != null && totalReviews != null && totalReviews > 0
                ? 'repeat(4, 1fr)'
                : 'repeat(3, 1fr)',
            boxShadow:
              '0 1px 2px rgba(11,37,69,0.04), 0 4px 12px rgba(11,37,69,0.05)',
          }}
        >
          {avgRating != null && totalReviews != null && totalReviews > 0 && (
            <div
              className="flex flex-col px-5 py-3.5"
              style={{ borderRight: '1px solid var(--border)' }}
            >
              <span
                className="font-body text-[10.5px] font-bold uppercase text-muted-foreground"
                style={{ letterSpacing: '0.10em' }}
              >
                Rating
              </span>
              <span
                className="font-display text-[22px] font-bold leading-none"
                style={{ color: '#FF6B2B', letterSpacing: '-0.01em' }}
              >
                {avgRating.toFixed(1)}★
              </span>
              <span className="font-body text-[11px] text-muted-foreground mt-1">
                {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
              </span>
            </div>
          )}
          <div
            className="flex flex-col px-5 py-3.5"
            style={{ borderRight: '1px solid var(--border)' }}
          >
            <span
              className="font-body text-[10.5px] font-bold uppercase text-muted-foreground"
              style={{ letterSpacing: '0.10em' }}
            >
              Listings
            </span>
            <span
              className="font-display text-[22px] font-bold leading-none text-foreground"
              style={{ letterSpacing: '-0.01em' }}
            >
              {listingCount}
            </span>
            <span className="font-body text-[11px] text-muted-foreground mt-1">
              Active
            </span>
          </div>
          <div
            className="flex flex-col px-5 py-3.5"
            style={{ borderRight: '1px solid var(--border)' }}
          >
            <span
              className="font-body text-[10.5px] font-bold uppercase text-muted-foreground"
              style={{ letterSpacing: '0.10em' }}
            >
              Team
            </span>
            <span
              className="font-display text-[22px] font-bold leading-none text-foreground"
              style={{ letterSpacing: '-0.01em' }}
            >
              {memberCount}
            </span>
            <span className="font-body text-[11px] text-muted-foreground mt-1">
              {memberCount === 1 ? 'member' : 'members'}
            </span>
          </div>
          <div className="flex flex-col px-5 py-3.5">
            <span
              className="font-body text-[10.5px] font-bold uppercase text-muted-foreground"
              style={{ letterSpacing: '0.10em' }}
            >
              On platform
            </span>
            <span
              className="font-display text-[22px] font-bold leading-none text-foreground"
              style={{ letterSpacing: '-0.01em' }}
            >
              {new Date().getFullYear() - memberSince}
              <span className="text-[14px] ml-1">yrs</span>
            </span>
            <span className="font-body text-[11px] text-muted-foreground mt-1">
              since {memberSince}
            </span>
          </div>
        </div>
        {company.website && (
          <div className="mt-3 pb-4">
            <a
              href={
                company.website.startsWith('http')
                  ? company.website
                  : `https://${company.website}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="font-body text-sm text-primary hover:underline"
            >
              {company.website.replace(/^https?:\/\//, '')}
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
