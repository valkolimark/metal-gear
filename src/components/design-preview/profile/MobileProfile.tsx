'use client'

import { useState } from 'react'
import { PHOTO_BG } from '../_shared/listings-data'
import { ChatAvatar } from '../_shared/ChatAvatar'
import { MobileBottomTabs } from '../_shared/MobileBottomTabs'
import { BookmarkIcon, MessageIcon, MoreIcon } from '../_shared/icons'
import { ActivityIcon } from './ProfileSections'
import {
  COMPANY_PROFILE,
  PERSON_PROFILE,
  PROFILE_ACTIVITY,
  PROFILE_FEATURED,
  PROFILE_LISTINGS,
  PROFILE_REVIEWS,
  type CompanyProfile,
  type PersonProfile,
  type ProfileActivity,
  type ProfileFeatured,
  type ProfileKind,
  type ProfileListing,
  type ProfileReview,
  type ProfileViewer,
} from './profile-data'

export function MobileProfilePerson({ viewer = 'visit' }: { viewer?: ProfileViewer }) {
  return <MobileProfileShell p={PERSON_PROFILE} kind="person" viewer={viewer} />
}

export function MobileProfileCompany() {
  return <MobileProfileShell p={COMPANY_PROFILE} kind="company" viewer="visit" />
}

