'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Search, MessageSquare, User, AlertTriangle, LayoutDashboard } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useUIStore } from '@/stores/ui-store'

interface MobileBottomNavProps {
  unreadMessages: number
}

const NAV_ITEMS = [
  { href: '/feed', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/sos/new', label: 'SOS', icon: null }, // center SOS
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/profile', label: 'Profile', icon: User },
] as const

export function MobileBottomNav({ unreadMessages: initialUnread }: MobileBottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [sosSheetOpen, setSosSheetOpen] = useState(false)
  const storeUnread = useUIStore((s) => s.unreadMessages)

  // Use store value if it's been updated (> 0 or explicitly set), otherwise use SSR prop
  const unreadMessages = storeUnread > 0 ? storeUnread : initialUnread

  const isActive = (href: string, label: string) => {
    if (label === 'Home') return pathname === '/feed' || pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      <nav
        className="mobile-bottom-nav fixed bottom-0 left-0 right-0 z-50 border-t border-border/40 bg-background md:hidden"
        style={{ overflow: 'visible' }}
      >
        <div className="flex h-14 items-end justify-around" style={{ overflow: 'visible' }}>
          {NAV_ITEMS.map((item) => {
            // SOS center button — opens sheet instead of navigating
            if (item.label === 'SOS') {
              return (
                <button
                  key="sos"
                  onClick={() => setSosSheetOpen(true)}
                  className="flex flex-1 flex-col items-center"
                  style={{ overflow: 'visible' }}
                >
                  <div
                    className="sos-pulse flex size-12 items-center justify-center rounded-full bg-[#FF6B2B] text-white"
                    style={{
                      marginTop: '-16px',
                      animation: 'sos-pulse 2.5s ease-in-out infinite',
                    }}
                    data-sos-trigger
                  >
                    <span className="text-xs font-bold">SOS</span>
                  </div>
                  <span className="mt-0.5 text-[10px] font-medium text-[#FF6B2B]">
                    SOS
                  </span>
                </button>
              )
            }

            const Icon = item.icon!
            const active = isActive(item.href, item.label)

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

      {/* SOS Launcher Sheet */}
      <Sheet open={sosSheetOpen} onOpenChange={setSosSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-8">
          <SheetHeader className="pb-2">
            <SheetTitle className="font-display text-lg text-[#FF6B2B]">SOS</SheetTitle>
          </SheetHeader>
          <div className="space-y-3">
            <button
              onClick={() => {
                setSosSheetOpen(false)
                router.push('/sos/create')
              }}
              className="flex w-full items-center gap-4 rounded-xl border border-[#FF6B2B]/30 bg-[#FF6B2B]/10 p-4 text-left transition-colors active:bg-[#FF6B2B]/20"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[#FF6B2B]/20">
                <AlertTriangle className="size-6 text-[#FF6B2B]" />
              </div>
              <div>
                <p className="font-display text-sm font-semibold text-foreground">Send SOS</p>
                <p className="font-body text-xs text-muted-foreground">
                  Broadcast an urgent equipment need
                </p>
              </div>
            </button>
            <button
              onClick={() => {
                setSosSheetOpen(false)
                router.push('/sos')
              }}
              className="flex w-full items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors active:bg-accent"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted">
                <LayoutDashboard className="size-6 text-muted-foreground" />
              </div>
              <div>
                <p className="font-display text-sm font-semibold text-foreground">SOS Dashboard</p>
                <p className="font-body text-xs text-muted-foreground">
                  View open requests & your active SOSes
                </p>
              </div>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
