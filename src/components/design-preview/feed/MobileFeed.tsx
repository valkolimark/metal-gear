'use client'

import { useState } from 'react'
import {
  ArrowRightIcon,
  HomeIcon,
  MenuIcon,
  MessageIcon,
  PhotoIcon,
  SearchIcon,
  SirenIcon,
  StoreIcon,
  UsersIcon,
} from '../_shared/icons'
import { IndustrialMark } from './IndustrialMark'
import {
  MOCK_POSTS,
  MOCK_SOS_STORIES,
  urgencyConfig,
  type FeedPost,
} from './feed-data'

export function MobileFeedApp() {
  return (
    <div
      style={{
        background: '#E9ECF1',
        color: '#0A1628',
        height: '100%',
        fontFamily: 'var(--mg-font-body)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflow: 'auto',
          backgroundImage:
            'linear-gradient(rgba(11,37,69,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(11,37,69,0.05) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          paddingBottom: 76,
        }}
      >
        <MobileHeader />
        <MobileSubBar />
        <MobileSOSStrip />
        <MobileComposer />
        {MOCK_POSTS.slice(0, 3).map((p) => (
          <MobilePostCard key={p.id} post={p} />
        ))}
      </div>
      <MobileTabBar />
    </div>
  )
}

function MobileHeader() {
  return (
    <header
      className="sticky top-0 z-30 flex items-center px-3"
      style={{
        height: 96,
        paddingTop: 44,
        background: '#0B2545',
        color: '#E8EEF5',
        boxShadow:
          '0 1px 0 rgba(0,0,0,0.4), inset 0 -1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <IndustrialMark size={32} />
        <span
          style={{
            fontFamily: 'var(--mg-font-display)',
            fontWeight: 800,
            fontSize: 17,
            letterSpacing: '-0.01em',
          }}
        >
          Metal Gear
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className="size-9 flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 4,
          }}
        >
          <SearchIcon size={16} />
        </button>
        <button
          type="button"
          className="relative size-9 flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 4,
          }}
        >
          <MessageIcon size={16} />
          <span
            className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 text-[10px] font-bold flex items-center justify-center"
            style={{
              background: '#FF6B2B',
              color: '#fff',
              borderRadius: 2,
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            3
          </span>
        </button>
        <button
          type="button"
          className="size-9 flex items-center justify-center"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 4,
          }}
        >
          <MenuIcon size={16} />
        </button>
      </div>
    </header>
  )
}

function MobileSubBar() {
  const tabs = ['Feed', 'SOS · 5', 'Equipment', 'Companies', 'Watch']
  const [active, setActive] = useState(0)
  return (
    <div
      className="flex items-center gap-1.5 px-3 h-[44px] overflow-x-auto"
      style={{ background: '#FFFFFF', borderBottom: '1px solid #D6DCE4' }}
    >
      {tabs.map((t, i) => {
        const isActive = i === active
        return (
          <button
            key={t}
            type="button"
            onClick={() => setActive(i)}
            className="shrink-0 h-7 px-2.5 text-[12px] font-semibold whitespace-nowrap"
            style={{
              background: isActive ? '#1877F2' : '#F0F3F7',
              color: isActive ? '#fff' : '#0A1628',
              border: `1px solid ${isActive ? '#1877F2' : '#D6DCE4'}`,
              borderRadius: 3,
            }}
          >
            {t}
          </button>
        )
      })}
    </div>
  )
}

