import { notFound } from 'next/navigation'
import {
  getPublicCompanyBySlug,
  getCompanyActiveListings,
  getCompanyReputationStats,
  getCompanyListingCount,
} from '@/app/actions/companies-public'
import { CompanyHero } from './components/company-hero'
import { CompanyListings } from './components/company-listings'
import { CompanyReputation } from './components/company-reputation'
import type { Metadata } from 'next'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const company = await getPublicCompanyBySlug(slug)
  if (!company) return { title: 'Company Not Found' }
  return {
    title: `${company.name} — Metal Gear`,
    description: `Browse active equipment listings from ${company.name}. ${company.city ?? ''}${company.state ? `, ${company.state}` : ''}.`,
    openGraph: {
      title: company.name,
      description: `Industrial equipment dealer — ${company.city ?? ''}${company.state ? `, ${company.state}` : ''}`,
      images: company.logo_url ? [company.logo_url] : [],
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

  return (
    <div className="min-h-screen">
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
