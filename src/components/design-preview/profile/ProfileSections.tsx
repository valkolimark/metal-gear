import { PHOTO_BG } from '../_shared/listings-data'
import { ChatAvatar } from '../_shared/ChatAvatar'
import { SirenIcon, StoreIcon, CheckIcon, ClockIcon } from '../_shared/icons'
import { SectionCard } from './ProfileShared'
import type {
  CompanyProfile,
  PersonProfile,
  ProfileActivity,
  ProfileFeatured,
  ProfileKind,
  ProfileListing,
  ProfileReview,
  CompanyCert,
} from './profile-data'

function AboutRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div
        className="text-[10px] font-bold uppercase"
        style={{ color: '#94A3B8', letterSpacing: '0.08em', fontFamily: 'var(--mg-font-mono)' }}
      >
        {label}
      </div>
      <div className="text-[13px]" style={{ color: '#0A1628' }}>
        {value}
      </div>
    </div>
  )
}

export function AboutSection({
  p,
  kind,
}: {
  p: PersonProfile | CompanyProfile
  kind: ProfileKind
}) {
  const person = p as PersonProfile
  const company = p as CompanyProfile
  return (
    <SectionCard title="About">
      <p className="text-[13.5px] leading-relaxed mb-3" style={{ color: '#0A1628' }}>
        {p.bio}
      </p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
        <AboutRow label="Location" value={p.location} />
        <AboutRow label="Service area" value={p.serviceArea} />
        {kind === 'person' && <AboutRow label="Company" value={person.company} />}
        {kind === 'company' && <AboutRow label="Hours" value={company.hours.text} />}
        {kind === 'company' && <AboutRow label="On-call" value={company.hours.oncall} />}
        <AboutRow label="Joined" value={p.joined} />
      </div>
      {kind === 'person' && person.skills && (
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid #E5E9EF' }}>
          <div
            className="text-[10px] font-bold uppercase mb-2"
            style={{ color: '#94A3B8', letterSpacing: '0.08em', fontFamily: 'var(--mg-font-mono)' }}
          >
            Skills
          </div>
          <div className="flex flex-wrap gap-1.5">
            {person.skills.map((s) => (
              <span
                key={s}
                className="inline-flex items-center h-7 px-2.5 text-[12px] font-semibold"
                style={{ background: '#F0F3F7', color: '#0A1628', borderRadius: 999 }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  )
}

export function HoursCard(_props: { p: CompanyProfile }) {
  // _props.p will be consumed when this is wired to live data; the preview hardcodes
  // the week grid + on-call copy to match the mockup.
  void _props
  return (
    <SectionCard title="Hours & on-call">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="size-2.5 rounded-full" style={{ background: '#22C55E' }} />
        <span
          className="text-[14px] font-bold"
          style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
        >
          Open now
        </span>
        <span className="text-[12px]" style={{ color: '#5A6B82' }}>
          · closes 7 PM CT
        </span>
      </div>
      <div className="text-[12.5px] grid grid-cols-7 gap-1 mb-4">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
          <div
            key={d}
            className="flex flex-col items-center gap-1 py-2"
            style={{
              background: i === 1 ? 'rgba(255,107,43,0.06)' : '#F7F9FC',
              borderRadius: 8,
              border: i === 1 ? '1.5px solid #FF6B2B' : '1px solid #E5E9EF',
            }}
          >
            <span
              className="text-[10px] font-bold uppercase"
              style={{ color: '#94A3B8', letterSpacing: '0.06em', fontFamily: 'var(--mg-font-mono)' }}
            >
              {d}
            </span>
            <span
              className="text-[11px] font-semibold"
              style={{ color: i >= 5 ? '#94A3B8' : '#0A1628' }}
            >
              {i >= 5 ? 'closed' : '7–7'}
            </span>
          </div>
        ))}
      </div>
      <div
        className="flex items-center gap-2.5 p-3"
        style={{ background: 'rgba(255,107,43,0.06)', borderRadius: 10, border: '1px solid rgba(255,107,43,0.20)' }}
      >
        <div
          className="size-9 flex items-center justify-center shrink-0"
          style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
        >
          <SirenIcon size={16} />
        </div>
        <div className="flex-1">
          <div className="text-[12.5px] font-bold" style={{ color: '#0A1628' }}>
            24/7 SOS hotline
          </div>
          <div className="text-[11px]" style={{ color: '#5A6B82' }}>
            Mid-shift emergencies — average pickup &lt; 4 min
          </div>
        </div>
        <button
          type="button"
          className="h-8 px-3 text-[12px] font-bold"
          style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
        >
          Call
        </button>
      </div>
    </SectionCard>
  )
}

export function CapabilitiesCard({ p }: { p: CompanyProfile }) {
  return (
    <SectionCard
      title="Capabilities"
      action={
        <span
          className="text-[11px] font-semibold"
          style={{ color: '#5A6B82', fontFamily: 'var(--mg-font-mono)' }}
        >
          {p.capabilities.length} services
        </span>
      }
    >
      <div className="grid grid-cols-2 gap-2">
        {p.capabilities.map((c, i) => (
          <div
            key={i}
            className="flex items-center gap-2 p-2.5"
            style={{ background: '#F7F9FC', borderRadius: 10, border: '1px solid #E5E9EF' }}
          >
            <div
              className="size-8 flex items-center justify-center shrink-0"
              style={{
                background: '#FFFFFF',
                color: '#0B2545',
                borderRadius: 8,
                border: '1px solid #E5E9EF',
              }}
            >
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
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-bold truncate" style={{ color: '#0A1628' }}>
                {c.label}
              </div>
              <div
                className="text-[10.5px]"
                style={{ color: '#5A6B82', fontFamily: 'var(--mg-font-mono)' }}
              >
                {c.count}
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

export function ServiceMapCard({
  city = 'Houston, TX',
  radius = '250 mi',
}: {
  city?: string
  radius?: string
}) {
  return (
    <SectionCard
      title="Service area"
      padded={false}
      action={
        <span
          className="text-[11px] font-semibold"
          style={{ color: '#5A6B82', fontFamily: 'var(--mg-font-mono)' }}
        >
          {radius} radius
        </span>
      }
    >
      <div
        className="relative"
        style={{
          height: 240,
          background: 'linear-gradient(180deg,#E6EDF5 0%, #DCE6F0 100%)',
          overflow: 'hidden',
          borderRadius: '0 0 14px 14px',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(11,37,69,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(11,37,69,0.06) 1px, transparent 1px)',
            backgroundSize: '36px 36px',
          }}
        />
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 600 240">
          <path
            d="M0 180 Q 120 165 240 175 T 480 165 T 600 150 L 600 240 L 0 240 Z"
            fill="rgba(14,165,233,0.18)"
          />
          <path
            d="M0 180 Q 120 165 240 175 T 480 165 T 600 150"
            stroke="rgba(11,37,69,0.30)"
            strokeWidth="1.5"
            fill="none"
          />
        </svg>
        <div className="absolute" style={{ left: '46%', top: '50%', transform: 'translate(-50%,-50%)' }}>
          {[200, 140, 80].map((s, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: s,
                height: s,
                left: -s / 2,
                top: -s / 2,
                border:
                  i === 0 ? '1px dashed rgba(255,107,43,0.50)' : '1px solid rgba(255,107,43,0.30)',
                background: `rgba(255,107,43,${0.04 + i * 0.04})`,
              }}
            />
          ))}
          <div className="absolute" style={{ left: -7, top: -7 }}>
            <div
              className="size-3.5 rounded-full"
              style={{
                background: '#FF6B2B',
                border: '2.5px solid #fff',
                boxShadow: '0 2px 6px rgba(255,107,43,0.5)',
              }}
            />
          </div>
          <div
            className="absolute -translate-x-1/2 whitespace-nowrap text-[10.5px] font-bold uppercase px-2 h-[20px] inline-flex items-center"
            style={{
              left: 0,
              top: 18,
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
        {[
          { x: '20%', y: '35%', label: 'Lake Charles' },
          { x: '70%', y: '40%', label: 'Beaumont' },
          { x: '36%', y: '20%', label: 'Odessa' },
          { x: '78%', y: '70%', label: 'Galveston' },
        ].map((c, i) => (
          <div
            key={i}
            className="absolute"
            style={{ left: c.x, top: c.y, transform: 'translate(-50%,-50%)' }}
          >
            <div className="size-2 rounded-full" style={{ background: '#0B2545', border: '2px solid #fff' }} />
            <span
              className="absolute left-3 top-0 text-[9.5px] font-semibold whitespace-nowrap"
              style={{ color: '#0A1628', fontFamily: 'var(--mg-font-mono)' }}
            >
              {c.label}
            </span>
          </div>
        ))}
        <div
          className="absolute bottom-3 right-3 px-2.5 py-1.5 text-[10.5px] font-semibold inline-flex items-center gap-2"
          style={{
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 999,
            color: '#0A1628',
            boxShadow: '0 1px 4px rgba(11,37,69,0.10)',
          }}
        >
          <span
            className="size-2.5 rounded-full"
            style={{ background: 'rgba(255,107,43,0.30)', border: '1px solid #FF6B2B' }}
          />
          Coverage zone
        </div>
      </div>
    </SectionCard>
  )
}

export function ProfileListingsGrid({
  listings,
  mine,
}: {
  listings: ProfileListing[]
  mine?: boolean
}) {
  return (
    <SectionCard
      title={mine ? 'Your listings' : 'Active listings'}
      action={
        <button type="button" className="text-[12px] font-bold" style={{ color: '#FF6B2B' }}>
          See all {listings.length}
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-3">
        {listings.slice(0, 6).map((l) => (
          <div
            key={l.id}
            className="overflow-hidden"
            style={{ background: '#FFFFFF', border: '1px solid #E5E9EF', borderRadius: 12 }}
          >
            <div className="relative" style={{ height: 120, background: PHOTO_BG[l.bg] }}>
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18) 0%, transparent 60%)',
                }}
              />
              <span
                className="absolute top-2 left-2 text-[9.5px] font-bold uppercase px-1.5 h-[18px] inline-flex items-center"
                style={{
                  background: 'rgba(11,37,69,0.85)',
                  color: '#fff',
                  borderRadius: 4,
                  letterSpacing: '0.06em',
                  fontFamily: 'var(--mg-font-mono)',
                  backdropFilter: 'blur(6px)',
                }}
              >
                {l.condition}
              </span>
            </div>
            <div className="p-2.5">
              <div
                className="text-[12.5px] font-bold leading-tight truncate"
                style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
              >
                {l.title}
              </div>
              <div className="text-[10.5px] truncate mt-0.5" style={{ color: '#5A6B82' }}>
                {l.sub}
              </div>
              <div className="flex items-center justify-between mt-2">
                <span
                  className="text-[14px] font-bold"
                  style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)', letterSpacing: '-0.01em' }}
                >
                  ${l.price.toLocaleString()}
                </span>
                <span
                  className="text-[10px] font-bold"
                  style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
                >
                  {l.id}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

export function FeaturedCarousel({ items }: { items: ProfileFeatured[] }) {
  return (
    <SectionCard
      title="Featured inventory"
      padded={false}
      action={
        <button type="button" className="text-[12px] font-bold mr-3" style={{ color: '#FF6B2B' }}>
          See all
        </button>
      }
    >
      <div
        className="flex items-stretch gap-2 px-4 pb-4 pt-2 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
        {items.map((l) => (
          <div
            key={l.id}
            className="shrink-0 overflow-hidden"
            style={{ width: 200, background: '#FFFFFF', border: '1px solid #E5E9EF', borderRadius: 12 }}
          >
            <div className="relative" style={{ height: 110, background: PHOTO_BG[l.bg] }}>
              <div
                className="absolute inset-0"
                style={{
                  background:
                    'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18) 0%, transparent 60%)',
                }}
              />
              <span
                className="absolute top-2 left-2 text-[9px] font-bold uppercase px-1.5 h-[16px] inline-flex items-center"
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
            <div className="p-2.5">
              <div
                className="text-[12px] font-bold leading-tight truncate"
                style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)' }}
              >
                {l.title}
              </div>
              <div className="text-[10px] truncate mt-0.5" style={{ color: '#5A6B82' }}>
                {l.sub}
              </div>
              <div
                className="text-[14px] font-bold mt-1"
                style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)', letterSpacing: '-0.01em' }}
              >
                ${l.price.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

export function ActivityIcon({ kind }: { kind: ProfileActivity['kind'] }) {
  const map: Record<ProfileActivity['kind'], React.ReactNode> = {
    'sos-resp': <SirenIcon size={14} />,
    listing: <StoreIcon size={14} />,
    review: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="m12 2 3 6.5L22 9.5l-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1z" />
      </svg>
    ),
    tx: <CheckIcon size={14} />,
    cert: (
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="8" r="6" />
        <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
      </svg>
    ),
  }
  return <>{map[kind] || <ClockIcon size={14} />}</>
}

export function ActivityFeed({ items }: { items: ProfileActivity[] }) {
  return (
    <SectionCard title="Recent activity">
      <div className="flex flex-col">
        {items.map((a, i) => (
          <div
            key={i}
            className="flex items-start gap-3 py-2.5"
            style={{ borderBottom: i < items.length - 1 ? '1px solid #E5E9EF' : 'none' }}
          >
            <div
              className="size-9 flex items-center justify-center shrink-0"
              style={{ background: `${a.color}1A`, color: a.color, borderRadius: 999 }}
            >
              <ActivityIcon kind={a.kind} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold" style={{ color: '#0A1628' }}>
                {a.title}
              </div>
              <div className="text-[11.5px] truncate" style={{ color: '#5A6B82' }}>
                {a.sub}
              </div>
            </div>
            <span
              className="text-[10.5px] font-semibold shrink-0 mt-0.5"
              style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
            >
              {a.when}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

export function ReviewsCard({
  reviews,
  p,
}: {
  reviews: ProfileReview[]
  p: PersonProfile | CompanyProfile
}) {
  return (
    <SectionCard
      title={`Reviews (${p.reviews})`}
      action={
        <div
          className="flex items-center gap-1 text-[12.5px] font-bold"
          style={{ color: '#FF6B2B' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="m12 2 3 6.5L22 9.5l-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1z" />
          </svg>
          {p.rating}
        </div>
      }
    >
      <div className="flex items-center gap-4 pb-4 mb-4" style={{ borderBottom: '1px solid #E5E9EF' }}>
        <div className="text-center pr-4" style={{ borderRight: '1px solid #E5E9EF' }}>
          <div
            className="text-[44px] font-bold leading-none"
            style={{ color: '#0A1628', fontFamily: 'var(--mg-font-display)', letterSpacing: '-0.02em' }}
          >
            {p.rating}
          </div>
          <div
            className="flex items-center gap-0.5 mt-1.5 justify-center"
            style={{ color: '#FF6B2B' }}
          >
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="m12 2 3 6.5L22 9.5l-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1z" />
              </svg>
            ))}
          </div>
          <div
            className="text-[10.5px] font-semibold mt-1"
            style={{ color: '#5A6B82', fontFamily: 'var(--mg-font-mono)' }}
          >
            {p.reviews} reviews
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1">
          {[5, 4, 3, 2, 1].map((n) => {
            const pct = n === 5 ? 84 : n === 4 ? 12 : n === 3 ? 3 : n === 2 ? 1 : 0
            return (
              <div
                key={n}
                className="flex items-center gap-2 text-[11px]"
                style={{ color: '#5A6B82', fontFamily: 'var(--mg-font-mono)' }}
              >
                <span className="w-3 font-bold" style={{ color: '#0A1628' }}>
                  {n}
                </span>
                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ background: '#F0F3F7' }}
                >
                  <div style={{ width: `${pct}%`, height: '100%', background: '#FF6B2B' }} />
                </div>
                <span className="w-8 text-right">{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {reviews.map((r, i) => (
          <div key={i} className="flex gap-3">
            <ChatAvatar tag={r.tag} color={r.color} size={36} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[13px] font-bold" style={{ color: '#0A1628' }}>
                  {r.name}
                </span>
                <span className="text-[11px]" style={{ color: '#5A6B82' }}>
                  · {r.role}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="flex items-center gap-0.5" style={{ color: '#FF6B2B' }}>
                  {Array.from({ length: 5 }).map((_, k) => (
                    <svg
                      key={k}
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill={k < r.rating ? 'currentColor' : '#E5E9EF'}
                    >
                      <path d="m12 2 3 6.5L22 9.5l-5 5 1.2 7L12 18l-6.2 3.5L7 14.5l-5-5 7-1z" />
                    </svg>
                  ))}
                </div>
                <span
                  className="text-[10.5px]"
                  style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
                >
                  · {r.when}
                </span>
                <span
                  className="text-[10px] font-bold uppercase px-1.5 h-[14px] inline-flex items-center"
                  style={{
                    background: 'rgba(14,165,233,0.10)',
                    color: '#0EA5E9',
                    borderRadius: 3,
                    letterSpacing: '0.06em',
                    fontFamily: 'var(--mg-font-mono)',
                  }}
                >
                  TX {r.tx}
                </span>
              </div>
              <p className="text-[12.5px] mt-1.5 leading-relaxed" style={{ color: '#0A1628' }}>
                {r.body}
              </p>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

export function TeamGrid({ members }: { members: CompanyProfile['team'] }) {
  return (
    <SectionCard title={`Team (${members.length})`}>
      <div className="grid grid-cols-4 gap-2">
        {members.map((m, i) => (
          <div
            key={i}
            className="flex flex-col items-center text-center p-3"
            style={{ background: '#F7F9FC', borderRadius: 10, border: '1px solid #E5E9EF' }}
          >
            <ChatAvatar tag={m.tag} color={m.color} size={48} />
            <div className="text-[12px] font-bold mt-2 truncate w-full" style={{ color: '#0A1628' }}>
              {m.name}
            </div>
            <div className="text-[10.5px] truncate w-full" style={{ color: '#5A6B82' }}>
              {m.role}
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

export function CertsWall({
  certs,
  kind = 'company',
}: {
  certs: string[] | CompanyCert[]
  kind?: ProfileKind
}) {
  const list: CompanyCert[] =
    kind === 'person'
      ? (certs as string[]).map((c) => ({ label: c, sub: 'Active', exp: '—' }))
      : (certs as CompanyCert[])
  return (
    <SectionCard title="Certifications & compliance">
      <div className="grid grid-cols-2 gap-2">
        {list.map((c, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 p-2.5"
            style={{ background: '#FFFFFF', borderRadius: 10, border: '1px solid #E5E9EF' }}
          >
            <div
              className="size-10 flex items-center justify-center shrink-0"
              style={{ background: 'rgba(34,197,94,0.10)', color: '#16A34A', borderRadius: 8 }}
            >
              <svg
                width="18"
                height="18"
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
              <div className="text-[12.5px] font-bold truncate" style={{ color: '#0A1628' }}>
                {c.label}
              </div>
              <div className="text-[10.5px] truncate" style={{ color: '#5A6B82' }}>
                {c.sub}
              </div>
            </div>
            {c.exp && c.exp !== '—' && (
              <span
                className="text-[10px] font-bold shrink-0"
                style={{ color: '#94A3B8', fontFamily: 'var(--mg-font-mono)' }}
              >
                EXP {c.exp}
              </span>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  )
}

export function PostsStrip() {
  return (
    <SectionCard
      title="Photos"
      action={
        <button type="button" className="text-[12px] font-bold" style={{ color: '#FF6B2B' }}>
          See all
        </button>
      }
    >
      <div className="grid grid-cols-3 gap-1.5">
        {[0, 1, 2, 4, 5, 3].map((b, i) => (
          <div
            key={i}
            className="relative"
            style={{
              aspectRatio: '1',
              background: PHOTO_BG[b],
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              className="absolute inset-0"
              style={{
                background:
                  'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18) 0%, transparent 60%)',
              }}
            />
          </div>
        ))}
      </div>
    </SectionCard>
  )
}
