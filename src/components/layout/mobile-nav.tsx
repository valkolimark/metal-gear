'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, PlusCircle, MessageSquare, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/stores/ui-store'

export function MobileNav() {
  const pathname = usePathname()
  const unreadMessages = useUIStore((s) => s.unreadMessages)
  const t = useTranslations('nav')

  const navItems = [
    { href: '/dashboard', label: t('home'), icon: Home },
    { href: '/search', label: t('search'), icon: Search },
    { href: '/listings/new', label: t('sell'), icon: PlusCircle, highlight: true },
    { href: '/messages', label: t('messages'), icon: MessageSquare, badge: true },
    { href: '/profile', label: t('profile'), icon: User },
  ]

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80 lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
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
                aria-hidden="true"
              />
              {item.label}
              {item.badge && unreadMessages > 0 && (
                <span
                  className="absolute right-1/4 top-1 flex size-4 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white"
                  aria-label={`${unreadMessages} unread`}
                >
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
