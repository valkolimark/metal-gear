import type { ComponentType, SVGProps } from 'react'
import { ModernHeader } from '../_shared/ModernHeader'
import {
  BarChartIcon,
  BookmarkIcon,
  CheckIcon,
  CreditIcon,
  HomeIcon,
  MessageIcon,
  MoreIcon,
  PhotoIcon,
  SirenIcon,
  StoreIcon,
} from '../_shared/icons'
import {
  MOCK_COMPANIES,
  MOCK_DISCOVERY,
  MOCK_POSTS,
  MOCK_SOS_ALERTS,
  MOCK_SOS_STORIES,
  MOCK_TRENDING,
  urgencyConfig,
  type FeedPost,
} from './feed-data'

const CARD_SHADOW =
  '0 1px 2px rgba(11,37,69,0.04), 0 4px 12px rgba(11,37,69,0.05)'

type LucideLike = ComponentType<SVGProps<SVGSVGElement> & { size?: number; strokeWidth?: number }>

export function ModernFeedApp() {
  return (
    <div
      style={{
        background: '#F0F2F5',
        color: '#0A1628',
        minHeight: '100%',
        fontFamily: 'var(--mg-font-body), sans-serif',
      }}
    >
      <ModernHeader />
      <div className="flex max-w-[1500px] mx-auto px-5 gap-6 pt-5">
        <ModernLeftSidebar />
        <main className="flex-1 max-w-[640px] mx-auto w-full pb-12">
          <ModernSOSSection />
          <ModernComposer />
          {MOCK_POSTS.map((p) => (
            <ModernPostCard key={p.id} post={p} />
          ))}
        </main>
        <ModernRightSidebar />
      </div>
    </div>
  )
}

