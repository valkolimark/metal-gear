'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, List, MessageSquare, Heart, User, FolderOpen, Siren, LayoutDashboard } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'

export function DesktopNav() {
  const pathname = usePathname()
  const t = useTranslations('nav')

  const navItems = [
    { href: '/search', label: t('home'), icon: Home },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/listings', label: t('myListings'), icon: List },
    { href: '/favorites', label: t('favorites'), icon: Heart },
    { href: '/collections', label: 'Radar', icon: FolderOpen },
    { href: '/sos', label: t('sos'), icon: Siren, highlight: true },
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
                  : 'highlight' in item && item.highlight
                    ? 'border-transparent text-red-500 hover:border-red-500/50 hover:text-red-400'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              <item.icon className="size-4" aria-hidden="true" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
