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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/stores/ui-store'

const mainLinks = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/search', label: 'Browse Equipment', icon: Search },
  { href: '/listings', label: 'My Listings', icon: List },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/profile', label: 'Profile', icon: User },
]

const secondaryLinks = [
  { href: '/pricing', label: 'Pricing', icon: DollarSign },
  { href: '/about', label: 'About', icon: Info },
]

export function MobileDrawer() {
  const pathname = usePathname()
  const { sidebarOpen, setSidebarOpen } = useUIStore()

  if (!sidebarOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 lg:hidden"
        onClick={() => setSidebarOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 z-50 w-72 bg-surface lg:hidden">
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <span className="font-display text-xl font-bold text-foreground">
            Metal <span className="text-primary">Gear</span>
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="size-5" />
          </Button>
        </div>

        <nav className="flex flex-col gap-1 p-4">
          {mainLinks.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 font-body text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <item.icon className="size-5" />
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
              <item.icon className="size-5" />
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </>
  )
}
