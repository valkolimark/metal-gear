'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Star, Package, Users, Calendar, Heart } from 'lucide-react'
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

  return (
    <div className="relative">
      {/* Banner */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-r from-primary to-primary/70 md:h-64">
        {company.banner_url && (
          <Image
            src={company.banner_url}
            alt={`${company.name} banner`}
            fill
            className="object-cover"
            unoptimized
          />
        )}
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

        {/* Stats bar */}
        <div className="flex flex-wrap gap-6 border-t border-border py-4">
          <div className="flex items-center gap-1.5 text-sm">
            <Package className="size-4 text-muted-foreground" />
            <span className="font-semibold">{listingCount}</span>
            <span className="text-muted-foreground">active listings</span>
          </div>
          {avgRating != null && totalReviews != null && totalReviews > 0 && (
            <div className="flex items-center gap-1.5 text-sm">
              <Star className="size-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{avgRating.toFixed(1)}</span>
              <span className="text-muted-foreground">
                ({totalReviews} {totalReviews === 1 ? 'review' : 'reviews'})
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-sm">
            <Users className="size-4 text-muted-foreground" />
            <span className="font-semibold">{memberCount}</span>
            <span className="text-muted-foreground">
              {memberCount === 1 ? 'member' : 'members'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-sm">
            <Calendar className="size-4 text-muted-foreground" />
            <span className="text-muted-foreground">Member since {memberSince}</span>
          </div>
          {company.website && (
            <a
              href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {company.website.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