function ModernLeftSidebar() {
  const items: Array<{
    label: string
    icon: LucideLike
    active?: boolean
    badge?: number
    orange?: boolean
  }> = [
    { label: 'Feed', icon: HomeIcon, active: true },
    { label: 'Equipment', icon: StoreIcon },
    { label: 'Dashboard', icon: BarChartIcon },
    { label: 'Messages', icon: MessageIcon, badge: 3 },
    { label: 'SOS', icon: SirenIcon, orange: true, badge: 5 },
    { label: 'Saved', icon: BookmarkIcon },
    { label: 'Credits', icon: CreditIcon },
  ]
  const muted = '#5A6B82'
  const fg = '#0A1628'
  return (
    <aside className="hidden xl:block w-[260px] shrink-0">
      <div className="sticky top-[68px] flex flex-col gap-1 pt-2">
        {items.map((it) => {
          const I = it.icon
          const color = it.active ? '#1877F2' : it.orange ? '#FF6B2B' : muted
          return (
            <button
              key={it.label}
              type="button"
              className="flex items-center gap-3 px-3 h-11 text-left"
              style={{
                background: it.active ? 'rgba(24,119,242,0.08)' : 'transparent',
                color: it.active ? '#1877F2' : fg,
                borderRadius: 12,
                fontWeight: it.active ? 600 : 500,
                fontSize: 14,
              }}
            >
              <I size={20} strokeWidth={it.active ? 2.4 : 2} style={{ color }} />
              <span className="flex-1">{it.label}</span>
              {it.badge ? (
                <span
                  className="text-[11px] font-bold px-1.5 py-0.5"
                  style={{
                    background: '#FF6B2B',
                    color: '#fff',
                    borderRadius: 999,
                    minWidth: 20,
                    textAlign: 'center',
                  }}
                >
                  {it.badge}
                </span>
              ) : null}
            </button>
          )
        })}
        <div
          className="mt-4 px-3 text-[11px] font-semibold"
          style={{
            color: muted,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Your companies
        </div>
        <div className="flex flex-col gap-1 mt-1">
          {MOCK_COMPANIES.map((c) => (
            <button
              key={c.initials}
              type="button"
              className="flex items-center gap-3 px-3 h-11 text-left"
              style={{
                borderRadius: 12,
                color: fg,
                fontSize: 14,
                fontWeight: c.active ? 600 : 500,
              }}
            >
              <span
                className="size-8 flex items-center justify-center font-bold text-[11px]"
                style={{
                  background: c.active ? '#3D9BD6' : '#94A3B8',
                  color: '#fff',
                  borderRadius: 10,
                  fontFamily: 'var(--mg-font-display)',
                }}
              >
                {c.initials}
              </span>
              <span>{c.name}</span>
              {c.active && (
                <span
                  className="ml-auto size-2 rounded-full"
                  style={{ background: '#22C55E' }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}

function ModernSOSSection() {
  const tiles = MOCK_SOS_STORIES.filter((s) => s.type !== 'create').slice(0, 4)
  const fg = '#0A1628'
  const muted = '#5A6B82'
  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2.5 px-1">
        <h2
          className="font-bold text-[15px]"
          style={{
            color: fg,
            fontFamily: 'var(--mg-font-display)',
            letterSpacing: '-0.01em',
          }}
        >
          Active SOS in your categories
        </h2>
        <button type="button" className="text-[13px] font-semibold" style={{ color: '#1877F2' }}>
          See all
        </button>
      </div>

      <button
        type="button"
        className="flex items-center gap-3 p-4 text-left w-full mb-3"
        style={{
          background: 'linear-gradient(135deg, #FFF7F0 0%, #FFEEDB 100%)',
          borderRadius: 16,
        }}
      >
        <div
          className="size-12 flex items-center justify-center shrink-0"
          style={{ background: '#FF6B2B', color: '#fff', borderRadius: 14 }}
        >
          <SirenIcon size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="font-bold text-[15px]"
            style={{
              color: '#9A3412',
              fontFamily: 'var(--mg-font-display)',
              letterSpacing: '-0.005em',
            }}
          >
            Got an urgent need?
          </div>
          <div
            className="text-[12.5px]"
            style={{ color: '#9A3412', opacity: 0.75 }}
          >
            Send an SOS — average response 18 min.
          </div>
        </div>
        <span
          className="font-semibold text-[13px] px-3.5 h-9 flex items-center shrink-0"
          style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
        >
          Send SOS
        </span>
      </button>

      <div className="grid grid-cols-2 gap-3">
        {tiles.map((s) => {
          const urg = urgencyConfig(s.urgency || 'normal')
          return (
            <button
              key={s.id}
              type="button"
              className="flex flex-col items-start gap-1.5 p-3.5 text-left"
              style={{
                background: '#FFFFFF',
                borderRadius: 14,
                boxShadow: CARD_SHADOW,
              }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: urg.color }}
                />
                <span
                  className="text-[11px] font-bold"
                  style={{
                    color: urg.color,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                  }}
                >
                  {urg.label}
                </span>
                <span className="text-[11.5px]" style={{ color: muted }}>
                  · {s.time}
                </span>
              </div>
              <div
                className="font-bold text-[14px] leading-snug"
                style={{
                  color: fg,
                  fontFamily: 'var(--mg-font-display)',
                  letterSpacing: '-0.005em',
                }}
              >
                {s.category}
              </div>
              <div className="text-[12.5px]" style={{ color: muted }}>
                {s.company}
              </div>
              <div
                className="mt-1 text-[12.5px] font-semibold"
                style={{ color: '#1877F2' }}
              >
                {s.yours ? 'View thread →' : 'Respond →'}
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function ModernComposer() {
  const fg = '#0A1628'
  const muted = '#5A6B82'
  return (
    <div
      className="mb-5"
      style={{ background: '#FFFFFF', borderRadius: 16, boxShadow: CARD_SHADOW }}
    >
      <div className="flex items-center gap-3 p-4">
        <div
          className="size-10 flex items-center justify-center font-bold text-[13px] shrink-0"
          style={{
            background: '#3D9BD6',
            color: '#fff',
            borderRadius: 999,
            fontFamily: 'var(--mg-font-display)',
          }}
        >
          NC
        </div>
        <button
          type="button"
          className="flex-1 h-11 px-4 text-left text-[14px]"
          style={{
            background: '#F0F3F7',
            color: muted,
            borderRadius: 999,
            border: 'none',
          }}
        >
          Share an update with your network…
        </button>
      </div>
      <div
        className="px-2 pb-2 flex items-stretch"
        style={{ borderTop: '1px solid #E5E9EF', paddingTop: 6 }}
      >
        <CompAction icon={SirenIcon} label="Send SOS" color="#FF6B2B" fg={fg} />
        <CompAction icon={PhotoIcon} label="Photo / Video" color="#22C55E" fg={fg} />
        <CompAction icon={StoreIcon} label="Listing" color="#1877F2" fg={fg} />
      </div>
    </div>
  )
}

function CompAction({
  icon: I,
  label,
  color,
  fg,
}: {
  icon: LucideLike
  label: string
  color: string
  fg: string
}) {
  return (
    <button
      type="button"
      className="flex-1 flex items-center justify-center gap-2 h-10"
      style={{ borderRadius: 12, color: fg }}
    >
      <I size={18} style={{ color }} />
      <span className="text-[13.5px] font-semibold">{label}</span>
    </button>
  )
}

function ModernPostCard({ post }: { post: FeedPost }) {
  const fg = '#0A1628'
  const muted = '#5A6B82'
  return (
    <div
      className="mb-5"
      style={{
        background: '#FFFFFF',
        borderRadius: 16,
        boxShadow: CARD_SHADOW,
        overflow: 'hidden',
      }}
    >
      <div className="flex items-start gap-3 p-4 pb-3">
        <div
          className="size-11 flex items-center justify-center font-bold text-[13px] shrink-0"
          style={{
            background: post.avatar,
            color: '#fff',
            borderRadius: 999,
            fontFamily: 'var(--mg-font-display)',
          }}
        >
          {post.avatarInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="font-bold text-[14.5px]"
              style={{
                color: fg,
                fontFamily: 'var(--mg-font-display)',
                letterSpacing: '-0.005em',
              }}
            >
              {post.author}
            </span>
            {post.authorBadge && (
              <CheckIcon size={14} style={{ color: '#1877F2' }} strokeWidth={3} />
            )}
          </div>
          <div className="text-[12px] mt-0.5" style={{ color: muted }}>
            {post.location} · {post.timeAgo}
          </div>
        </div>
        <button
          type="button"
          className="size-8 flex items-center justify-center"
          style={{ color: muted, borderRadius: 999 }}
        >
          <MoreIcon size={18} />
        </button>
      </div>

      <div
        className="px-4 pb-3 text-[14.5px] leading-relaxed"
        style={{ color: fg, textWrap: 'pretty' }}
      >
        {post.body}
      </div>

      {post.media && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.media.src}
            alt=""
            className="w-full max-h-[460px] object-cover"
            style={{ display: 'block' }}
          />
          {post.media.kind === 'video' && (
            <button
              type="button"
              className="absolute inset-0 flex items-center justify-center"
            >
              <span
                className="size-14 flex items-center justify-center"
                style={{
                  background: 'rgba(11,37,69,0.85)',
                  borderRadius: 999,
                }}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="white"
                >
                  <polygon points="6 3 20 12 6 21 6 3" />
                </svg>
              </span>
            </button>
          )}
        </div>
      )}

      <div
        className="flex items-center justify-between px-4 py-2.5 text-[12.5px]"
        style={{ color: muted }}
      >
        <div className="flex items-center gap-1.5">
          <span className="flex -space-x-1">
            <span
              className="size-[18px] flex items-center justify-center text-[10px]"
              style={{
                background: '#1877F2',
                color: '#fff',
                borderRadius: 999,
                border: '2px solid #FFFFFF',
              }}
            >
              👍
            </span>
            <span
              className="size-[18px] flex items-center justify-center text-[10px]"
              style={{
                background: '#FF4D4F',
                color: '#fff',
                borderRadius: 999,
                border: '2px solid #FFFFFF',
              }}
            >
              ❤
            </span>
          </span>
          <span>{post.reactions.total}</span>
        </div>
        <div className="flex items-center gap-3">
          <span>{post.comments} comments</span>
          <span>{post.shares} shares</span>
        </div>
      </div>

      <div
        className="px-2 pb-2 flex items-stretch"
        style={{ borderTop: '1px solid #E5E9EF', paddingTop: 4 }}
      >
        <PostAction label="Like" fg={fg} icon="thumb" />
        <PostAction label="Comment" fg={fg} icon="comment" />
        <PostAction label="Share" fg={fg} icon="share" />
      </div>
    </div>
  )
}

function PostAction({
  label,
  fg,
  icon,
}: {
  label: string
  fg: string
  icon: 'thumb' | 'comment' | 'share'
}) {
  return (
    <button
      type="button"
      className="flex-1 flex items-center justify-center gap-2 h-10"
      style={{ borderRadius: 12, color: fg }}
    >
      {icon === 'thumb' && (
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
          <path d="M7 10v12" />
          <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L14 1a3.13 3.13 0 0 1 3 3.88z" />
        </svg>
      )}
      {icon === 'comment' && (
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
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      )}
      {icon === 'share' && (
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
          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
          <polyline points="16 6 12 2 8 6" />
          <line x1="12" x2="12" y1="2" y2="15" />
        </svg>
      )}
      <span className="text-[13.5px] font-semibold">{label}</span>
    </button>
  )
}

function ModernRightSidebar() {
  const fg = '#0A1628'
  const muted = '#5A6B82'
  return (
    <aside className="hidden xl:block w-[300px] shrink-0">
      <div className="sticky top-[68px] flex flex-col gap-4 pt-2">
        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            boxShadow: CARD_SHADOW,
            padding: 16,
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h3
              className="font-bold text-[14.5px]"
              style={{
                color: fg,
                fontFamily: 'var(--mg-font-display)',
                letterSpacing: '-0.005em',
              }}
            >
              SOS alerts
            </h3>
            <button
              type="button"
              className="text-[12px] font-semibold"
              style={{ color: '#1877F2' }}
            >
              See all
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {MOCK_SOS_ALERTS.slice(0, 4).map((a, i) => {
              const u = urgencyConfig(a.urgency)
              return (
                <button
                  key={i}
                  type="button"
                  className="flex items-start gap-2.5 p-2 -mx-2 text-left"
                  style={{ borderRadius: 10 }}
                >
                  <span
                    className="size-2 rounded-full mt-1.5 shrink-0"
                    style={{ background: u.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-[13px] font-semibold leading-snug truncate"
                      style={{ color: fg }}
                    >
                      {a.title}
                    </div>
                    <div className="text-[11.5px]" style={{ color: muted }}>
                      {a.time}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            boxShadow: CARD_SHADOW,
            padding: 16,
          }}
        >
          <h3
            className="font-bold text-[14.5px] mb-3"
            style={{
              color: fg,
              fontFamily: 'var(--mg-font-display)',
              letterSpacing: '-0.005em',
            }}
          >
            Suggested for you
          </h3>
          <div className="flex flex-col gap-3">
            {MOCK_DISCOVERY.map((d, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <span
                  className="size-9 flex items-center justify-center font-bold text-[11px] shrink-0"
                  style={{
                    background: ['#3D9BD6', '#8B5CF6', '#22C55E'][i % 3],
                    color: '#fff',
                    borderRadius: 999,
                    fontFamily: 'var(--mg-font-display)',
                  }}
                >
                  {d.name
                    .split(' ')
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')}
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[13px] font-semibold truncate"
                    style={{ color: fg }}
                  >
                    {d.name}
                  </div>
                  <div className="text-[11.5px]" style={{ color: muted }}>
                    {d.loc} · {d.match}% match
                  </div>
                </div>
                <button
                  type="button"
                  className="text-[12px] font-semibold px-3 h-7 flex items-center"
                  style={{
                    background: 'rgba(24,119,242,0.1)',
                    color: '#1877F2',
                    borderRadius: 999,
                  }}
                >
                  Follow
                </button>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            background: '#FFFFFF',
            borderRadius: 16,
            boxShadow: CARD_SHADOW,
            padding: 16,
          }}
        >
          <h3
            className="font-bold text-[14.5px] mb-3"
            style={{
              color: fg,
              fontFamily: 'var(--mg-font-display)',
              letterSpacing: '-0.005em',
            }}
          >
            Trending
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {MOCK_TRENDING.map((t) => (
              <span
                key={t}
                className="text-[12.5px] font-medium px-2.5 py-1"
                style={{ background: '#F0F3F7', color: fg, borderRadius: 999 }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
