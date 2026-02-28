'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusCircle, MessageSquare, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/listings/new', label: 'Sell', icon: PlusCircle, highlight: true },
  { href: '/messages', label: 'Messages', icon: MessageSquare, badge: true },
  { href: '/profile', label: 'Profile', icon: User },
]

export function MobileNav() {
  const pathname = usePathname()
  const unreadMessages = useUIStore((s) => s.unreadMessages)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 lg:hidden">
      <div className="flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-1 flex-col items-center gap-0.5 py-2 font-body text-[10px] transition-colors',
                item.highlight
                  ? 'text-primary'
                  : isActive
                    ? 'text-primary'
                    : 'text-muted-foreground active:text-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'size-5',
                  item.highlight && 'size-7 -mt-1'
                )}
              />
              {item.label}
              {item.badge && unreadMessages > 0 && (
                <span className="absolute right-1/4 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
