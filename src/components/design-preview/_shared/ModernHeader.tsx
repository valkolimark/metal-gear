'use client'

import { useState, type ReactNode } from 'react'
import {
  HomeIcon,
  StoreIcon,
  SirenIcon,
  VideoIcon,
  UsersIcon,
  SearchIcon,
  PlusIcon,
  MessageIcon,
  BellIcon,
} from './icons'

type NavKey = 'Feed' | 'Equipment' | 'SOS' | 'Watch' | 'Companies'

const navItems: Array<{
  key: NavKey
  icon: typeof HomeIcon
  orange?: boolean
  badge?: number
}> = [
  { key: 'Feed', icon: HomeIcon },
  { key: 'Equipment', icon: StoreIcon },
  { key: 'SOS', icon: SirenIcon, orange: true, badge: 5 },
  { key: 'Watch', icon: VideoIcon },
  { key: 'Companies', icon: UsersIcon },
]

export function ModernHeader() {
  const navy = '#0B2545'
  const fg = '#E8EEF5'
  const [active, setActive] = useState<NavKey>('Feed')

  return (
    <header
      className="sticky top-0 z-30 flex items-center px-6 h-[56px]"
      style={{ background: navy, color: fg }}
    >
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="size-9 flex items-center justify-center font-bold text-[14px] shrink-0"
          style={{
            background: '#1877F2',
            color: '#fff',
            borderRadius: 10,
            letterSpacing: '-0.02em',
            fontFamily: 'var(--mg-font-display)',
          }}
        >
          MG
        </div>
        <div className="relative max-w-[280px] w-full hidden md:block">
          <SearchIcon
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2"
            style={{ opacity: 0.55 }}
          />
          <input
            type="search"
            placeholder="Search"
            className="w-full h-9 pl-10 pr-3 text-[13.5px] outline-none placeholder:opacity-55"
            style={{
              background: 'rgba(255,255,255,0.08)',
              color: fg,
              border: 'none',
              borderRadius: 999,
            }}
          />
        </div>
      </div>
      <nav className="hidden lg:flex items-center justify-center">
        {navItems.map((item) => {
          const I = item.icon
          const isActive = active === item.key
          const accent = item.orange ? '#FF6B2B' : '#3D9BD6'
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActive(item.key)}
              className="relative h-[56px] w-[80px] flex items-center justify-center"
              style={{ color: isActive ? accent : 'rgba(255,255,255,0.6)' }}
            >
              <I size={22} strokeWidth={isActive ? 2.4 : 2} />
              {item.badge ? (
                <span
                  className="absolute top-2.5 right-[18px] min-w-[16px] h-[16px] px-1 text-[10px] font-bold flex items-center justify-center"
                  style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
                >
                  {item.badge}
                </span>
              ) : null}
              {isActive && (
                <span
                  className="absolute bottom-0 left-4 right-4 h-[3px]"
                  style={{ background: accent, borderRadius: '3px 3px 0 0' }}
                />
              )}
            </button>
          )
        })}
      </nav>
      <div className="flex items-center gap-2 flex-1 justify-end">
        <button
          type="button"
          className="hidden md:flex items-center gap-1.5 h-9 px-4 font-semibold text-[13px]"
          style={{ background: '#1877F2', color: '#fff', border: 'none', borderRadius: 999 }}
        >
          <PlusIcon size={14} strokeWidth={3} /> Listing
        </button>
        <ModernIconBtn>
          <MessageIcon size={18} />
        </ModernIconBtn>
        <ModernIconBtn badge={8}>
          <BellIcon size={18} />
        </ModernIconBtn>
        <button
          type="button"
          className="size-9 flex items-center justify-center font-semibold text-[12px] shrink-0"
          style={{ background: '#3D9BD6', color: '#fff', borderRadius: 999, fontWeight: 700 }}
        >
          MT
        </button>
      </div>
    </header>
  )
}

export function ModernIconBtn({ children, badge }: { children: ReactNode; badge?: number }) {
  return (
    <button
      type="button"
      className="relative size-9 flex items-center justify-center shrink-0"
      style={{
        background: 'rgba(255,255,255,0.08)',
        color: '#E8EEF5',
        border: 'none',
        borderRadius: 999,
      }}
    >
      {children}
      {badge ? (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 text-[10px] font-bold flex items-center justify-center"
          style={{ background: '#FF6B2B', color: '#fff', borderRadius: 999 }}
        >
          {badge}
        </span>
      ) : null}
    </button>
  )
}
