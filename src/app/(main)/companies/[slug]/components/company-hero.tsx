'use client'

import Image from 'next/image'
import { Star, Package, Users, Calendar } from 'lucide-react'

interface CompanyHeroProps {
  company: {
    name: string
    logo_url: string | null
    banner_url: string | null
    city: string | null
    state: string | null
    industry: string | null
    website: string | null
  }
  listingCount: number
  memberCount: number
  memberSince: number
  avgRating?: number
  totalReviews?: number
}

export function CompanyHero({
  company,
  listingCount,
  memberCount,
  memberSince,
  avgRating,
  totalReviews,
}: CompanyHeroProps) {
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
            <h1 className="truncate font-display text-2xl font-bold md:text-3xl">
              {company.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {company.city}
              {company.state ? `, ${company.state}` : ''}
              {company.industry ? ` · ${company.industry}` : ''}
            </p>
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