function MobileSOSStrip() {
  return (
    <section className="px-3 pt-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="size-2 rounded-sm" style={{ background: '#FF6B2B' }} />
          <h2
            className="font-bold text-[13px] whitespace-nowrap"
            style={{
              color: '#0A1628',
              fontFamily: 'var(--mg-font-display)',
              letterSpacing: '-0.005em',
            }}
          >
            Active SOS
          </h2>
          <span
            className="text-[10px] px-1.5 py-0.5 font-semibold whitespace-nowrap"
            style={{
              background: 'rgba(255,107,43,0.12)',
              color: '#FF6B2B',
              borderRadius: 2,
              fontFamily: 'var(--mg-font-mono)',
            }}
          >
            5 open
          </span>
        </div>
        <button
          type="button"
          className="text-[11px] font-semibold flex items-center gap-0.5 whitespace-nowrap"
          style={{ color: '#1877F2' }}
        >
          See all <ArrowRightIcon size={10} />
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto -mx-3 px-3 pb-1">
        <button
          type="button"
          className="shrink-0 w-[150px] flex flex-col text-left"
          style={{
            background: '#FFF7F0',
            border: '1px dashed #FF6B2B',
            borderRadius: 4,
            minHeight: 100,
          }}
        >
          <div
            style={{
              height: 5,
              background:
                'repeating-linear-gradient(45deg, #FF6B2B 0 6px, #1A1A1A 6px 12px)',
            }}
          />
          <div className="flex-1 flex flex-col items-center justify-center gap-1 p-2.5">
            <div
              className="size-8 flex items-center justify-center"
              style={{ background: '#FF6B2B', color: '#fff', borderRadius: 4 }}
            >
              <SirenIcon size={16} />
            </div>
            <span
              className="font-bold text-[12px] whitespace-nowrap"
              style={{ color: '#FF6B2B', fontFamily: 'var(--mg-font-display)' }}
            >
              Send SOS
            </span>
          </div>
        </button>
        {MOCK_SOS_STORIES.filter((s) => s.type !== 'create')
          .slice(0, 4)
          .map((s) => {
            const urg = urgencyConfig(s.urgency || 'normal')
            return (
              <button
                key={s.id}
                type="button"
                className="shrink-0 w-[170px] flex flex-col text-left"
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #D6DCE4',
                  borderRadius: 4,
                  minHeight: 100,
                }}
              >
                <div style={{ height: 4, background: urg.stripeColor }} />
                <div className="px-2.5 py-2 flex flex-col gap-1 flex-1">
                  <span
                    className="text-[9px] font-semibold px-1 py-0.5 whitespace-nowrap self-start"
                    style={{
                      background: `${urg.color}20`,
                      color: urg.color,
                      borderRadius: 2,
                      fontFamily: 'var(--mg-font-mono)',
                    }}
                  >
                    {urg.code} · {urg.label}
                  </span>
                  <div
                    className="text-[12px] font-bold leading-tight"
                    style={{
                      color: '#0A1628',
                      fontFamily: 'var(--mg-font-display)',
                      letterSpacing: '-0.005em',
                    }}
                  >
                    {s.category}
                  </div>
                  <div className="text-[10px]" style={{ color: '#5A6B82' }}>
                    {s.company}
                  </div>
                  <div className="mt-auto pt-1 flex items-center justify-between">
                    <span
                      className="text-[10px]"
                      style={{
                        color: '#5A6B82',
                        fontFamily: 'var(--mg-font-mono)',
                      }}
                    >
                      {s.time}
                    </span>
                    <span
                      className="text-[10px] font-bold"
                      style={{ color: '#1877F2' }}
                    >
                      {s.yours ? 'View →' : 'Respond →'}
                    </span>
                  </div>
                </div>
              </button>
            )
          })}
      </div>
    </section>
  )
}

