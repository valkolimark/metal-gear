'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, List, MessageSquare, User, Radar, LayoutDashboard } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { SosNavPopover } from '@/components/sos-nav-popover'

export function DesktopNav() {
  const pathname = usePathname()
  const t = useTranslations('nav')

  const navItems = [
    { href: '/feed', label: t('home'), icon: Home },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/search', label: t('search'), icon: Search },
    { href: '/listings', label: t('myListings'), icon: List },
    { href: '/radar', label: 'Radar', icon: Radar },
    { href: '/messages', label: t('messages'), icon: MessageSquare },
    { href: '/profile', label: t('profile'), icon: User },
  ]

  return (
    <nav className="hidden border-b border-border bg-surface lg:block" aria-label="Main navigation">
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 sm:px-6 lg:px-8">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-3 font-body text-sm transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
        <SosNavPopover />
      </div>
    </nav>
  )
}
