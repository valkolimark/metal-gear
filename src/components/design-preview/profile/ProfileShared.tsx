import type { ReactNode } from 'react'
import {
  CheckIcon,
  MessageIcon,
  PhotoIcon,
  MoreIcon,
  BookmarkIcon,
} from '../_shared/icons'
import type {
  CompanyProfile,
  PersonProfile,
  ProfileKind,
  ProfileViewer,
} from './profile-data'

type AnyProfile = PersonProfile | CompanyProfile

export function ProfileCoverHeader({
  p,
  kind = 'person',
  viewer = 'visit',
}: {
  p: AnyProfile
  kind?: ProfileKind
  viewer?: ProfileViewer
}) {
  const isOwn = viewer === 'own'
  const isCompany = kind === 'company'
  const person = p as PersonProfile
  return (
    <header style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E9EF' }}>
      <div className="relative" style={{ height: 280, background: p.cover, overflow: 'hidden' }}>
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
        <div className="absolute top-4 left-5 inline-flex items-center gap-2">
          <span
            className="text-[10px] font-bold uppercase px-2 h-[20px] inline-flex items-center"
            style={{
              background: 'rgba(255,255,255,0.16)',
              color: '#fff',
              borderRadius: 4,
              letterSpacing: '0.08em',
              fontFamily: 'var(--mg-font-mono)',
              backdropFilter: 'blur(8px)',
            }}
          >
            {isCompany ? 'COMPANY · VERIFIED SELLER' : 'MEMBER · INDIVIDUAL'}
          </span>
          {p.verified && (
            <span
              className="text-[10px] font-bold uppercase px-2 h-[20px] inline-flex items-center gap-1"
              style={{
                background: 'rgba(34,197,94,0.20)',
                color: '#86EFAC',
                borderRadius: 4,
                letterSpacing: '0.08em',
                fontFamily: 'var(--mg-font-mono)',
              }}
            >
              <CheckIcon size={10} /> ID + INSURANCE VERIFIED
            </span>
          )}
        </div>
        {isOwn && (
          <button
            type="button"
            className="absolute right-5 bottom-5 inline-flex items-center gap-1.5 h-9 px-3 text-[12px] font-bold"
            style={{ background: 'rgba(255,255,255,0.95)', color: '#0A1628', borderRadius: 999 }}
          >
            <PhotoIcon size={13} /> Edit cover
          </button>
        )}
        <div
          className="absolute inset-x-0 bottom-0 h-16"
          style={{ background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.18))' }}
        />
      </div>

      <div className="px-6 pt-0 pb-4 relative" style={{ marginTop: -52 }}>
        <div className="flex items-end gap-5">
          <div className="relative shrink-0">
            <div
              className="flex items-center justify-center font-bold"
              style={{
                width: 168,
                height: 168,
                background: p.avatarColor,
                color: '#fff',
                borderRadius: isCompany ? 24 : 999,
                fontSize: 56,
                fontFamily: 'var(--mg-font-display)',
                border: '6px solid #FFFFFF',
                boxShadow: '0 8px 24px rgba(11,37,69,0.18)',
                letterSpacing: '-0.02em',
              }}
            >
              {p.tag}
            </div>
            {!isCompany && person.online && (
              <span
                className="absolute size-6 rounded-full"
                style={{
                  right: 10,
                  bottom: 10,
                  background: '#22C55E',
                  border: '4px solid #fff',
                }}
              />
            )}
            {isOwn && (
              <button
                type="button"
                className="absolute bottom-2 right-2 size-9 flex items-center justify-center"
                style={{ background: '#0A1628', color: '#fff', borderRadius: 999, border: '3px solid #fff' }}
              >
                <PhotoIcon size={14} />
              </button>
            )}
          </div>
          <div className="flex-1 min-w-0 pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                className="text-[28px] font-bold"
                style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)', letterSpacing: '-0.02em' }}
              >
                {p.name}
              </h1>
              {p.verified && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M12 1l3 4 5-1-1 5 4 3-4 3 1 5-5-1-3 4-3-4-5 1 1-5-4-3 4-3-1-5 5 1z" />
                </svg>
              )}
              {!isCompany && person.online && (
                <span
                  className="inline-flex items-center gap-1 text-[11.5px] font-semibold"
                  style={{ color: '#22C55E' }}
                >
                  <span className="size-1.5 rounded-full" style={{ background: '#22C55E' }} />{' '}
                  Active now
                </span>
              )}
            </div>
            <div className="text-[14px] mt-1" style={{ color: '#5A6B82' }}>
              {p.title}
            </div>
            <div className="flex items-center gap-3 mt-2 text-[12.5px]" style={{ color: '#5A6B82' }}>
              <span className="inline-flex items-center gap-1">
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {p.location}
              </span>
              <span style={{ color: '#CBD5E0' }}>·</span>
              <span>{p.serviceArea}</span>
              <span style={{ color: '#CBD5E0' }}>·</span>
              <span style={{ fontFamily: 'var(--mg-font-mono)' }}>{p.joined}</span>
              {!isCompany && person.mutual && (
                <>
                  <span style={{ color: '#CBD5E0' }}>·</span>
                  <span>
                    <b style={{ color: '#0A1628' }}>{person.mutual}</b> mutual connections
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 pb-3 shrink-0">
            {isOwn ? (
              <>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-bold"
                  style={{ background: '#0B2545', color: '#fff', borderRadius: 999 }}
                >
                  <PhotoIcon size={14} /> Add a post
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-bold"
                  style={{ background: '#F0F3F7', color: '#0A1628', borderRadius: 999 }}
                >
                  Edit profile
                </button>
                <button
                  type="button"
                  className="size-10 flex items-center justify-center"
                  style={{ background: '#F0F3F7', color: '#0A1628', borderRadius: 999 }}
                >
                  <MoreIcon size={16} />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-bold"
                  style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
                >
                  <MessageIcon size={14} /> Message
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-bold"
                  style={{ background: '#0B2545', color: '#fff', borderRadius: 999 }}
                >
                  {isCompany ? 'Follow' : '+ Connect'}
                </button>
                <button
                  type="button"
                  className="size-10 flex items-center justify-center"
                  style={{ background: '#F0F3F7', color: '#0A1628', borderRadius: 999 }}
                >
                  <BookmarkIcon size={14} />
                </button>
                <button
                  type="button"
                  className="size-10 flex items-center justify-center"
                  style={{ background: '#F0F3F7', color: '#0A1628', borderRadius: 999 }}
                >
                  <MoreIcon size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

type TrustStat = { label: string; value: string | number; sub: string; color: string }

export function TrustStrip({ p, kind = 'person' }: { p: AnyProfile; kind?: ProfileKind }) {
  const person = p as PersonProfile
  const company = p as CompanyProfile
  const stats: TrustStat[] =
    kind === 'company'
      ? [
          { label: 'Rating', value: company.rating + ' ★', sub: `${company.reviews} reviews`, color: '#FF6B2B' },
          { label: 'Transactions', value: company.txCount, sub: 'completed', color: '#0A1628' },
          { label: 'Response time', value: company.responseTime, sub: `${company.responseRate}% rate`, color: '#22C55E' },
          { label: 'Followers', value: company.followers.toLocaleString(), sub: 'industrial network', color: '#0B2545' },
          { label: 'On platform', value: '8 yrs', sub: 'since 2018', color: '#5A6B82' },
        ]
      : [
          { label: 'Rating', value: person.rating + ' ★', sub: `${person.reviews} reviews`, color: '#FF6B2B' },
          { label: 'Transactions', value: person.txCount, sub: 'completed', color: '#0A1628' },
          { label: 'SOS responses', value: person.sosResponses, sub: 'within radius', color: '#FF6B2B' },
          { label: 'Response time', value: person.responseTime, sub: `${person.responseRate}% rate`, color: '#22C55E' },
          { label: 'On platform', value: '5 yrs', sub: 'since 2021', color: '#5A6B82' },
        ]
  return (
    <div
      className="grid grid-cols-5 gap-0"
      style={{ background: '#FFFFFF', borderTop: '1px solid #E5E9EF', borderBottom: '1px solid #E5E9EF' }}
    >
      {stats.map((s, i) => (
        <div
          key={i}
          className="px-5 py-3.5"
          style={{ borderRight: i < stats.length - 1 ? '1px solid #E5E9EF' : 'none' }}
        >
          <div
            className="text-[10px] font-bold uppercase mb-1"
            style={{ color: '#94A3B8', letterSpacing: '0.08em', fontFamily: 'var(--mg-font-mono)' }}
          >
            {s.label}
          </div>
          <div
            className="text-[22px] font-bold"
            style={{
              color: s.color,
              fontFamily: 'var(--mg-font-display)',
              letterSpacing: '-0.01em',
              lineHeight: 1,
            }}
          >
            {s.value}
          </div>
          <div className="text-[11px] mt-1" style={{ color: '#5A6B82' }}>
            {s.sub}
          </div>
        </div>
      ))}
    </div>
  )
}

export type ProfileTab = { key: string; label: string; count?: number }

export function ProfileTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: ProfileTab[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div
      className="flex items-center gap-1 px-4"
      style={{ background: '#FFFFFF', borderBottom: '1px solid #E5E9EF' }}
    >
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className="relative inline-flex items-center gap-1.5 h-12 px-3.5 text-[13px] font-bold"
          style={{ color: active === t.key ? '#0A1628' : '#5A6B82' }}
        >
          {t.label}
          {t.count !== undefined && (
            <span
              className="text-[10.5px] font-bold px-1.5 h-[16px] inline-flex items-center"
              style={{
                background: active === t.key ? 'rgba(11,37,69,0.08)' : '#F0F3F7',
                color: active === t.key ? '#0A1628' : '#5A6B82',
                borderRadius: 999,
                fontFamily: 'var(--mg-font-mono)',
              }}
            >
              {t.count}
            </span>
          )}
          {active === t.key && (
            <span
              className="absolute left-2 right-2 bottom-0"
              style={{ height: 3, background: '#FF6B2B', borderRadius: '3px 3px 0 0' }}
            />
          )}
        </button>
      ))}
      <div className="ml-auto flex items-center gap-1 pr-1">
        <button type="button" className="size-9 flex items-center justify-center" style={{ color: '#5A6B82' }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
        <button type="button" className="size-9 flex items-center justify-center" style={{ color: '#5A6B82' }}>
          <MoreIcon size={16} />
        </button>
      </div>
    </div>
  )
}

export function SectionCard({
  title,
  action,
  children,
  padded = true,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
  padded?: boolean
}) {
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: 14,
        border: '1px solid #E5E9EF',
        boxShadow: '0 1px 2px rgba(11,37,69,0.04)',
      }}
    >
      {title && (
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ borderBottom: '1px solid #E5E9EF' }}
        >
          <h3
            className="text-[14px] font-bold"
            style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)', letterSpacing: '-0.01em' }}
          >
            {title}
          </h3>
          {action && <div className="ml-auto">{action}</div>}
        </div>
      )}
      <div className={padded ? 'p-4' : ''}>{children}</div>
    </div>
  )
}
