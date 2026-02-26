'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, List, MessageSquare, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/search', label: 'Browse Equipment', icon: Search },
  { href: '/listings', label: 'My Listings', icon: List },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/profile', label: 'Profile', icon: User },
]

export function DesktopNav() {
  const pathname = usePathname()

  return (
    <nav className="hidden border-b border-border bg-surface lg:block">
      <div className="mx-auto flex max-w-7xl items-center gap-1 px-4 sm:px-6 lg:px-8">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2 border-b-2 px-4 py-3 font-body text-sm transition-colors',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