function MobileComposer() {
  return (
    <div
      className="mx-3 mt-3"
      style={{
        background: '#FFFFFF',
        border: '1px solid #D6DCE4',
        borderRadius: 4,
      }}
    >
      <div className="flex items-center gap-2 p-2.5">
        <div
          className="size-8 flex items-center justify-center font-bold text-[11px] shrink-0"
          style={{
            background: '#3D9BD6',
            color: '#fff',
            borderRadius: 4,
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          NC
        </div>
        <button
          type="button"
          className="flex-1 h-8 px-2.5 text-left text-[12px]"
          style={{
            background: '#F0F3F7',
            color: '#5A6B82',
            border: '1px solid #D6DCE4',
            borderRadius: 3,
          }}
        >
          Share an update…
        </button>
      </div>
      <div
        className="border-t flex items-stretch"
        style={{ borderColor: '#D6DCE4' }}
      >
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-1.5 py-2"
          style={{ color: '#0A1628', borderRight: '1px solid #D6DCE4' }}
        >
          <SirenIcon size={14} style={{ color: '#FF6B2B' }} />
          <span className="text-[12px] font-semibold">SOS</span>
        </button>
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-1.5 py-2"
          style={{ color: '#0A1628', borderRight: '1px solid #D6DCE4' }}
        >
          <PhotoIcon size={14} style={{ color: '#31A24C' }} />
          <span className="text-[12px] font-semibold">Media</span>
        </button>
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-1.5 py-2"
          style={{ color: '#0A1628' }}
        >
          <StoreIcon size={14} style={{ color: '#1877F2' }} />
          <span className="text-[12px] font-semibold">Listing</span>
        </button>
      </div>
    </div>
  )
}

function MobilePostCard({ post }: { post: FeedPost }) {
  return (
    <div
      className="mx-3 mt-3"
      style={{
        background: '#FFFFFF',
        border: '1px solid #D6DCE4',
        borderRadius: 4,
      }}
    >
      <div
        className="px-2.5 py-1 flex items-center justify-between whitespace-nowrap"
        style={{
          background: '#F0F3F7',
          borderBottom: '1px solid #D6DCE4',
          fontSize: 10,
          color: '#5A6B82',
          fontWeight: 600,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--mg-font-mono)',
            letterSpacing: '0.02em',
          }}
        >
          POST · {post.id.toUpperCase()}
        </span>
        <span>{post.timeAgo}</span>
      </div>

      <div className="flex items-start gap-2 px-2.5 pt-2.5 pb-2">
        <div
          className="size-9 flex items-center justify-center font-bold text-[12px] shrink-0"
          style={{
            background: post.avatar,
            color: '#fff',
            borderRadius: 4,
            fontFamily: 'var(--mg-font-mono)',
          }}
        >
          {post.avatarInitials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span
              className="font-bold text-[13px]"
              style={{
                color: '#0A1628',
                fontFamily: 'var(--mg-font-display)',
                letterSpacing: '-0.005em',
              }}
            >
              {post.author}
            </span>
            {post.authorBadge && (
              <span
                className="text-[9px] font-bold px-1 py-0.5 whitespace-nowrap"
                style={{
                  background: 'rgba(24,119,242,0.12)',
                  color: '#1877F2',
                  borderRadius: 2,
                }}
              >
                ✓ Verified
              </span>
            )}
          </div>
          <div
            className="text-[10px] mt-0.5 truncate"
            style={{ color: '#5A6B82' }}
          >
            {post.location}
          </div>
        </div>
      </div>

      <div
        className="px-2.5 pb-2.5 text-[13px] leading-snug"
        style={{ color: '#0A1628', textWrap: 'pretty' }}
      >
        {post.body}
      </div>

      {post.media && (
        <div
          className="relative"
          style={{
            borderTop: '1px solid #D6DCE4',
            borderBottom: '1px solid #D6DCE4',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.media.src}
            alt=""
            className="w-full max-h-[260px] object-cover"
            style={{ display: 'block' }}
          />
        </div>
      )}

      <div
        className="flex items-center justify-between px-2.5 py-1.5 text-[11px]"
        style={{ color: '#5A6B82' }}
      >
        <span>
          {post.reactions.total} · {post.comments} replies
        </span>
        <span style={{ color: '#31A24C' }} className="font-semibold">
          ● Active
        </span>
      </div>

      <div
        className="border-t flex items-stretch"
        style={{ borderColor: '#D6DCE4' }}
      >
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-1.5 py-2"
          style={{ color: '#0A1628', borderRight: '1px solid #D6DCE4' }}
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
            <path d="M7 10v12" />
            <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L14 1a3.13 3.13 0 0 1 3 3.88z" />
          </svg>
          <span className="text-[12px] font-semibold">Endorse</span>
        </button>
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-1.5 py-2"
          style={{ color: '#0A1628', borderRight: '1px solid #D6DCE4' }}
        >
          <MessageIcon size={13} />
          <span className="text-[12px] font-semibold">Reply</span>
        </button>
        <button
          type="button"
          className="flex-1 flex items-center justify-center gap-1.5 py-2"
          style={{ color: '#0A1628' }}
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
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" x2="12" y1="2" y2="15" />
          </svg>
          <span className="text-[12px] font-semibold">Forward</span>
        </button>
      </div>
    </div>
  )
}

function MobileTabBar() {
  const tabs = [
    { key: 'home', icon: HomeIcon, label: 'Feed', active: true },
    { key: 'eq', icon: StoreIcon, label: 'Equipment' },
    { key: 'sos', icon: SirenIcon, label: 'SOS', orange: true, badge: 5 },
    { key: 'msg', icon: MessageIcon, label: 'Inbox', badge: 3 },
    { key: 'me', icon: UsersIcon, label: 'You' },
  ] as const
  return (
    <nav
      className="absolute bottom-0 left-0 right-0 flex items-stretch h-[68px] z-20"
      style={{
        background: '#0B2545',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 14,
      }}
    >
      {tabs.map((t) => {
        const I = t.icon
        const isActive = 'active' in t && t.active
        const color = isActive
          ? '#3D9BD6'
          : 'orange' in t && t.orange
            ? '#FF6B2B'
            : 'rgba(255,255,255,0.65)'
        return (
          <button
            key={t.key}
            type="button"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 relative"
          >
            <I size={20} style={{ color }} strokeWidth={2} />
            <span className="text-[10px] font-semibold" style={{ color }}>
              {t.label}
            </span>
            {'badge' in t && t.badge ? (
              <span
                className="absolute top-2 right-[20%] min-w-[14px] h-[14px] px-1 text-[9px] font-bold flex items-center justify-center"
                style={{
                  background: '#FF6B2B',
                  color: '#fff',
                  borderRadius: 2,
                  fontFamily: 'var(--mg-font-mono)',
                }}
              >
                {t.badge}
              </span>
            ) : null}
            {isActive && (
              <span
                className="absolute top-0 left-3 right-3 h-[2px]"
                style={{ background: '#3D9BD6' }}
              />
            )}
          </button>
        )
      })}
    </nav>
  )
}