function MobileProfileShell({
  p,
  kind,
  viewer,
}: {
  p: PersonProfile | CompanyProfile
  kind: ProfileKind
  viewer: ProfileViewer
}) {
  const isCompany = kind === 'company'
  const isOwn = viewer === 'own'
  const person = p as PersonProfile
  const company = p as CompanyProfile
  const [tab, setTab] = useState('about')
  const tabs = isCompany
    ? [
        { key: 'about', label: 'About' },
        { key: 'listings', label: 'Inventory' },
        { key: 'team', label: 'Team' },
        { key: 'reviews', label: 'Reviews' },
      ]
    : [
        { key: 'about', label: 'About' },
        { key: 'listings', label: 'Listings' },
        { key: 'reviews', label: 'Reviews' },
        { key: 'sos', label: 'SOS' },
      ]
  return (
    <div className="h-full flex flex-col" style={{ background: '#F0F2F5', paddingTop: 44 }}>
      <div style={{ height: 8 }} />
      <div
        className="flex items-center gap-2 px-3 py-2 absolute"
        style={{ top: 48, left: 0, right: 0, zIndex: 10 }}
      >
        <button
          type="button"
          className="size-9 flex items-center justify-center"
          style={{
            background: 'rgba(0,0,0,0.32)',
            color: '#fff',
            borderRadius: 999,
            backdropFilter: 'blur(8px)',
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            className="size-9 flex items-center justify-center"
            style={{
              background: 'rgba(0,0,0,0.32)',
              color: '#fff',
              borderRadius: 999,
              backdropFilter: 'blur(8px)',
            }}
          >
            <BookmarkIcon size={14} />
          </button>
          <button
            type="button"
            className="size-9 flex items-center justify-center"
            style={{
              background: 'rgba(0,0,0,0.32)',
              color: '#fff',
              borderRadius: 999,
              backdropFilter: 'blur(8px)',
            }}
          >
            <MoreIcon size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ background: '#F0F2F5' }}>
        <div className="relative" style={{ height: 160, background: p.cover, overflow: 'hidden' }}>
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.16) 0%, transparent 60%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 24px)',
            }}
          />
          <span
            className="absolute top-14 left-3 text-[9px] font-bold uppercase px-1.5 h-[18px] inline-flex items-center"
            style={{
              background: 'rgba(255,255,255,0.16)',
              color: '#fff',
              borderRadius: 3,
              letterSpacing: '0.08em',
              fontFamily: 'var(--mg-font-mono)',
              backdropFilter: 'blur(6px)',
            }}
          >
            {isCompany ? 'COMPANY · VERIFIED' : 'MEMBER · VERIFIED'}
          </span>
        </div>

        <div
          className="relative bg-white px-4 pt-0 pb-4"
          style={{ marginTop: -36, borderBottom: '1px solid #E5E9EF' }}
        >
          <div className="flex items-end gap-3" style={{ marginTop: -32 }}>
            <div className="relative shrink-0">
              <div
                className="flex items-center justify-center font-bold"
                style={{
                  width: 92,
                  height: 92,
                  background: p.avatarColor,
                  color: '#fff',
                  borderRadius: isCompany ? 16 : 999,
                  fontSize: 32,
                  fontFamily: 'var(--mg-font-display)',
                  border: '4px solid #FFFFFF',
                  boxShadow: '0 4px 12px rgba(11,37,69,0.18)',
                }}
              >
                {p.tag}
              </div>
              {!isCompany && person.online && (
                <span
                  className="absolute size-3.5 rounded-full"
                  style={{ right: 4, bottom: 4, background: '#22C55E', border: '2.5px solid #fff' }}
                />
              )}
            </div>
            <div className="pb-1 flex-1 min-w-0">
              <div className="flex items-center gap-1">
                <h1
                  className="text-[18px] font-bold leading-tight truncate"
                  style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)', letterSpacing: '-0.015em' }}
                >
                  {p.name}
                </h1>
                {p.verified && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#1877F2">
                    <path d="M12 1l3 4 5-1-1 5 4 3-4 3 1 5-5-1-3 4-3-4-5 1 1-5-4-3 4-3-1-5 5 1z" />
                  </svg>
                )}
              </div>
              <div className="text-[11.5px] mt-0.5 truncate" style={{ color: '#5A6B82' }}>
                {p.title}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 text-[11px]" style={{ color: '#5A6B82' }}>
            <span>{p.location}</span>
            <span style={{ color: '#CBD5E0' }}>·</span>
            <span>{p.serviceArea}</span>
          </div>

          <div className="flex items-center gap-1.5 mt-3">
            {isOwn ? (
              <>
                <button
                  type="button"
                  className="flex-1 h-9 text-[12.5px] font-bold"
                  style={{ background: '#0B2545', color: '#fff', borderRadius: 999 }}
                >
                  + Add post
                </button>
                <button
                  type="button"
                  className="flex-1 h-9 text-[12.5px] font-bold"
                  style={{ background: '#F0F3F7', color: '#0A1628', borderRadius: 999 }}
                >
                  Edit profile
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="flex-1 h-9 inline-flex items-center justify-center gap-1.5 text-[12.5px] font-bold"
                  style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
                >
                  <MessageIcon size={13} /> Message
                </button>
                <button
                  type="button"
                  className="flex-1 h-9 text-[12.5px] font-bold"
                  style={{ background: '#0B2545', color: '#fff', borderRadius: 999 }}
                >
                  {isCompany ? 'Follow' : 'Connect'}
                </button>
              </>
            )}
          </div>
        </div>

        <div
          className="grid grid-cols-3 bg-white"
          style={{ borderBottom: '1px solid #E5E9EF' }}
        >
          {[
            { label: 'Rating', value: p.rating + ' ★', color: '#FF6B2B' },
            { label: 'Tx', value: String(p.txCount), color: '#0A1628' },
            {
              label: kind === 'person' ? 'SOS' : 'Followers',
              value:
                kind === 'person'
                  ? String(person.sosResponses)
                  : company.followers >= 1000
                    ? (company.followers / 1000).toFixed(1) + 'k'
                    : String(company.followers),
              color: '#FF6B2B',
            },
          ].map((s, i) => (
            <div
              key={i}
              className="px-3 py-2.5 text-center"
              style={{ borderRight: i < 2 ? '1px solid #E5E9EF' : 'none' }}
            >
              <div
                className="text-[18px] font-bold leading-none"
                style={{ color: s.color, fontFamily: 'var(--mg-font-display)' }}
              >
                {s.value}
              </div>
              <div
                className="text-[9.5px] font-bold uppercase mt-1"
                style={{
                  color: '#94A3B8',
                  letterSpacing: '0.08em',
                  fontFamily: 'var(--mg-font-mono)',
                }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </div>

        <div
          className="flex items-center bg-white sticky top-0 z-10"
          style={{ borderBottom: '1px solid #E5E9EF' }}
        >
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="relative flex-1 h-11 text-[12px] font-bold"
              style={{ color: tab === t.key ? '#0A1628' : '#5A6B82' }}
            >
              {t.label}
              {tab === t.key && (
                <span
                  className="absolute left-3 right-3 bottom-0"
                  style={{ height: 3, background: '#FF6B2B', borderRadius: '3px 3px 0 0' }}
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 p-3">
          {tab === 'about' && (
            <>
              <div className="bg-white p-3 rounded-xl" style={{ border: '1px solid #E5E9EF' }}>
                <div
                  className="text-[10px] font-bold uppercase mb-1.5"
                  style={{
                    color: '#94A3B8',
                    letterSpacing: '0.08em',
                    fontFamily: 'var(--mg-font-mono)',
                  }}
                >
                  Bio
                </div>
                <p className="text-[13px] leading-relaxed" style={{ color: '#0A1628' }}>
                  {p.bio}
                </p>
                {kind === 'person' && person.skills && (
                  <div
                    className="flex flex-wrap gap-1.5 mt-3 pt-3"
                    style={{ borderTop: '1px solid #E5E9EF' }}
                  >
                    {person.skills.map((s) => (
                      <span
                        key={s}
                        className="inline-flex items-center h-6 px-2 text-[11px] font-semibold"
                        style={{ background: '#F0F3F7', color: '#0A1628', borderRadius: 999 }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {isCompany && <MobileFeaturedStrip items={PROFILE_FEATURED} />}
              <MobileListingsGrid listings={PROFILE_LISTINGS} />
              <MobileServiceMap city={p.location} radius={p.serviceArea} />
              <MobileCertList
                certs={isCompany ? company.certs.map((c) => c.label) : person.certs}
                kind={kind}
              />
            </>
          )}
          {tab === 'listings' && <MobileListingsGrid listings={PROFILE_LISTINGS} />}
          {tab === 'team' && isCompany && <MobileTeamGrid members={company.team} />}
          {tab === 'reviews' && <MobileReviews reviews={PROFILE_REVIEWS} p={p} />}
          {tab === 'activity' && <MobileActivity items={PROFILE_ACTIVITY} />}
          {tab === 'sos' && (
            <MobileActivity
              items={PROFILE_ACTIVITY.filter((a) => a.kind === 'sos-resp' || a.kind === 'tx')}
            />
          )}
        </div>
      </div>

      <MobileBottomTabs active="me" />
    </div>
  )
}

function MobileFeaturedStrip({ items }: { items: ProfileFeatured[] }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #E5E9EF' }}>
      <div
        className="flex items-center px-3 py-2.5"
        style={{ borderBottom: '1px solid #E5E9EF' }}
      >
        <span
          className="text-[12.5px] font-bold"
          style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
        >
          Featured inventory
        </span>
        <button type="button" className="ml-auto text-[11px] font-bold" style={{ color: '#FF6B2B' }}>
          See all
        </button>
      </div>
      <div className="flex gap-2 p-3 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {items.map((l) => (
          <div
            key={l.id}
            className="shrink-0"
            style={{ width: 140, border: '1px solid #E5E9EF', borderRadius: 10, overflow: 'hidden' }}
          >
            <div className="relative" style={{ height: 80, background: PHOTO_BG[l.bg] }}>
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18) 0%, transparent 60%)',
                }}
              />
              <span
                className="absolute top-1.5 left-1.5 text-[8.5px] font-bold uppercase px-1 h-[14px] inline-flex items-center"
                style={{
                  background: '#FF6B2B',
                  color: '#fff',
                  borderRadius: 3,
                  letterSpacing: '0.08em',
                  fontFamily: 'var(--mg-font-mono)',
                }}
              >
                {l.badge}
              </span>
            </div>
            <div className="p-2">
              <div className="text-[11px] font-bold leading-tight truncate" style={{ color: '#0A1628' }}>
                {l.title}
              </div>
              <div
                className="text-[12px] font-bold mt-0.5"
                style={{
                  color: '#0A1628',
                  fontFamily: 'var(--mg-font-display)',
                  letterSpacing: '-0.01em',
                }}
              >
                ${l.price.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MobileListingsGrid({ listings }: { listings: ProfileListing[] }) {
  return (
    <div className="bg-white rounded-xl p-3" style={{ border: '1px solid #E5E9EF' }}>
      <div className="flex items-center mb-2">
        <span
          className="text-[12.5px] font-bold"
          style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
        >
          Active listings
        </span>
        <span
          className="ml-1.5 text-[10px] font-bold px-1.5 h-[16px] inline-flex items-center"
          style={{
            background: '#F0F3F7',
            color: '#5A6B82',
            borderRadius: 999,
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          {listings.length}
        </span>
        <button type="button" className="ml-auto text-[11px] font-bold" style={{ color: '#FF6B2B' }}>
          See all
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {listings.slice(0, 4).map((l) => (
          <div
            key={l.id}
            style={{ border: '1px solid #E5E9EF', borderRadius: 10, overflow: 'hidden' }}
          >
            <div className="relative" style={{ height: 90, background: PHOTO_BG[l.bg] }}>
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18) 0%, transparent 60%)',
                }}
              />
              <span
                className="absolute top-1.5 left-1.5 text-[8.5px] font-bold uppercase px-1 h-[14px] inline-flex items-center"
                style={{
                  background: 'rgba(11,37,69,0.85)',
                  color: '#fff',
                  borderRadius: 3,
                  letterSpacing: '0.06em',
                  fontFamily: 'var(--mg-font-mono)',
                }}
              >
                {l.condition}
              </span>
            </div>
            <div className="p-2">
              <div className="text-[11px] font-bold leading-tight truncate" style={{ color: '#0A1628' }}>
                {l.title}
              </div>
              <div className="text-[10px] truncate mt-0.5" style={{ color: '#5A6B82' }}>
                {l.sub}
              </div>
              <div
                className="text-[12.5px] font-bold mt-1"
                style={{
                  color: '#0A1628',
                  fontFamily: 'var(--mg-font-display)',
                  letterSpacing: '-0.01em',
                }}
              >
                ${l.price.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MobileServiceMap({ city, radius }: { city: string; radius: string }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1px solid #E5E9EF' }}>
      <div className="flex items-center px-3 py-2.5" style={{ borderBottom: '1px solid #E5E9EF' }}>
        <span
          className="text-[12.5px] font-bold"
          style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
        >
          Service area
        </span>
        <span
          className="ml-auto text-[10.5px] font-semibold"
          style={{ color: '#5A6B82', fontFamily: 'var(--mg-font-mono)' }}
        >
          {radius}
        </span>
      </div>
      <div className="relative" style={{ height: 160, background: 'linear-gradient(180deg,#E6EDF5,#DCE6F0)' }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(11,37,69,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(11,37,69,0.06) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute" style={{ left: '50%', top: '55%', transform: 'translate(-50%,-50%)' }}>
          {[140, 90, 50].map((s, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: s,
                height: s,
                left: -s / 2,
                top: -s / 2,
                border:
                  i === 0
                    ? '1px dashed rgba(255,107,43,0.50)'
                    : '1px solid rgba(255,107,43,0.30)',
                background: `rgba(255,107,43,${0.04 + i * 0.04})`,
              }}
            />
          ))}
          <div
            className="size-3 rounded-full"
            style={{
              background: '#FF6B2B',
              border: '2.5px solid #fff',
              boxShadow: '0 2px 6px rgba(255,107,43,0.5)',
            }}
          />
        </div>
        <div
          className="absolute bottom-2 left-2 text-[9.5px] font-bold uppercase px-1.5 h-[18px] inline-flex items-center"
          style={{
            background: '#0A1628',
            color: '#fff',
            borderRadius: 999,
            letterSpacing: '0.06em',
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          {city}
        </div>
      </div>
    </div>
  )
}

function MobileCertList({ certs, kind }: { certs: string[]; kind: ProfileKind }) {
  const list = certs.map((c) => ({ label: c, sub: kind === 'company' ? 'Active' : 'Active' }))
  return (
    <div className="bg-white rounded-xl p-3" style={{ border: '1px solid #E5E9EF' }}>
      <div
        className="text-[12.5px] font-bold mb-2"
        style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
      >
        Certifications
      </div>
      <div className="flex flex-col gap-1.5">
        {list.slice(0, 4).map((c, i) => (
          <div key={i} className="flex items-center gap-2 py-1">
            <div
              className="size-7 flex items-center justify-center shrink-0"
              style={{ background: 'rgba(34,197,94,0.10)', color: '#16A34A', borderRadius: 7 }}
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="8" r="6" />
                <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold truncate" style={{ color: '#0A1628' }}>
                {c.label}
              </div>
              <div className="text-[10px]" style={{ color: '#5A6B82' }}>
                {c.sub}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MobileTeamGrid({ members }: { members: CompanyProfile['team'] }) {
  return (
    <div className="bg-white rounded-xl p-3" style={{ border: '1px solid #E5E9EF' }}>
      <div
        className="text-[12.5px] font-bold mb-2"
        style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
      >
        Team ({members.length})
      </div>
      <div className="grid grid-cols-3 gap-2">
        {members.map((m, i) => (
          <div
            key={i}
            className="flex flex-col items-center text-center p-2"
            style={{ background: '#F7F9FC', borderRadius: 8, border: '1px solid #E5E9EF' }}
          >
            <ChatAvatar tag={m.tag} color={m.color} size={40} />
            <div className="text-[10.5px] font-bold mt-1.5 truncate w-full" style={{ color: '#0A1628' }}>
              {m.name}
            </div>
            <div className="text-[9px] truncate w-full" style={{ color: '#5A6B82' }}>
              {m.role}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function MobileReviews({
  reviews,
  p,
}: {
  reviews: ProfileReview[]
  p: PersonProfile | CompanyProfile
}) {
  return (
    <div className="bg-white rounded-xl p-3" style={{ border: '1px solid #E5E9EF' }}>
      <div
        className="flex items-baseline gap-3 pb-3 mb-3"
        style={{ borderBottom: '1px solid #E5E9EF' }}
      >
        <div
          className="text-[34px] font-bold leading-none"
          style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)', letterSpacing: '-0.02em' }}
        >
          {p.rating}
        </div>
        <div>
          <div className="flex items-center gap-0.5" style={{ color: '#FF6B2B' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <path d="m12 2 3 6.5L22 9.5l-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1z" />
              </svg>
            ))}
          </div>
          <div
            className="text-[10.5px] mt-0.5"
            style={{ color: '#5A6B82', fontFamily: 'var(--mg-font-mono)' }}
          >
            {p.reviews} reviews
          </div>
        </div>
      </div>
      {reviews.slice(0, 3).map((r, i) => (
        <div
          key={i}
          className="flex gap-2.5 py-2.5"
          style={{ borderBottom: i < 2 ? '1px solid #E5E9EF' : 'none' }}
        >
          <ChatAvatar tag={r.tag} color={r.color} size={32} />
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold" style={{ color: '#0A1628' }}>
              {r.name}
            </div>
            <div className="flex items-center gap-1 mt-0.5" style={{ color: '#FF6B2B' }}>
              {Array.from({ length: 5 }).map((_, k) => (
                <svg
                  key={k}
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill={k < r.rating ? 'currentColor' : '#E5E9EF'}
                >
                  <path d="m12 2 3 6.5L22 9.5l-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1z" />
                </svg>
              ))}
              <span
                className="text-[10px] ml-1"
                style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
              >
                · {r.when}
              </span>
            </div>
            <p className="text-[11.5px] mt-1 leading-relaxed" style={{ color: '#0A1628' }}>
              {r.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function MobileActivity({ items }: { items: ProfileActivity[] }) {
  return (
    <div className="bg-white rounded-xl p-3" style={{ border: '1px solid #E5E9EF' }}>
      {items.map((a, i) => (
        <div
          key={i}
          className="flex items-start gap-2.5 py-2"
          style={{ borderBottom: i < items.length - 1 ? '1px solid #E5E9EF' : 'none' }}
        >
          <div
            className="size-8 flex items-center justify-center shrink-0"
            style={{ background: `${a.color}1A`, color: a.color, borderRadius: 999 }}
          >
            <ActivityIcon kind={a.kind} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-semibold" style={{ color: '#0A1628' }}>
              {a.title}
            </div>
            <div className="text-[10.5px] truncate" style={{ color: '#5A6B82' }}>
              {a.sub}
            </div>
          </div>
          <span
            className="text-[10px] font-semibold mt-0.5"
            style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
          >
            {a.when}
          </span>
        </div>
      ))}
    </div>
  )
}
