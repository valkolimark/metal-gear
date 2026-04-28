import { notFound } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  getPublicCompanyBySlug,
  getCompanyActiveListings,
  getCompanyReputationStats,
  getCompanyListingCount,
} from '@/app/actions/companies-public'
import { isCompanyFavorited } from '@/app/actions/trusted-vendors'
import { JsonLd } from '@/components/json-ld'
import { CompanyHero } from './components/company-hero'
import { CompanyListings } from './components/company-listings'
import { CompanyReputation } from './components/company-reputation'
import { getCompanyIndustries } from '@/types/company'
import type { Metadata } from 'next'

const APP_URL = 'https://metal-gear-five.vercel.app'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const company = await getPublicCompanyBySlug(slug)
  if (!company) return { title: 'Company Not Found' }

  const listingCount = await getCompanyListingCount(company.id)
  const location = [company.city, company.state].filter(Boolean).join(', ')
  const industries = getCompanyIndustries(company)
  const description = `Browse ${listingCount} active equipment listings from ${company.name}. ${location}.`

  const industriesParam = industries.length > 0
    ? `&industries=${encodeURIComponent(industries.slice(0, 4).join(' · '))}`
    : ''
  const ogUrl = `${APP_URL}/api/og?type=company&name=${encodeURIComponent(company.name)}&location=${encodeURIComponent(location)}&listings=${listingCount}${industriesParam}${company.logo_url ? `&logo=${encodeURIComponent(company.logo_url)}` : ''}`

  return {
    title: `${company.name} — Metal Gear`,
    description,
    alternates: {
      canonical: `${APP_URL}/companies/${slug}`,
    },
    openGraph: {
      title: company.name,
      description,
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      siteName: 'Metal Gear',
    },
  }
}

export default async function CompanyPublicPage({ params }: Props) {
  const { slug } = await params

  const company = await getPublicCompanyBySlug(slug)
  if (!company) notFound()

  // Get current user for favorite state
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user?.id ?? null

  // Read active company from cookie
  const cookieStore = await cookies()
  const activeCompanyId = cookieStore.get('active_company_id')?.value ?? null
  const isOwnCompany = activeCompanyId === company.id

  const [listings, listingCount, reputationStats, favorited] = await Promise.all([
    getCompanyActiveListings(company.id),
    getCompanyListingCount(company.id),
    getCompanyReputationStats(company.id),
    userId ? isCompanyFavorited(userId, company.id) : Promise.resolve(false),
  ])

  const memberCount = company.company_memberships?.length ?? 0
  const memberSince = new Date(company.created_at).getFullYear()

  const localBusinessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: company.name,
    image: company.logo_url ?? undefined,
    url: company.website ?? `${APP_URL}/companies/${slug}`,
    address: {
      '@type': 'PostalAddress',
      addressLocality: company.city,
      addressRegion: company.state,
      addressCountry: 'US',
    },
    ...(reputationStats && reputationStats.totalReviews > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: reputationStats.avgRating.toFixed(1),
            reviewCount: reputationStats.totalReviews,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  }

  return (
    <div className="min-h-screen">
      <JsonLd data={localBusinessSchema} />
      <CompanyHero
        company={{
          id: company.id,
          name: company.name,
          logo_url: company.logo_url,
          banner_url: company.banner_url,
          city: company.city,
          state: company.state,
          industries: getCompanyIndustries(company),
          website: company.website,
        }}
        listingCount={listingCount}
        memberCount={memberCount}
        memberSince={memberSince}
        avgRating={reputationStats?.avgRating}
        totalReviews={reputationStats?.totalReviews}
        userId={userId}
        isFavorited={favorited}
        isOwnCompany={isOwnCompany}
      />
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-12">
        {reputationStats && <CompanyReputation stats={reputationStats} />}
        <CompanyListings
          listings={listings}
          totalCount={listingCount}
          companyName={company.name}
          companyId={company.id}
        />
      </div>
    </div>
  )
}
