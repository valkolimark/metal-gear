'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Plus, MessageSquare, User } from 'lucide-react'
import { MobileComposeSheet } from './MobileComposeSheet'
import { useUIStore } from '@/stores/ui-store'

interface MobileBottomNavProps {
  unreadMessages: number
}

const NAV_ITEMS: Array<{
  href: string | null
  label: string | null
  icon: typeof Home
  action?: 'compose'
}> = [
  { href: '/feed', label: 'Home', icon: Home },
  { href: '/search', label: 'Browse', icon: Search },
  { href: null, label: null, icon: Plus, action: 'compose' },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/profile', label: 'Profile', icon: User },
]

export function MobileBottomNav({ unreadMessages: initialUnread }: MobileBottomNavProps) {
  const pathname = usePathname()
  const [composeOpen, setComposeOpen] = useState(false)
  const storeUnread = useUIStore((s) => s.unreadMessages)

  // Use store value if it's been updated (> 0 or explicitly set), otherwise use SSR prop
  const unreadMessages = storeUnread > 0 ? storeUnread : initialUnread

  const isActive = (href: string | null, label: string | null) => {
    if (!href) return false
    if (label === 'Home') return pathname === '/feed' || pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      <nav
        className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background md:hidden"
      >
        <div className="flex h-14 items-center justify-around" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
          {NAV_ITEMS.map((item, idx) => {
            // Compose center button
            if (item.action === 'compose') {
              return (
                <button
                  key="compose"
                  onClick={() => setComposeOpen(true)}
                  className="flex flex-1 items-center justify-center"
                  aria-label="Create"
                >
                  <div className="flex size-10 items-center justify-center rounded-full bg-primary">
                    <Plus className="size-5 text-primary-foreground" />
                  </div>
                </button>
              )
            }

            const Icon = item.icon
            const active = isActive(item.href, item.label)

            return (
              <Link
                key={item.href ?? idx}
                href={item.href!}
                className="relative flex flex-1 flex-col items-center justify-center pb-1 pt-1.5"
              >
                <div className="relative">
                  <Icon
                    className={`size-[22px] ${active ? 'text-primary' : 'text-muted-foreground'}`}
                  />
                  {item.label === 'Messages' && unreadMessages > 0 && (
                    <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
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

      <MobileComposeSheet open={composeOpen} onClose={() => setComposeOpen(false)} />
    </>
  )
}
