'use client'

import { useState } from 'react'
import { ModernHeader } from '../_shared/ModernHeader'
import { ProfileCoverHeader, TrustStrip, ProfileTabs, type ProfileTab } from './ProfileShared'
import {
  AboutSection,
  ActivityFeed,
  CapabilitiesCard,
  CertsWall,
  FeaturedCarousel,
  HoursCard,
  PostsStrip,
  ProfileListingsGrid,
  ReviewsCard,
  ServiceMapCard,
  TeamGrid,
} from './ProfileSections'
import {
  COMPANY_PROFILE,
  PERSON_PROFILE,
  PROFILE_ACTIVITY,
  PROFILE_FEATURED,
  PROFILE_LISTINGS,
  PROFILE_REVIEWS,
  type CompanyProfile,
  type PersonProfile,
  type ProfileKind,
  type ProfileViewer,
} from './profile-data'

export function ProfileDesktopPersonOwn() {
  return <ProfileDesktopShell p={PERSON_PROFILE} kind="person" viewer="own" />
}
export function ProfileDesktopPersonVisit() {
  return <ProfileDesktopShell p={PERSON_PROFILE} kind="person" viewer="visit" />
}
export function ProfileDesktopCompanyVisit() {
  return <ProfileDesktopShell p={COMPANY_PROFILE} kind="company" viewer="visit" />
}

function ProfileDesktopShell({
  p,
  kind,
  viewer,
}: {
  p: PersonProfile | CompanyProfile
  kind: ProfileKind
  viewer: ProfileViewer
}) {
  const [tab, setTab] = useState('about')
  const isCompany = kind === 'company'
  const person = p as PersonProfile
  const company = p as CompanyProfile
  const tabs: ProfileTab[] = isCompany
    ? [
        { key: 'about', label: 'About' },
        { key: 'listings', label: 'Inventory', count: 47 },
        { key: 'team', label: 'Team', count: company.team?.length },
        { key: 'reviews', label: 'Reviews', count: p.reviews },
        { key: 'activity', label: 'Activity' },
      ]
    : [
        { key: 'about', label: 'About' },
        { key: 'listings', label: viewer === 'own' ? 'My listings' : 'Listings', count: PROFILE_LISTINGS.length },
        { key: 'activity', label: viewer === 'own' ? 'Posts' : 'Activity' },
        { key: 'reviews', label: 'Reviews', count: p.reviews },
        { key: 'sos', label: 'SOS history', count: person.sosResponses },
      ]
  return (
    <div
      style={{
        width: '100%',
        minHeight: 1100,
        background: '#F0F2F5',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ModernHeader />
      <div className="flex justify-center px-6 py-5">
        <div className="w-full" style={{ maxWidth: 1320 }}>
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid #E5E9EF',
              boxShadow:
                '0 1px 2px rgba(11,37,69,0.04), 0 8px 24px rgba(11,37,69,0.06)',
            }}
          >
            <ProfileCoverHeader p={p} kind={kind} viewer={viewer} />
            <TrustStrip p={p} kind={kind} />
            <ProfileTabs tabs={tabs} active={tab} onChange={setTab} />
          </div>

          <div className="grid mt-5" style={{ gridTemplateColumns: '380px 1fr', gap: 20 }}>
            <aside className="flex flex-col gap-4">
              <AboutSection p={p} kind={kind} />
              {isCompany ? (
                <>
                  <HoursCard p={company} />
                  <CertsWall certs={company.certs} kind="company" />
                </>
              ) : (
                <CertsWall certs={person.certs} kind="person" />
              )}
              <ServiceMapCard city={p.location} radius={p.serviceArea} />
            </aside>

            <main className="flex flex-col gap-4">
              {tab === 'about' && (
                <>
                  {isCompany && <FeaturedCarousel items={PROFILE_FEATURED} />}
                  {isCompany && <CapabilitiesCard p={company} />}
                  <ProfileListingsGrid listings={PROFILE_LISTINGS} mine={viewer === 'own'} />
                  {viewer === 'own' && <PostsStrip />}
                  <ActivityFeed items={PROFILE_ACTIVITY} />
                </>
              )}
              {tab === 'listings' && (
                <ProfileListingsGrid listings={PROFILE_LISTINGS} mine={viewer === 'own'} />
              )}
              {tab === 'team' && isCompany && <TeamGrid members={company.team} />}
              {tab === 'reviews' && <ReviewsCard reviews={PROFILE_REVIEWS} p={p} />}
              {tab === 'activity' && <ActivityFeed items={PROFILE_ACTIVITY} />}
              {tab === 'sos' && (
                <ActivityFeed
                  items={PROFILE_ACTIVITY.filter((a) => a.kind === 'sos-resp' || a.kind === 'tx')}
                />
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  )
}
