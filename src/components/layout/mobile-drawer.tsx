'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Search,
  List,
  MessageSquare,
  User,
  X,
  DollarSign,
  Info,
  Siren,
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui-store'

export function MobileDrawer() {
  const pathname = usePathname()
  const { sidebarOpen, setSidebarOpen } = useUIStore()
  const t = useTranslations('nav')
  const tA = useTranslations('accessibility')

  const mainLinks = [
    { href: '/dashboard', label: t('home'), icon: Home },
    { href: '/search', label: t('browseEquipment'), icon: Search },
    { href: '/listings', label: t('myListings'), icon: List },
    { href: '/sos', label: t('sos'), icon: Siren },
    { href: '/messages', label: t('messages'), icon: MessageSquare },
    { href: '/profile', label: t('profile'), icon: User },
  ]

  const secondaryLinks = [
    { href: '/pricing', label: t('pricing'), icon: DollarSign },
    { href: '/about', label: t('about'), icon: Info },
  ]

  if (!sidebarOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 lg:hidden"
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed inset-y-0 left-0 z-50 w-72 bg-surface lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label={tA('mainNavigation')}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <span className="font-display text-xl font-bold text-foreground">
            Metal <span className="text-primary">Gear</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            aria-label={tA('closeMenu')}
          >
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex flex-col gap-1 p-4" aria-label={tA('mainNavigation')}>
          {mainLinks.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 font-body text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <item.icon className="size-5" aria-hidden="true" />
                {item.label}
              </Link>
            )
          })}

          <div className="my-3 border-t border-border" />

          {secondaryLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 font-body text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <item.icon className="size-5" aria-hidden="true" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  )
}
