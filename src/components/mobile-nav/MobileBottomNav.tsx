'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, MessageSquare, User } from 'lucide-react'

interface MobileBottomNavProps {
  unreadMessages: number
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/sos/new', label: 'SOS', icon: null }, // center SOS
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/profile', label: 'Profile', icon: User },
] as const

export function MobileBottomNav({ unreadMessages }: MobileBottomNavProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <nav
      className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background md:hidden"
      style={{ overflow: 'visible' }}
    >
      <div className="flex h-14 items-end justify-around" style={{ overflow: 'visible' }}>
        {NAV_ITEMS.map((item) => {
          // SOS center button
          if (item.label === 'SOS') {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-1 flex-col items-center"
                style={{ overflow: 'visible' }}
              >
                <div
                  className="sos-pulse flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  style={{
                    marginTop: '-16px',
                    animation: 'sos-pulse 2.5s ease-in-out infinite',
                  }}
                  data-sos-trigger
                >
                  <span className="text-xs font-bold">SOS</span>
                </div>
                <span className="mt-0.5 text-[10px] font-medium text-primary">
                  SOS
                </span>
              </Link>
            )
          }

          const Icon = item.icon!
          const active = isActive(item.href)

          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-1 flex-col items-center justify-center pb-1 pt-1.5"
            >
              <div className="relative">
                <Icon
                  className={`size-[22px] ${active ? 'text-primary' : 'text-muted-foreground'}`}
                />
                {item.label === 'Messages' && unreadMessages > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
