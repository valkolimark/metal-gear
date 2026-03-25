import { notFound } from 'next/navigation'
import {
  getPublicCompanyBySlug,
  getCompanyActiveListings,
  getCompanyReputationStats,
  getCompanyListingCount,
} from '@/app/actions/companies-public'
import { JsonLd } from '@/components/json-ld'
import { CompanyHero } from './components/company-hero'
import { CompanyListings } from './components/company-listings'
import { CompanyReputation } from './components/company-reputation'
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
  const description = `Browse ${listingCount} active equipment listings from ${company.name}. ${location}.`

  const ogUrl = `${APP_URL}/api/og?type=company&name=${encodeURIComponent(company.name)}&location=${encodeURIComponent(location)}&listings=${listingCount}${company.logo_url ? `&logo=${encodeURIComponent(company.logo_url)}` : ''}`

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

  const [listings, listingCount, reputationStats] = await Promise.all([
    getCompanyActiveListings(company.id),
    getCompanyListingCount(company.id),
    getCompanyReputationStats(company.id),
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
        company={company}
        listingCount={listingCount}
        memberCount={memberCount}
        memberSince={memberSince}
        avgRating={reputationStats?.avgRating}
        totalReviews={reputationStats?.totalReviews}
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
